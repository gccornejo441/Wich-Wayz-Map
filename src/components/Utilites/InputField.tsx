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
      <label className="block mb-2 text-sm font-medium text-dark">
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
          className={`w-full p-2 border rounded-lg bg-white text-dark ${
            errors[name] ? "border-red-500" : "border-secondary"
          }`}
        />
      )}

      {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
    </div>
  );
}

export default InputField;
