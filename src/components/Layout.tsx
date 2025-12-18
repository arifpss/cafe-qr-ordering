import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { LanguageToggle } from "./LanguageToggle";

const navBase = "text-sm font-medium transition";
const navActive = "text-[var(--primary)]";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { t } = useI18n();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in srgb,var(--bg) 85%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="font-display text-lg font-semibold tracking-wide text-[var(--text)]">
            {t("appName")}
          </Link>
          <nav className="flex flex-wrap items-center gap-4">
            <NavLink to="/leaderboard" className={({ isActive }) => `${navBase} ${isActive ? navActive : "text-[var(--text-muted)]"}`}>
              {t("leaderboard")}
            </NavLink>
            {user && (
              <NavLink to="/profile" className={({ isActive }) => `${navBase} ${isActive ? navActive : "text-[var(--text-muted)]"}`}>
                {t("profile")}
              </NavLink>
            )}
            {user?.role === "chef" && (
              <NavLink to="/staff/kitchen" className={({ isActive }) => `${navBase} ${isActive ? navActive : "text-[var(--text-muted)]"}`}>
                {t("kitchenView")}
              </NavLink>
            )}
            {user && ["employee", "manager", "admin"].includes(user.role) && (
              <NavLink to="/staff/frontdesk" className={({ isActive }) => `${navBase} ${isActive ? navActive : "text-[var(--text-muted)]"}`}>
                {t("frontDesk")}
              </NavLink>
            )}
            {user && ["admin", "manager"].includes(user.role) && (
              <NavLink to="/admin" className={({ isActive }) => `${navBase} ${isActive ? navActive : "text-[var(--text-muted)]"}`}>
                {t("admin")}
              </NavLink>
            )}
            {!user ? (
              <NavLink to="/login" className={({ isActive }) => `${navBase} ${isActive ? navActive : "text-[var(--text-muted)]"}`}>
                {t("login")}
              </NavLink>
            ) : (
              <button onClick={() => logout()} className="text-sm font-medium text-[var(--text-muted)]">
                {t("logout")}
              </button>
            )}
            <LanguageToggle />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
};
