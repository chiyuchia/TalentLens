import type { CandidateStatus } from "../types/api";
import { parseStatusLabels, statusLabels } from "../lib/format";

const statusClass: Record<CandidateStatus, string> = {
  pending: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  screen_passed: "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  interviewing: "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  hired: "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  rejected: "border-red-200 bg-red-100 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
};

const parseStatusClass: Record<string, string> = {
  uploaded: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  parsing: "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200",
  extracting: "border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200",
  completed:
    "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  failed: "border-red-200 bg-red-100 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
};

export function CandidateStatusBadge({ status }: { status: CandidateStatus }) {
  return (
    <span className={`inline-flex shrink-0 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium ${statusClass[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

export function ParseStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium ${
        parseStatusClass[status] ?? "border-border bg-muted text-muted-foreground"
      }`}
    >
      {parseStatusLabels[status] ?? status}
    </span>
  );
}
