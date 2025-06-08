import {
  FieldValues,
  FieldErrors,
  UseFormRegister,
  Path,
} from "react-hook-form";
import { ChangeEvent } from "react";

interface InputFieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  placeholder?: string;
  type?: string;
  step?: string;
  register?: UseFormRegister<T>;
  errors: FieldErrors<T>;
  value?: string;
  children?: React.ReactNode;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}

function InputField<T extends FieldValues>({
  name,
  label,
  placeholder,
  type = "text",
  step,
  register,
  value,
  errors,
  children,
  onChange,
}: InputFieldProps<T>) {
  const errorMessage = errors[name]?.message
    ? String(errors[name]?.message)
    : null;

  const registered = register?.(name);

  return (
    <div>
      <label className="block mb-2 text-sm font-medium text-text-base dark:text-text-inverted">
        {label}
      </label>

      {children ? (
        children
      ) : (
        <input
          type={type}
          step={step}
          value={value}
          placeholder={placeholder}
          {...registered}
          onChange={(e) => {
            registered?.onChange(e);
            onChange?.(e);
          }}
          className={`w-full p-2 border rounded-lg 
    bg-background dark:bg-surface-dark 
    text-text-base dark:text-text-inverted 
    placeholder:text-text-muted dark:placeholder:text-text-muted 
    ${errors[name]
              ? "border-red-500 dark:border-red-500"
              : "border-secondary dark:border-gray-700"
            }`}
        />
      )}

      {errorMessage && (
        <p className="text-red-500 dark:text-red-400 text-sm mt-1">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export default InputField;
