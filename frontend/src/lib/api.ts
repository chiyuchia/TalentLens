import type {
  ApiResponse,
  CandidateDetail,
  CandidateListResponse,
  CandidateStatus,
  CompareResponse,
  JobDescription,
  JobListResponse,
  ResumeProfile,
  ScoreCreateResponse,
  ScoreListResponse,
  SessionResponse,
  UploadResponse,
} from "../types/api";
import { ApiError } from "./errors";

export const API_PREFIX = import.meta.env.VITE_API_BASE_URL || "/api";

type QueryParamPrimitive = string | number;
type QueryParams = Record<string, QueryParamPrimitive | QueryParamPrimitive[] | undefined>;

function appendSearchParam(search: URLSearchParams, key: string, value: QueryParamPrimitive | QueryParamPrimitive[] | undefined) {
  if (value === undefined || value === "") return;

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (item !== "") search.append(key, String(item));
    });
    return;
  }

  search.set(key, String(value));
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_PREFIX}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok) {
    const apiError = payload && "error" in payload ? payload.error : null;
    const message = apiError?.message || "请求失败";
    if (response.status === 401 && window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
    throw new ApiError(message, {
      status: response.status,
      code: apiError?.code,
      details: apiError?.details,
      path,
    });
  }

  return (payload as { data: T }).data;
}

export const authApi = {
  session: () => apiRequest<SessionResponse>("/auth/session"),
  login: (accessKey: string) =>
    apiRequest<SessionResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ access_key: accessKey }),
    }),
  logout: () => apiRequest<SessionResponse>("/auth/logout", { method: "POST" }),
};

export const uploadApi = {
  uploadResumes: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    return apiRequest<UploadResponse>("/uploads/resumes", {
      method: "POST",
      body: formData,
    });
  },
};

export const candidateApi = {
  list: (params: QueryParams) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      appendSearchParam(search, key, value);
    });
    return apiRequest<CandidateListResponse>(`/candidates?${search.toString()}`);
  },
  get: (candidateId: number) => apiRequest<CandidateDetail>(`/candidates/${candidateId}`),
  updateProfile: (candidateId: number, profile: ResumeProfile) =>
    apiRequest<CandidateDetail>(`/candidates/${candidateId}/profile`, {
      method: "PATCH",
      body: JSON.stringify(profile),
    }),
  updateStatus: (candidateId: number, status: CandidateStatus) =>
    apiRequest<CandidateDetail>(`/candidates/${candidateId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  compare: (candidateIds: number[]) =>
    apiRequest<CompareResponse>("/candidates/compare", {
      method: "POST",
      body: JSON.stringify({ candidate_ids: candidateIds }),
    }),
};

export const jobsApi = {
  list: () => apiRequest<JobListResponse>("/jobs"),
  create: (payload: Pick<JobDescription, "title" | "description" | "required_skills" | "bonus_skills">) =>
    apiRequest<JobDescription>("/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (
    jobId: number,
    payload: Pick<JobDescription, "title" | "description" | "required_skills" | "bonus_skills">,
  ) =>
    apiRequest<JobDescription>(`/jobs/${jobId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  delete: (jobId: number) =>
    apiRequest<{ id: number; deleted: boolean }>(`/jobs/${jobId}`, {
      method: "DELETE",
    }),
};

export const scoresApi = {
  list: (params: QueryParams = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      appendSearchParam(search, key, value);
    });
    return apiRequest<ScoreListResponse>(`/scores?${search.toString()}`);
  },
  create: (candidateId: number, jobIds: number[]) =>
    apiRequest<ScoreCreateResponse>("/scores", {
      method: "POST",
      body: JSON.stringify({ candidate_id: candidateId, job_ids: jobIds }),
    }),
};
