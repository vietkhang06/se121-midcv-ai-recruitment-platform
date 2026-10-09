import re
import time
import json
import uuid
import logging
from typing import Optional, Dict, Any, Tuple
from pydantic import BaseModel, Field

from app.config import settings
from app.services.llm.types import (
    LLMResponse,
    LLMClientProtocol,
    LLMInvalidResponseError,
    LLMServerError,
)
from app.services.llm.openai_compatible_client import OpenAICompatibleClient
from app.services.llm.ollama_client import OllamaClient
from app.services.llm.fallback_client import FallbackLLMClient, FallbackExecutionResult
from app.services.structured_cv_validator import StructuredCVValidator, StructuredCVData

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You extract structured information from CV text for the MidCV recruitment platform.

STRICT INSTRUCTIONS:
1. Return exactly ONE valid JSON object matching the target schema.
2. Do not return Markdown or code fences (no ```json).
3. Do not add explanations, preamble, or commentary.
4. Extract ONLY facts explicitly supported by the supplied CV text. Do NOT fabricate, guess, or infer unsupported facts.
5. If a date is just a year (e.g. 2021), keep it as "2021". NEVER invent days or months ("2021-01-01").
6. If GPA or grading scale is not explicitly stated in the CV, set "gpa", "gpa_scale", and "gpa_display" to null. NEVER invent grades.
7. If years of experience or proficiency levels are not explicitly stated, use null.
8. Use null for missing scalar values. Use empty arrays [] for missing collections. Never output "N/A" or "Unknown"."""

REPAIR_SYSTEM_PROMPT = """You are a JSON schema repair assistant for structured CV profiles.
Fix the syntax, structure, and data types of the malformed output to strictly conform to the expected schema.
Do not add new facts, explanations, or markdown fences. Return ONLY the valid JSON object."""

SCHEMA_TEMPLATE = """{
  "personalInfo": {
    "fullName": null,
    "headline": null,
    "email": null,
    "phone": null,
    "address": null,
    "linkedinUrl": null,
    "githubUrl": null
  },
  "summary": null,
  "skills": [{"name": "string", "level": null}],
  "education": [{"institution": "string", "degree": null, "fieldOfStudy": null, "startYear": null, "endYear": null, "gpa": null, "gpa_scale": null, "gpa_display": null}],
  "experience": [{"company": "string", "position": "string", "startDate": null, "endDate": null, "is_current": false, "description": "", "technologies": []}],
  "projects": [{"name": "string", "role": null, "description": "", "techStack": []}],
  "certifications": [{"name": "string", "issuer": null, "date": null}],
  "languages": [{"language": "string", "proficiency": null}]
}"""



def _sanitize_validation_error(err_msg: Optional[str]) -> str:
    """Sanitizes validation error messages by stripping secrets, emails, phones, and truncating."""
    if not err_msg:
        return "Output must be valid JSON conforming to the expected schema."
    text = str(err_msg)
    # Redact API keys, tokens, bearer headers
    text = re.sub(r"(?i)sk-[a-zA-Z0-9_\-]+", "[REDACTED_SECRET]", text)
    text = re.sub(r"(?i)bearer\s+[a-zA-Z0-9._\-]+", "[REDACTED_SECRET]", text)
    text = re.sub(r"(?i)(api[_-]?key[\s:=]+)[^\s,]+", r"\1[REDACTED_SECRET]", text)
    text = re.sub(r"(?i)(password[\s:=]+)[^\s,]+", r"\1[REDACTED_SECRET]", text)
    # Redact email addresses
    text = re.sub(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", "[REDACTED_EMAIL]", text)
    # Redact phone numbers
    text = re.sub(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", "[REDACTED_PHONE]", text)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    concise = " | ".join(lines[:4])
    return concise[:400]


class StructuringResponse(BaseModel):
    success: bool
    providerUsed: str
    fallbackUsed: bool
    fallbackReason: Optional[str] = None
    requestedModel: str
    resolvedModel: Optional[str] = None
    finishReason: Optional[str] = None
    usage: Dict[str, Any] = Field(default_factory=dict)
    validation: Dict[str, bool] = Field(default_factory=dict)
    data: Optional[Dict[str, Any]] = None
    correlationId: str
    error: Optional[str] = None
    error_message: Optional[str] = None


class CVStructuringService:
    """
    Dedicated CV structuring service responsible for:
    - Receiving verified raw text (does NOT read PDF/DOCX directly).
    - Applying length and content validation.
    - Orchestrating LLM calls through FallbackLLMClient (PRIMARY first, Ollama fallback).
    - Parsing and validating JSON schema via StructuredCVValidator.
    - Executing at most one JSON repair attempt if LLM produces malformed output.
    - Never fabricating facts or guessing missing data.
    """

    _sanitize_validation_error = staticmethod(_sanitize_validation_error)

    def __init__(
        self,
        fallback_orchestrator: Optional[FallbackLLMClient] = None,
        validator: Optional[StructuredCVValidator] = None
    ):
        self.validator = validator or StructuredCVValidator()
        if fallback_orchestrator:
            self.orchestrator = fallback_orchestrator
        else:
            primary = OpenAICompatibleClient(
                base_url=settings.LLM_PRIMARY_BASE_URL,
                api_key=settings.LLM_PRIMARY_API_KEY,
                model=settings.LLM_PRIMARY_MODEL,
                timeout_seconds=settings.LLM_PRIMARY_TIMEOUT_SECONDS,
                max_retries=settings.LLM_PRIMARY_MAX_RETRIES
            )
            fallback = OllamaClient(
                base_url=settings.OLLAMA_BASE_URL,
                model=settings.OLLAMA_CHAT_MODEL,
                timeout_seconds=settings.OLLAMA_TIMEOUT_SECONDS,
                max_retries=settings.OLLAMA_MAX_RETRIES
            ) if settings.LLM_FALLBACK_ENABLED else None

            self.orchestrator = FallbackLLMClient(
                primary_client=primary,
                fallback_client=fallback,
                fallback_enabled=settings.LLM_FALLBACK_ENABLED
            )

    def _build_user_prompt(self, raw_text: str) -> str:
        return f"""Extract structured information from the following CV text:
<CV_TEXT>
{raw_text}
</CV_TEXT>

Target JSON schema structure:
{SCHEMA_TEMPLATE}"""

    async def structure_raw_text(
        self,
        raw_text: str,
        correlation_id: Optional[str] = None
    ) -> StructuringResponse:
        cid = correlation_id or str(uuid.uuid4())

        # 1. Validate raw text length
        if not raw_text or not raw_text.strip():
            return StructuringResponse(
                success=False,
                providerUsed="none",
                fallbackUsed=False,
                requestedModel="none",
                correlationId=cid,
                error_message="Raw text is empty or missing."
            )

        cleaned_text = raw_text.strip()
        if len(cleaned_text) < 15:
            return StructuringResponse(
                success=False,
                providerUsed="none",
                fallbackUsed=False,
                requestedModel="none",
                correlationId=cid,
                error_message="Raw text is too short to extract structured CV data (minimum 15 characters required)."
            )

        if len(cleaned_text) > 150_000:
            return StructuringResponse(
                success=False,
                providerUsed="none",
                fallbackUsed=False,
                requestedModel="none",
                correlationId=cid,
                error_message="Raw text exceeds maximum allowed limit of 150,000 characters."
            )

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": self._build_user_prompt(cleaned_text)}
        ]

        # 2. Execute via fallback orchestrator (PRIMARY first)
        exec_res: FallbackExecutionResult = await self.orchestrator.execute(messages, correlation_id=cid)
        llm_resp = exec_res.response

        # 3. Parse and validate JSON
        json_valid, schema_valid, parsed_data, err_msg = self.validator.validate(llm_resp.content, raw_text=cleaned_text)

        # 4. If JSON syntax or schema is invalid, attempt at most 1 bounded repair
        if not (json_valid and schema_valid):
            sanitized_err = self._sanitize_validation_error(err_msg)
            logger.warning(f"[{cid}] LLM returned invalid output (json_valid={json_valid}, schema_valid={schema_valid}). Attempting single repair request... [err={sanitized_err}]")
            repair_messages = [
                {"role": "system", "content": REPAIR_SYSTEM_PROMPT},
                {"role": "user", "content": f"Schema:\n{SCHEMA_TEMPLATE}\n\nValidation Errors:\n{sanitized_err}\n\nMalformed Output to Fix:\n{llm_resp.content}"}
            ]
            try:
                repair_res = await self.orchestrator.execute(repair_messages, correlation_id=f"{cid}-repair")
                r_json_valid, r_schema_valid, r_data, r_err = self.validator.validate(repair_res.response.content, raw_text=cleaned_text)
                if r_json_valid and r_schema_valid and r_data:
                    json_valid = True
                    schema_valid = True
                    parsed_data = r_data
                    llm_resp = repair_res.response
                    err_msg = None
                    logger.info(f"[{cid}] JSON repair succeeded.")
                else:
                    err_msg = r_err or err_msg
                    logger.error(f"[{cid}] JSON repair failed: {self._sanitize_validation_error(r_err)}")
            except Exception as repair_exc:
                logger.error(f"[{cid}] JSON repair request encountered error: {repair_exc}")

            # If repair failed on PRIMARY, trigger fallback to Ollama per fallback rules
            if not (json_valid and schema_valid) and not exec_res.fallback_used and self.orchestrator.fallback_enabled and self.orchestrator.fallback_client:
                logger.warning(f"[{cid}] Primary output unrecoverable after repair attempt. Engaging fallback Ollama client...")
                try:
                    fb_resp = await self.orchestrator.fallback_client.chat(messages, correlation_id=f"{cid}-json-fallback")
                    fb_json_valid, fb_schema_valid, fb_data, fb_err = self.validator.validate(fb_resp.content, raw_text=cleaned_text)
                    if fb_json_valid and fb_schema_valid and fb_data:
                        json_valid = True
                        schema_valid = True
                        parsed_data = fb_data
                        llm_resp = fb_resp
                        err_msg = None
                        exec_res.fallback_used = True
                        exec_res.provider_used = "fallback"
                        exec_res.fallback_reason = "Primary output invalid after repair attempt"
                        logger.info(f"[{cid}] Fallback Ollama structuring succeeded.")
                    else:
                        err_msg = fb_err or err_msg
                        logger.error(f"[{cid}] Fallback Ollama output also invalid: {self._sanitize_validation_error(fb_err)}")
                except Exception as fb_exc:
                    logger.error(f"[{cid}] Fallback Ollama structuring error: {fb_exc}")

        usage_dict = {
            "promptTokens": llm_resp.prompt_tokens,
            "completionTokens": llm_resp.completion_tokens,
            "totalTokens": llm_resp.total_tokens
        }

        validation_dict = {
            "jsonValid": json_valid,
            "schemaValid": schema_valid
        }

        if not (json_valid and schema_valid):
            data_dict = None
            err_code = "LLM_JSON_SYNTAX_FAILED" if not json_valid else "LLM_SCHEMA_VALIDATION_FAILED"
            formatted_err = f"{err_code}: {_sanitize_validation_error(err_msg)}"
        else:
            data_dict = parsed_data.model_dump() if parsed_data else {}
            err_code = None
            formatted_err = None

        return StructuringResponse(
            success=bool(json_valid and schema_valid),
            providerUsed=exec_res.provider_used,
            fallbackUsed=exec_res.fallback_used,
            fallbackReason=exec_res.fallback_reason,
            requestedModel=llm_resp.requested_model,
            resolvedModel=llm_resp.resolved_model or llm_resp.requested_model,
            finishReason=llm_resp.finish_reason or "stop",
            usage=usage_dict,
            validation=validation_dict,
            data=data_dict,
            correlationId=cid,
            error=err_code,
            error_message=formatted_err
        )

    def structure_raw_text_sync(
        self,
        raw_text: str,
        correlation_id: Optional[str] = None
    ) -> StructuringResponse:
        cid = correlation_id or str(uuid.uuid4())

        if not raw_text or not raw_text.strip():
            return StructuringResponse(
                success=False,
                providerUsed="none",
                fallbackUsed=False,
                requestedModel="none",
                correlationId=cid,
                error_message="Raw text is empty or missing."
            )

        cleaned_text = raw_text.strip()
        if len(cleaned_text) < 15:
            return StructuringResponse(
                success=False,
                providerUsed="none",
                fallbackUsed=False,
                requestedModel="none",
                correlationId=cid,
                error_message="Raw text is too short to extract structured CV data (minimum 15 characters required)."
            )

        if len(cleaned_text) > 150_000:
            return StructuringResponse(
                success=False,
                providerUsed="none",
                fallbackUsed=False,
                requestedModel="none",
                correlationId=cid,
                error_message="Raw text exceeds maximum allowed limit of 150,000 characters."
            )

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": self._build_user_prompt(cleaned_text)}
        ]

        exec_res: FallbackExecutionResult = self.orchestrator.execute_sync(messages, correlation_id=cid)
        llm_resp = exec_res.response

        json_valid, schema_valid, parsed_data, err_msg = self.validator.validate(llm_resp.content)

        if not (json_valid and schema_valid):
            sanitized_err = self._sanitize_validation_error(err_msg)
            logger.warning(f"[{cid}] LLM returned invalid output (json_valid={json_valid}, schema_valid={schema_valid}). Attempting single repair request... [err={sanitized_err}]")
            repair_messages = [
                {"role": "system", "content": REPAIR_SYSTEM_PROMPT},
                {"role": "user", "content": f"Schema:\n{SCHEMA_TEMPLATE}\n\nValidation Errors:\n{sanitized_err}\n\nMalformed Output to Fix:\n{llm_resp.content}"}
            ]
            try:
                repair_res = self.orchestrator.execute_sync(repair_messages, correlation_id=f"{cid}-repair")
                r_json_valid, r_schema_valid, r_data, r_err = self.validator.validate(repair_res.response.content)
                if r_json_valid and r_schema_valid and r_data:
                    json_valid = True
                    schema_valid = True
                    parsed_data = r_data
                    llm_resp = repair_res.response
                    err_msg = None
                    logger.info(f"[{cid}] JSON repair succeeded.")
                else:
                    err_msg = r_err or err_msg
                    logger.error(f"[{cid}] JSON repair failed: {self._sanitize_validation_error(r_err)}")
            except Exception as repair_exc:
                logger.error(f"[{cid}] JSON repair request encountered error: {repair_exc}")

        usage_dict = {
            "promptTokens": llm_resp.prompt_tokens,
            "completionTokens": llm_resp.completion_tokens,
            "totalTokens": llm_resp.total_tokens
        }

        validation_dict = {
            "jsonValid": json_valid,
            "schemaValid": schema_valid
        }

        if not (json_valid and schema_valid):
            data_dict = None
            err_code = "LLM_JSON_SYNTAX_FAILED" if not json_valid else "LLM_SCHEMA_VALIDATION_FAILED"
            formatted_err = f"{err_code}: {_sanitize_validation_error(err_msg)}"
        else:
            data_dict = parsed_data.model_dump() if parsed_data else {}
            err_code = None
            formatted_err = None

        return StructuringResponse(
            success=bool(json_valid and schema_valid),
            providerUsed=exec_res.provider_used,
            fallbackUsed=exec_res.fallback_used,
            fallbackReason=exec_res.fallback_reason,
            requestedModel=llm_resp.requested_model,
            resolvedModel=llm_resp.resolved_model or llm_resp.requested_model,
            finishReason=llm_resp.finish_reason or "stop",
            usage=usage_dict,
            validation=validation_dict,
            data=data_dict,
            correlationId=cid,
            error=err_code,
            error_message=formatted_err
        )

