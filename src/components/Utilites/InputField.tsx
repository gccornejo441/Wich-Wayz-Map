import {
  FieldValues,
  FieldErrors,
  UseFormRegister,
  Path,
} from "react-hook-form";

interface InputFieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  placeholder?: string;
  type?: string;
  step?: string;
  register?: UseFormRegister<T>;
  errors: FieldErrors<T>;
  children?: React.ReactNode;
}

function InputField<T extends FieldValues>({
  name,
  label,
  placeholder,
  type = "text",
  step,
  register,
  errors,
  children,
}: InputFieldProps<T>) {
  const errorMessage = errors[name]?.message
    ? String(errors[name]?.message)
    : null;

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
          placeholder={placeholder}
          {...register?.(name)}
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
