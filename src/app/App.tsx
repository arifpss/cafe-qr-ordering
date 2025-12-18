import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useAuth } from "../lib/auth";
import { HomePage } from "./HomePage";
import { LoginPage } from "./LoginPage";
import { CustomerOrderPage } from "./CustomerOrderPage";
import { CustomerStatusPage } from "./CustomerStatusPage";
import { CustomerProfilePage } from "./CustomerProfilePage";
import { LeaderboardPage } from "./LeaderboardPage";
import { StaffKitchenPage } from "./StaffKitchenPage";
import { StaffFrontDeskPage } from "./StaffFrontDeskPage";
import { AdminDashboardPage } from "./AdminDashboardPage";
import { NotFoundPage } from "./NotFoundPage";

const RequireAuth: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="py-12 text-center text-[var(--text-muted)]">Loading...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/t/:tableCode" element={<CustomerOrderPage />} />
        <Route path="/order/:orderId" element={<CustomerStatusPage />} />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <CustomerProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/staff/kitchen"
          element={
            <RequireAuth roles={["chef", "admin", "manager"]}>
              <StaffKitchenPage />
            </RequireAuth>
          }
        />
        <Route
          path="/staff/frontdesk"
          element={
            <RequireAuth roles={["employee", "manager", "admin"]}>
              <StaffFrontDeskPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth roles={["admin", "manager"]}>
              <AdminDashboardPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
};

export default App;
