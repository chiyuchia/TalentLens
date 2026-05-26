export type ApiErrorOptions = {
  status: number;
  code?: string;
  details?: unknown;
  path?: string;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  path?: string;

  constructor(message: string, options: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.path = options.path;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getErrorMessage(error: unknown, fallback = "操作失败，请稍后重试。"): string {
  if (isApiError(error)) {
    return error.message || fallback;
  }

  if (error instanceof Error) {
    if (error.name === "TypeError" && /fetch|network|failed/i.test(error.message)) {
      return "网络连接异常，请检查服务状态后重试。";
    }
    return error.message || fallback;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

export function getErrorTitle(error: unknown): string {
  if (isApiError(error)) {
    if (error.status >= 500) return "服务异常";
    if (error.status === 401) return "登录状态失效";
    if (error.status === 403) return "没有权限";
    if (error.status === 404) return "资源不存在";
    return "请求失败";
  }

  return "操作失败";
}
