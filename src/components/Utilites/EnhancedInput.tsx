import { AddAShopPayload } from "@/types/dataTypes";
import React, { useState } from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { MdClear } from "react-icons/md";

const EnhancedInput = ({
  name,
  placeholder,
  register,
  setValue,
  errors,
  type = "text",
}: {
  name: keyof AddAShopPayload;
  placeholder: string;
  register: UseFormRegister<AddAShopPayload>;
  setValue: (name: keyof AddAShopPayload, value: string) => void;
  errors: FieldErrors<AddAShopPayload>;
  type?: string;
}) => {
  const [inputValue, setInputValue] = useState("");

  const handleClear = () => {
    setInputValue(""); 
    setValue(name, "");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="relative">
      <input
        type={type}
        {...register(name)}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        className={`w-full p-2 border rounded-lg bg-white text-dark ${
          errors[name] ? "border-red-500" : "border-secondary"
        }`}
      />
      {inputValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute bg-primary text-white rounded-full p-1 right-2 top-1/2 transform -translate-y-1/2"
          title="Clear"
        >
          <MdClear  />
        </button>
      )}
      {errors[name] && (
        <p className="text-red-500 text-sm mt-1">{errors[name]?.message}</p>
      )}
    </div>
  );
};

export default EnhancedInput;
