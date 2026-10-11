/**
 * Shared display helpers for job-related labels.
 * Locale values intentionally match LanguageContext's Locale union.
 */
export type Locale = 'en' | 'vi';

type TranslationPair = { en: string; vi: string };

const INDUSTRIES: Record<string, TranslationPair> = {
  TECHNOLOGY: { en: 'Technology', vi: 'Công nghệ' },
  TECH: { en: 'Technology', vi: 'Công nghệ' },
  IT: { en: 'Technology', vi: 'Công nghệ' },
  INFORMATION_TECHNOLOGY: { en: 'Information Technology', vi: 'Công nghệ thông tin' },
  IT_AND_SOFTWARE: { en: 'IT & Software', vi: 'CNTT & Phần mềm' },
  SOFTWARE: { en: 'Software', vi: 'Phần mềm' },
  SOFTWARE_ENGINEERING: { en: 'Software Engineering', vi: 'Kỹ thuật phần mềm' },
  MARKETING: { en: 'Marketing', vi: 'Tiếp thị' },
  DIGITAL_MARKETING: { en: 'Digital Marketing', vi: 'Tiếp thị số' },
  DESIGN: { en: 'Design', vi: 'Thiết kế' },
  UI_UX: { en: 'UI/UX Design', vi: 'Thiết kế UI/UX' },
  UI_UX_DESIGN: { en: 'UI/UX Design', vi: 'Thiết kế UI/UX' },
  GRAPHIC_DESIGN: { en: 'Graphic Design', vi: 'Thiết kế đồ họa' },
  PRODUCT_DESIGN: { en: 'Product Design', vi: 'Thiết kế sản phẩm' },
  FINANCE: { en: 'Finance', vi: 'Tài chính' },
  BANKING: { en: 'Banking', vi: 'Ngân hàng' },
  FINANCE_AND_BANKING: { en: 'Finance & Banking', vi: 'Tài chính & Ngân hàng' },
  ACCOUNTING: { en: 'Accounting', vi: 'Kế toán' },
  HR: { en: 'Human Resources', vi: 'Nhân sự' },
  HUMAN_RESOURCES: { en: 'Human Resources', vi: 'Nhân sự' },
  RECRUITMENT: { en: 'Recruitment', vi: 'Tuyển dụng' },
  SALES: { en: 'Sales', vi: 'Kinh doanh' },
  BUSINESS_DEVELOPMENT: { en: 'Business Development', vi: 'Phát triển kinh doanh' },
  EDUCATION: { en: 'Education', vi: 'Giáo dục' },
  HEALTHCARE: { en: 'Healthcare', vi: 'Chăm sóc sức khỏe' },
  MEDICAL: { en: 'Medical', vi: 'Y tế' },
  ENGINEERING: { en: 'Engineering', vi: 'Kỹ thuật' },
  MANUFACTURING: { en: 'Manufacturing', vi: 'Sản xuất' },
  LOGISTICS: { en: 'Logistics', vi: 'Logistics' },
  SUPPLY_CHAIN: { en: 'Supply Chain', vi: 'Chuỗi cung ứng' },
  RETAIL: { en: 'Retail', vi: 'Bán lẻ' },
  E_COMMERCE: { en: 'E-commerce', vi: 'Thương mại điện tử' },
  ECOMMERCE: { en: 'E-commerce', vi: 'Thương mại điện tử' },
  CUSTOMER_SERVICE: { en: 'Customer Service', vi: 'Dịch vụ khách hàng' },
  CONSULTING: { en: 'Consulting', vi: 'Tư vấn' },
  LEGAL: { en: 'Legal', vi: 'Pháp lý' },
  REAL_ESTATE: { en: 'Real Estate', vi: 'Bất động sản' },
  CONSTRUCTION: { en: 'Construction', vi: 'Xây dựng' },
  MEDIA: { en: 'Media', vi: 'Truyền thông' },
  COMMUNICATIONS: { en: 'Communications', vi: 'Truyền thông' },
  HOSPITALITY: { en: 'Hospitality', vi: 'Dịch vụ lưu trú' },
  TOURISM: { en: 'Tourism', vi: 'Du lịch' },
  AGRICULTURE: { en: 'Agriculture', vi: 'Nông nghiệp' },
  OTHER: { en: 'Other', vi: 'Khác' },
};

const WORK_MODES: Record<string, TranslationPair> = {
  FULL_TIME: { en: 'Full-time', vi: 'Toàn thời gian' },
  FULLTIME: { en: 'Full-time', vi: 'Toàn thời gian' },
  PART_TIME: { en: 'Part-time', vi: 'Bán thời gian' },
  PARTTIME: { en: 'Part-time', vi: 'Bán thời gian' },
  CONTRACT: { en: 'Contract', vi: 'Hợp đồng' },
  TEMPORARY: { en: 'Temporary', vi: 'Tạm thời' },
  INTERNSHIP: { en: 'Internship', vi: 'Thực tập' },
  INTERN: { en: 'Internship', vi: 'Thực tập' },
  FREELANCE: { en: 'Freelance', vi: 'Tự do' },
  REMOTE: { en: 'Remote', vi: 'Từ xa' },
  WORK_FROM_HOME: { en: 'Remote', vi: 'Làm việc từ xa' },
  HYBRID: { en: 'Hybrid', vi: 'Kết hợp' },
  ONSITE: { en: 'On-site', vi: 'Tại văn phòng' },
  ON_SITE: { en: 'On-site', vi: 'Tại văn phòng' },
  OFFICE: { en: 'On-site', vi: 'Tại văn phòng' },
};

const SENIORITY_LEVELS: Record<string, TranslationPair> = {
  INTERN: { en: 'Intern', vi: 'Thực tập sinh' },
  INTERNSHIP: { en: 'Intern', vi: 'Thực tập sinh' },
  FRESHER: { en: 'Fresher', vi: 'Mới tốt nghiệp' },
  ENTRY: { en: 'Entry-level', vi: 'Mới vào nghề' },
  ENTRY_LEVEL: { en: 'Entry-level', vi: 'Mới vào nghề' },
  JUNIOR: { en: 'Junior', vi: 'Nhân viên cấp thấp' },
  MID: { en: 'Mid-level', vi: 'Trung cấp' },
  MID_LEVEL: { en: 'Mid-level', vi: 'Trung cấp' },
  MIDDLE: { en: 'Mid-level', vi: 'Trung cấp' },
  MIDDLE_LEVEL: { en: 'Mid-level', vi: 'Trung cấp' },
  SENIOR: { en: 'Senior', vi: 'Cấp cao' },
  LEAD: { en: 'Lead', vi: 'Trưởng nhóm' },
  TEAM_LEAD: { en: 'Team Lead', vi: 'Trưởng nhóm' },
  MANAGER: { en: 'Manager', vi: 'Quản lý' },
  DIRECTOR: { en: 'Director', vi: 'Giám đốc' },
  EXECUTIVE: { en: 'Executive', vi: 'Điều hành' },
  ALL: { en: 'All levels', vi: 'Tất cả cấp bậc' },
};

function normalizeKey(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (char) => (char === 'đ' ? 'd' : 'D'))
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .replace(/[\/]+/g, '_')
    .replace(/&/g, '_AND_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase();
}

function translateFromMap(
  value: string | null | undefined,
  locale: Locale,
  dictionary: Record<string, TranslationPair>,
): string {
  if (!value || !value.trim()) return '';
  const key = normalizeKey(value);
  const pair = dictionary[key];
  // Keep unrecognized backend values visible rather than hiding data.
  return pair ? pair[locale] : value.trim();
}

export function translateIndustry(
  industry: string | null | undefined,
  locale: Locale,
): string {
  return translateFromMap(industry, locale, INDUSTRIES);
}

export function translateWorkMode(
  mode: string | null | undefined,
  locale: Locale,
): string {
  return translateFromMap(mode, locale, WORK_MODES);
}

export function translateSeniority(
  level: string | null | undefined,
  locale: Locale,
): string {
  return translateFromMap(level, locale, SENIORITY_LEVELS);
}

function parseSalaryNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  if (typeof value !== 'string') return null;

  const raw = value.trim().replace(/\s/g, '');
  // Do not interpret labels such as "10 triệu" as a numeric salary.
  if (!raw || !/^\d[\d.,]*$/.test(raw)) return null;

  let normalized = raw;
  // Common grouped formats: 15,000,000 or 15.000.000.
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(raw)) {
    normalized = raw.replace(/[.,]/g, '');
  } else if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(raw)) {
    normalized = raw.replace(/,/g, '');
  } else if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(raw)) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if (raw.includes(',') && !raw.includes('.')) {
    normalized = raw.replace(',', '.');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatVnd(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function translateSalaryRange(range: string, locale: Locale): string {
  const key = normalizeKey(range);
  if (['NEGOTIABLE', 'THUONG_LUONG', 'SALARY_NEGOTIABLE'].includes(key)) {
    return locale === 'vi' ? 'Thương lượng' : 'Negotiable';
  }
  if (['COMPETITIVE', 'CANH_TRANH', 'COMPETITIVE_SALARY'].includes(key)) {
    return locale === 'vi' ? 'Cạnh tranh' : 'Competitive';
  }
  return range.trim();
}

/** Formats salary amounts as VND. Non-numeric salaryRange labels are preserved. */
export function formatSalary(
  salaryMin: number | string | null | undefined,
  salaryMax: number | string | null | undefined,
  salaryRange: string | null | undefined,
  locale: Locale,
): string {
  const min = parseSalaryNumber(salaryMin);
  const max = parseSalaryNumber(salaryMax);

  if (min !== null && max !== null) {
    if (min === max) return formatVnd(min, locale);
    return `${formatVnd(min, locale)} – ${formatVnd(max, locale)}`;
  }
  if (min !== null) {
    return `${locale === 'vi' ? 'Từ' : 'From'} ${formatVnd(min, locale)}`;
  }
  if (max !== null) {
    return `${locale === 'vi' ? 'Đến' : 'Up to'} ${formatVnd(max, locale)}`;
  }
  if (salaryRange && salaryRange.trim()) {
    return translateSalaryRange(salaryRange, locale);
  }
  return '';
}
