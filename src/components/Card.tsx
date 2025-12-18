import React from "react";
import clsx from "clsx";

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return <div className={clsx("card rounded-2xl p-4", className)}>{children}</div>;
};
