import { Checkbox } from "flowbite-react";

interface CustomCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const CustomCheckbox = ({ id, label, checked, onChange }: CustomCheckboxProps) => {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="text-primary focus:ring-primary"
      />
      <label htmlFor={id} className="text-sm text-accent cursor-pointer">
        {label}
      </label>
    </div>
  );
};

export default CustomCheckbox;
