import type { CandidateSummary, ResumeProfile } from "../types/api";

export const emptyResumeProfile: ResumeProfile = {
  name: "",
  phone: "",
  email: "",
  city: "",
  education: [],
  work_experience: [],
  skills: [],
  projects: [],
};

export function normalizeProfile(
  profile?: Partial<ResumeProfile> | null,
  fallback?: Partial<CandidateSummary> | null,
): ResumeProfile {
  return {
    name: profile?.name ?? fallback?.name ?? "",
    phone: profile?.phone ?? "",
    email: profile?.email ?? fallback?.email ?? "",
    city: profile?.city ?? fallback?.city ?? "",
    education: Array.isArray(profile?.education) ? profile.education : [],
    work_experience: Array.isArray(profile?.work_experience) ? profile.work_experience : [],
    skills: Array.isArray(profile?.skills) ? profile.skills : Array.isArray(fallback?.skills) ? fallback.skills : [],
    projects: Array.isArray(profile?.projects) ? profile.projects : [],
  };
}
