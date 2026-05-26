export type ApiResponse<T> =
  | { data: T }
  | { error: { code: string; message: string; details?: unknown } };

export type SessionResponse = {
  authenticated: boolean;
};

export type CandidateStatus = "pending" | "screen_passed" | "interviewing" | "hired" | "rejected";

export type CandidateSummary = {
  id: number;
  upload_batch_id: string;
  original_filename: string;
  name?: string;
  email?: string;
  city?: string;
  status: CandidateStatus;
  parse_status: "uploaded" | "parsing" | "extracting" | "completed" | "failed";
  error_message?: string | null;
  skills: string[];
  total_score?: number | null;
  uploaded_at: string;
  updated_at: string;
};

export type ResumeProfile = {
  name: string;
  phone: string;
  email: string;
  city: string;
  education: unknown[];
  work_experience: unknown[];
  skills: string[];
  projects: unknown[];
};

export type ScoreResult = {
  id: number;
  candidate_id: number;
  job_id: number;
  job_title: string;
  total_score: number;
  skill_score: number;
  experience_score: number;
  education_score: number;
  ai_comment: string;
  details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CandidateDetail = CandidateSummary & {
  raw_text: string;
  profile: ResumeProfile;
  scores: ScoreResult[];
  pdf_url: string;
};

export type CandidateListResponse = {
  items: CandidateSummary[];
  total: number;
  page: number;
  page_size: number;
};

export type UploadResponse = {
  upload_id: string;
  candidates: CandidateSummary[];
};

export type JobDescription = {
  id: number;
  title: string;
  description: string;
  required_skills: string[];
  bonus_skills: string[];
  created_at: string;
  updated_at: string;
};

export type JobListResponse = {
  items: JobDescription[];
};

export type ScoreListResponse = {
  items: ScoreResult[];
};

export type ScoreCreateResponse = {
  candidate: CandidateDetail;
  items: ScoreResult[];
};

export type CompareResponse = {
  candidates: CandidateDetail[];
};
