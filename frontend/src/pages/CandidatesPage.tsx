import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GitCompare,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import { AnimatedPage } from "../components/AnimatedPage";
import {
  CandidateStatusBadge,
  ParseStatusBadge,
} from "../components/StatusBadge";
import { Tag, TagList } from "../components/Tag";
import { TagInput } from "../components/TagInput";
import { candidateApi } from "../lib/api";
import { useCompareStore } from "../lib/compare-store";
import type { CandidateStatus } from "../types/api";

const statusOptions: Array<{ value: "" | CandidateStatus; label: string }> = [
  { value: "", label: "全部状态" },
  { value: "pending", label: "待筛选" },
  { value: "screen_passed", label: "初筛通过" },
  { value: "interviewing", label: "面试中" },
  { value: "hired", label: "已录用" },
  { value: "rejected", label: "已淘汰" },
];

type SortField = "uploaded_at" | "score";
type SortDirection = "asc" | "desc";
type ViewMode = "table" | "card";

const sortFieldOptions: Array<{ value: SortField; label: string }> = [
  { value: "uploaded_at", label: "上传时间" },
  { value: "score", label: "评分" },
];

const sortDirectionOptions: Array<{
  value: SortDirection;
  label: string;
  icon: typeof ArrowDownWideNarrow;
}> = [
  { value: "desc", label: "降序", icon: ArrowDownWideNarrow },
  { value: "asc", label: "升序", icon: ArrowUpWideNarrow },
];

const pageSizeOptionsByView: Record<ViewMode, number[]> = {
  table: [10, 20, 50, 100],
  card: [9, 24, 48, 96],
};

const defaultPageSizeByView: Record<ViewMode, number> = {
  table: 20,
  card: 24,
};

function getVisiblePages(currentPage: number, totalPages: number): number[] {
  const windowSize = 5;
  const start = Math.max(
    1,
    Math.min(currentPage - 2, totalPages - windowSize + 1),
  );
  const end = Math.min(totalPages, start + windowSize - 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function normalizeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  return skills
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function CandidatesPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | CandidateStatus>("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>("uploaded_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>("table");
  const [pageSizeByView, setPageSizeByView] = useState<
    Record<ViewMode, number>
  >(defaultPageSizeByView);
  const {
    selectedIds,
    toggleCandidate,
    selectMany,
    deselectMany,
    clearSelected,
    runCompare,
    isComparing,
  } = useCompareStore();
  const queryClient = useQueryClient();
  const pageSize = pageSizeByView[view];
  const pageSizeOptions = pageSizeOptionsByView[view];
  const sort = `${sortDirection === "desc" ? "-" : ""}${sortField}`;
  const candidatesQuery = useQuery({
    queryKey: [
      "candidates",
      { q, status, skills: selectedSkills, sort, page, pageSize },
    ],
    queryFn: () =>
      candidateApi.list({
        q,
        status,
        skill: selectedSkills,
        sort,
        page,
        page_size: pageSize,
      }),
    placeholderData: (previousData) => previousData,
  });

  const deleteMutation = useMutation({
    mutationFn: candidateApi.delete,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });

  const candidates = useMemo(
    () => candidatesQuery.data?.items ?? [],
    [candidatesQuery.data?.items],
  );
  const total = candidatesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageStart = total ? (page - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(page * pageSize, total);
  const visiblePages = getVisiblePages(page, totalPages);
  const selectedSkillKeys = useMemo(
    () => new Set(selectedSkills.map((item) => item.toLowerCase())),
    [selectedSkills],
  );
  const skillSuggestions = useMemo(() => {
    const counts = new Map<string, number>();
    candidates.forEach((candidate) => {
      candidate.skills.forEach((item) => {
        const normalized = item.trim();
        if (!normalized || selectedSkillKeys.has(normalized.toLowerCase()))
          return;
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      });
    });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([item]) => item);
  }, [candidates, selectedSkillKeys]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function resetToFirstPage() {
    setPage(1);
  }

  function clearKeyword() {
    setQ("");
    resetToFirstPage();
  }

  function handleViewChange(nextView: ViewMode) {
    if (nextView === view) return;
    setView(nextView);
    resetToFirstPage();
  }

  function updateSkillFilters(nextSkills: string[]) {
    setSelectedSkills(normalizeSkills(nextSkills));
    resetToFirstPage();
  }

  function addSkillFilter(nextSkill: string) {
    updateSkillFilters([...selectedSkills, nextSkill]);
  }

  function removeSkillFilter(nextSkill: string) {
    updateSkillFilters(
      selectedSkills.filter(
        (item) => item.toLowerCase() !== nextSkill.toLowerCase(),
      ),
    );
  }

  function clearSkills() {
    setSelectedSkills([]);
    resetToFirstPage();
  }

  return (
    <AnimatedPage>
      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-in-down">
          <div>
            <h2 className="text-2xl font-semibold">候选人</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              搜索、筛选与状态管理
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                resetToFirstPage();
              }}
              className={`h-10 w-full rounded-md border border-border bg-background pl-9 text-sm outline-none focus:ring-2 focus:ring-primary ${q ? "pr-9" : "pr-3"}`}
              placeholder="搜索姓名、技能、学校等"
              aria-label="关键字搜索"
            />
            {q ? (
              <button
                type="button"
                onClick={clearKeyword}
                className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="清空关键字搜索"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-4 animate-fade-in-up-1">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(14rem,18rem)_minmax(18rem,1fr)]">
              <label className="block text-sm">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <SlidersHorizontal className="h-3.5 w-3.5" /> 候选状态
                </span>
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as "" | CandidateStatus);
                    resetToFirstPage();
                  }}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="block text-sm">
                <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  技能标签筛选
                </span>
                <div className="flex min-w-0 gap-2">
                  <TagInput
                    value={selectedSkills}
                    onChange={updateSkillFilters}
                    placeholder="输入技能后按 Enter"
                    inputLabel="技能标签筛选"
                    className="min-w-0 flex-1"
                  />
                  <button
                    type="button"
                    onClick={clearSkills}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!selectedSkills.length}
                    aria-label="清空技能筛选"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 xl:justify-end">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  排序字段
                </p>
                <div className="inline-flex overflow-hidden rounded-md border border-border bg-background">
                  {sortFieldOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSortField(option.value);
                        resetToFirstPage();
                      }}
                      className={`h-10 px-3 text-sm font-medium transition-colors ${
                        sortField === option.value
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  排序方式
                </p>
                <div className="inline-flex overflow-hidden rounded-md border border-border bg-background">
                  {sortDirectionOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSortDirection(option.value);
                          resetToFirstPage();
                        }}
                        className={`inline-flex h-10 items-center gap-1.5 px-3 text-sm font-medium transition-colors ${
                          sortDirection === option.value
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  视图
                </p>
                <div className="inline-flex overflow-hidden rounded-md border border-border bg-background">
                  <button
                    type="button"
                    onClick={() => handleViewChange("table")}
                    className={`h-10 px-3 transition-colors duration-200 ${view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                    aria-label="表格视图"
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewChange("card")}
                    className={`h-10 px-3 transition-colors duration-200 ${view === "card" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                    aria-label="卡片视图"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <span className="text-xs font-medium text-muted-foreground">
              当前结果：{total} 人
            </span>
            {total > 0 ? (
              <span className="text-xs text-muted-foreground">
                当前显示 {pageStart}-{pageEnd}
              </span>
            ) : null}
            {q ? (
              <button
                type="button"
                onClick={clearKeyword}
                className="inline-flex max-w-full items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-medium text-primary transition hover:bg-primary/15"
              >
                <span className="truncate">关键字：{q}</span>
                <X className="h-3 w-3 shrink-0" />
              </button>
            ) : null}
            {selectedSkills.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => removeSkillFilter(item)}
                className="inline-flex max-w-full items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-medium text-primary transition hover:bg-primary/15"
              >
                <span className="truncate">技能：{item}</span>
                <X className="h-3 w-3 shrink-0" />
              </button>
            ))}
            {skillSuggestions.length ? (
              <>
                <span className="ml-0 text-xs text-muted-foreground sm:ml-2">
                  常见技能
                </span>
                {skillSuggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => addSkillFilter(item)}
                    className="transition hover:-translate-y-0.5"
                    aria-label={`添加技能筛选 ${item}`}
                  >
                    <Tag>{item}</Tag>
                  </button>
                ))}
              </>
            ) : null}
          </div>
        </div>
        {candidatesQuery.isLoading ? (
          <div className="h-48 rounded-lg bg-muted skeleton-shimmer" />
        ) : null}
        {!candidatesQuery.isLoading && candidates.length === 0 ? (
          <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground animate-fade-in">
            <Link
              className="hover:text-foreground transition-colors"
              to="/upload"
            >
              暂无候选人，前往上传
            </Link>
          </div>
        ) : null}
        {view === "table" && candidates.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border animate-fade-in-up-2">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="w-10 px-2 py-3">
                    <input
                      type="checkbox"
                      checked={
                        candidates.length > 0 &&
                        candidates.every((c) => selectedIds.includes(c.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newIds = candidates
                            .map((c) => c.id)
                            .filter(
                              (id, i) =>
                                !selectedIds.includes(id) &&
                                selectedIds.length + i < 3,
                            )
                            .slice(0, 3 - selectedIds.length);
                          selectMany(newIds);
                        } else {
                          deselectMany(candidates.map((c) => c.id));
                        }
                      }}
                      className="accent-primary"
                      aria-label="全选当前页"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">姓名</th>
                  <th className="px-4 py-3 font-medium">技能</th>
                  <th className="px-4 py-3 font-medium">评分</th>
                  <th className="px-4 py-3 font-medium">解析</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {candidates.map((candidate, index) => {
                  const isSelected = selectedIds.includes(candidate.id);
                  const isMaxReached = selectedIds.length >= 3 && !isSelected;
                  return (
                    <tr
                      key={candidate.id}
                      className={`table-row-hover hover:bg-muted/30 ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                      style={{
                        animation: `fade-in-up 0.4s ease-out ${0.04 * Math.min(index, 12)}s both`,
                      }}
                    >
                      <td className="px-2 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isMaxReached}
                          onChange={() => toggleCandidate(candidate.id)}
                          className="accent-primary"
                          aria-label={`选择 ${candidate.name || candidate.original_filename}`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          className="font-medium hover:text-primary transition-colors"
                          to={`/candidates/${candidate.id}`}
                        >
                          {candidate.name || candidate.original_filename}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {candidate.email || candidate.city}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <TagList
                          items={candidate.skills}
                          limit={4}
                          className="max-w-sm"
                        />
                      </td>
                      <td className="px-4 py-4">
                        {candidate.total_score ?? "--"}
                      </td>
                      <td className="px-4 py-4">
                        <ParseStatusBadge status={candidate.parse_status} />
                      </td>
                      <td className="px-4 py-4">
                        <CandidateStatusBadge status={candidate.status} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`确定要删除候选人「${candidate.name || candidate.original_filename}」吗？`)) {
                              deleteMutation.mutate(candidate.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="rounded-md p-2 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                          aria-label="删除候选人"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {view === "card" && candidates.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 stagger-children">
            {candidates.map((candidate) => {
              const isSelected = selectedIds.includes(candidate.id);
              const isMaxReached = selectedIds.length >= 3 && !isSelected;
              return (
                <div
                  key={candidate.id}
                  className={`card-hover relative rounded-lg border p-4 transition-colors ${
                    isSelected
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  <div className="absolute right-3 top-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isMaxReached}
                      onChange={() => toggleCandidate(candidate.id)}
                      className="accent-primary h-4 w-4"
                      aria-label={`选择 ${candidate.name || candidate.original_filename}`}
                    />
                  </div>
                  <Link to={`/candidates/${candidate.id}`} className="block">
                    <div className="flex items-start justify-between gap-3 pr-6">
                      <div>
                        <p className="font-medium">
                          {candidate.name || candidate.original_filename}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {candidate.email || candidate.city || "暂无联系方式"}
                        </p>
                      </div>
                    </div>
                    <TagList
                      items={candidate.skills}
                      limit={5}
                      className="mt-4"
                    />
                    <p className="mt-4 text-sm text-muted-foreground">
                      评分：{candidate.total_score ?? "--"}
                    </p>
                  </Link>
                  <div className="mt-3 flex items-center justify-between">
                    <CandidateStatusBadge status={candidate.status} />
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`确定要删除候选人「${candidate.name || candidate.original_filename}」吗？`)) {
                          deleteMutation.mutate(candidate.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="rounded-md p-1.5 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                      aria-label="删除候选人"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        {total > 0 ? (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <span>
                第 {page} / {totalPages} 页
              </span>
              <span>共 {total} 人</span>
              {candidatesQuery.isFetching ? (
                <span className="text-primary">更新中...</span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-muted-foreground">
                <span>每页</span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSizeByView((current) => ({
                      ...current,
                      [view]: Number(event.target.value),
                    }));
                    resetToFirstPage();
                  }}
                  className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-primary"
                >
                  {pageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <div className="inline-flex overflow-hidden rounded-md border border-border bg-background">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={page === 1 || candidatesQuery.isFetching}
                  className="inline-flex h-9 w-9 items-center justify-center text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="第一页"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1 || candidatesQuery.isFetching}
                  className="inline-flex h-9 w-9 items-center justify-center border-l border-border text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="上一页"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {visiblePages.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    disabled={candidatesQuery.isFetching}
                    className={`h-9 min-w-9 border-l border-border px-3 text-sm font-medium transition ${
                      page === item
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    }`}
                    aria-label={`第 ${item} 页`}
                    aria-current={page === item ? "page" : undefined}
                  >
                    {item}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page === totalPages || candidatesQuery.isFetching}
                  className="inline-flex h-9 w-9 items-center justify-center border-l border-border text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="下一页"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages || candidatesQuery.isFetching}
                  className="inline-flex h-9 w-9 items-center justify-center border-l border-border text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="最后一页"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {selectedIds.length > 0 ? (
          <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-lg border border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur animate-fade-in-up">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                已选 {selectedIds.length} 人
              </span>
              <button
                type="button"
                onClick={clearSelected}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                清空
              </button>
            </div>
            <button
              type="button"
              onClick={() => runCompare()}
              disabled={selectedIds.length < 2 || isComparing}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60 hover:opacity-90 transition-opacity"
            >
              <GitCompare className="h-4 w-4" />
              {isComparing ? "对比中..." : "开始对比"}
            </button>
          </div>
        ) : null}
      </section>
    </AnimatedPage>
  );
}
