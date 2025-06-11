interface CheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
  disabled?: boolean;
}

const SimpleCheckbox = ({
  id,
  label,
  checked,
  onChange,
  description,
  disabled = false,
}: CheckboxProps) => (
  <label
    htmlFor={id}
    className={`inline-flex items-center gap-2 ${
      disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
    }`}
  >
    <input
      id={id}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      aria-describedby={description ? `${id}-desc` : undefined}
      onChange={(e) => onChange(e.target.checked)}
      className={`
        appearance-none h-5 w-5 rounded-md border-2 focus:ring-0 
        transition-colors duration-200 ease-in-out text-2xl
        border-brand-primaryBorder dark:border-brand-secondaryBorder
        bg-transparent
        checked:bg-brand-primary checked:border-brand-primary
        dark:checked:bg-brand-primary dark:checked:border-brand-primary
      `}
    />

    <span className="text-sm text-text-base dark:text-text-inverted">
      {label}
      {description && (
        <span id={`${id}-desc`} className="sr-only">
          {description}
        </span>
      )}
    </span>
  </label>
);

export default SimpleCheckbox;
