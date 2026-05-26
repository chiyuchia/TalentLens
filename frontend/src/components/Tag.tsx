import type { ReactNode } from "react";

type TagTone = "skill" | "muted";

const toneClass: Record<TagTone, string> = {
  skill:
    "border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-950/50 dark:bg-indigo-950/30 dark:text-indigo-300",
  muted:
    "border-border bg-background text-muted-foreground dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400",
};

type TagProps = {
  children: ReactNode;
  className?: string;
  tone?: TagTone;
};

export function Tag({ children, className = "", tone = "skill" }: TagProps) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-md border px-2 py-1 text-xs font-medium leading-5 ${toneClass[tone]} ${className}`}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

type TagListProps = {
  items: string[];
  limit?: number;
  emptyText?: string;
  className?: string;
};

export function TagList({ items, limit, emptyText = "--", className = "" }: TagListProps) {
  const visibleItems = limit ? items.slice(0, limit) : items;
  const hiddenCount = limit ? Math.max(items.length - limit, 0) : 0;

  if (!items.length) {
    return <span className="text-sm text-muted-foreground">{emptyText}</span>;
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {visibleItems.map((item, index) => (
        <Tag key={`${item}-${index}`}>{item}</Tag>
      ))}
      {hiddenCount > 0 ? <Tag tone="muted">+{hiddenCount}</Tag> : null}
    </div>
  );
}
