import { useEffect, useRef, useState } from "react";
import { User, Mail, Phone, MapPin, Cpu, CheckCircle, GraduationCap, Briefcase, FolderGit2, Sparkles, Trophy } from "lucide-react";

import { Skeleton } from "./Skeleton";

interface ResumeStreamViewerProps {
  streamText: string;
  isCompleted: boolean;
}

type EducationItem = {
  school?: string;
  graduation_time?: string;
  major?: string;
  degree?: string;
};

type WorkExperienceItem = {
  company?: string;
  period?: string;
  title?: string;
  summary?: string;
};

type ProjectItem = {
  name?: string;
  tech_stack?: string[];
  responsibilities?: string;
  highlights?: string;
};

type StreamResumeData = {
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  skills?: string[];
  education?: EducationItem[];
  work_experience?: WorkExperienceItem[];
  projects?: ProjectItem[];
};

// Resilient partial JSON repairing and parsing
function repairJson(jsonStr: string): string {
  let str = jsonStr.trim();
  if (!str) return "{}";

  // Strip trailing commas, colons, or incomplete properties
  str = str.replace(/,\s*$/, "");
  str = str.replace(/:\s*$/, "");

  // Handle unclosed quote cut-offs
  let inString = false;
  let isEscaped = false;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '"' && !isEscaped) {
      inString = !inString;
    }
    if (str[i] === '\\' && !isEscaped) {
      isEscaped = true;
    } else {
      isEscaped = false;
    }
  }
  if (inString) {
    str += '"';
  }

  // Parse structural brackets using a stack
  const stack: ("object" | "array")[] = [];
  inString = false;
  isEscaped = false;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '"' && !isEscaped) {
      inString = !inString;
    }
    if (str[i] === '\\' && !isEscaped) {
      isEscaped = true;
    } else {
      isEscaped = false;
    }
    if (inString) continue;
    if (str[i] === "{") stack.push("object");
    if (str[i] === "[") stack.push("array");
    if (str[i] === "}") stack.pop();
    if (str[i] === "]") stack.pop();
  }

  while (stack.length > 0) {
    const top = stack.pop();
    if (top === "object") {
      str = str.trim().replace(/,\s*$/, "");
      str += "}";
    }
    if (top === "array") {
      str = str.trim().replace(/,\s*$/, "");
      str += "]";
    }
  }

  return str;
}

function parsePartialJson(jsonStr: string): Partial<StreamResumeData> {
  try {
    const repaired = repairJson(jsonStr);
    return JSON.parse(repaired) as Partial<StreamResumeData>;
  } catch {
    return {};
  }
}

function FieldValueSkeleton({ className = "w-28" }: { className?: string }) {
  return <Skeleton className={`mt-1.5 h-4 ${className}`} />;
}

function SkillListSkeleton() {
  return (
    <div className="flex flex-wrap gap-1.5" role="status" aria-label="正在加载技能标签">
      <span className="sr-only">正在加载技能标签</span>
      {["w-12", "w-16", "w-10", "w-20", "w-14"].map((width, index) => (
        <Skeleton key={index} className={`h-6 ${width}`} />
      ))}
    </div>
  );
}

function TimelineSkeleton({
  count = 2,
  variant,
}: {
  count?: number;
  variant: "education" | "experience";
}) {
  const lineClass =
    variant === "education"
      ? "border-indigo-200 dark:border-indigo-950/80"
      : "border-emerald-200 dark:border-emerald-950/80";
  const dotClass = variant === "education" ? "bg-indigo-300 dark:bg-indigo-900" : "bg-emerald-300 dark:bg-emerald-900";

  return (
    <div className={`relative ml-3 space-y-5 border-l-2 border-dashed pl-6 ${lineClass}`} role="status" aria-label="正在加载时间线">
      <span className="sr-only">正在加载时间线</span>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="relative">
          <span className={`absolute -left-[32px] top-1.5 h-4 w-4 rounded-full border-2 border-white shadow-sm dark:border-slate-950 ${dotClass}`} />
          <div className="rounded-xl border border-slate-100/60 bg-slate-50/60 p-3.5 dark:border-slate-900/60 dark:bg-slate-900/20">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-2">
                <Skeleton className="mt-0.5 h-4 w-4 rounded" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className={`h-4 ${index === 0 ? "w-40" : "w-32"}`} />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <Skeleton className="h-5 w-20 shrink-0" />
            </div>
            {variant === "experience" && (
              <div className="mt-3 space-y-2 border-t border-slate-100 pt-2.5 dark:border-slate-900">
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectSkeleton() {
  return (
    <div className="space-y-3.5" role="status" aria-label="正在加载项目经历">
      <span className="sr-only">正在加载项目经历</span>
      {["w-44", "w-36"].map((titleWidth, index) => (
        <div key={index} className="rounded-xl border border-slate-100/60 bg-slate-50/60 p-4 dark:border-slate-900/60 dark:bg-slate-900/20">
          <div className="flex items-start gap-2">
            <Skeleton className="mt-0.5 h-4 w-4 rounded" />
            <Skeleton className={`h-4 ${titleWidth}`} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Skeleton className="h-5 w-12 rounded" />
            <Skeleton className="h-5 w-16 rounded" />
            <Skeleton className="h-5 w-10 rounded" />
          </div>
          <div className="mt-3.5 space-y-2 border-t border-slate-100 pt-2.5 dark:border-slate-900">
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TerminalSkeleton() {
  return (
    <div className="space-y-2" role="status" aria-label="等待大模型提取接口响应">
      <span className="sr-only">等待大模型提取接口响应</span>
      {["w-4/5", "w-11/12", "w-2/3", "w-5/6", "w-3/5", "w-10/12", "w-7/12"].map((width, index) => (
        <Skeleton key={index} className={`h-3 rounded-sm bg-cyan-400/10 dark:bg-cyan-400/10 ${width}`} />
      ))}
      <div className="flex items-center gap-2 pt-3 text-slate-600">
        <Cpu className="h-5 w-5 animate-pulse text-cyan-500/40" />
        <span className="animate-pulse">正在建立解析流...</span>
      </div>
    </div>
  );
}

export function ResumeStreamViewer({ streamText, isCompleted }: ResumeStreamViewerProps) {
  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"basic" | "education" | "experience" | "projects">("basic");
  const hasStreamText = streamText.trim().length > 0;
  const isInitialLoading = !isCompleted && !hasStreamText;

  // Parse structured data dynamically from the streaming text
  const data = parsePartialJson(streamText);

  const name = data.name || "";
  const email = data.email || "";
  const phone = data.phone || "";
  const city = data.city || "";
  const skills = Array.isArray(data.skills) ? data.skills : [];
  const education = Array.isArray(data.education) ? data.education : [];
  const workExperience = Array.isArray(data.work_experience) ? data.work_experience : [];
  const projects = Array.isArray(data.projects) ? data.projects : [];

  // Automatically scroll terminal to bottom on new stream content
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamText]);

  // Determine beautiful custom badge class based on degree
  const getDegreeBadgeClass = (degree?: string) => {
    const d = (degree || "").trim();
    if (d.includes("博士") || d.toLowerCase().includes("phd") || d.toLowerCase().includes("doctor")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-950/40";
    }
    if (d.includes("硕士") || d.toLowerCase().includes("master")) {
      return "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-950/40";
    }
    if (d.includes("本科") || d.includes("学士") || d.toLowerCase().includes("bachelor")) {
      return "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-950/40";
    }
    return "bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-850";
  };

  // Resilient worker summary lists generator
  const renderWorkSummary = (summary?: string) => {
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

  return (
    <div
      className="mt-4 overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50/40 shadow-md transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/40"
      aria-busy={!isCompleted}
    >
      {/* Header Bar */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="flex cursor-pointer items-center justify-between bg-slate-100/90 px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-200/50 dark:bg-slate-850 dark:text-slate-200 transition-colors select-none"
      >
        <span className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary animate-pulse" />
          <span>AI 简历实时分析与结构化看板 (SSE)</span>
        </span>
        <div className="flex items-center gap-3">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
              <CheckCircle className="h-3.5 w-3.5" /> 解析完成
            </span>
          ) : isInitialLoading ? (
            <span className="inline-flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
              </span>
              准备解析
            </span>
          ) : (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
          )}
          <span className="text-muted-foreground">{expanded ? "收起" : "展开"}</span>
        </div>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 bg-white/60 dark:bg-slate-900/10 backdrop-blur-sm border-t border-slate-200/50 dark:border-slate-800/50">
          
          {/* Left Panel: Structured Resume Dashboard (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col rounded-xl border border-slate-150 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/45 min-h-[300px]">
            {/* Dashboard Navigation Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-900 pb-2 mb-4 overflow-x-auto gap-2 scrollbar-none">
              <button
                onClick={() => setActiveTab("basic")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeTab === "basic"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900"
                }`}
              >
                <User className="h-3.5 w-3.5" /> 基本信息
              </button>
              <button
                onClick={() => setActiveTab("education")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeTab === "education"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900"
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5" /> 教育经历 ({education.length})
              </button>
              <button
                onClick={() => setActiveTab("experience")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeTab === "experience"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900"
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" /> 工作经历 ({workExperience.length})
              </button>
              <button
                onClick={() => setActiveTab("projects")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeTab === "projects"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900"
                }`}
              >
                <FolderGit2 className="h-3.5 w-3.5" /> 项目经验 ({projects.length})
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1">
              {/* Tab 1: Basic Info & Skills */}
              {activeTab === "basic" && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-4 p-3.5 bg-slate-50/50 rounded-xl dark:bg-slate-900/30 border border-slate-100/50 dark:border-slate-900/50">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <User className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">候选人姓名</p>
                      {name ? (
                        <p className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">{name}</p>
                      ) : (
                        <FieldValueSkeleton className="mt-1 h-5 w-24" />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-3 bg-slate-50/30 rounded-xl dark:bg-slate-900/10 border border-slate-100/30 dark:border-slate-900/30">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">电子邮箱</span>
                      </div>
                      {email ? (
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1.5 break-all">{email}</p>
                      ) : (
                        <FieldValueSkeleton className="w-36" />
                      )}
                    </div>

                    <div className="p-3 bg-slate-50/30 rounded-xl dark:bg-slate-900/10 border border-slate-100/30 dark:border-slate-900/30">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">联系电话</span>
                      </div>
                      {phone ? (
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1.5">{phone}</p>
                      ) : (
                        <FieldValueSkeleton />
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/30 rounded-xl dark:bg-slate-900/10 border border-slate-100/30 dark:border-slate-900/30">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">意向城市</span>
                    </div>
                    {city ? (
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1.5">{city}</p>
                    ) : isCompleted ? (
                      <p className="text-xs text-slate-400 dark:text-slate-600 mt-1.5">未提取到期望城市</p>
                    ) : (
                      <FieldValueSkeleton className="w-16" />
                    )}
                  </div>

                  {/* Skills tags */}
                  <div className="p-3 border-t border-slate-100 dark:border-slate-900">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-2">
                      <Sparkles className="h-3.5 w-3.5 text-yellow-500 animate-spin-slow" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">核心技能清单</span>
                    </div>
                    {skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {skills.map((skill: string, index: number) => (
                          <span 
                            key={index}
                            className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 border border-indigo-100/30 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-950/40 hover:scale-105 transition-transform"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : isCompleted ? (
                      <p className="text-xs text-slate-400 dark:text-slate-600">未提取到专业技能</p>
                    ) : (
                      <SkillListSkeleton />
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Education list */}
              {activeTab === "education" && (
                <div className="space-y-4 animate-fadeIn max-h-[310px] overflow-y-auto pr-1">
                  {education.length > 0 ? (
                    <div className="relative border-l-2 border-dashed border-indigo-200 dark:border-indigo-950/80 ml-3 pl-6 space-y-5">
                      {education.map((edu, index) => (
                        <div key={index} className="relative group">
                          {/* Timeline dot */}
                          <div className="absolute -left-[32px] top-1 h-4 w-4 rounded-full border-2 border-white bg-indigo-500 shadow-sm dark:border-slate-950 group-hover:scale-110 transition-transform animate-fadeIn" />
                          <div className="p-3.5 bg-slate-50/50 rounded-xl dark:bg-slate-900/20 border border-slate-100/50 dark:border-slate-900/50 hover:bg-white dark:hover:bg-slate-900/60 hover:shadow-md transition-all duration-300">
                            <div className="flex justify-between items-start gap-2 flex-wrap sm:flex-nowrap">
                              <div className="flex items-start gap-2">
                                <GraduationCap className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                                <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">{edu.school || "学校名称"}</h5>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded shrink-0">{edu.graduation_time || "毕业时间"}</span>
                            </div>
                            <div className="flex gap-2 text-xs text-muted-foreground mt-2 font-semibold flex-wrap">
                              <span className="px-2 py-0.5 rounded border border-slate-100 bg-white/70 dark:bg-slate-950/40 dark:border-slate-900">专业: <strong className="text-slate-700 dark:text-slate-300 font-bold">{edu.major || "未设定"}</strong></span>
                              <span className={`px-2 py-0.5 rounded border ${getDegreeBadgeClass(edu.degree)}`}>学位: <strong className="font-bold">{edu.degree || "未设定"}</strong></span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : isCompleted ? (
                    <div className="flex h-40 flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-2">
                      <GraduationCap className="h-8 w-8 text-slate-300 dark:text-slate-800 animate-pulse" />
                      <span className="text-xs">未提取到教育经历信息</span>
                    </div>
                  ) : (
                    <TimelineSkeleton variant="education" />
                  )}
                </div>
              )}

              {/* Tab 3: Work Experience timeline */}
              {activeTab === "experience" && (
                <div className="space-y-4 animate-fadeIn max-h-[310px] overflow-y-auto pr-1">
                  {workExperience.length > 0 ? (
                    <div className="relative border-l-2 border-dashed border-emerald-250 dark:border-emerald-950/80 ml-3 pl-6 space-y-5">
                      {workExperience.map((work, index) => (
                        <div key={index} className="relative group">
                          {/* Timeline dot */}
                          <div className="absolute -left-[32px] top-1.5 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-sm dark:border-slate-950 group-hover:scale-110 transition-transform animate-fadeIn" />
                          <div className="p-3.5 bg-slate-50/50 rounded-xl dark:bg-slate-900/20 border border-slate-100/50 dark:border-slate-900/50 hover:bg-white dark:hover:bg-slate-900/60 hover:shadow-md transition-all duration-300">
                            <div className="flex justify-between items-start gap-2 flex-wrap sm:flex-nowrap">
                              <div className="flex items-start gap-2">
                                <Briefcase className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">{work.company || "公司名称"}</h5>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded shrink-0">{work.period || "在职时间"}</span>
                            </div>
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1.5 bg-emerald-500/5 inline-block px-2 py-0.5 rounded border border-emerald-500/10">{work.title || "岗位职称"}</p>
                            {renderWorkSummary(work.summary)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : isCompleted ? (
                    <div className="flex h-40 flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-2">
                      <Briefcase className="h-8 w-8 text-slate-300 dark:text-slate-800 animate-pulse" />
                      <span className="text-xs">未提取到工作经历信息</span>
                    </div>
                  ) : (
                    <TimelineSkeleton variant="experience" />
                  )}
                </div>
              )}

              {/* Tab 4: Projects list */}
              {activeTab === "projects" && (
                <div className="space-y-4 animate-fadeIn max-h-[310px] overflow-y-auto pr-1">
                  {projects.length > 0 ? (
                    <div className="space-y-3.5">
                      {projects.map((proj, index) => (
                        <div 
                          key={index}
                          className="p-4 bg-slate-50/50 rounded-xl dark:bg-slate-900/20 border border-slate-100/50 dark:border-slate-900/50 hover:bg-white dark:hover:bg-slate-900/60 hover:shadow-md transition-all duration-300 relative overflow-hidden group"
                        >
                          <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
                          <div className="flex items-start gap-2">
                            <FolderGit2 className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                            <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">{proj.name || "项目名称"}</h5>
                          </div>
                          
                          {/* Tech stack tags */}
                          {Array.isArray(proj.tech_stack) && proj.tech_stack.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {proj.tech_stack.map((tech: string, tIndex: number) => (
                                <span key={tIndex} className="text-[9px] font-bold bg-slate-100/80 text-slate-500 border border-slate-200/20 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="space-y-2 mt-3.5 border-t border-slate-100 dark:border-slate-900 pt-2.5">
                            {proj.responsibilities && (
                              <div className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">
                                <Cpu className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold text-slate-600 dark:text-slate-400">项目职责：</span>
                                  <span className="break-all">{proj.responsibilities}</span>
                                </div>
                              </div>
                            )}
                            
                            {proj.highlights && (
                              <div className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90 leading-relaxed flex items-start gap-2 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                                <Trophy className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5 animate-bounce-slow" />
                                <div>
                                  <span className="font-bold text-emerald-700 dark:text-emerald-500">项目成果：</span>
                                  <span className="break-all">{proj.highlights}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : isCompleted ? (
                    <div className="flex h-40 flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-2">
                      <FolderGit2 className="h-8 w-8 text-slate-300 dark:text-slate-800 animate-pulse" />
                      <span className="text-xs">未提取到项目经历信息</span>
                    </div>
                  ) : (
                    <ProjectSkeleton />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Retro AI Terminal (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col h-auto lg:h-[400px] rounded-xl border border-slate-950 bg-[#0B0F19] text-cyan-400/90 font-mono text-[11px] leading-relaxed shadow-lg relative select-none">
            {/* Terminal Window Header */}
            <div className="flex items-center justify-between border-b border-slate-900 px-4 py-2.5 text-slate-500 shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-500/80" />
                <div className="h-2 w-2 rounded-full bg-yellow-500/80" />
                <div className="h-2 w-2 rounded-full bg-green-500/80" />
              </div>
              <span className="text-[10px] text-slate-600 select-none">简历解析结果</span>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-[9px] text-cyan-500/80 font-bold uppercase tracking-wider">LIVE</span>
              </div>
            </div>
            
            {/* Terminal Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-800 select-text selection:bg-cyan-500/20 max-h-60 lg:max-h-none">
              {streamText ? (
                <pre className="whitespace-pre-wrap font-mono break-all text-cyan-400/90 dark:text-cyan-400/90">
                  {streamText}
                  {!isCompleted && <span className="inline-block w-1.5 h-3.5 bg-cyan-400 ml-0.5 animate-pulse select-none" style={{ verticalAlign: 'middle' }} />}
                </pre>
              ) : (
                <TerminalSkeleton />
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
