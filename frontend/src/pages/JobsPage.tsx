import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

import { AnimatedPage } from "../components/AnimatedPage";
import { TagInput } from "../components/TagInput";
import { jobsApi } from "../lib/api";
import type { JobDescription } from "../types/api";

type JobForm = {
  title: string;
  description: string;
  required_skills: string[];
  bonus_skills: string[];
};

const emptyJobForm: JobForm = {
  title: "",
  description: "",
  required_skills: [],
  bonus_skills: [],
};

export function JobsPage() {
  const queryClient = useQueryClient();
  const jobsQuery = useQuery({ queryKey: ["jobs"], queryFn: jobsApi.list });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<JobForm>(emptyJobForm);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title,
        description: form.description,
        required_skills: form.required_skills,
        bonus_skills: form.bonus_skills,
      };
      return editingId ? jobsApi.update(editingId, payload) : jobsApi.create(payload);
    },
    onSuccess: async () => {
      setEditingId(null);
      setForm(emptyJobForm);
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: jobsApi.delete,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });

  function editJob(job: JobDescription) {
    setEditingId(job.id);
    setForm({
      title: job.title,
      description: job.description,
      required_skills: [...job.required_skills],
      bonus_skills: [...job.bonus_skills],
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate();
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "j" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        document.getElementById("job-title")?.focus();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <AnimatedPage>
      <section className="space-y-6">
        <div className="animate-fade-in-down">
          <h2 className="text-2xl font-semibold">岗位管理</h2>
          <p className="mt-1 text-sm text-muted-foreground">岗位描述、必备技能与加分技能</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-muted/20 p-5 animate-fade-in-up-1">
            <input
              id="job-title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="h-11 w-full rounded-md border border-border bg-background px-3"
              placeholder="岗位名称"
            />
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="min-h-72 w-full rounded-md border border-border bg-background p-4 outline-none focus:ring-2 focus:ring-primary"
              placeholder="输入岗位描述"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="text-muted-foreground">必备技能</span>
                <TagInput
                  value={form.required_skills}
                  onChange={(required_skills) => setForm((current) => ({ ...current, required_skills }))}
                  className="mt-1"
                  placeholder="添加必备技能"
                  inputLabel="必备技能"
                />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">加分技能</span>
                <TagInput
                  value={form.bonus_skills}
                  onChange={(bonus_skills) => setForm((current) => ({ ...current, bonus_skills }))}
                  className="mt-1"
                  placeholder="添加加分技能"
                  inputLabel="加分技能"
                />
              </label>
            </div>
            {saveMutation.isError ? <p className="text-sm text-red-600 animate-fade-in">{saveMutation.error.message}</p> : null}
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
              {editingId ? "保存岗位" : "创建岗位"}
            </button>
          </form>
          <div className="rounded-lg border border-border bg-muted/20 p-5 animate-fade-in-up-2">
            <h3 className="font-medium">岗位列表</h3>
            <div className="mt-5 space-y-3 stagger-children">
              {jobsQuery.isLoading ? <div className="h-24 rounded-md bg-muted skeleton-shimmer" /> : null}
              {(jobsQuery.data?.items ?? []).map((job) => (
                <div key={job.id} className="card-hover rounded-md border border-border bg-background p-3">
                  <button type="button" onClick={() => editJob(job)} className="text-left font-medium hover:text-primary transition-colors">
                    {job.title}
                  </button>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{job.required_skills.length} 必备技能</span>
                    <button type="button" onClick={() => deleteMutation.mutate(job.id)} className="rounded-md p-2 text-red-600 hover:bg-red-50 transition-colors" aria-label="删除岗位">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {!jobsQuery.isLoading && !jobsQuery.data?.items.length ? <p className="text-sm text-muted-foreground animate-fade-in">暂无岗位</p> : null}
            </div>
          </div>
        </div>
      </section>
    </AnimatedPage>
  );
}
