import type { CandidateStatus } from "../types/api";

export const statusLabels: Record<CandidateStatus, string> = {
  pending: "待筛选",
  screen_passed: "初筛通过",
  interviewing: "面试中",
  hired: "已录用",
  rejected: "已淘汰",
};

export const parseStatusLabels: Record<string, string> = {
  uploaded: "已上传",
  parsing: "解析中",
  extracting: "AI 提取中",
  completed: "已完成",
  failed: "失败",
};

export function splitSkills(value: string): string[] {
  return value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? [], null, 2);
}

export function parseJsonArray(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

