import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { useParams } from "react-router-dom";
import { User, Mail, Phone, MapPin, Cpu, GraduationCap, Briefcase, FolderGit2, Sparkles, Trophy, Edit3, Eye, Trash2 } from "lucide-react";

import { AnimatedPage } from "../components/AnimatedPage";

import { CandidateStatusBadge, ParseStatusBadge } from "../components/StatusBadge";
import { TagInput } from "../components/TagInput";
import { API_PREFIX, candidateApi, jobsApi, scoresApi } from "../lib/api";
import { normalizeProfile } from "../lib/candidate-profile";
import { parseJsonArray, statusLabels, stringifyJson } from "../lib/format";
import type { CandidateStatus, ResumeProfile } from "../types/api";

const statusOptions = Object.entries(statusLabels) as Array<[CandidateStatus, string]>;
const basicFieldLabels: Record<"name" | "phone" | "email" | "city", string> = {
  name: "姓名",
  phone: "电话",
  email: "邮箱",
  city: "所在城市",
};
const profileSectionLabels: Record<"education" | "work_experience" | "projects", string> = {
  education: "教育经历",
  work_experience: "工作经历",
  projects: "项目经历",
};

type ProfileForm = {
  name: string;
  phone: string;
  email: string;
  city: string;
  education: string;
  work_experience: string;
  skills: string[];
  projects: string;
};

const emptyProfileForm: ProfileForm = {
  name: "",
  phone: "",
  email: "",
  city: "",
  education: "[]",
  work_experience: "[]",
  skills: [],
  projects: "[]",
};

const getDegreeBadgeClass = (degree: string) => {
  const d = (degree || "").trim();
  if (d.includes("博士") || d.toLowerCase().includes("phd") || d.toLowerCase().includes("doctor")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-950/40";
  }
  if (d.includes("硕士") || d.toLowerCase().includes("master")) {
    return "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-950/40";
  }
  if (d.includes("本科") || d.includes("学士") || d.toLowerCase().includes("bachelor")) {
    return "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-950/40";
  }
  return "bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-850";
};

const renderWorkSummary = (summary: string) => {
  if (!summary) return null;
  const bullets = summary
    .split(/[;；\n•*]/g)
    .map((s) => s.trim().replace(/^-\s*/, ""))
    .filter((s) => s.length > 2);

  if (bullets.length === 0) {
    return <p className="text-[11px] text-muted-foreground leading-normal whitespace-pre-wrap">{summary}</p>;
  }

  return (
    <ul className="space-y-2 mt-3 border-t border-slate-100 dark:border-slate-900 pt-2.5">
      {bullets.map((bullet, bIdx) => (
        <li key={bIdx} className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed group/item hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/80 group-hover/item:scale-125 transition-transform" />
          <span className="flex-1">{bullet}</span>
        </li>
      ))}
    </ul>
  );
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toDisplayText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(toDisplayText).filter(Boolean);
}

export function CandidateDetailPage() {
  const { candidateId } = useParams();
  const numericCandidateId = Number(candidateId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const candidateQuery = useQuery({
    queryKey: ["candidate", numericCandidateId],
    queryFn: () => candidateApi.get(numericCandidateId),
    enabled: Number.isFinite(numericCandidateId),
  });
  const jobsQuery = useQuery({ queryKey: ["jobs"], queryFn: jobsApi.list });
  const candidate = candidateQuery.data;
  const profile = normalizeProfile(candidate?.profile, candidate);
  const candidateScores = useMemo(() => candidate?.scores ?? [], [candidate?.scores]);
  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfileForm);
  const [selectedJobIds, setSelectedJobIds] = useState<number[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"education" | "experience" | "projects">("education");

  useEffect(() => {
    if (!candidate) return;
    const nextProfile = normalizeProfile(candidate.profile, candidate);
    setProfileForm({
      name: nextProfile.name,
      phone: nextProfile.phone,
      email: nextProfile.email,
      city: nextProfile.city,
      education: stringifyJson(nextProfile.education),
      work_experience: stringifyJson(nextProfile.work_experience),
      skills: [...nextProfile.skills],
      projects: stringifyJson(nextProfile.projects),
    });
  }, [candidate]);

  const saveProfileMutation = useMutation({
    mutationFn: (profile: ResumeProfile) => candidateApi.updateProfile(numericCandidateId, profile),
    onSuccess: async () => {
      setEditMode(false);
      await queryClient.invalidateQueries({ queryKey: ["candidate", numericCandidateId] });
      await queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: CandidateStatus) => candidateApi.updateStatus(numericCandidateId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["candidate", numericCandidateId] });
      await queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });

  const scoreMutation = useMutation({
    mutationFn: () => scoresApi.create(numericCandidateId, selectedJobIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["candidate", numericCandidateId] });
      await queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => candidateApi.delete(numericCandidateId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["candidates"] });
      navigate("/candidates");
    },
  });

  const chartData = useMemo(() => {
    const score = candidateScores[0];
    if (!score) return [];
    return [
      { metric: "技能", score: score.skill_score },
      { metric: "经验", score: score.experience_score },
      { metric: "教育", score: score.education_score },
    ];
  }, [candidateScores]);

  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveProfileMutation.mutate({
      name: profileForm.name,
      phone: profileForm.phone,
      email: profileForm.email,
      city: profileForm.city,
      education: parseJsonArray(profileForm.education),
      work_experience: parseJsonArray(profileForm.work_experience),
      skills: profileForm.skills,
      projects: parseJsonArray(profileForm.projects),
    });
  }

  if (candidateQuery.isLoading) {
    return <div className="h-96 animate-pulse rounded-lg bg-muted" />;
  }

  if (!candidate) {
    return <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">候选人不存在</div>;
  }

  return (
    <AnimatedPage>
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between animate-fade-in-down">
        <div>
          <h2 className="text-2xl font-semibold">{profile.name || candidate.original_filename}</h2>
          <p className="mt-1 text-sm text-muted-foreground">结构化简历、评分详情与原始 PDF</p>
        </div>
        <div className="flex items-center gap-2">
          <ParseStatusBadge status={candidate.parse_status} />
          <CandidateStatusBadge status={candidate.status} />
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`确定要删除候选人「${profile.name || candidate.original_filename}」吗？`)) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
            className="rounded-md p-2 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
            aria-label="删除候选人"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        <div className="space-y-4">
          {editMode ? (
            <form onSubmit={handleProfileSubmit} className="space-y-4 rounded-lg border border-border bg-muted/20 p-5 animate-fade-in-up-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">简历编辑修正</h3>
                <button 
                  onClick={() => setEditMode(false)}
                  className="rounded-md border border-border text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1 transition-all"
                  type="button"
                >
                  <Eye className="h-3.5 w-3.5" /> 返回预览
                </button>
              </div>
              <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground font-semibold" type="submit">
                {saveProfileMutation.isPending ? "保存中" : "保存修正"}
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {(["name", "phone", "email", "city"] as const).map((key) => (
                <label key={key} className="text-sm">
                  <span className="text-muted-foreground">{basicFieldLabels[key]}</span>
                  <input value={profileForm[key]} onChange={(event) => setProfileForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3" />
                </label>
              ))}
            </div>
            <label className="block text-sm">
              <span className="text-muted-foreground">技能标签</span>
              <TagInput
                value={profileForm.skills}
                onChange={(skills) => setProfileForm((current) => ({ ...current, skills }))}
                className="mt-1"
                placeholder="添加技能"
                inputLabel="技能标签"
              />
            </label>
            {(["education", "work_experience", "projects"] as const).map((key) => (
              <label key={key} className="block text-sm">
                <span className="text-muted-foreground">{profileSectionLabels[key]}</span>
                <textarea value={profileForm[key]} onChange={(event) => setProfileForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 min-h-28 w-full rounded-md border border-border bg-background p-3 font-mono text-xs" />
              </label>
            ))}
            </form>
          ) : (
            <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-5 animate-fade-in-up-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">简历画像预览</h3>
              <button 
                onClick={() => setEditMode(true)}
                className="rounded-md bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 px-3 py-2 text-sm font-semibold flex items-center gap-1.5 transition-all"
                type="button"
              >
                <Edit3 className="h-4 w-4" /> 修改简历
              </button>
            </div>

            {/* Basic Info Details */}
            <div className="grid gap-3.5 md:grid-cols-2 bg-background p-4 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <User className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">姓名</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">{profile.name || "未设定"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Phone className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">电话</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{profile.phone || "未设定"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">邮箱</p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 truncate">{profile.email || "未设定"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <MapPin className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">意向城市</p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{profile.city || "未设定"}</p>
                </div>
              </div>
            </div>

            {/* Skills tags */}
            <div className="p-4 bg-background rounded-xl border border-border">
              <div className="flex items-center gap-1.5 text-slate-500 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider">核心技能</span>
              </div>
              {profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((skill, index) => (
                    <span 
                      key={index}
                      className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 border border-indigo-100/30 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-950/40"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-600">暂无技能标签</p>
              )}
            </div>

            {/* Structured Dashboard Panels */}
            <div className="flex flex-col bg-background p-4 rounded-xl border border-border min-h-[300px]">
              {/* Tabs Navigation */}
              <div className="flex border-b border-slate-100 dark:border-slate-900 pb-2 mb-4 gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("education")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "education"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <GraduationCap className="h-3.5 w-3.5" /> 教育经历 ({profile.education.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("experience")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "experience"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <Briefcase className="h-3.5 w-3.5" /> 工作经历 ({profile.work_experience.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("projects")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "projects"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <FolderGit2 className="h-3.5 w-3.5" /> 项目经历 ({profile.projects.length})
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1">
                {activeTab === "education" && (
                  <div className="space-y-4 animate-fadeIn max-h-[300px] overflow-y-auto pr-1">
                    {profile.education.length > 0 ? (
                      <div className="relative border-l-2 border-dashed border-indigo-200 dark:border-indigo-950 ml-3 pl-6 space-y-5">
                        {profile.education.map((item, index) => {
                          const edu = asRecord(item);
                          const school = toDisplayText(edu.school);
                          const graduationTime = toDisplayText(edu.graduation_time);
                          const major = toDisplayText(edu.major);
                          const degree = toDisplayText(edu.degree);

                          return (
                            <div key={index} className="relative group">
                              <div className="absolute -left-[32px] top-1 h-4 w-4 rounded-full border-2 border-white bg-indigo-500 shadow-sm dark:border-slate-950 group-hover:scale-110 transition-transform animate-fadeIn" />
                              <div className="p-3.5 bg-slate-50/50 rounded-xl dark:bg-slate-900/20 border border-slate-100/50 dark:border-slate-900/50 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm transition-all duration-300">
                                <div className="flex justify-between items-start gap-2 flex-wrap sm:flex-nowrap">
                                  <div className="flex items-start gap-2">
                                    <GraduationCap className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                                    <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">{school || "学校名称"}</h5>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide bg-slate-100 dark:bg-slate-855 px-2 py-0.5 rounded shrink-0">{graduationTime || "毕业时间"}</span>
                                </div>
                                <div className="flex gap-2 text-xs text-muted-foreground mt-2 font-semibold flex-wrap">
                                  <span className="px-2 py-0.5 rounded border border-slate-100 bg-white/70 dark:bg-slate-950/40 dark:border-slate-900">专业: <strong className="text-slate-700 dark:text-slate-300 font-bold">{major || "未设定"}</strong></span>
                                  <span className={`px-2 py-0.5 rounded border ${getDegreeBadgeClass(degree)}`}>学位: <strong className="font-bold">{degree || "未设定"}</strong></span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex h-40 flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-2">
                        <GraduationCap className="h-8 w-8 text-slate-300 dark:text-slate-800" />
                        <span className="text-xs">暂无教育经历</span>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "experience" && (
                  <div className="space-y-4 animate-fadeIn max-h-[300px] overflow-y-auto pr-1">
                    {profile.work_experience.length > 0 ? (
                      <div className="relative border-l-2 border-dashed border-emerald-200 dark:border-emerald-950 ml-3 pl-6 space-y-5">
                        {profile.work_experience.map((item, index) => {
                          const work = asRecord(item);
                          const company = toDisplayText(work.company);
                          const period = toDisplayText(work.period);
                          const title = toDisplayText(work.title);
                          const summary = toDisplayText(work.summary);

                          return (
                            <div key={index} className="relative group">
                              <div className="absolute -left-[32px] top-1.5 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-sm dark:border-slate-950 group-hover:scale-110 transition-transform animate-fadeIn" />
                              <div className="p-3.5 bg-slate-50/50 rounded-xl dark:bg-slate-900/20 border border-slate-100/50 dark:border-slate-900/50 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md transition-all duration-300">
                                <div className="flex justify-between items-start gap-2 flex-wrap sm:flex-nowrap">
                                  <div className="flex items-start gap-2">
                                    <Briefcase className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">{company || "公司名称"}</h5>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wide bg-slate-100 dark:bg-slate-855 px-2 py-0.5 rounded shrink-0">{period || "在职时间"}</span>
                                </div>
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1.5 bg-emerald-500/5 inline-block px-2 py-0.5 rounded border border-emerald-500/10">{title || "岗位职称"}</p>
                                {renderWorkSummary(summary)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex h-40 flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-2">
                        <Briefcase className="h-8 w-8 text-slate-300 dark:text-slate-800" />
                        <span className="text-xs">暂无工作经历</span>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "projects" && (
                  <div className="space-y-4 animate-fadeIn max-h-[300px] overflow-y-auto pr-1">
                    {profile.projects.length > 0 ? (
                      <div className="space-y-3.5">
                        {profile.projects.map((item, index) => {
                          const project = asRecord(item);
                          const name = toDisplayText(project.name);
                          const techStack = toStringList(project.tech_stack);
                          const responsibilities = toDisplayText(project.responsibilities);
                          const highlights = toDisplayText(project.highlights);

                          return (
                            <div
                              key={index}
                              className="p-4 bg-slate-50/50 rounded-xl dark:bg-slate-900/20 border border-slate-100/50 dark:border-slate-900/50 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md transition-all duration-300 relative overflow-hidden group"
                            >
                              <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
                              <div className="flex items-start gap-2">
                                <FolderGit2 className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                                <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">{name || "项目名称"}</h5>
                              </div>

                              {techStack.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {techStack.map((tech, tIndex) => (
                                    <span key={tIndex} className="text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200/20 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded">
                                      {tech}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="space-y-2 mt-3.5 border-t border-slate-100 dark:border-slate-900 pt-2.5">
                                {responsibilities ? (
                                  <div className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">
                                    <Cpu className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-bold text-slate-600 dark:text-slate-400">项目职责：</span>
                                      <span className="break-all">{responsibilities}</span>
                                    </div>
                                  </div>
                                ) : null}

                                {highlights ? (
                                  <div className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90 leading-relaxed flex items-start gap-2 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                                    <Trophy className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-bold text-emerald-700 dark:text-emerald-500">项目成果：</span>
                                      <span className="break-all">{highlights}</span>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex h-40 flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-2">
                        <FolderGit2 className="h-8 w-8 text-slate-300 dark:text-slate-800" />
                        <span className="text-xs">暂无项目经历</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            </div>
          )}
          <div className="rounded-lg border border-border bg-muted/20 p-5 animate-fade-in-up-3">
            <h3 className="font-medium">原始 PDF</h3>
            <iframe title="原始 PDF" src={`${API_PREFIX}${candidate.pdf_url}`} className="mt-4 h-[34rem] w-full rounded-md border border-border bg-background" />
          </div>
        </div>
        <div className="space-y-4 animate-fade-in-up-2">
          <div className="rounded-lg border border-border bg-muted/20 p-5">
            <h3 className="font-medium">状态流转</h3>
            <select value={candidate.status} onChange={(event) => statusMutation.mutate(event.target.value as CandidateStatus)} className="mt-4 h-10 w-full rounded-md border border-border bg-background px-3">
              {statusOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-5">
            <h3 className="font-medium">岗位评分</h3>
            <div className="mt-4 space-y-2">
              {(jobsQuery.data?.items ?? []).map((job) => (
                <label key={job.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedJobIds.includes(job.id)}
                    onChange={(event) =>
                      setSelectedJobIds((current) =>
                        event.target.checked ? [...current, job.id] : current.filter((id) => id !== job.id),
                      )
                    }
                  />
                  {job.title}
                </label>
              ))}
            </div>
            <button type="button" onClick={() => scoreMutation.mutate()} disabled={!selectedJobIds.length || scoreMutation.isPending} className="mt-4 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60">
              {scoreMutation.isPending ? "评分中" : "生成评分"}
            </button>
            {scoreMutation.isError ? <p className="mt-3 text-sm text-red-600">{scoreMutation.error.message}</p> : null}
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-5">
            <h3 className="font-medium">评分</h3>
            {candidateScores.length ? (
              <>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={chartData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <Radar dataKey="score" fill="hsl(var(--primary))" fillOpacity={0.35} stroke="hsl(var(--primary))" />
                      <Tooltip formatter={(value) => [value, "评分"]} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={candidateScores}>
                      <XAxis dataKey="job_title" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => [value, "总分"]} labelFormatter={(label) => `岗位：${label}`} />
                      <Bar dataKey="total_score" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-3">
                  {candidateScores.map((score) => (
                    <div key={score.id} className="card-hover rounded-md border border-border bg-background p-3 text-sm">
                      <p className="font-medium">{score.job_title}：{score.total_score}</p>
                      <p className="mt-1 text-muted-foreground">{score.ai_comment}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-5 grid h-72 place-items-center rounded-md border border-dashed border-border text-sm text-muted-foreground">暂无评分</div>
            )}
          </div>
        </div>
      </div>
    </section>
    </AnimatedPage>
  );
}
