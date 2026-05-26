import { createBrowserRouter } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { CandidateDetailPage } from "../pages/CandidateDetailPage";
import { CandidatesPage } from "../pages/CandidatesPage";
import { DashboardPage } from "../pages/DashboardPage";
import { JobsPage } from "../pages/JobsPage";
import { LoginPage } from "../pages/LoginPage";
import { UploadPage } from "../pages/UploadPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "upload", element: <UploadPage /> },
          {
            path: "candidates",
            element: <CandidatesPage />,
            handle: { fullWidth: true },
          },
          {
            path: "candidates/:candidateId",
            element: <CandidateDetailPage />,
            handle: { fullWidth: true },
          },
          { path: "jobs", element: <JobsPage />, handle: { fullWidth: true } },
        ],
      },
    ],
  },
]);
