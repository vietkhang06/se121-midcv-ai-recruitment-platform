'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CVReviewData, CVDraftData, CVEvidenceAttachmentItem, CVStructuredData, CVStructuredItem, CVPersonalInfo, CVTechnology } from '@/types';
import {
  fetchCVReview,
  downloadCVFile,
  retryCVExtraction,
  fetchCVDraft,
  updateCVDraft,
  confirmCandidateCV
} from '@/lib/api';
import { RichTextEditor } from '@/components/common/RichTextEditor';
import { SkillAutocomplete } from '@/components/cv/SkillAutocomplete';
import { EvidenceAttachmentControl } from '@/components/cv/EvidenceAttachmentControl';
import { AnimatedModalShell, AnimatedStatus } from '@/components/motion';
import { useLanguage } from '@/context/LanguageContext';
import {
  X,
  FileText,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  BookOpen,
  Briefcase,
  GraduationCap,
  Award,
  Globe,
  Layers,
  Edit3,
  Save,
  Trash2,
  Plus,
  Undo2,
  CheckSquare,
  Lock,
  User,
  Mail,
  Phone,
  MapPin,
  Link2
} from 'lucide-react';

interface CVExtractionReviewModalProps {
  cvId: string;
  isOpen: boolean;
  onClose: () => void;
  onCvUpdated?: () => void;
}

type TabType = 'overview' | 'raw_text' | 'evidence' | 'json' | 'warnings';

const waitForReviewCompletion = async (
  cvId: string,
  initialReview: CVReviewData
): Promise<CVReviewData> => {
  let review = normalizeReviewResponse(initialReview);
  if (isCompletedStatus(review.status) || review.status === 'FAILED') return review;

  const pollingDeadline = Date.now() + 270_000;
  let lastPollingError: unknown = null;
  while (Date.now() < pollingDeadline) {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 2_000));
    try {
      review = normalizeReviewResponse(await fetchCVReview(cvId));
      lastPollingError = null;
      if (isCompletedStatus(review.status) || review.status === 'FAILED') return review;
    } catch (error: unknown) {
      lastPollingError = error;
      console.warn('[CV_REVIEW_POLL_FAILED]', { cvId, error });
    }
  }

  if (lastPollingError instanceof Error) {
    throw new Error(`Không thể cập nhật trạng thái xử lý CV: ${lastPollingError.message}`);
  }
  throw new Error('Quá thời gian chờ phân tích CV. Tiến trình có thể vẫn đang chạy; vui lòng tải lại trạng thái trước khi thử lại.');
};

const normalizeExternalUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

const readRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const readText = (value: unknown): string => typeof value === 'string' ? value : '';

const readTechnologies = (value: unknown): CVTechnology[] =>
  Array.isArray(value) ? value.flatMap<CVTechnology>((entry) => {
    if (typeof entry === 'string') return [entry];
    const record = readRecord(entry);
    return record && typeof record.name === 'string' ? [{ ...record, name: record.name }] : [];
  }) : [];

const technologyName = (technology: CVTechnology): string =>
  typeof technology === 'string' ? technology : technology.name;

const toSkillChoices = (technologies: CVTechnology[]) =>
  technologies.map((technology) => ({ name: technologyName(technology) }));

const readRows = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.map(readRecord).filter((row): row is Record<string, unknown> => row !== null) : [];

const toDraftWorkExperience = (value: unknown): NonNullable<CVDraftData['work_experience']> =>
  readRows(value).map((item) => ({
    ...item,
    id: readText(item.id) || undefined,
    company: readText(item.company),
    role: readText(item.role) || undefined,
    position: readText(item.position) || undefined,
    start_date: readText(item.start_date) || undefined,
    end_date: readText(item.end_date) || undefined,
    startDate: readText(item.startDate) || undefined,
    endDate: readText(item.endDate) || undefined,
    is_current: typeof item.is_current === 'boolean' ? item.is_current : undefined,
    description: readText(item.description) || undefined,
    technologies: readTechnologies(item.technologies),
    origin: readText(item.origin) || undefined,
  }));

const toDraftProjects = (value: unknown): NonNullable<CVDraftData['projects']> =>
  readRows(value).map((item) => ({
    ...item,
    id: readText(item.id) || undefined,
    name: readText(item.name),
    role: readText(item.role) || undefined,
    start_date: readText(item.start_date) || undefined,
    end_date: readText(item.end_date) || undefined,
    description: readText(item.description) || undefined,
    techStack: readTechnologies(item.techStack),
    tech_stack: readTechnologies(item.tech_stack),
    origin: readText(item.origin) || undefined,
  }));

const toDraftEducation = (value: unknown): NonNullable<CVDraftData['education']> =>
  readRows(value).map((item) => ({
    ...item,
    id: readText(item.id) || undefined,
    institution: readText(item.institution),
    degree: readText(item.degree) || undefined,
    fieldOfStudy: readText(item.fieldOfStudy) || undefined,
    field_of_study: readText(item.field_of_study) || undefined,
    startYear: typeof item.startYear === 'number' ? item.startYear : undefined,
    start_year: typeof item.start_year === 'string' || typeof item.start_year === 'number' ? item.start_year : undefined,
    endYear: typeof item.endYear === 'number' ? item.endYear : undefined,
    end_year: typeof item.end_year === 'string' || typeof item.end_year === 'number' ? item.end_year : undefined,
    graduationYear: typeof item.graduationYear === 'string' || typeof item.graduationYear === 'number' ? item.graduationYear : undefined,
    school: readText(item.school) || undefined,
    gpa: typeof item.gpa === 'number' ? item.gpa : undefined,
    gpa_scale: typeof item.gpa_scale === 'number' ? item.gpa_scale : undefined,
    gpaScale: typeof item.gpaScale === 'number' ? item.gpaScale : undefined,
    gpa_display: readText(item.gpa_display) || undefined,
    description: readText(item.description) || undefined,
    origin: readText(item.origin) || undefined,
  }));

const toEvidenceAttachment = (value: unknown): CVEvidenceAttachmentItem | null | undefined => {
  if (value === null) return null;
  const attachment = readRecord(value);
  if (!attachment) return undefined;
  const itemType = attachment.itemType ?? attachment.item_type;
  if (itemType !== 'CERTIFICATION' && itemType !== 'LANGUAGE') return undefined;
  const fileSize = attachment.fileSize ?? attachment.file_size;
  if (typeof fileSize !== 'number') return undefined;
  const attachmentId = readText(attachment.attachmentId) || readText(attachment.attachment_id);
  const cvId = readText(attachment.cvId) || readText(attachment.cv_id);
  const itemId = readText(attachment.itemId) || readText(attachment.item_id);
  const fileName = readText(attachment.fileName) || readText(attachment.file_name);
  const fileType = readText(attachment.fileType) || readText(attachment.file_type);
  const previewUrl = readText(attachment.previewUrl) || readText(attachment.preview_url);
  const createdAt = readText(attachment.createdAt) || readText(attachment.created_at);
  if (!attachmentId || !cvId || !itemId || !fileName || !fileType || !previewUrl || !createdAt) return undefined;
  return { attachmentId, cvId, itemType, itemId, fileName, fileSize, fileType, status: readText(attachment.status), previewUrl, createdAt };
};

const toDraftCertifications = (value: unknown): NonNullable<CVDraftData['certifications']> =>
  Array.isArray(value) ? value.flatMap((entry) => {
    if (typeof entry === 'string') return [{ name: entry }];
    const item = readRecord(entry);
    if (!item || typeof item.name !== 'string') return [];
    return [{
      ...item,
      id: readText(item.id) || undefined,
      name: item.name,
      issuer: readText(item.issuer) || undefined,
      issueDate: readText(item.issueDate) || undefined,
      date: readText(item.date) || undefined,
      credentialId: readText(item.credentialId) || undefined,
      credentialUrl: readText(item.credentialUrl) || undefined,
      attachment: toEvidenceAttachment(item.attachment),
      origin: readText(item.origin) || undefined,
    }];
  }) : [];

const toDraftLanguages = (value: unknown): NonNullable<CVDraftData['languages']> =>
  Array.isArray(value) ? value.flatMap((entry) => {
    if (typeof entry === 'string') return [{ language: entry }];
    const item = readRecord(entry);
    if (!item || typeof item.language !== 'string') return [];
    return [{
      ...item,
      id: readText(item.id) || undefined,
      language: item.language,
      name: readText(item.name) || undefined,
      proficiency: readText(item.proficiency) || undefined,
      proficiencyLevel: readText(item.proficiencyLevel) || undefined,
      proficiency_level: readText(item.proficiency_level) || undefined,
      score: readText(item.score) || undefined,
      attachment: toEvidenceAttachment(item.attachment),
      origin: readText(item.origin) || undefined,
    }];
  }) : [];

const toDraftSkills = (value: unknown): NonNullable<CVDraftData['skills']> =>
  Array.isArray(value) ? value.flatMap((entry) => {
    if (typeof entry === 'string') return [{ name: entry }];
    const item = readRecord(entry);
    if (!item || typeof item.name !== 'string') return [];
    return [{
      ...item,
      name: item.name,
      category: readText(item.category) || undefined,
      level: readText(item.level) || undefined,
      isCustom: typeof item.isCustom === 'boolean' ? item.isCustom : undefined,
      verified: typeof item.verified === 'boolean' ? item.verified : undefined,
      origin: readText(item.origin) || undefined,
    }];
  }) : [];

type ProvenanceValue<T = unknown> = {
  value: T;
  origin?: string | null;
};

const isProvenanceValue = (
  input: unknown
): input is ProvenanceValue<unknown> => {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return false;
  }

  const record = input as Record<string, unknown>;

  return (
    Object.prototype.hasOwnProperty.call(record, 'value') &&
    Object.prototype.hasOwnProperty.call(record, 'origin')
  );
};

const unwrapProvenanceDeep = (input: unknown): unknown => {
  if (Array.isArray(input)) {
    return input.map(unwrapProvenanceDeep);
  }

  if (isProvenanceValue(input)) {
    return unwrapProvenanceDeep(input.value);
  }

  if (input !== null && typeof input === 'object') {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(
      input as Record<string, unknown>
    )) {
      result[key] = unwrapProvenanceDeep(value);
    }

    return result;
  }

  return input;
};

const toPersonalInfo = (value: unknown): CVPersonalInfo | undefined => {
  const record = readRecord(value);
  if (!record) return undefined;
  return {
    ...record,
    fullName: readText(record.fullName) || readText(record.full_name) || undefined,
    full_name: readText(record.full_name) || readText(record.fullName) || undefined,
    headline: readText(record.headline) || undefined,
    title: readText(record.title) || undefined,
    email: readText(record.email) || undefined,
    phone: readText(record.phone) || undefined,
    address: readText(record.address) || undefined,
    location: readText(record.location) || undefined,
    githubUrl: readText(record.githubUrl) || undefined,
    github_url: readText(record.github_url) || undefined,
    linkedinUrl: readText(record.linkedinUrl) || undefined,
    linkedin_url: readText(record.linkedin_url) || undefined,
  };
};

const toStructuredItem = (value: unknown): CVStructuredItem | null => {
  const record = readRecord(value);
  if (!record) return null;
  return {
    ...record,
    id: readText(record.id) || undefined,
    name: readText(record.name) || undefined,
    company: readText(record.company) || undefined,
    role: readText(record.role) || undefined,
    title: readText(record.title) || undefined,
    position: readText(record.position) || undefined,
    institution: readText(record.institution) || undefined,
    degree: readText(record.degree) || undefined,
    issuer: readText(record.issuer) || undefined,
    language: readText(record.language) || undefined,
    description: readText(record.description) || undefined,
    start_date: readText(record.start_date) || undefined,
    end_date: readText(record.end_date) || undefined,
    technologies: readTechnologies(record.technologies),
    techStack: readTechnologies(record.techStack),
    tech_stack: readTechnologies(record.tech_stack),
  };
};

const toStructuredItems = (value: unknown): CVStructuredItem[] =>
  readRows(value).map(toStructuredItem).filter((item): item is CVStructuredItem => item !== null);

const toCVStructuredData = (value: unknown): CVStructuredData | undefined => {
  const record = readRecord(value);
  if (!record) return undefined;
  const result: CVStructuredData = {};
  for (const [key, entry] of Object.entries(record)) result[key] = entry;
  result.personalInfo = toPersonalInfo(record.personalInfo);
  result.personal_info = toPersonalInfo(record.personal_info);
  result.fullName = readText(record.fullName) || undefined;
  result.full_name = readText(record.full_name) || undefined;
  result.name = readText(record.name) || undefined;
  result.headline = readText(record.headline) || undefined;
  result.targetRole = readText(record.targetRole) || undefined;
  result.target_role = readText(record.target_role) || undefined;
  result.email = readText(record.email) || undefined;
  result.phone = readText(record.phone) || undefined;
  result.address = readText(record.address) || undefined;
  result.githubUrl = readText(record.githubUrl) || undefined;
  result.linkedinUrl = readText(record.linkedinUrl) || undefined;
  result.summary = readText(record.summary) || undefined;
  result.schema_version = readText(record.schema_version) || undefined;
  result.skills = Array.isArray(record.skills)
    ? record.skills.flatMap<(string | CVStructuredItem)>((skill) => {
      if (typeof skill === 'string') return [skill];
      const structuredItem = toStructuredItem(skill);
      return structuredItem ? [structuredItem] : [];
    })
    : undefined;
  result.experience = toStructuredItems(record.experience);
  result.experiences = toStructuredItems(record.experiences);
  result.projects = toStructuredItems(record.projects);
  result.education = toStructuredItems(record.education);
  result.educations = toStructuredItems(record.educations);
  result.certifications = toStructuredItems(record.certifications);
  result.languages = toStructuredItems(record.languages);
  return result;
};

const normalizeReviewResponse = (
  review: CVReviewData
): CVReviewData => {
  return {
    ...review,
    structured: toCVStructuredData(unwrapProvenanceDeep(review.structured))
  };
};

const isProcessingStatus = (status?: string | null): boolean => {
  return status === 'PROCESSING' || status === 'PENDING';
};

const isCompletedStatus = (status?: string | null): boolean => {
  return (
    status === 'READY' ||
    status === 'EXTRACTED' ||
    status === 'CONFIRMED'
  );
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidUuid = (value: unknown): value is string => {
  return typeof value === 'string' && UUID_PATTERN.test(value);
};

const createStableItemId = (): string => {
  return crypto.randomUUID();
};

const hasReviewableProfessionalContent = (draft: CVDraftData | null): boolean => {
  if (!draft) return false;
  const ignoredKeys = new Set(['id', 'origin', 'source', 'evidence', 'raw_structured', 'warnings', 'attachment', 'attachment_id', 'attachmentId', 'url', 'verificationStatus', 'status']);
  const containsText = (value: unknown): boolean => {
    if (typeof value === 'string') return value.replace(/<[^>]*>/g, ' ').trim().length > 0;
    if (typeof value === 'number') return true;
    if (Array.isArray(value)) return value.some(containsText);
    const record = readRecord(value);
    if (!record) return false;
    if ('value' in record) return containsText(record.value);
    return Object.entries(record).some(([key, entry]) => !ignoredKeys.has(key) && containsText(entry));
  };
  return [draft.summary, draft.skills, draft.work_experience, draft.projects, draft.education, draft.certifications, draft.languages]
    .some(containsText);
};

const normalizeDraftEvidenceItemIds = (
  sourceDraft: CVDraftData
): CVDraftData => {
  const certifications: unknown[] = sourceDraft.certifications || [];
  const languages: unknown[] = sourceDraft.languages || [];
  return {
    ...sourceDraft,
    certifications: certifications.map((value) => {
      const item = readRecord(value);
      if (typeof value === 'string') {
        return {
          id: createStableItemId(),
          name: value
        };
      }

      return {
        ...(item || {}),
        id: isValidUuid(item?.id) ? item.id : createStableItemId(),
        name: readText(item?.name),
      };
    }),
    languages: languages.map((value) => {
      const item = readRecord(value);
      if (typeof value === 'string') {
        return {
          id: createStableItemId(),
          language: value
        };
      }

      return {
        ...(item || {}),
        id: isValidUuid(item?.id) ? item.id : createStableItemId(),
        language: readText(item?.language),
      };
    })
  };
};

const CVExtractionReviewModalContent: React.FC<CVExtractionReviewModalProps> = ({
  cvId,
  isOpen,
  onClose,
  onCvUpdated
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [data, setData] = useState<CVReviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  // Edit & Draft state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draft, setDraft] = useState<CVDraftData | null>(null);
  const [initialDraftSnapshot, setInitialDraftSnapshot] = useState<CVDraftData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const { locale } = useLanguage();
  const isVi = locale === 'vi';
  const currentDraftRef = useRef<CVDraftData | null>(null);
  const savedDraftRef = useRef<CVDraftData | null>(null);
  const saveInFlight = useRef(false);
  const loadReviewAndDraftRef = React.useRef<() => Promise<void>>(async () => undefined);

  const loadReviewAndDraft = async () => {
    try {
      const initialResponse = await fetchCVReview(cvId);
      const review = await waitForReviewCompletion(cvId, initialResponse);

      setData(review);

      if (review.status === 'FAILED') {
        const reviewWithError = review as CVReviewData & {
          errorMessage?: string;
        };

        setErrorMessage(
          reviewWithError.errorMessage ||
          'Quá trình trích xuất CV đã thất bại.'
        );
        return;
      }

      try {
        const rawDraftResponse = await fetchCVDraft(cvId);
        const normalizedDraftResponse = unwrapProvenanceDeep(rawDraftResponse);

        if (normalizedDraftResponse) {
          const formattedDraft = normalizeDraftEvidenceItemIds(initializeDraftFromResponse(
            normalizedDraftResponse,
            review
          ));

          setDraft(formattedDraft);
          currentDraftRef.current = formattedDraft;
          setInitialDraftSnapshot(structuredClone(formattedDraft));
          savedDraftRef.current = structuredClone(formattedDraft);
        } else {
          const fallbackDraft = normalizeDraftEvidenceItemIds(initializeDraftFromReview(review));
          setDraft(fallbackDraft);
          currentDraftRef.current = fallbackDraft;
          setInitialDraftSnapshot(structuredClone(fallbackDraft));
          savedDraftRef.current = structuredClone(fallbackDraft);
        }
      } catch (draftError) {
        console.warn('[CV_DRAFT_LOAD_FAILED]', { cvId, error: draftError });

        const fallbackDraft = normalizeDraftEvidenceItemIds(initializeDraftFromReview(review));
        setDraft(fallbackDraft);
        currentDraftRef.current = fallbackDraft;
        setInitialDraftSnapshot(structuredClone(fallbackDraft));
        savedDraftRef.current = structuredClone(fallbackDraft);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Không thể tải kết quả trích xuất CV.';

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeDraftFromResponse = (
    draftResponse: unknown,
    reviewResponse: CVReviewData | null
  ): CVDraftData => {
    const draftRes = readRecord(unwrapProvenanceDeep(draftResponse)) || {};
    const review = reviewResponse
      ? normalizeReviewResponse(reviewResponse)
      : null;

    return {
      cv_id: cvId,
      profile_id: readText(draftRes.profile_id) || undefined,
      version_id: readText(draftRes.version_id) || undefined,
      version_number: typeof draftRes.version_number === 'number' ? draftRes.version_number : undefined,
      title: readText(draftRes.title) || review?.title || 'Hồ sơ CV',
      status: readText(draftRes.status) || review?.status || 'DRAFT',
      confirmed_at: readText(draftRes.confirmed_at) || undefined,
      personal_info: toPersonalInfo(draftRes.personal_info) || {
        fullName: review?.structured?.personalInfo?.fullName || review?.structured?.personal_info?.fullName || review?.structured?.personalInfo?.full_name || review?.structured?.fullName || review?.structured?.full_name || review?.structured?.name || '',
        headline: review?.structured?.personalInfo?.headline || review?.structured?.personal_info?.headline || review?.structured?.headline || review?.structured?.targetRole || review?.structured?.target_role || '',
        email: review?.structured?.personalInfo?.email || review?.structured?.personal_info?.email || review?.structured?.email || '',
        phone: review?.structured?.personalInfo?.phone || review?.structured?.personal_info?.phone || review?.structured?.phone || '',
        address: review?.structured?.personalInfo?.address || review?.structured?.personal_info?.address || review?.structured?.address || '',
        githubUrl: review?.structured?.personalInfo?.githubUrl || review?.structured?.personal_info?.githubUrl || review?.structured?.githubUrl || '',
        linkedinUrl: review?.structured?.personalInfo?.linkedinUrl || review?.structured?.personal_info?.linkedinUrl || review?.structured?.linkedinUrl || ''
      },
      summary: typeof draftRes.summary === 'string'
        ? { content: draftRes.summary }
        : readRecord(draftRes.summary)
          ? { content: readText(readRecord(draftRes.summary)?.content) || readText(readRecord(draftRes.summary)?.text) }
          : { content: review?.structured?.summary || '' },
      skills: toDraftSkills(draftRes.skills ?? review?.structured?.skills),
      work_experience: toDraftWorkExperience(draftRes.work_experience ?? review?.structured?.experience ?? review?.structured?.experiences),
      projects: toDraftProjects(draftRes.projects ?? review?.structured?.projects),
      education: toDraftEducation(draftRes.education ?? review?.structured?.education ?? review?.structured?.educations),
      certifications: toDraftCertifications(draftRes.certifications ?? review?.structured?.certifications),
      languages: toDraftLanguages(draftRes.languages ?? review?.structured?.languages)
    };
  };

  const initializeDraftFromReview = (
    reviewResponse: CVReviewData
  ): CVDraftData => {
    const review = normalizeReviewResponse(reviewResponse);
    const structured = review.structured || {};
    const personalInfo = structured.personalInfo || structured.personal_info || {};
    return {
      cv_id: cvId,
      title: review.title || 'Hồ sơ CV',
      status: review.status || 'DRAFT',
      personal_info: {
        fullName: personalInfo.fullName || personalInfo.full_name || structured.personalInfo?.fullName || structured.personal_info?.full_name || structured.fullName || structured.full_name || structured.name || '',
        headline: personalInfo.headline || personalInfo.title || structured.personalInfo?.headline || structured.personal_info?.headline || structured.headline || structured.targetRole || structured.target_role || '',
        email: personalInfo.email || structured.personalInfo?.email || structured.email || '',
        phone: personalInfo.phone || structured.personalInfo?.phone || structured.phone || '',
        address: personalInfo.address || personalInfo.location || structured.personalInfo?.address || structured.address || '',
        githubUrl: personalInfo.githubUrl || personalInfo.github_url || structured.personalInfo?.githubUrl || structured.githubUrl || '',
        linkedinUrl: personalInfo.linkedinUrl || personalInfo.linkedin_url || structured.personalInfo?.linkedinUrl || structured.linkedinUrl || ''
      },
      summary: {
        content: structured.summary || ''
      },
      skills: toDraftSkills(structured.skills),
      work_experience: toDraftWorkExperience(structured.experience ?? structured.experiences),
      projects: toDraftProjects(structured.projects),
      education: toDraftEducation(structured.education ?? structured.educations),
      certifications: toDraftCertifications(structured.certifications),
      languages: toDraftLanguages(structured.languages)
    };
  };

  useEffect(() => {
    loadReviewAndDraftRef.current = loadReviewAndDraft;
  });

  useEffect(() => {
    if (!isOpen || !cvId) return;
    const timer = window.setTimeout(() => { void loadReviewAndDraftRef.current(); }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, cvId]);

  useEffect(() => {
    if (!isOpen || !hasUnsavedChanges) return;
    const guardPageExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Required for browsers that still use returnValue to show the native prompt.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guardPageExit);
    return () => window.removeEventListener('beforeunload', guardPageExit);
  }, [isOpen, hasUnsavedChanges]);

  const handleRetry = async () => {
    if (isRetrying || isProcessingStatus(data?.status)) {
      return;
    }

    setIsRetrying(true);
    setErrorMessage(null);

    try {
      await retryCVExtraction(cvId);

      await loadReviewAndDraft();

      if (onCvUpdated) {
        onCvUpdated();
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Không thể thử lại trích xuất CV.';

      setErrorMessage(message);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDownload = async (format: 'raw' | 'json' | 'original') => {
    if (!data) return;
    setDownloadingFormat(format);
    try {
      const base = data.title || 'cv';
      const fallbackName =
        format === 'raw'
          ? `${base}_raw.txt`
          : format === 'json'
            ? `${base}_structured.json`
            : data.fileName || `${base}.pdf`;
      await downloadCVFile(cvId, format, fallbackName);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi tải tập tin.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const markDraftDirty = (updatedDraft: CVDraftData) => {
    setDraft(updatedDraft);
    currentDraftRef.current = updatedDraft;
    const isDirty = !savedDraftRef.current || JSON.stringify(updatedDraft) !== JSON.stringify(savedDraftRef.current);
    setHasUnsavedChanges(isDirty);
    setSaveStatus(isDirty ? 'dirty' : 'saved');
    setSaveError(null);
  };

  const persistDraft = async (submitted: CVDraftData): Promise<boolean> => {
    if (saveInFlight.current) return false;
    const submittedSnapshot = structuredClone(normalizeDraftEvidenceItemIds(submitted));
    saveInFlight.current = true;
    setIsSavingDraft(true);
    setSaveStatus('saving');
    setSaveError(null);
    try {
      await updateCVDraft(cvId, submittedSnapshot);
      setInitialDraftSnapshot(submittedSnapshot);
      savedDraftRef.current = submittedSnapshot;
      const hasNewerEdits = JSON.stringify(currentDraftRef.current) !== JSON.stringify(submittedSnapshot);
      setHasUnsavedChanges(hasNewerEdits);
      setSaveStatus(hasNewerEdits ? 'dirty' : 'saved');
      setShowSaveToast(true);
      window.setTimeout(() => setShowSaveToast(false), 2400);
      if (onCvUpdated) onCvUpdated();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể lưu bản nháp hồ sơ.';
      setSaveError(message);
      setSaveStatus('error');
      return false;
    } finally {
      saveInFlight.current = false;
      setIsSavingDraft(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!draft || !hasUnsavedChanges || saveInFlight.current) return;
    await persistDraft(draft);
  };

  const handleCancelChanges = () => {
    if (hasUnsavedChanges) {
      const confirmDiscard = window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn hủy bỏ các thay đổi gần nhất không?');
      if (!confirmDiscard) return;
    }
    if (initialDraftSnapshot) {
      setDraft(structuredClone(initialDraftSnapshot));
      currentDraftRef.current = structuredClone(initialDraftSnapshot);
      savedDraftRef.current = structuredClone(initialDraftSnapshot);
    }
    setHasUnsavedChanges(false);
    setSaveStatus('saved');
    setSaveError(null);
  };

  const handleCloseModal = () => {
    if (showConfirmModal) {
      setShowConfirmModal(false);
      setConfirmError(null);
      return;
    }
    if (isSavingDraft || isConfirming) return;
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm('Bạn có thay đổi bản nháp chưa lưu. Bạn có chắc chắn muốn đóng mà không lưu không?');
      if (!confirmClose) return;
    }
    onClose();
  };

  const handleOpenConfirmDialog = () => {
    if (currentProfile?.status === 'CONFIRMED') return;
    if (!hasReviewableProfessionalContent(draft)) {
      alert(isVi ? 'Hãy thêm nội dung nghề nghiệp trước khi xác nhận hồ sơ.' : 'Add professional content before confirming this CV.');
      return;
    }
    setConfirmError(null);
    setShowConfirmModal(true);
  };

  const handleConfirmProfile = async () => {
    if (isConfirming) return;
    if (!hasReviewableProfessionalContent(draft)) {
      setConfirmError(isVi ? 'Hãy thêm nội dung nghề nghiệp trước khi xác nhận hồ sơ.' : 'Add professional content before confirming this CV.');
      return;
    }
    setIsConfirming(true);
    try {
      if (draft && hasUnsavedChanges) {
        const saved = await persistDraft(draft);
        if (!saved) return;
        if (JSON.stringify(currentDraftRef.current) !== JSON.stringify(savedDraftRef.current)) {
          setConfirmError(isVi
            ? 'Có thay đổi mới trong lúc lưu. Hãy lưu lại rồi xác nhận phiên bản mới nhất.'
            : 'New edits were made while saving. Save again before confirming the latest version.');
          return;
        }
      }
      await confirmCandidateCV(cvId);
      setShowConfirmModal(false);
      setConfirmError(null);
      setIsEditing(false);
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      await loadReviewAndDraft();
      if (onCvUpdated) onCvUpdated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi khi xác nhận hồ sơ CV.';
      setConfirmError(message);
    } finally {
      setIsConfirming(false);
    }
  };

  if (!isOpen) return null;

  const currentProfile = draft || (data ? initializeDraftFromReview(data) : null);
  const personalInfo = currentProfile?.personal_info || {};
  const summaryContent = typeof currentProfile?.summary === 'string'
    ? currentProfile.summary
    : currentProfile?.summary?.content || '';
  const skillsList = currentProfile?.skills || [];
  const experiences = currentProfile?.work_experience || [];
  const projects = currentProfile?.projects || [];
  const educations = currentProfile?.education || [];
  const certifications = currentProfile?.certifications || [];
  const languages = currentProfile?.languages || [];

  const structured = data?.structured || {};
  const evidences = data?.evidences || [];
  const unverifiedFacts = data?.unverifiedFacts || [];
  const warnings = data?.warnings || [];
  const pages = data?.pages || [];

  return (
    <AnimatedModalShell
      isOpen={isOpen}
      onRequestClose={handleCloseModal}
      titleId="cv-review-modal-title"
      descriptionId="cv-review-modal-description"
      testId="cv-review-modal"
      overlayClassName="p-3 sm:p-5 bg-slate-950/80 dark:bg-slate-950/80 backdrop-blur-md"
      panelClassName="relative bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100"
    >

        {showSaveToast && <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-6 right-6 z-[70] rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 shadow-lg">{isVi ? 'Đã lưu bản nháp' : 'Draft saved'}</div>}

        {/* Top Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-[var(--border)] flex flex-col gap-3 bg-slate-50/80 dark:bg-[var(--surface)]/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="cv-review-modal-title" className="text-base sm:text-lg font-bold truncate text-[var(--heading)] dark:text-white">
                  {data?.title || 'Đang tải dữ liệu hồ sơ...'}
                </h2>
                {currentProfile?.status && (
                  <span
                    className={`px-2.5 py-0.5 rounded-xl text-[10px] font-sans font-semibold uppercase tracking-wider ${currentProfile.status === 'CONFIRMED'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                      : currentProfile.status === 'READY'
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-800'
                        : currentProfile.status === 'FAILED'
                          ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                          : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                      }`}
                  >
                    {currentProfile.status === 'CONFIRMED' ? 'ĐÃ XÁC NHẬN' : currentProfile.status}
                  </span>
                )}
              </div>
              <p id="cv-review-modal-description" className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {data?.fileName ? `${data.fileName} (${((data.fileSize || 0) / 1024).toFixed(1)} KB)` : (isVi ? 'Chi tiết hồ sơ CV' : 'CV details')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex w-56 min-w-56 items-center gap-2 min-h-8 whitespace-nowrap" aria-live="polite" aria-atomic="true">
            <span className={`w-36 text-xs ${saveStatus === 'error' ? 'text-rose-600' : saveStatus === 'dirty' ? 'text-amber-600' : saveStatus === 'saving' ? 'text-blue-600' : 'text-emerald-600'}`}>
              {saveStatus === 'saving' ? (isVi ? 'Đang lưu…' : 'Saving…') : saveStatus === 'dirty' ? (isVi ? 'Chưa lưu thay đổi' : 'Unsaved changes') : saveStatus === 'error' ? (isVi ? 'Lưu thất bại' : 'Save failed') : (isVi ? 'Đã lưu' : 'Saved')}
            </span>
            {saveError && <button type="button" className="text-xs underline text-rose-600" onClick={() => void handleSaveDraft()}>{isVi ? 'Thử lại' : 'Retry'}</button>}
          </div>
          <div className="flex flex-wrap items-center gap-2">

            {!isEditing ? (
              <button
                onClick={() => {
                  setIsEditing(true);
                  setActiveTab('overview');
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Chỉnh sửa hồ sơ</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCancelChanges}
                  disabled={!hasUnsavedChanges || isSavingDraft || isConfirming}
                  aria-label={isVi ? 'Hủy thay đổi' : 'Discard changes'}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-[var(--border)] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[var(--surface)] transition flex items-center gap-1 cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Hủy thay đổi</span>
                </button>
                <button
                  onClick={handleSaveDraft}
                  disabled={!hasUnsavedChanges || isSavingDraft || isConfirming}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Save className={`w-3.5 h-3.5 ${isSavingDraft ? 'animate-spin' : ''}`} />
                  <span>{isSavingDraft ? (isVi ? 'Đang lưu…' : 'Saving…') : (isVi ? 'Lưu bản nháp' : 'Save draft')}</span>
                </button>
                <button
                  onClick={handleOpenConfirmDialog}
                  disabled={isSavingDraft || isConfirming}
                  aria-label={isVi ? 'Xác nhận hồ sơ' : 'Confirm CV'}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Xác nhận hồ sơ</span>
                </button>
              </div>
            )}

            <button
              onClick={handleRetry}
              disabled={
                isRetrying ||
                isEditing ||
                isProcessingStatus(data?.status)
              }
              title="Thử lại trích xuất CV"
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-[var(--border)] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[var(--surface)] transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">
                {isRetrying || isProcessingStatus(data?.status)
                  ? 'Đang phân tích...'
                  : 'Trích xuất lại'}
              </span>
            </button>

            <button
              onClick={handleCloseModal}
              disabled={isSavingDraft || isConfirming}
              data-autofocus="true"
              aria-label="Đóng chi tiết trích xuất CV"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[var(--surface)] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          </div>
        </div>

        {/* Tab Navigation & Action Bar */}
        <div className="px-6 py-2 border-b border-slate-200 dark:border-[var(--border)] flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[var(--surface)]">
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[var(--surface)]'
                }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{isVi ? 'Hồ sơ' : 'Profile'}</span>
            </button>

          </div>

          <details className="relative shrink-0">
            <summary className="list-none cursor-pointer rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-[var(--border)] dark:text-slate-200 dark:hover:bg-[var(--surface)]">Tùy chọn khác</summary>
            <div className="absolute right-0 top-full z-20 mt-2 flex min-w-64 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-[var(--border)] dark:bg-[var(--surface)]">
              <button type="button" onClick={() => setActiveTab('raw_text')} className="rounded-xl px-3 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-[var(--surface)]">Văn bản thô ({data?.rawText ? `${data.rawText.length} ký tự` : '0'})</button>
              <button type="button" onClick={() => setActiveTab('json')} className="rounded-xl px-3 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-[var(--surface)]">JSON trích xuất</button>
              <button type="button" onClick={() => setActiveTab('warnings')} className="rounded-xl px-3 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-[var(--surface)]">Cảnh báo & audit ({warnings.length + unverifiedFacts.length})</button>
              <div className="my-1 border-t border-slate-100 dark:border-[var(--border)]" />
              <button type="button" onClick={() => handleDownload('raw')} disabled={downloadingFormat !== null} className="rounded-xl px-3 py-2 text-left text-xs hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-[var(--surface)]">Tải raw.txt</button>
              <button type="button" onClick={() => handleDownload('json')} disabled={downloadingFormat !== null} className="rounded-xl px-3 py-2 text-left text-xs hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-[var(--surface)]">Tải structured.json</button>
              <button type="button" onClick={() => handleDownload('original')} disabled={downloadingFormat !== null} className="rounded-xl px-3 py-2 text-left text-xs hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-[var(--surface)]">Tải file gốc</button>
            </div>
          </details>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-[var(--surface)]/50" inert={isConfirming}>
          {isLoading ? (
            <AnimatedStatus stateKey="loading" isBusy className="h-full flex flex-col items-center justify-center space-y-3 py-16">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin motion-reduce:animate-none" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải và xử lý hồ sơ trích xuất...</p>
            </AnimatedStatus>
          ) : errorMessage ? (
            <AnimatedStatus stateKey="error" isError className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Trích xuất gặp sự cố</h4>
                <p className="text-xs mt-1">{errorMessage}</p>
                <button
                  onClick={handleRetry}
                  className="mt-3 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition"
                >
                  Thử lại trích xuất
                </button>
              </div>
            </AnimatedStatus>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & EDITABLE PROFILE */}
              {activeTab === 'overview' && (
                <div className="animate-fade-in space-y-6 max-w-5xl mx-auto">

                  {/* Personal Header Card */}
                  <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-[var(--heading)] dark:text-white">
                          {personalInfo.fullName || personalInfo.full_name || structured.personalInfo?.fullName || structured.personal_info?.full_name || structured.fullName || structured.full_name || structured.name || 'Chưa xác định họ tên'}
                        </h3>
                        {(personalInfo.address || structured.personalInfo?.address || structured.address) && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            📍 {personalInfo.address || structured.personalInfo?.address || structured.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 1. PERSONAL INFORMATION CARD */}
                  <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-[var(--border)] pb-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600" />
                        <h4 className="text-sm font-bold text-[var(--heading)] dark:text-white uppercase tracking-wider">
                          Thông tin cá nhân & Liên hệ
                        </h4>
                      </div>
                    </div>

                    {!isEditing ? (
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-bold text-[var(--heading)] dark:text-white">
                            {personalInfo.fullName || 'Chưa xác định họ tên'}
                          </h3>
                          {personalInfo.address && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{personalInfo.address}</span>
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col text-xs text-slate-600 dark:text-slate-300 space-y-1.5 sm:text-right">
                          {personalInfo.email && (
                            <div className="flex items-center sm:justify-end gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span>{personalInfo.email}</span>
                            </div>
                          )}
                          {personalInfo.phone && (
                            <div className="flex items-center sm:justify-end gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{personalInfo.phone}</span>
                            </div>
                          )}
                          {personalInfo.linkedinUrl && (
                            <a
                              href={normalizeExternalUrl(personalInfo.linkedinUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center sm:justify-end gap-1"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              <span>LinkedIn</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {personalInfo.githubUrl && (
                            <a
                              href={normalizeExternalUrl(personalInfo.githubUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center sm:justify-end gap-1"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              <span>GitHub</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Họ và tên <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={personalInfo.fullName || ''}
                            onChange={(e) => {
                              markDraftDirty({
                                ...draft!,
                                personal_info: { ...personalInfo, fullName: e.target.value }
                              });
                            }}
                            placeholder="Nhập họ và tên đầy đủ"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)] focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                          />
                        </div>


                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={personalInfo.email || ''}
                            onChange={(e) => {
                              markDraftDirty({
                                ...draft!,
                                personal_info: { ...personalInfo, email: e.target.value }
                              });
                            }}
                            placeholder="email@example.com"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)] focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Số điện thoại
                          </label>
                          <input
                            type="text"
                            value={personalInfo.phone || ''}
                            onChange={(e) => {
                              markDraftDirty({
                                ...draft!,
                                personal_info: { ...personalInfo, phone: e.target.value }
                              });
                            }}
                            placeholder="0912345678"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)] focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Địa chỉ / Khu vực
                          </label>
                          <input
                            type="text"
                            value={personalInfo.address || ''}
                            onChange={(e) => {
                              markDraftDirty({
                                ...draft!,
                                personal_info: { ...personalInfo, address: e.target.value }
                              });
                            }}
                            placeholder="Thành phố Hồ Chí Minh, Việt Nam"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)] focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            LinkedIn URL
                          </label>
                          <input
                            type="text"
                            value={personalInfo.linkedinUrl || ''}
                            onChange={(e) => {
                              markDraftDirty({
                                ...draft!,
                                personal_info: { ...personalInfo, linkedinUrl: e.target.value }
                              });
                            }}
                            placeholder="https://linkedin.com/in/..."
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)] focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            GitHub URL
                          </label>
                          <input
                            type="text"
                            value={personalInfo.githubUrl || ''}
                            onChange={(e) => {
                              markDraftDirty({
                                ...draft!,
                                personal_info: { ...personalInfo, githubUrl: e.target.value }
                              });
                            }}
                            placeholder="https://github.com/..."
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)] focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. SUMMARY (RICH TEXT) */}
                  <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-[var(--border)] pb-2">
                      <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Tóm tắt năng lực (Summary)
                      </h4>
                    </div>

                    {!isEditing ? (
                      summaryContent ? (
                        <div
                          className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed prose dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: summaryContent }}
                        />
                      ) : (
                        <p className="text-xs text-slate-400">Không có tóm tắt năng lực.</p>
                      )
                    ) : (
                      <div>
                        <RichTextEditor
                          value={summaryContent}
                          onChange={(newVal) => {
                            markDraftDirty({
                              ...draft!,
                              summary: { content: newVal }
                            });
                          }}
                          placeholder="Viết tóm tắt ngắn về kinh nghiệm, thế mạnh kỹ thuật và mục tiêu nghề nghiệp..."
                        />
                      </div>
                    )}
                  </div>

                  {/* 3. OVERALL SKILLS (TAGS WITH AUTOCOMPLETE) */}
                  <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-[var(--heading)] dark:text-white uppercase tracking-wider">
                        Kỹ năng chuyên môn ({skillsList.length})
                      </h4>
                    </div>

                    {!isEditing ? (
                      skillsList.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {skillsList.map((s, idx) => {
                            const skillName = s.name;
                            const isCustom = s.isCustom === true;
                            return (
                              <span
                                key={idx}
                                className={`px-3 py-1 rounded-xl text-xs font-medium border flex items-center gap-1.5 ${isCustom
                                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/40'
                                  }`}
                              >
                                <span>{skillName}</span>
                                {isCustom && (
                                  <span className="text-[10px] text-amber-500 font-normal">(tùy chỉnh)</span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">Không tìm thấy kỹ năng nào.</p>
                      )
                    ) : (
                      <div>
                        <p className="text-xs text-slate-500 mb-2">
                          Tìm kiếm trong Taxonomy kỹ năng chuẩn hoặc thêm kỹ năng tùy chỉnh:
                        </p>
                        <SkillAutocomplete
                          skills={skillsList}
                          onChange={(newSkills) => {
                            markDraftDirty({
                              ...draft!,
                              skills: newSkills
                            });
                          }}
                          placeholder="Nhập tên kỹ năng (ví dụ: Java, Docker, React, Spring Boot...)"
                        />
                      </div>
                    )}
                  </div>

                  {/* 4. WORK EXPERIENCE TIMELINE & CARDS */}
                  <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-[var(--border)] pb-3">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-blue-600" />
                        <h4 className="text-sm font-bold text-[var(--heading)] dark:text-white uppercase tracking-wider">
                          Kinh nghiệm làm việc ({experiences.length})
                        </h4>
                      </div>
                      {isEditing && (
                        <button
                          onClick={() => {
                            const newExps = [
                              ...experiences,
                              {
                                id: `exp_${Date.now()}`,
                                company: '',
                                role: '',
                                start_date: '',
                                end_date: '',
                                is_current: false,
                                description: '',
                                technologies: []
                              }
                            ];
                            markDraftDirty({ ...draft!, work_experience: newExps });
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm kinh nghiệm</span>
                        </button>
                      )}
                    </div>

                    {experiences.length > 0 ? (
                      <div className="space-y-4">
                        {experiences.map((exp, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-xl border border-slate-200 dark:border-[var(--border)] bg-slate-50/50 dark:bg-[var(--surface)]/50 space-y-3"
                          >
                            {!isEditing ? (
                              <>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                  <div className="font-semibold text-sm text-[var(--heading)] dark:text-white">
                                    {exp.role || exp.position || 'Chức danh'} {exp.company ? `@ ${exp.company}` : ''}
                                  </div>
                                  <div className="text-xs font-sans text-slate-500">
                                    {exp.start_date || exp.startDate || 'N/A'} — {exp.is_current ? 'Hiện tại' : (exp.end_date || exp.endDate || 'Hiện tại')}
                                  </div>
                                </div>
                                {exp.description && (
                                  <div
                                    className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed prose dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: exp.description }}
                                  />
                                )}
                                {Array.isArray(exp.technologies) && exp.technologies.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {exp.technologies.map((t, tidx) => (
                                      <span
                                        key={tidx}
                                        className="px-2 py-0.5 rounded-xl text-[11px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40"
                                      >
                                        {technologyName(t)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-200 dark:border-[var(--border)] pb-2">
                                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                    Kinh nghiệm #{idx + 1}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => {
                                        const copy = [...experiences];
                                        const temp = copy[idx - 1];
                                        copy[idx - 1] = copy[idx];
                                        copy[idx] = temp;
                                        markDraftDirty({ ...draft!, work_experience: copy });
                                      }}
                                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                      title="Di chuyển lên"
                                    >
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === experiences.length - 1}
                                      onClick={() => {
                                        const copy = [...experiences];
                                        const temp = copy[idx + 1];
                                        copy[idx + 1] = copy[idx];
                                        copy[idx] = temp;
                                        markDraftDirty({ ...draft!, work_experience: copy });
                                      }}
                                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                      title="Di chuyển xuống"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const copy = experiences.filter((_, i) => i !== idx);
                                        markDraftDirty({ ...draft!, work_experience: copy });
                                      }}
                                      className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition ml-2"
                                      title="Xóa kinh nghiệm này"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                      Công ty
                                    </label>
                                    <input
                                      type="text"
                                      value={exp.company || ''}
                                      onChange={(e) => {
                                        const copy = [...experiences];
                                        copy[idx] = { ...copy[idx], company: e.target.value };
                                        markDraftDirty({ ...draft!, work_experience: copy });
                                      }}
                                      placeholder="Tên công ty"
                                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                      Chức danh / Vai trò
                                    </label>
                                    <input
                                      type="text"
                                      value={exp.role || exp.position || ''}
                                      onChange={(e) => {
                                        const copy = [...experiences];
                                        copy[idx] = { ...copy[idx], role: e.target.value, position: e.target.value };
                                        markDraftDirty({ ...draft!, work_experience: copy });
                                      }}
                                      placeholder="Software Engineer, Team Leader..."
                                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                      Thời gian bắt đầu
                                    </label>
                                    <input
                                      type="text"
                                      value={exp.start_date || exp.startDate || ''}
                                      onChange={(e) => {
                                        const copy = [...experiences];
                                        copy[idx] = { ...copy[idx], start_date: e.target.value };
                                        markDraftDirty({ ...draft!, work_experience: copy });
                                      }}
                                      placeholder="MM/YYYY hoặc YYYY"
                                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                      Thời gian kết thúc
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        disabled={exp.is_current}
                                        value={exp.is_current ? 'Hiện tại' : (exp.end_date || exp.endDate || '')}
                                        onChange={(e) => {
                                          const copy = [...experiences];
                                          copy[idx] = { ...copy[idx], end_date: e.target.value };
                                          markDraftDirty({ ...draft!, work_experience: copy });
                                        }}
                                        placeholder="MM/YYYY hoặc Hiện tại"
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)] disabled:opacity-60"
                                      />
                                      <label className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={!!exp.is_current}
                                          onChange={(e) => {
                                            const copy = [...experiences];
                                            copy[idx] = { ...copy[idx], is_current: e.target.checked };
                                            markDraftDirty({ ...draft!, work_experience: copy });
                                          }}
                                          className="rounded"
                                        />
                                        <span>Đang làm</span>
                                      </label>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                    Mô tả công việc & Thành tựu
                                  </label>
                                  <RichTextEditor
                                    value={exp.description || ''}
                                    onChange={(newVal) => {
                                      const copy = [...experiences];
                                      copy[idx] = { ...copy[idx], description: newVal };
                                      markDraftDirty({ ...draft!, work_experience: copy });
                                    }}
                                    placeholder="Chi tiết trách nhiệm, kết quả đo lường được..."
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                    Công nghệ & Kỹ năng liên quan
                                  </label>
                                  <SkillAutocomplete
                                    skills={toSkillChoices(exp.technologies || [])}
                                    onChange={(newSkills) => {
                                      const copy = [...experiences];
                                      copy[idx] = { ...copy[idx], technologies: newSkills.map(s => s.name) };
                                      markDraftDirty({ ...draft!, work_experience: copy });
                                    }}
                                    placeholder="Thêm công nghệ được sử dụng..."
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Chưa ghi nhận kinh nghiệm làm việc.</p>
                    )}
                  </div>

                  {/* 5. PROJECTS CARDS */}
                  <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-[var(--border)] pb-3">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-600" />
                        <h4 className="text-sm font-bold text-[var(--heading)] dark:text-white uppercase tracking-wider">
                          Dự án ({projects.length})
                        </h4>
                      </div>
                      {isEditing && (
                        <button
                          onClick={() => {
                            const newProjects = [
                              ...projects,
                              {
                                id: `proj_${Date.now()}`,
                                name: '',
                                role: '',
                                description: '',
                                techStack: []
                              }
                            ];
                            markDraftDirty({ ...draft!, projects: newProjects });
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm dự án</span>
                        </button>
                      )}
                    </div>

                    {projects.length > 0 ? (
                      <div className="space-y-4">
                        {projects.map((project, idx) => {
                          const techStack = Array.isArray(project.techStack)
                            ? project.techStack
                            : Array.isArray(project.tech_stack)
                              ? project.tech_stack
                              : [];

                          return (
                            <div
                              key={idx}
                              className="p-4 rounded-xl border border-slate-200 dark:border-[var(--border)] bg-slate-50/50 dark:bg-[var(--surface)]/50 space-y-3"
                            >
                              {!isEditing ? (
                                <>
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <div className="font-semibold text-sm text-[var(--heading)] dark:text-white">
                                      {project.name || 'Dự án chưa xác định tên'}
                                    </div>
                                    {project.role && (
                                      <div className="text-xs text-blue-600 dark:text-blue-400">
                                        Vai trò: {project.role}
                                      </div>
                                    )}
                                  </div>
                                  {project.description && (
                                    <div
                                      className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed prose dark:prose-invert max-w-none"
                                      dangerouslySetInnerHTML={{ __html: project.description }}
                                    />
                                  )}
                                  {techStack.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {techStack.map((technology, technologyIndex) => (
                                        <span
                                          key={technologyIndex}
                                          className="px-2 py-0.5 rounded-xl text-[11px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40"
                                        >
                                          {technologyName(technology)}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-[var(--border)] pb-2">
                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                      Dự án #{idx + 1}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        disabled={idx === 0}
                                        onClick={() => {
                                          const copy = [...projects];
                                          const temp = copy[idx - 1];
                                          copy[idx - 1] = copy[idx];
                                          copy[idx] = temp;
                                          markDraftDirty({ ...draft!, projects: copy });
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                        title="Di chuyển lên"
                                      >
                                        <ChevronUp className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={idx === projects.length - 1}
                                        onClick={() => {
                                          const copy = [...projects];
                                          const temp = copy[idx + 1];
                                          copy[idx + 1] = copy[idx];
                                          copy[idx] = temp;
                                          markDraftDirty({ ...draft!, projects: copy });
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                        title="Di chuyển xuống"
                                      >
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const copy = projects.filter((_, i) => i !== idx);
                                          markDraftDirty({ ...draft!, projects: copy });
                                        }}
                                        className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition ml-2"
                                        title="Xóa dự án"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                        Tên dự án
                                      </label>
                                      <input
                                        type="text"
                                        value={project.name || ''}
                                        onChange={(e) => {
                                          const copy = [...projects];
                                          copy[idx] = { ...copy[idx], name: e.target.value };
                                          markDraftDirty({ ...draft!, projects: copy });
                                        }}
                                        placeholder="Ví dụ: E-Commerce Platform"
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)]"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                        Vai trò
                                      </label>
                                      <input
                                        type="text"
                                        value={project.role || ''}
                                        onChange={(e) => {
                                          const copy = [...projects];
                                          copy[idx] = { ...copy[idx], role: e.target.value };
                                          markDraftDirty({ ...draft!, projects: copy });
                                        }}
                                        placeholder="Full-stack Developer, Tech Lead..."
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)]"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                      Mô tả dự án & Kết quả
                                    </label>
                                    <RichTextEditor
                                      value={project.description || ''}
                                      onChange={(newVal) => {
                                        const copy = [...projects];
                                        copy[idx] = { ...copy[idx], description: newVal };
                                        markDraftDirty({ ...draft!, projects: copy });
                                      }}
                                      placeholder="Mô tả phạm vi dự án, kiến trúc hệ thống và đóng góp của bạn..."
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                      Tech Stack dự án
                                    </label>
                                    <SkillAutocomplete
                                      skills={toSkillChoices(techStack || [])}
                                      onChange={(newSkills) => {
                                        const copy = [...projects];
                                        copy[idx] = { ...copy[idx], techStack: newSkills.map(s => s.name) };
                                        markDraftDirty({ ...draft!, projects: copy });
                                      }}
                                      placeholder="Thêm công nghệ được sử dụng trong dự án..."
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Không có thông tin dự án.</p>
                    )}
                  </div>

                  {/* 6. EDUCATION & GPA */}
                  <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-[var(--border)] pb-3">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-blue-600" />
                        <h4 className="text-sm font-bold text-[var(--heading)] dark:text-white uppercase tracking-wider">
                          Học vấn & Điểm số (GPA) ({educations.length})
                        </h4>
                      </div>
                      {isEditing && (
                        <button
                          onClick={() => {
                            const newEdus = [
                              ...educations,
                              {
                                id: `edu_${Date.now()}`,
                                institution: '',
                                degree: '',
                                fieldOfStudy: '',
                                startYear: undefined,
                                endYear: undefined,
                                gpa: undefined,
                                gpa_scale: 10,
                                gpa_display: undefined
                              }
                            ];
                            markDraftDirty({ ...draft!, education: newEdus });
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm học vấn</span>
                        </button>
                      )}
                    </div>

                    {educations.length > 0 ? (
                      <div className="space-y-3">
                        {educations.map((edu, idx) => {
                          const hasGpa = edu.gpa != null || edu.gpa_display;
                          const gpaText = edu.gpa_display
                            ? edu.gpa_display
                            : edu.gpa != null
                              ? `${edu.gpa}${edu.gpa_scale || edu.gpaScale ? `/${edu.gpa_scale || edu.gpaScale}` : ''}`
                              : null;

                          return (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl border border-slate-200 dark:border-[var(--border)] bg-slate-50/50 dark:bg-[var(--surface)]/50 space-y-2"
                            >
                              {!isEditing ? (
                                <div className="space-y-1 text-xs">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                                      {edu.institution || edu.school || 'Cơ sở đào tạo'}
                                    </div>
                                    <div className="text-[11px] font-sans text-slate-400">
                                      {edu.startYear || edu.start_year || 'N/A'} — {edu.endYear || edu.end_year || edu.graduationYear || 'Hiện tại'}
                                    </div>
                                  </div>

                                  <div className="text-slate-600 dark:text-slate-400">
                                    {edu.degree || 'Bằng cấp'}
                                    {(edu.fieldOfStudy || edu.field_of_study) ? ` — ${edu.fieldOfStudy || edu.field_of_study}` : ''}
                                  </div>

                                  {/* GPA Badge */}
                                  <div className="pt-1 flex items-center gap-2">
                                    <span className="text-[11px] text-slate-500 font-medium">Điểm trung bình (GPA):</span>
                                    {hasGpa ? (
                                      <span className="px-2 py-0.5 rounded-xl text-xs font-sans font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                                        {gpaText}
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-xl text-[11px] font-sans text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                        Không cung cấp GPA
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-[var(--border)] pb-2">
                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                      Học vấn #{idx + 1}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        disabled={idx === 0}
                                        onClick={() => {
                                          const copy = [...educations];
                                          const temp = copy[idx - 1];
                                          copy[idx - 1] = copy[idx];
                                          copy[idx] = temp;
                                          markDraftDirty({ ...draft!, education: copy });
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                      >
                                        <ChevronUp className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={idx === educations.length - 1}
                                        onClick={() => {
                                          const copy = [...educations];
                                          const temp = copy[idx + 1];
                                          copy[idx + 1] = copy[idx];
                                          copy[idx] = temp;
                                          markDraftDirty({ ...draft!, education: copy });
                                        }}
                                        className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                      >
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const copy = educations.filter((_, i) => i !== idx);
                                          markDraftDirty({ ...draft!, education: copy });
                                        }}
                                        className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 ml-2"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                        Trường / Cơ sở đào tạo
                                      </label>
                                      <input
                                        type="text"
                                        value={edu.institution || edu.school || ''}
                                        onChange={(e) => {
                                          const copy = [...educations];
                                          copy[idx] = { ...copy[idx], institution: e.target.value };
                                          markDraftDirty({ ...draft!, education: copy });
                                        }}
                                        placeholder="Ví dụ: Đại học Bách Khoa TP.HCM"
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)]"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                        Bằng cấp
                                      </label>
                                      <input
                                        type="text"
                                        value={edu.degree || ''}
                                        onChange={(e) => {
                                          const copy = [...educations];
                                          copy[idx] = { ...copy[idx], degree: e.target.value };
                                          markDraftDirty({ ...draft!, education: copy });
                                        }}
                                        placeholder="Cử nhân, Kỹ sư, Thạc sĩ..."
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)]"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                        Chuyên ngành
                                      </label>
                                      <input
                                        type="text"
                                        value={edu.fieldOfStudy || edu.field_of_study || ''}
                                        onChange={(e) => {
                                          const copy = [...educations];
                                          copy[idx] = { ...copy[idx], fieldOfStudy: e.target.value };
                                          markDraftDirty({ ...draft!, education: copy });
                                        }}
                                        placeholder="Công nghệ phần mềm..."
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)]"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                        Năm bắt đầu
                                      </label>
                                      <input
                                        type="number"
                                        value={edu.startYear || edu.start_year || ''}
                                        onChange={(e) => {
                                          const copy = [...educations];
                                          copy[idx] = { ...copy[idx], startYear: e.target.value ? Number(e.target.value) : undefined };
                                          markDraftDirty({ ...draft!, education: copy });
                                        }}
                                        placeholder="2020"
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)]"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                        Năm kết thúc / Tốt nghiệp
                                      </label>
                                      <input
                                        type="number"
                                        value={edu.endYear || edu.end_year || edu.graduationYear || ''}
                                        onChange={(e) => {
                                          const copy = [...educations];
                                          copy[idx] = { ...copy[idx], endYear: e.target.value ? Number(e.target.value) : undefined };
                                          markDraftDirty({ ...draft!, education: copy });
                                        }}
                                        placeholder="2024"
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)]"
                                      />
                                    </div>
                                  </div>

                                  {/* GPA inputs */}
                                  <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      <div>
                                        <label className="block text-[11px] font-semibold text-blue-900 dark:text-blue-300 mb-1">
                                          Điểm GPA (để trống nếu không có)
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          max="10"
                                          value={edu.gpa != null ? edu.gpa : ''}
                                          onChange={(e) => {
                                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                            const copy = [...educations];
                                            copy[idx] = {
                                              ...copy[idx],
                                              gpa: val,
                                              gpa_display: val != null
                                                ? `${val}/${copy[idx].gpa_scale || 10}`
                                                : undefined
                                            };
                                            markDraftDirty({ ...draft!, education: copy });
                                          }}
                                          placeholder="8.3 hoặc 3.6"
                                          className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)]"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[11px] font-semibold text-blue-900 dark:text-blue-300 mb-1">
                                          Thang điểm (Scale)
                                        </label>
                                        <select
                                          value={edu.gpa_scale || edu.gpaScale || 10}
                                          onChange={(e) => {
                                            const scale = parseFloat(e.target.value);
                                            const copy = [...educations];
                                            copy[idx] = {
                                              ...copy[idx],
                                              gpa_scale: scale,
                                              gpaScale: scale,
                                              gpa_display: copy[idx].gpa != null ? `${copy[idx].gpa}/${scale}` : undefined
                                            };
                                            markDraftDirty({ ...draft!, education: copy });
                                          }}
                                          className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)]"
                                        >
                                          <option value={10}>Thang điểm 10 (/10)</option>
                                          <option value={4}>Thang điểm 4 (/4.0)</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-[11px] font-semibold text-blue-900 dark:text-blue-300 mb-1">
                                          Hiển thị dự kiến
                                        </label>
                                        <div className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-sans">
                                          {edu.gpa != null ? `${edu.gpa}/${edu.gpa_scale || 10}` : 'Không cung cấp GPA'}
                                        </div>
                                      </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2">
                                      * Nguyên tắc: Nếu hồ sơ gốc không ghi GPA, vui lòng để trống giá trị để bảo toàn tính xác thực.
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Không có thông tin học vấn.</p>
                    )}
                  </div>

                  {/* 7. CERTIFICATIONS & EVIDENCE ATTACHMENT */}
                  <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-[var(--border)] pb-3">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-500" />
                        <h4 className="text-sm font-bold text-[var(--heading)] dark:text-white uppercase tracking-wider">
                          Chứng chỉ & Minh chứng đính kèm ({certifications.length})
                        </h4>
                      </div>
                      {isEditing && (
                        <button
                          onClick={() => {
                            const newCerts = [
                              ...certifications,
                              {
                                id: createStableItemId(),
                                name: '',
                                issuer: '',
                                issueDate: '',
                                credentialId: '',
                                credentialUrl: ''
                              }
                            ];
                            markDraftDirty({ ...draft!, certifications: newCerts });
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm chứng chỉ</span>
                        </button>
                      )}
                    </div>

                    {certifications.length > 0 ? (
                      <div className="space-y-3">
                        {certifications.map((c, idx) => {
                          const certId =
                            typeof c === 'object' && isValidUuid(c?.id)
                              ? c.id
                              : null;
                          const canUploadEvidence =
                            certId !== null && !hasUnsavedChanges;
                          const certName = typeof c === 'string' ? c : c.name;
                          const certIssuer = typeof c === 'object' ? c.issuer : null;

                          return (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl border border-slate-200 dark:border-[var(--border)] bg-slate-50/50 dark:bg-[var(--surface)]/50 space-y-3"
                            >
                              {!isEditing ? (
                                <div className="space-y-1.5 text-xs">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <div className="font-semibold text-slate-800 dark:text-slate-100">
                                      {certName} {certIssuer ? `(${certIssuer})` : ''}
                                    </div>
                                    {(c.issueDate || c.date) && (
                                      <div className="text-[11px] font-sans text-slate-400">
                                        Ngày cấp: {c.issueDate || c.date}
                                      </div>
                                    )}
                                  </div>

                                  {c.credentialUrl && (
                                    <a
                                      href={normalizeExternalUrl(c.credentialUrl)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                                    >
                                      <span>Xem chứng chỉ trực tuyến</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}

                                  {/* Evidence Attachment Control in View Mode */}
                                  <div className="pt-2 border-t border-slate-100 dark:border-[var(--border)]">
                                    {certId ? (
                                      <EvidenceAttachmentControl
                                        cvId={cvId}
                                        itemType="CERTIFICATION"
                                        itemId={certId}
                                        attachment={c.attachment}
                                        isEditable={false}
                                        onAttachmentChange={() => { }}
                                      />
                                    ) : (
                                      <p className="text-[11px] text-slate-400">
                                        Chứng chỉ chưa có mã lưu trữ hợp lệ nên chưa thể xem minh chứng.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-[var(--border)] pb-2">
                                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                      Chứng chỉ #{idx + 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const copy = certifications.filter((_, i) => i !== idx);
                                        markDraftDirty({ ...draft!, certifications: copy });
                                      }}
                                      className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                        Tên chứng chỉ
                                      </label>
                                      <input
                                        type="text"
                                        value={c.name || (typeof c === 'string' ? c : '')}
                                        onChange={(e) => {
                                          const copy = [...certifications];
                                          copy[idx] = { ...copy[idx], name: e.target.value };
                                          markDraftDirty({ ...draft!, certifications: copy });
                                        }}
                                        placeholder="Ví dụ: AWS Certified Solutions Architect"
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)]"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                        Tổ chức cấp
                                      </label>
                                      <input
                                        type="text"
                                        value={c.issuer || ''}
                                        onChange={(e) => {
                                          const copy = [...certifications];
                                          copy[idx] = { ...copy[idx], issuer: e.target.value };
                                          markDraftDirty({ ...draft!, certifications: copy });
                                        }}
                                        placeholder="Amazon Web Services, Coursera..."
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)]"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                        Ngày cấp
                                      </label>
                                      <input
                                        type="text"
                                        value={c.issueDate || c.date || ''}
                                        onChange={(e) => {
                                          const copy = [...certifications];
                                          copy[idx] = { ...copy[idx], issueDate: e.target.value };
                                          markDraftDirty({ ...draft!, certifications: copy });
                                        }}
                                        placeholder="MM/YYYY"
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)]"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                        Credential URL (nếu có)
                                      </label>
                                      <input
                                        type="text"
                                        value={c.credentialUrl || ''}
                                        onChange={(e) => {
                                          const copy = [...certifications];
                                          copy[idx] = { ...copy[idx], credentialUrl: e.target.value };
                                          markDraftDirty({ ...draft!, certifications: copy });
                                        }}
                                        placeholder="https://..."
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)]"
                                      />
                                    </div>
                                  </div>

                                  {/* Evidence Attachment Control in Edit Mode */}
                                  <div className="pt-2 border-t border-slate-200 dark:border-[var(--border)]">
                                    {canUploadEvidence && certId ? (
                                      <EvidenceAttachmentControl
                                        cvId={cvId}
                                        itemType="CERTIFICATION"
                                        itemId={certId}
                                        attachment={c.attachment}
                                        isEditable={true}
                                        onAttachmentChange={(updatedAttachment: CVEvidenceAttachmentItem | null) => {
                                          const copy = [...certifications];
                                          copy[idx] = { ...copy[idx], attachment: updatedAttachment };
                                          markDraftDirty({ ...draft!, certifications: copy });
                                        }}
                                      />
                                    ) : (
                                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                                        Vui lòng lưu bản nháp để hệ thống ghi nhận chứng chỉ trước khi tải minh chứng.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Không có chứng chỉ.</p>
                    )}
                  </div>

                  {/* 8. LANGUAGES & EVIDENCE ATTACHMENT */}
                  <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-[var(--border)] pb-3">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-emerald-500" />
                        <h4 className="text-sm font-bold text-[var(--heading)] dark:text-white uppercase tracking-wider">
                          Ngoại ngữ & Trình độ ({languages.length})
                        </h4>
                      </div>
                      {isEditing && (
                        <button
                          onClick={() => {
                            const newLangs = [
                              ...languages,
                              {
                                id: createStableItemId(),
                                language: '',
                                proficiency: 'Thành thạo (Professional)'
                              }
                            ];
                            markDraftDirty({ ...draft!, languages: newLangs });
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-100 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm ngoại ngữ</span>
                        </button>
                      )}
                    </div>

                    {languages.length > 0 ? (
                      <div className="space-y-3">
                        {languages.map((l, idx) => {
                          const langId =
                            typeof l === 'object' && isValidUuid(l?.id)
                              ? l.id
                              : null;
                          const canUploadEvidence =
                            langId !== null && !hasUnsavedChanges;
                          const langName = typeof l === 'string' ? l : l.language || l.name;
                          const prof = typeof l === 'object' ? l.proficiency || l.proficiencyLevel || l.proficiency_level : null;

                          return (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl border border-slate-200 dark:border-[var(--border)] bg-slate-50/50 dark:bg-[var(--surface)]/50 space-y-3"
                            >
                              {!isEditing ? (
                                <div className="space-y-1.5 text-xs">
                                  <div className="flex items-center justify-between">
                                    <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                      <span>{langName}</span>
                                      {prof && (
                                        <span className="px-2 py-0.5 rounded-xl text-[11px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                                          {prof}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Evidence Attachment Control in View Mode */}
                                  <div className="pt-2 border-t border-slate-100 dark:border-[var(--border)]">
                                    {langId ? (
                                      <EvidenceAttachmentControl
                                        cvId={cvId}
                                        itemType="LANGUAGE"
                                        itemId={langId}
                                        attachment={l.attachment}
                                        isEditable={false}
                                        onAttachmentChange={() => { }}
                                      />
                                    ) : (
                                      <p className="text-[11px] text-slate-400">
                                        Ngoại ngữ chưa có mã lưu trữ hợp lệ nên chưa thể xem minh chứng.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-[var(--border)] pb-2">
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                      Ngoại ngữ #{idx + 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const copy = languages.filter((_, i) => i !== idx);
                                        markDraftDirty({ ...draft!, languages: copy });
                                      }}
                                      className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                        Tên ngoại ngữ
                                      </label>
                                      <input
                                        type="text"
                                        value={l.language || l.name || (typeof l === 'string' ? l : '')}
                                        onChange={(e) => {
                                          const copy = [...languages];
                                          copy[idx] = { ...copy[idx], language: e.target.value };
                                          markDraftDirty({ ...draft!, languages: copy });
                                        }}
                                        placeholder="Ví dụ: Tiếng Anh, Tiếng Nhật..."
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)]"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                        Trình độ / Chứng chỉ
                                      </label>
                                      <input
                                        type="text"
                                        value={l.proficiency || l.proficiencyLevel || ''}
                                        onChange={(e) => {
                                          const copy = [...languages];
                                          copy[idx] = { ...copy[idx], proficiency: e.target.value };
                                          markDraftDirty({ ...draft!, languages: copy });
                                        }}
                                        placeholder="Ví dụ: IELTS 7.5, TOEIC 850, JLPT N2..."
                                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--surface)]"
                                      />
                                    </div>
                                  </div>

                                  {/* Evidence Attachment Control in Edit Mode */}
                                  <div className="pt-2 border-t border-slate-200 dark:border-[var(--border)]">
                                    {canUploadEvidence && langId ? (
                                      <EvidenceAttachmentControl
                                        cvId={cvId}
                                        itemType="LANGUAGE"
                                        itemId={langId}
                                        attachment={l.attachment}
                                        isEditable={true}
                                        onAttachmentChange={(updatedAttachment: CVEvidenceAttachmentItem | null) => {
                                          const copy = [...languages];
                                          copy[idx] = { ...copy[idx], attachment: updatedAttachment };
                                          markDraftDirty({ ...draft!, languages: copy });
                                        }}
                                      />
                                    ) : (
                                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                                        Vui lòng lưu bản nháp để hệ thống ghi nhận ngoại ngữ trước khi tải minh chứng.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Không có thông tin ngoại ngữ.</p>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 2: RAW TEXT (IMMUTABLE SNAPSHOT) */}
              {activeTab === 'raw_text' && (
                <div className="animate-fade-in space-y-4 max-w-5xl mx-auto">
                  <div className="flex items-center justify-between bg-white dark:bg-[var(--surface)] p-4 rounded-xl border border-slate-200 dark:border-[var(--border)]">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--heading)] dark:text-white flex items-center gap-2">
                        <Lock className="w-4 h-4 text-slate-400" />
                        <span>Văn bản trích xuất thô nguyên bản (Extraction Snapshot - Bất biến)</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {pages.length > 0
                          ? `Đã phân đoạn theo ${pages.length} trang/khối độc lập`
                          : 'Bản trích xuất thuần túy, bảo toàn nguồn'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopy(data?.rawText || '', 'raw_text')}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-[var(--border)] hover:bg-slate-100 dark:hover:bg-[var(--surface)] transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedType === 'raw_text' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Đã sao chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao chép toàn bộ</span>
                        </>
                      )}
                    </button>
                  </div>

                  {pages.length > 0 ? (
                    <div className="space-y-4">
                      {pages.map((p, idx) => (
                        <div
                          key={idx}
                          className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-4 shadow-xs space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[var(--border)] pb-2 text-xs">
                            <span className="font-bold text-blue-600 dark:text-blue-400 font-sans">
                              Trang {p.page_number}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-sans font-semibold uppercase ${p.used_ocr
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  }`}
                              >
                                {p.method}
                              </span>
                              {p.ocr_confidence != null && (
                                <span className="text-[10px] font-sans text-slate-500">
                                  OCR: {p.ocr_confidence.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                          <pre className="font-sans text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                            {p.text}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-4 shadow-xs">
                      <pre className="font-sans text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[65vh]">
                        {data?.rawText || 'Không có nội dung văn bản thô.'}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: EVIDENCE AUDIT */}
              {activeTab === 'evidence' && (
                <div className="animate-fade-in space-y-4 max-w-5xl mx-auto">
                  <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 p-4 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-[var(--heading)] dark:text-white">
                        Bằng chứng đối chiếu (Evidence Citations)
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Mỗi thực thể trích xuất được gắn kèm vị trí ký tự và trích dẫn nguyên văn trong văn bản gốc.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl text-xs font-sans bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                      {evidences.length} trích dẫn xác thực
                    </span>
                  </div>

                  {evidences.length > 0 ? (
                    <div className="space-y-3">
                      {evidences.map((ev, idx) => (
                        <div
                          key={idx}
                          className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-4 shadow-xs space-y-2"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-sans">
                              {ev.field_path}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] font-sans text-slate-500">
                              {(ev.page_number || ev.source_page) && (
                                <span>Trang {ev.page_number || ev.source_page}</span>
                              )}
                              {ev.start_char != null && (
                                <span>[{ev.start_char}..{ev.end_char}]</span>
                              )}
                              {(ev.method || ev.extraction_method) && (
                                <span className="uppercase">{ev.method || ev.extraction_method}</span>
                              )}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[var(--surface)] border border-slate-100 dark:border-[var(--border)]/60 text-xs text-slate-700 dark:text-slate-300 font-sans">
                            <span className="text-slate-400 mr-2">Trích dẫn:</span>
                            <span className="text-blue-700 dark:text-blue-300 font-medium">&quot;{ev.quote}&quot;</span>
                          </div>

                          {Boolean(ev.verbatim_value) && (
                            <div className="text-xs text-slate-500 flex items-center gap-2">
                              <span>Giá trị nguyên văn:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {typeof ev.verbatim_value === 'object' ? JSON.stringify(ev.verbatim_value) : String(ev.verbatim_value)}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white dark:bg-[var(--surface)] rounded-xl border border-slate-200 dark:border-[var(--border)]">
                      <p className="text-xs text-slate-400">Chưa ghi nhận bằng chứng đối chiếu cho hồ sơ này.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: STRUCTURED JSON SNAPSHOT */}
              {activeTab === 'json' && (
                <div className="animate-fade-in space-y-4 max-w-5xl mx-auto">
                  <div className="flex items-center justify-between bg-white dark:bg-[var(--surface)] p-4 rounded-xl border border-slate-200 dark:border-[var(--border)]">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--heading)] dark:text-white flex items-center gap-2">
                        <Lock className="w-4 h-4 text-slate-400" />
                        <span>{isVi ? 'Dữ liệu JSON đã trích xuất' : 'Extracted JSON data'}</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Schema version: {data?.structured?.schema_version || '2.0.0'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopy(JSON.stringify(data?.structured || {}, null, 2), 'json')}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-[var(--border)] hover:bg-slate-100 dark:hover:bg-[var(--surface)] transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedType === 'json' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Đã sao chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao chép JSON</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-[var(--retro-deep)] border border-slate-800 rounded-xl p-4 overflow-hidden">
                    <pre className="font-sans text-xs text-emerald-400 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[60vh]">
                      {JSON.stringify(data?.structured || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 5: WARNINGS & AUDIT */}
              {activeTab === 'warnings' && (
                <div className="animate-fade-in space-y-4 max-w-5xl mx-auto">

                  {/* Warnings List */}
                  <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <h4 className="text-sm font-bold text-[var(--heading)] dark:text-white uppercase tracking-wider">
                        Cảnh báo phát sinh ({warnings.length})
                      </h4>
                    </div>

                    {warnings.length > 0 ? (
                      <div className="space-y-2">
                        {warnings.map((w, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2"
                          >
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Không có cảnh báo trích xuất nào. Toàn bộ nội dung trích xuất đạt tiêu chuẩn.</span>
                      </p>
                    )}
                  </div>

                  <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-rose-500" />
                      <h4 className="text-sm font-bold text-[var(--heading)] dark:text-white uppercase tracking-wider">
                        Sự thật chưa được đối chiếu (Unverified Facts: {unverifiedFacts.length})
                      </h4>
                    </div>

                    {unverifiedFacts.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500">
                          Các trường dưới đây do LLM trích xuất nhưng không tìm thấy trích dẫn nguyên văn đối chiếu từ văn bản gốc, cần người dùng tự kiểm chứng:
                        </p>
                        {unverifiedFacts.map((uf, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 space-y-1"
                          >
                            <div className="font-sans font-semibold">{uf.field_path}</div>
                            <div className="text-[11px] font-sans">
                              Trích dẫn đề xuất: &quot;{uf.quote}&quot;
                            </div>
                            <div className="text-[11px] text-rose-600 dark:text-rose-400">
                              Lý do: {uf.reason || 'Trích dẫn không khớp chính xác chuỗi con trong raw text.'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Không có sự thật không đối chiếu. Toàn bộ các thực thể bóc tách đều có bằng chứng nguồn.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

            {/* CONFIRM PROFILE MODAL DIALOG */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[var(--surface)] border border-slate-200 dark:border-[var(--border)] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--heading)] dark:text-white">
                  Xác nhận hồ sơ chính thức
                </h3>
                <p className="text-xs text-slate-500">
                  Lưu phiên bản hồ sơ đã review để sử dụng
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xác nhận hồ sơ này? Sau khi xác nhận:
            </p>

            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-4">
              <li>Dữ liệu hồ sơ này sẽ được lưu thành phiên bản <strong>CONFIRMED</strong> chính thức.</li>
              <li>Engine AI Matching JD–CV sẽ sử dụng chính xác các kỹ năng, học vấn và kinh nghiệm đã được bạn xác nhận.</li>
              <li>Bản trích xuất raw text và JSON gốc của AI vẫn được bảo toàn nguyên vẹn.</li>
            </ul>

            {confirmError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{confirmError}</p>}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[var(--border)]">
              <button
                type="button"
                disabled={isConfirming}
                onClick={() => setShowConfirmModal(false)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-[var(--border)] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[var(--surface)] transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isConfirming}
                onClick={handleConfirmProfile}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isConfirming ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xác nhận...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Xác nhận ngay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </AnimatedModalShell>
  );
};

export const CVExtractionReviewModal: React.FC<CVExtractionReviewModalProps> = (props) =>
  props.isOpen
    ? <CVExtractionReviewModalContent key={props.cvId} {...props} />
    : null;
