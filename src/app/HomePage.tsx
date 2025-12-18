import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { useI18n } from "../lib/i18n";

export const HomePage: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-[var(--text-muted)]">Scan. Order. Enjoy.</p>
          <h1 className="font-display text-4xl font-semibold leading-tight lg:text-5xl">
            A smarter way to order from your favorite cafe table.
          </h1>
          <p className="max-w-xl text-base text-[var(--text-muted)]">
            Instantly browse the full menu, earn badges, and track your order in real time. Staff gets live updates without any extra hardware.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/login">
            <Button>{t("login")}</Button>
          </Link>
          <Link to="/leaderboard">
            <Button variant="outline">{t("leaderboard")}</Button>
          </Link>
        </div>
      </section>

      <Card className="space-y-4">
        <h2 className="font-display text-xl">Quick start for tables</h2>
        <ol className="space-y-2 text-sm text-[var(--text-muted)]">
          <li>1. Scan the QR at your table.</li>
          <li>2. Create your account in seconds.</li>
          <li>3. Track status updates until served.</li>
        </ol>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs text-[var(--text-muted)]">
          Try a demo table: <Link className="text-[var(--primary)]" to="/t/TBL-0001">TBL-0001</Link>
        </div>
      </Card>
    </div>
  );
};
