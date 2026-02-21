import React from "react";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

export const Button = ({
  variant = "secondary",
  className,
  ...props
}: ButtonProps) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors " +
    "disabled:cursor-not-allowed disabled:opacity-60";
  const styles = {
    primary:
      "bg-brand-primary text-white hover:bg-brand-secondary dark:hover:bg-brand-secondary",
    secondary:
      "border border-black/10 bg-white text-text-base hover:bg-black/5 " +
      "dark:border-white/10 dark:bg-surface-darker dark:text-text-inverted dark:hover:bg-white/10",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];

  return <button className={cx(base, styles, className)} {...props} />;
};
