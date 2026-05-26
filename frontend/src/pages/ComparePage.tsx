import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  GitCompare,
  GraduationCap,
  Mail,
  MapPin,
} from "lucide-react";

import { AnimatedPage } from "../components/AnimatedPage";
import {
  CandidateStatusBadge,
  ParseStatusBadge,
} from "../components/StatusBadge";
import { candidateApi } from "../lib/api";
import { statusLabels } from "../lib/format";
import { normalizeProfile } from "../lib/candidate-profile";
import type { ScoreResult } from "../types/api";

function ScoreBar({
  label,
  score,
  max = 100,
}: {
  label: string;
  score: number;
  max?: number;
}) {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  let color = "bg-red-500";
  if (pct >= 80) color = "bg-emerald-500";
  else if (pct >= 60) color = "bg-amber-500";
  else if (pct >= 40) color = "bg-orange-500";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-12 shrink-0 text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right tabular-nums text-muted-foreground">
        {score}
      </span>
    </div>
  );
}

function ScoreCard({ score }: { score: ScoreResult }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium truncate">{score.job_title}</p>
        <span className="shrink-0 text-lg font-bold tabular-nums text-primary">
          {score.total_score}
        </span>
      </div>
      <div className="mt-2 space-y-1">
        <ScoreBar label="技能" score={score.skill_score} />
        <ScoreBar label="经验" score={score.experience_score} />
        <ScoreBar label="教育" score={score.education_score} />
      </div>
      {score.ai_comment ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> 收起评价
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> 展开评价
              </>
            )}
          </button>
          {expanded ? (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground animate-fade-in">
              {score.ai_comment}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ComparePage() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const candidatesQuery = useQuery({
    queryKey: ["candidates", "compare"],
    queryFn: () =>
      candidateApi.list({ page: 1, page_size: 100, sort: "-score" }),
  });
  const compareMutation = useMutation({
    mutationFn: candidateApi.compare,
  });

  function toggleCandidate(candidateId: number) {
    setSelectedIds((current) => {
      if (current.includes(candidateId))
        return current.filter((id) => id !== candidateId);
      if (current.length >= 3) return current;
      return [...current, candidateId];
    });
  }

  return (
    <AnimatedPage>
      <section className="space-y-6">
        <div className="animate-fade-in-down">
          <h2 className="text-2xl font-semibold">候选人对比</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            选择 2-3 名候选人并排比较
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[18rem_1fr] xl:grid-cols-[20rem_1fr]">
          <div className="rounded-lg border border-border bg-muted/20 p-5 animate-fade-in-up-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">选择候选人</h3>
              <span className="text-xs text-muted-foreground">
                已选 {selectedIds.length}/3
              </span>
            </div>
            <div className="mt-4 space-y-2 stagger-children">
              {(candidatesQuery.data?.items ?? []).map((candidate) => {
                const isSelected = selectedIds.includes(candidate.id);
                const isMaxReached = selectedIds.length >= 3 && !isSelected;
                const scoreColor =
                  (candidate.total_score ?? 0) >= 80
                    ? "text-emerald-600"
                    : (candidate.total_score ?? 0) >= 60
                      ? "text-amber-600"
                      : "text-red-600";
                const initials = (candidate.name || candidate.original_filename)
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <label
                    key={candidate.id}
                    className={[
                      "flex items-center gap-3 rounded-lg border bg-background p-3 text-sm cursor-pointer transition-all",
                      isSelected
                        ? "border-primary/50 bg-primary/5 shadow-sm"
                        : "border-border hover:bg-muted/30",
                      isMaxReached
                        ? "opacity-50 cursor-not-allowed hover:bg-background"
                        : "",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isMaxReached}
                      onChange={() => toggleCandidate(candidate.id)}
                      className="accent-primary shrink-0"
                    />
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {candidate.name || candidate.original_filename}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <CandidateStatusBadge status={candidate.status} />
                        {candidate.parse_status !== "completed" ? (
                          <ParseStatusBadge status={candidate.parse_status} />
                        ) : null}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-base font-bold tabular-nums ${scoreColor}`}
                    >
                      {candidate.total_score ?? "--"}
                    </span>
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => compareMutation.mutate(selectedIds)}
              disabled={selectedIds.length < 2 || compareMutation.isPending}
              className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60 hover:opacity-90 transition-opacity"
            >
              生成对比
              {selectedIds.length >= 2 ? ` (${selectedIds.length} 人)` : ""}
            </button>
            {selectedIds.length >= 3 ? (
              <p className="mt-2 text-xs text-center text-muted-foreground">
                最多选择 3 名候选人
              </p>
            ) : null}
            {compareMutation.isError ? (
              <p className="mt-3 text-sm text-red-600 animate-fade-in">
                {compareMutation.error.message}
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-5 animate-fade-in-up-2">
            <h3 className="font-medium">对比结果</h3>
            {compareMutation.data?.candidates.length ? (
              <div className="mt-4 grid gap-4 grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] stagger-children">
                {compareMutation.data.candidates.map((candidate) => {
                  const profile = normalizeProfile(
                    candidate.profile,
                    candidate,
                  );
                  const scores = candidate.scores ?? [];
                  const topEdu = profile.education[0] as
                    | Record<string, unknown>
                    | undefined;
                  const topExp = profile.work_experience[0] as
                    | Record<string, unknown>
                    | undefined;

                  return (
                    <div
                      key={candidate.id}
                      className="card-hover flex flex-col rounded-xl border border-border bg-background overflow-hidden"
                    >
                      {/* Header */}
                      <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 px-4 pt-5 pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold truncate">
                              {profile.name || candidate.original_filename}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              {profile.email ? (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  <span className="truncate max-w-[140px]">
                                    {profile.email}
                                  </span>
                                </span>
                              ) : null}
                              {profile.city ? (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {profile.city}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <CandidateStatusBadge status={candidate.status} />
                        </div>
                        <div className="mt-3 flex items-end gap-2">
                          <span
                            className={`text-3xl font-bold tabular-nums ${
                              (candidate.total_score ?? 0) >= 80
                                ? "text-emerald-600"
                                : (candidate.total_score ?? 0) >= 60
                                  ? "text-amber-600"
                                  : "text-red-600"
                            }`}
                          >
                            {candidate.total_score ?? "--"}
                          </span>
                          <span className="mb-1 text-xs text-muted-foreground">
                            综合评分
                          </span>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="flex-1 px-4 py-4 space-y-4">
                        {/* Skills */}
                        {profile.skills.length ? (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">
                              技能
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {profile.skills.slice(0, 8).map((skill) => (
                                <span
                                  key={skill}
                                  className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                                >
                                  {skill}
                                </span>
                              ))}
                              {profile.skills.length > 8 ? (
                                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                  +{profile.skills.length - 8}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ) : null}

                        {/* Education */}
                        {topEdu ? (
                          <div className="flex items-start gap-2 text-xs">
                            <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {String(
                                  topEdu.school ?? topEdu.institution ?? "",
                                )}
                              </p>
                              <p className="text-muted-foreground truncate">
                                {String(topEdu.degree ?? "")}
                                {topEdu.major
                                  ? ` · ${String(topEdu.major)}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        ) : null}

                        {/* Work Experience */}
                        {topExp ? (
                          <div className="flex items-start gap-2 text-xs">
                            <Briefcase className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {String(
                                  topExp.company ?? topExp.employer ?? "",
                                )}
                              </p>
                              <p className="text-muted-foreground truncate">
                                {String(topExp.title ?? topExp.position ?? "")}
                              </p>
                            </div>
                          </div>
                        ) : null}

                        {/* Job Scores */}
                        {scores.length ? (
                          <div className="space-y-2 pt-2 border-t border-border">
                            <p className="text-xs font-medium text-muted-foreground">
                              岗位匹配 ({scores.length})
                            </p>
                            <div className="space-y-2">
                              {scores.map((score) => (
                                <ScoreCard key={score.id} score={score} />
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 grid h-80 place-items-center rounded-lg border border-dashed border-border bg-background animate-fade-in">
                <div className="text-center">
                  <GitCompare className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    暂无对比对象
                  </p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  从左侧选择 2-3 名候选人后点击「生成对比」
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </AnimatedPage>
  );
}
