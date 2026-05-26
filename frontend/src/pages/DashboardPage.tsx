import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, FileText, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { AnimatedPage } from "../components/AnimatedPage";
import { candidateApi, jobsApi } from "../lib/api";
import { statusLabels } from "../lib/format";

export function DashboardPage() {
  const candidatesQuery = useQuery({
    queryKey: ["candidates", "dashboard"],
    queryFn: () =>
      candidateApi.list({ page: 1, page_size: 100, sort: "-uploaded_at" }),
  });
  const jobsQuery = useQuery({ queryKey: ["jobs"], queryFn: jobsApi.list });
  const candidates = useMemo(
    () => candidatesQuery.data?.items ?? [],
    [candidatesQuery.data?.items],
  );
  const scored = candidates.filter(
    (candidate) => typeof candidate.total_score === "number",
  );
  const averageScore = scored.length
    ? Math.round(
        scored.reduce(
          (sum, candidate) => sum + (candidate.total_score ?? 0),
          0,
        ) / scored.length,
      )
    : null;

  const metrics = [
    {
      label: "候选人",
      value: String(candidatesQuery.data?.total ?? 0),
      icon: Users,
    },
    {
      label: "已解析",
      value: String(
        candidates.filter((candidate) => candidate.parse_status === "completed")
          .length,
      ),
      icon: FileText,
    },
    {
      label: "平均分",
      value: averageScore === null ? "--" : String(averageScore),
      icon: TrendingUp,
    },
    {
      label: "岗位",
      value: String(jobsQuery.data?.items.length ?? 0),
      icon: BarChart3,
    },
  ];
  const statusData = useMemo(
    () =>
      Object.entries(statusLabels)
        .map(([status, label]) => ({
          status,
          label,
          value: candidates.filter((candidate) => candidate.status === status)
            .length,
        }))
        .filter((item) => item.value > 0),
    [candidates],
  );
  const scoreData = candidates
    .filter((candidate) => typeof candidate.total_score === "number")
    .slice(0, 8)
    .map((candidate) => ({
      name: candidate.name || `#${candidate.id}`,
      score: candidate.total_score ?? 0,
    }));

  return (
    <AnimatedPage>
      <section className="space-y-6">
        <div className="animate-fade-in-down">
          <h2 className="text-2xl font-semibold">总览</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            候选人解析和评分概况
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, index) => (
            <div
              key={metric.label}
              className="card-hover rounded-lg border border-border bg-muted/30 p-5"
              style={{
                animation: `fade-in-up 0.45s ease-out ${0.05 + index * 0.07}s both`,
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <metric.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-4 text-3xl font-semibold">{metric.value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-6 animate-fade-in-up-3">
          <h3 className="text-lg font-medium">数据分布</h3>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <div className="h-80 rounded-md border border-border bg-background p-4 animate-fade-in-up-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                候选人状态分布
              </h4>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="label"
                    outerRadius={80}
                    label={({ label, value, percent }) =>
                      `${label}: ${value} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {statusData.map((item, index) => (
                      <Cell
                        key={item.status}
                        fill={
                          [
                            "#0f766e",
                            "#2563eb",
                            "#d97706",
                            "#16a34a",
                            "#dc2626",
                          ][index]
                        }
                      />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip
                    formatter={(value, _name, props) => [
                      `${value} 人 (${((props?.payload?.percent ?? 0) * 100).toFixed(0)}%)`,
                      props?.payload?.label ?? "数量",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="h-80 rounded-md border border-border bg-background p-4 animate-fade-in-up-5">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                候选人评分
              </h4>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={scoreData}>
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    formatter={(value) => [value, "评分"]}
                    labelFormatter={(label) => `候选人：${label}`}
                  />
                  <Bar dataKey="score" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-6 animate-fade-in-up-5">
          <h3 className="text-lg font-medium">最近上传</h3>
          <div className="mt-4 divide-y divide-border rounded-md border border-border bg-background">
            {candidates.slice(0, 6).map((candidate, index) => (
              <div
                key={candidate.id}
                className="flex items-center justify-between px-4 py-3 text-sm table-row-hover hover:bg-muted/30"
                style={{
                  animation: `fade-in-up 0.35s ease-out ${0.05 * index}s both`,
                }}
              >
                <Link
                  className="hover:text-primary transition-colors"
                  to={`/candidates/${candidate.id}`}
                >
                  {candidate.name || candidate.original_filename}
                </Link>
                <span className="text-muted-foreground">
                  {candidate.total_score ?? "--"}
                </span>
              </div>
            ))}
            {!candidates.length ? (
              <div className="p-6 text-sm text-muted-foreground animate-fade-in">
                暂无候选人
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </AnimatedPage>
  );
}
