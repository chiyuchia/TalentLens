import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { getErrorMessage, getErrorTitle, isApiError } from "./errors";
import { useUiStore } from "./ui-store";

type GlobalFeedbackMeta = {
  suppressGlobalError?: boolean;
};

function shouldReportError(error: unknown, meta: unknown) {
  if ((meta as GlobalFeedbackMeta | undefined)?.suppressGlobalError) return false;
  if (isApiError(error) && error.status === 401) return false;
  return true;
}

function reportGlobalError(error: unknown, meta: unknown) {
  if (!shouldReportError(error, meta)) return;

  useUiStore.getState().pushError({
    title: getErrorTitle(error),
    message: getErrorMessage(error),
  });
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      reportGlobalError(error, query.meta);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      reportGlobalError(error, mutation.meta);
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
