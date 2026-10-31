import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../../layouts/adminlayout";
import CategoriesPage from "../admin/CategoryCard";
import ReportsPage from "../admin/index";
import UsersPage from "../admin/StatCard";
import VerificationPage from "../admin/VerificationPage";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<ReportsPage />} />
          <Route path="verifications" element={<VerificationPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
