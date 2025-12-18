import React from "react";
import clsx from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className, ...props }) => {
  return (
    <label className="flex w-full flex-col gap-1 text-sm text-[var(--text-muted)]">
      {label && <span>{label}</span>}
      <input
        className={clsx(
          "rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primary)]",
          className
        )}
        {...props}
      />
    </label>
  );
};
