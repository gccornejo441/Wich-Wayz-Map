import React from "react";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = (props: InputProps) => {
  return (
    <input
      {...props}
      className={cx(
        "h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm text-text-base shadow-sm outline-none",
        "placeholder:text-black/40 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20",
        "dark:border-white/10 dark:bg-surface-darker dark:text-text-inverted dark:placeholder:text-white/40",
        "dark:focus:border-brand-primary dark:focus:ring-brand-primary/25",
        props.className,
      )}
    />
  );
};
