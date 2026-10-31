import "@/styles/global.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import AdminLayout from "@/layouts/adminlayout";
import HomeAdmin from "@/page/admin/index";
import VerificationPage from "@/page/admin/VerificationPage";
import CategoriesPage from "@/page/admin/CategoryCard";
import UsersPage from "@/page/admin/StatCard";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<HomeAdmin />} />
          <Route path="/reports" element={<HomeAdmin />} />
          <Route path="/verifications" element={<VerificationPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/admin" element={<Navigate to="/" replace />} />
          <Route path="/admin/reports" element={<Navigate to="/reports" replace />} />
          <Route path="/admin/verifications" element={<Navigate to="/verifications" replace />} />
          <Route path="/admin/categories" element={<Navigate to="/categories" replace />} />
          <Route path="/admin/users" element={<Navigate to="/users" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);