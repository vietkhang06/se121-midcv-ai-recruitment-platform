import { apiRequest, getAuthToken, BASE_URL } from "./api";
import { Company } from "@/types";
export async function productRequest<T>(
  path: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  const response = await apiRequest<{ data: T }>(`/api/v1${path}`, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return response.data;
}
export async function uploadBusinessLicense(file: File): Promise<Company> {
  const body = new FormData();
  body.append("file", file);
  const result = await apiRequest<{ data: Company }>(
    "/api/v1/recruiter/company/business-license",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${getAuthToken()}` },
      body,
    },
  );
  return result.data;
}
export async function downloadBusinessLicense(companyId: string) {
  const res = await fetch(
    `${BASE_URL}/api/v1/admin/companies/${companyId}/business-license`,
    { headers: { Authorization: `Bearer ${getAuthToken()}` } },
  );
  if (!res.ok) throw new Error("Không tải được giấy phép kinh doanh.");
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = "business-license";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
