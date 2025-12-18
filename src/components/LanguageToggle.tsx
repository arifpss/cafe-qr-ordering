import React from "react";
import { useI18n } from "../lib/i18n";

export const LanguageToggle: React.FC = () => {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--border)] px-2 py-1">
      <button
        className={`text-xs font-semibold ${lang === "en" ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}`}
        onClick={() => setLang("en")}
      >
        EN
      </button>
      <span className="text-xs text-[var(--text-muted)]">/</span>
      <button
        className={`text-xs font-semibold ${lang === "bn" ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}`}
        onClick={() => setLang("bn")}
      >
        বাংলা
      </button>
    </div>
  );
};
