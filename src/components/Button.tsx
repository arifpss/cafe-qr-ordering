import React from "react";
import clsx from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost";
}

export const Button: React.FC<ButtonProps> = ({ variant = "primary", className, ...props }) => {
  const base =
    "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
  const variants = {
    primary: "btn-primary shadow-md",
    outline: "btn-outline",
    ghost: "text-[var(--text)]"
  };
  return <button className={clsx(base, variants[variant], className)} {...props} />;
};
