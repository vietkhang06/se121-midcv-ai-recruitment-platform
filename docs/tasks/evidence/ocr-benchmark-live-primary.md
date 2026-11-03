# O03: real OCR + primary API proposal benchmark

Synthetic labelled documents; labels are independent and never sent to the provider. After = validated proposal preview, not human approval or a saved CV. Lower CER/WER is better. This small dataset does not establish production accuracy.

| Sample | CER before | CER after | WER before | WER after | Result |
|---|---:|---:|---:|---:|---|
| en-image | 0.000000 | 0.000000 | 0.000000 | 0.000000 | NO_CHANGE_PROPOSED |
| vi-image | 0.021277 | 0.021277 | 0.108696 | 0.108696 | NO_CHANGE_PROPOSED |
| bilingual-scan | 0.027140 | 0.016701 | 0.168831 | 0.103896 | PROPOSAL_PREVIEW_NOT_APPLIED |
| vi-blurred | 0.012766 | 0.012766 | 0.065217 | 0.065217 | NO_CHANGE_PROPOSED |
| en-native | 0.000000 | 0.000000 | 0.000000 | 0.000000 | NO_CHANGE_PROPOSED |

## en-image

Raw OCR:
```text
SYNTHETIC CV - ALEX SAMPLE

Software developer and test engineer
Email: alex.sample@example.com

Skills: Python, Docker, PostgreSQL
Experience: Example Lab, 2021-2024

Built an API with automated tests.
Education: Example Institute, Bachelor 2021
```
Proposed text:
```text
SYNTHETIC CV - ALEX SAMPLE

Software developer and test engineer
Email: alex.sample@example.com

Skills: Python, Docker, PostgreSQL
Experience: Example Lab, 2021-2024

Built an API with automated tests.
Education: Example Institute, Bachelor 2021
```
Trace:
```json
{
  "source_sha256": "a598af2bc9d0cc3b854ad5d02977416731f91d74d459799af1942d6dcce0e8ac",
  "edits": [],
  "provider": "openai_compatible",
  "model": "gpt-6-luna",
  "fallback_used": false,
  "warnings": [
    "Only typography is proposed. Review every change; original extraction remains unchanged."
  ],
  "usage": {
    "prompt_tokens": 266,
    "completion_tokens": 43,
    "total_tokens": 309
  }
}
```

## vi-image

Raw OCR:
```text
HO SƠ GIA LẬP - NGUYEN AN

Kỹ sư phần mềm và kiểm thử

Email: nguyen.an@example.com

Kỹ năng: Java, Spring Boot, PostgreSQL
Kinh nghiệm: Công ty Vi Du, 2021-2024
Xây dựng hệ thống quản lý có kiểm thử.
Học vấn: Trường Giả Lập, Cử nhân 2021
```
Proposed text:
```text
HO SƠ GIA LẬP - NGUYEN AN

Kỹ sư phần mềm và kiểm thử

Email: nguyen.an@example.com

Kỹ năng: Java, Spring Boot, PostgreSQL
Kinh nghiệm: Công ty Vi Du, 2021-2024
Xây dựng hệ thống quản lý có kiểm thử.
Học vấn: Trường Giả Lập, Cử nhân 2021
```
Trace:
```json
{
  "source_sha256": "0c9b66303371e8662553d89fe7eec21c44ab7f3d1203df4b524b9dd43ca21c66",
  "edits": [],
  "provider": "openai_compatible",
  "model": "gpt-6-luna",
  "fallback_used": false,
  "warnings": [
    "Only typography is proposed. Review every change; original extraction remains unchanged."
  ],
  "usage": {
    "prompt_tokens": 293,
    "completion_tokens": 66,
    "total_tokens": 359
  }
}
```

## bilingual-scan

Raw OCR:
```text
SYNTHETIC CV - ALEX SAMPLE
Software developer and test engineer
Email: alex.sample@example.com
Skills: Python, Docker, PostgreSQL
Experience: Example Lab, 2021-2024
Built an API with automated tests.
Education: Example Institute, Bachelor 2021
HO SƠ GIA LAP - NGUYEN AN

Kỹ su phần mềm va kiểm thử

Email: nguyen.an@example.com

Kỹ năng: Java, Spring Boot, PostgreSQL
Kinh nghiém: Céng ty Vi Du, 2021-2024
Xây dựng hệ thống quan ly có kiểm thử.
Học van: Trường Giả Lập, Cử nhân 2021
```
Proposed text:
```text
SYNTHETIC CV - ALEX SAMPLE
Software developer and test engineer
Email: alex.sample@example.com
Skills: Python, Docker, PostgreSQL
Experience: Example Lab, 2021-2024
Built an API with automated tests.
Education: Example Institute, Bachelor 2021
HO SƠ GIA LAP - NGUYEN AN

Kỹ sư phần mềm va kiểm thử

Email: nguyen.an@example.com

Kỹ năng: Java, Spring Boot, PostgreSQL
Kinh nghiệm: Céng ty Vi Du, 2021-2024
Xây dựng hệ thống quản lý có kiểm thử.
Học vấn: Trường Giả Lập, Cử nhân 2021
```
Trace:
```json
{
  "source_sha256": "1ebb4aeb5fd64624498214df61e752e4da44927435dd9d0af4f6084e901359c9",
  "edits": [
    {
      "start": 271,
      "end": 276,
      "before": "Kỹ su",
      "after": "Kỹ sư"
    },
    {
      "start": 368,
      "end": 379,
      "before": "Kinh nghiém",
      "after": "Kinh nghiệm"
    },
    {
      "start": 424,
      "end": 431,
      "before": "quan ly",
      "after": "quản lý"
    },
    {
      "start": 445,
      "end": 452,
      "before": "Học van",
      "after": "Học vấn"
    }
  ],
  "provider": "openai_compatible",
  "model": "gpt-6-luna",
  "fallback_used": false,
  "warnings": [],
  "usage": {
    "prompt_tokens": 404,
    "completion_tokens": 266,
    "total_tokens": 670
  }
}
```

## vi-blurred

Raw OCR:
```text
HÒ SƠ GIÁ LẬP - NGUYÊN AN

Kỹ sư phần mềm và kiểm thử

Email: nguyen.an@example.com

Kỹ năng: Java, Spring Boot, PostgreSQL
Kinh nghiệm: Công ty Ví Dụ, 2021-2024
Xây dựng hệ thống quản lý có kiểm thử.
Học vấn: Trường Giả Lập, Cử nhân 2021
```
Proposed text:
```text
HÒ SƠ GIÁ LẬP - NGUYÊN AN

Kỹ sư phần mềm và kiểm thử

Email: nguyen.an@example.com

Kỹ năng: Java, Spring Boot, PostgreSQL
Kinh nghiệm: Công ty Ví Dụ, 2021-2024
Xây dựng hệ thống quản lý có kiểm thử.
Học vấn: Trường Giả Lập, Cử nhân 2021
```
Trace:
```json
{
  "source_sha256": "167d37f71dadfdb5e1a481f41f23e33efb7a02a6413bda35435a633bfd343412",
  "edits": [],
  "provider": "openai_compatible",
  "model": "gpt-6-luna",
  "fallback_used": false,
  "warnings": [
    "Only typography is proposed. Review every change; original extraction remains unchanged."
  ],
  "usage": {
    "prompt_tokens": 296,
    "completion_tokens": 74,
    "total_tokens": 370
  }
}
```

## en-native

Raw OCR:
```text
SYNTHETIC CV - ALEX SAMPLE

Software developer and test engineer
Email: alex.sample@example.com
Skills: Python, Docker, PostgreSQL

Experience: Example Lab, 2021-2024
Built an API with automated tests.

Education: Example Institute, Bachelor 2021
```
Proposed text:
```text
SYNTHETIC CV - ALEX SAMPLE

Software developer and test engineer
Email: alex.sample@example.com
Skills: Python, Docker, PostgreSQL

Experience: Example Lab, 2021-2024
Built an API with automated tests.

Education: Example Institute, Bachelor 2021
```
Trace:
```json
{
  "source_sha256": "a6c551e91ac816c16f004cfe3a9181495a33e5b746051f892d05d263640e1d0b",
  "edits": [],
  "provider": "openai_compatible",
  "model": "gpt-6-luna",
  "fallback_used": false,
  "warnings": [
    "Only typography is proposed. Review every change; original extraction remains unchanged."
  ],
  "usage": {
    "prompt_tokens": 266,
    "completion_tokens": 47,
    "total_tokens": 313
  }
}
```
