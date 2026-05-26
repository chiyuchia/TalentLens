import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, UploadCloud } from "lucide-react";

import { AnimatedPage } from "../components/AnimatedPage";
import { EmptyState } from "../components/EmptyState";
import { ParseStatusBadge } from "../components/StatusBadge";
import { ResumeStreamViewer } from "../components/ResumeStreamViewer";
import { Skeleton } from "../components/Skeleton";
import { API_PREFIX, uploadApi } from "../lib/api";
import type { CandidateDetail, CandidateSummary } from "../types/api";

type QueueItem = CandidateSummary & {
  message?: string;
};

const MAX_UPLOAD_FILES = 5;

function UploadQueueSkeleton() {
  return (
    <div className="rounded-lg border border-border animate-fade-in" role="status" aria-live="polite" aria-label="正在创建解析队列">
      <span className="sr-only">正在创建解析队列</span>
      <div className="border-b border-border px-4 py-3">
        <Skeleton className="h-5 w-24 skeleton-shimmer" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-4 p-4" style={{ animation: `fade-in-up 0.4s ease-out ${0.1 * index}s both` }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Skeleton className="mt-1 h-5 w-5 rounded skeleton-shimmer" />
                <div className="space-y-2">
                  <Skeleton className={`h-4 skeleton-shimmer ${index === 0 ? "w-48" : "w-40"}`} />
                  <Skeleton className="h-3 w-56 max-w-full skeleton-shimmer" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full skeleton-shimmer" />
            </div>
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-slate-900/40 lg:grid-cols-12">
              <div className="space-y-3 lg:col-span-7">
                <Skeleton className="h-10 w-full rounded-xl skeleton-shimmer" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Skeleton className="h-16 w-full rounded-xl skeleton-shimmer" />
                  <Skeleton className="h-16 w-full rounded-xl skeleton-shimmer" />
                </div>
                <Skeleton className="h-20 w-full rounded-xl skeleton-shimmer" />
              </div>
              <div className="space-y-2 rounded-xl bg-slate-950 p-4 lg:col-span-5">
                <Skeleton className="h-3 w-4/5 rounded-sm bg-cyan-400/10 dark:bg-cyan-400/10" />
                <Skeleton className="h-3 w-11/12 rounded-sm bg-cyan-400/10 dark:bg-cyan-400/10" />
                <Skeleton className="h-3 w-2/3 rounded-sm bg-cyan-400/10 dark:bg-cyan-400/10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UploadPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [error, setError] = useState("");
  const [streams, setStreams] = useState<Record<number, string>>({});
  const inputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: uploadApi.uploadResumes,
    onSuccess: (data) => {
      setStreams({});
      setQueue(data.candidates);
      subscribeToUpload(data.upload_id);
      void queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  function handleFiles(files: FileList | File[]) {
    const selected = Array.from(files).filter(
      (file) => file.type === "application/pdf" || file.name.endsWith(".pdf"),
    );
    setError("");
    if (!selected.length) {
      setError("请选择 PDF 文件。");
      return;
    }
    if (selected.length > MAX_UPLOAD_FILES) {
      setError(`单次最多上传 ${MAX_UPLOAD_FILES} 个 PDF 文件，请减少后重试。`);
      return;
    }
    uploadMutation.mutate(selected);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) handleFiles(event.target.files);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  }

  function subscribeToUpload(uploadId: string) {
    const source = new EventSource(`${API_PREFIX}/uploads/${uploadId}/events`, { withCredentials: true });
    const updateCandidate = (candidate: CandidateSummary | CandidateDetail, message?: string) => {
      setQueue((current) =>
        current.map((item) => (item.id === candidate.id ? { ...item, ...candidate, message } : item)),
      );
      void queryClient.invalidateQueries({ queryKey: ["candidates"] });
    };

    ["uploaded", "parsing", "extracting", "partial_result", "completed"].forEach((eventName) => {
      source.addEventListener(eventName, (event) => {
        const payload = JSON.parse(event.data) as { candidate?: CandidateSummary | CandidateDetail };
        if (payload.candidate) updateCandidate(payload.candidate);
      });
    });

    source.addEventListener("extract_chunk", (event) => {
      const payload = JSON.parse(event.data) as {
        candidate_id: number;
        chunk: string;
      };
      setStreams((current) => {
        const prev = current[payload.candidate_id] || "";
        return {
          ...current,
          [payload.candidate_id]: prev + payload.chunk,
        };
      });
    });

    source.addEventListener("error", (event) => {
      if ("data" in event && typeof event.data === "string" && event.data) {
        const payload = JSON.parse(event.data) as { candidate?: CandidateSummary; message?: string };
        if (payload.candidate) updateCandidate(payload.candidate, payload.message);
      }
      if (queue.every((item) => item.parse_status === "completed" || item.parse_status === "failed")) {
        source.close();
      }
    });
  }

  return (
    <AnimatedPage>
      <section className="space-y-6">
        <div className="animate-fade-in-down">
          <h2 className="text-2xl font-semibold">上传简历</h2>
          <p className="mt-1 text-sm text-muted-foreground">PDF 批量上传与解析队列</p>
        </div>
        <div
          className="grid min-h-72 place-items-center rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center transition-all duration-300 hover:bg-muted/40 hover:border-primary/40 hover:shadow-lg animate-fade-in-up-1"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <div>
            <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 font-medium">拖拽 PDF 到此处</p>
            <p className="mt-2 text-sm text-muted-foreground">支持批量上传，单次最多 5 份 PDF 简历</p>
            <input
              ref={inputRef}
              className="hidden"
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleInputChange}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:opacity-90 transition-opacity"
            >
              选择文件
            </button>
          </div>
        </div>
        {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 animate-fade-in">{error}</p> : null}
        {uploadMutation.isPending ? (
          <UploadQueueSkeleton />
        ) : queue.length ? (
          <div className="rounded-lg border border-border animate-fade-in-up-2">
            <div className="border-b border-border px-4 py-3 font-medium">解析队列</div>
            <div className="divide-y divide-border">
              {queue.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 flex flex-col"
                  style={{ animation: `fade-in-up 0.4s ease-out ${0.06 * index}s both` }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <FileText className="mt-1 h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{item.name || item.original_filename}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.message || item.error_message || item.email || "等待处理"}</p>
                      </div>
                    </div>
                    <ParseStatusBadge status={item.parse_status} />
                  </div>
                  {/* Real-time Streaming Area */}
                  {(item.parse_status === "extracting" || streams[item.id]) && (
                    <ResumeStreamViewer
                      streamText={streams[item.id] || ""}
                      isCompleted={item.parse_status === "completed"}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState title="暂无上传任务" description="上传后会在这里展示每份简历的解析状态" />
        )}
      </section>
    </AnimatedPage>
  );
}
