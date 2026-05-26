import { useEffect, useMemo, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { AlertCircle, Loader2, X } from "lucide-react";

import type { GlobalErrorNotice } from "../lib/ui-store";
import { useUiStore } from "../lib/ui-store";
import { getErrorMessage, getErrorTitle } from "../lib/errors";

function useDelayedVisibility(active: boolean, delayMs = 250) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return undefined;
    }

    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);

  return visible;
}

function GlobalErrorToast({ error }: { error: GlobalErrorNotice }) {
  const dismissError = useUiStore((state) => state.dismissError);

  useEffect(() => {
    const timer = window.setTimeout(() => dismissError(error.id), 8000);
    return () => window.clearTimeout(timer);
  }, [dismissError, error.id]);

  return (
    <div
      role="alert"
      className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border border-red-200 bg-white p-4 text-sm text-slate-900 shadow-lg dark:border-red-900/70 dark:bg-slate-950 dark:text-slate-100"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-300" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{error.title}</p>
        <p className="mt-1 break-words text-slate-600 dark:text-slate-300">{error.message}</p>
      </div>
      <button
        type="button"
        onClick={() => dismissError(error.id)}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        aria-label="关闭错误提示"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function GlobalFeedback() {
  const errors = useUiStore((state) => state.errors);
  const loadingCount = useUiStore((state) => state.loadingCount);
  const pushError = useUiStore((state) => state.pushError);
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const pendingCount = isFetching + isMutating + loadingCount;
  const showLoading = useDelayedVisibility(pendingCount > 0);
  const loadingLabel = useMemo(() => (isMutating + loadingCount > 0 ? "正在处理" : "正在加载"), [isMutating, loadingCount]);

  useEffect(() => {
    function handleWindowError(event: ErrorEvent) {
      pushError({
        title: getErrorTitle(event.error),
        message: getErrorMessage(event.error ?? event.message, "页面运行异常，请刷新后重试。"),
      });
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      pushError({
        title: getErrorTitle(event.reason),
        message: getErrorMessage(event.reason),
      });
    }

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [pushError]);

  return (
    <>
      <div
        className={`fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-primary/10 transition-opacity duration-200 ${
          showLoading ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        role="progressbar"
        aria-label={loadingLabel}
        aria-valuetext={loadingLabel}
      >
        <div className="global-loading-bar h-full w-full" />
      </div>

      {showLoading ? (
        <div
          className="pointer-events-none fixed right-4 top-20 z-50 hidden items-center gap-2 rounded-md border border-border bg-background/95 px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur sm:flex"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          {loadingLabel}
        </div>
      ) : null}

      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] flex-col gap-3 sm:top-5 sm:w-auto">
        {errors.map((error) => (
          <GlobalErrorToast key={error.id} error={error} />
        ))}
      </div>
    </>
  );
}
