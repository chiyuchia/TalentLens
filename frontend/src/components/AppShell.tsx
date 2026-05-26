import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Menu,
  Moon,
  Sun,
  Upload,
  Users,
  X,
} from "lucide-react";
import { NavLink, Outlet, useMatches, useNavigate } from "react-router-dom";

import { authApi } from "../lib/api";
import { useCompareStore } from "../lib/compare-store";
import { useUiStore } from "../lib/ui-store";
import { CompareResultPanel } from "./CompareResultPanel";
import { ResizableDrawer } from "./ResizableDrawer";

const navItems = [
  { to: "/", label: "总览", icon: BarChart3 },
  { to: "/upload", label: "上传", icon: Upload },
  { to: "/candidates", label: "候选人", icon: Users },
  { to: "/jobs", label: "岗位", icon: BriefcaseBusiness },
];

type AppRouteHandle = {
  fullWidth?: boolean;
};

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { theme, toggleTheme } = useUiStore();
  const navigate = useNavigate();
  const matches = useMatches();
  const isFullWidth = matches.some((match) =>
    Boolean((match.handle as AppRouteHandle | undefined)?.fullWidth),
  );
  const queryClient = useQueryClient();
  const {
    selectedIds,
    drawerOpen,
    compareResult,
    compareError,
    isComparing,
    closeDrawer,
    clearSelected,
    runCompare,
  } = useCompareStore();
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
      navigate("/login", { replace: true });
    },
  });

  function closeSidebar() {
    setSidebarOpen(false);
  }

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const editing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (editing) return;
      if (event.key === "/") {
        event.preventDefault();
        navigate("/candidates");
        window.setTimeout(
          () =>
            document
              .querySelector<HTMLInputElement>('input[placeholder*="搜索"]')
              ?.focus(),
          0,
        );
      }
      if (event.key === "u") navigate("/upload");
      if (event.key === "j") navigate("/jobs");
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 hidden border-r border-border bg-muted/40 p-4 transition-all duration-300 ease-in-out lg:block ${
          sidebarCollapsed ? "w-16" : "w-56"
        }`}
      >
        <div className={`mb-8 flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"}`}>
          {!sidebarCollapsed && (
            <div>
              <p className="text-xl font-semibold">TalentLens</p>
              <p className="mt-1 text-sm text-muted-foreground">智能简历分析平台</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent transition-transform hover:scale-105 shrink-0"
            aria-label={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
          >
            {sidebarCollapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        </div>
        <nav className="space-y-1">
          {navItems.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                [
                  "nav-indicator flex items-center rounded-md py-2 text-sm transition-all duration-200",
                  sidebarCollapsed ? "justify-center px-2" : "gap-3 px-3",
                  isActive
                    ? "active bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:translate-x-0.5",
                ].join(" ")
              }
              style={{
                animation: `fade-in-up 0.35s ease-out ${0.05 + index * 0.04}s both`,
              }}
              title={item.label}
            >
              <item.icon aria-hidden className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={closeSidebar}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-56 border-r border-border bg-background p-4 lg:hidden animate-fade-in-left">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xl font-semibold">TalentLens</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  智能简历分析平台
                </p>
              </div>
              <button
                type="button"
                onClick={closeSidebar}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-accent"
                aria-label="关闭导航"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    ].join(" ")
                  }
                >
                  <item.icon aria-hidden className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        </>
      )}

      <div className={`transition-all duration-300 ease-in-out ${sidebarCollapsed ? "lg:pl-16" : "lg:pl-56"}`}>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:px-8 animate-fade-in-down">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border hover:bg-accent transition-transform hover:scale-105 lg:hidden"
              aria-label="展开导航"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div>
              <p className="text-sm text-muted-foreground">招聘工作台</p>
              <h1 className="text-lg font-semibold">TalentLens</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border hover:bg-accent transition-transform hover:scale-105"
              aria-label="切换主题"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border hover:bg-accent transition-transform hover:scale-105"
              aria-label="退出登录"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main
          className={`w-full px-4 py-6 lg:px-8 ${isFullWidth ? "" : "mx-auto max-w-7xl"}`}
        >
          <Outlet />
        </main>
      </div>

      <ResizableDrawer
        open={drawerOpen}
        onClose={() => {
          closeDrawer();
          clearSelected();
        }}
        title="候选人对比"
        defaultWidth={Math.min(
          1200,
          Math.max(
            600,
            (compareResult?.candidates.length ?? selectedIds.length) *
              320 +
              ((compareResult?.candidates.length ?? selectedIds.length) -
                1) *
                12 +
              32,
          ),
        )}
      >
        <CompareResultPanel
          candidates={compareResult?.candidates ?? []}
          empty={
            <p className="mt-2 text-xs text-muted-foreground text-center">
              {isComparing
                ? "对比中..."
                : compareError
                  ? compareError.message
                  : "选择 2-3 名候选人后点击「开始对比」"}
            </p>
          }
        />
      </ResizableDrawer>
    </div>
  );
}
