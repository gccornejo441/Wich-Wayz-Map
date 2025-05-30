import { Checkbox } from "flowbite-react";
import "./CustomCheckbox.css";

interface CustomCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
}

const CustomCheckbox = ({
  id,
  label,
  checked,
  onChange,
  description,
  disabled = false,
}: CustomCheckboxProps) => {
  return (
    <label htmlFor={id} className="flex items-center gap-2 cursor-pointer">
      <div className="relative">
        <Checkbox
          id={id}
          name={id}
          checked={checked}
          disabled={disabled}
          aria-disabled={disabled}
          aria-describedby={description ? `${id}-desc` : undefined}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div
          className={`w-5 h-5 border-2 rounded-sm flex items-center justify-center transition-all duration-200
            ${checked ? "bg-primary animate-checkbox-bounce border-primary" : "border-gray-400"}
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <svg
            className={`w-5 h-5 text-white transform transition-all duration-200 ${
              checked ? "scale-100 opacity-100" : "scale-0 opacity-0"
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <span className="text-sm text-accent">
        {label}
        {description && (
          <span id={`${id}-desc`} className="sr-only">
            {description}
          </span>
        )}
      </span>
    </label>
  );
};

export default CustomCheckbox;
