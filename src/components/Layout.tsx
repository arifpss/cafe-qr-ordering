import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Badge } from "./Badge";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { LanguageToggle } from "./LanguageToggle";

const navBase = "text-sm font-medium transition";
const navActive = "text-[var(--primary)]";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

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
            {user && ["admin", "manager", "employee"].includes(user.role) && (
              <NavLink to="/admin/orders" className={({ isActive }) => `${navBase} ${isActive ? navActive : "text-[var(--text-muted)]"}`}>
                {t("allOrders")}
              </NavLink>
            )}
            <LanguageToggle />
            {!user ? (
              <NavLink to="/login" className={({ isActive }) => `${navBase} ${isActive ? navActive : "text-[var(--text-muted)]"}`}>
                {t("login")}
              </NavLink>
            ) : (
              <div className="relative" ref={menuRef}>
                <button
                  className="flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1 text-left"
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <div className="text-xs">
                    <p className="text-sm font-semibold text-[var(--text)]">{user.username ?? user.phone}</p>
                    <p className="text-[var(--text-muted)]">{user.name}</p>
                  </div>
                  <Badge label={user.role === "customer" ? user.badge.displayName : user.role.toUpperCase()} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 text-sm shadow-lg">
                    <NavLink
                      to="/profile"
                      className={({ isActive }) =>
                        `block rounded-lg px-3 py-2 ${isActive ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-2)]"}`
                      }
                    >
                      {t("profile")}
                    </NavLink>
                    <button
                      onClick={() => logout()}
                      className="mt-1 w-full rounded-lg px-3 py-2 text-left hover:bg-[var(--surface-2)]"
                    >
                      {t("logout")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
};
