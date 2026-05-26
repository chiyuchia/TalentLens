import { useState } from "react";
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  GitCompare,
  GraduationCap,
  Mail,
  MapPin,
} from "lucide-react";

import { CandidateStatusBadge } from "./StatusBadge";
import { normalizeProfile } from "../lib/candidate-profile";
import type { CandidateDetail, ScoreResult } from "../types/api";

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

export function CompareResultPanel({
  candidates,
  empty,
}: {
  candidates: CandidateDetail[];
  empty?: React.ReactNode;
}) {
  if (!candidates.length) {
    return (
      <div className="grid h-80 place-items-center rounded-lg border border-dashed border-border bg-background animate-fade-in">
        <div className="text-center">
          <GitCompare className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">暂无对比对象</p>
        </div>
        {empty}
      </div>
    );
  }

  const colCount = candidates.length;

  return (
    <div
      className="grid gap-3 w-full stagger-children"
      style={{
        gridTemplateColumns: `repeat(${colCount}, minmax(260px, 1fr))`,
      }}
    >
      {candidates.map((candidate) => {
        const profile = normalizeProfile(candidate.profile, candidate);
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
                  className={`text-3xl font-bold tabular-nums ${(candidate.total_score ?? 0) >= 80 ? "text-emerald-600" : (candidate.total_score ?? 0) >= 60 ? "text-amber-600" : "text-red-600"}`}
                >
                  {candidate.total_score ?? "--"}
                </span>
                <span className="mb-1 text-xs text-muted-foreground">
                  综合评分
                </span>
              </div>
            </div>

            <div className="flex-1 px-4 py-4 space-y-4">
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

              {topEdu ? (
                <div className="flex items-start gap-2 text-xs">
                  <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {String(topEdu.school ?? topEdu.institution ?? "")}
                    </p>
                    <p className="text-muted-foreground truncate">
                      {String(topEdu.degree ?? "")}
                      {topEdu.major ? ` · ${String(topEdu.major)}` : ""}
                    </p>
                  </div>
                </div>
              ) : null}

              {topExp ? (
                <div className="flex items-start gap-2 text-xs">
                  <Briefcase className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {String(topExp.company ?? topExp.employer ?? "")}
                    </p>
                    <p className="text-muted-foreground truncate">
                      {String(topExp.title ?? topExp.position ?? "")}
                    </p>
                  </div>
                </div>
              ) : null}

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
  );
}
