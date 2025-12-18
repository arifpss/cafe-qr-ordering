import React from "react";
import clsx from "clsx";

export const Badge: React.FC<{ label: string; className?: string }> = ({ label, className }) => {
  return (
    <span className={clsx("badge inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", className)}>
      {label}
    </span>
  );
};
