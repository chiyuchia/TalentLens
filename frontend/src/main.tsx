import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";

import { router } from "./app/router";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GlobalFeedback } from "./components/GlobalFeedback";
import { queryClient } from "./lib/query-client";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <GlobalFeedback />
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>,
);
