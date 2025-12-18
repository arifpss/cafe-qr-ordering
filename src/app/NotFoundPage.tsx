import React from "react";
import { Link } from "react-router-dom";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="py-12 text-center">
      <h2 className="font-display text-2xl">Page not found</h2>
      <p className="text-sm text-[var(--text-muted)]">The page you requested does not exist.</p>
      <Link className="text-sm text-[var(--primary)]" to="/">
        Go home
      </Link>
    </div>
  );
};
