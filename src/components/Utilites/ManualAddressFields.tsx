import { FieldErrors, Path, UseFormRegister } from "react-hook-form";
import InputField from "./InputField";
import { AddAShopPayload } from "@/types/dataTypes";

interface ManualAddressFieldsProps {
  register: UseFormRegister<AddAShopPayload>;
  errors: FieldErrors<AddAShopPayload>;
}

const addressFields: Array<{
  name: Path<AddAShopPayload>;
  label: string;
  type?: string;
  step?: string;
}> = [
  { name: "house_number", label: "Street Number" },
  { name: "address_first", label: "Address Line 1" },
  { name: "address_second", label: "Address Line 2" },
  { name: "city", label: "City" },
  { name: "state", label: "State" },
  { name: "postcode", label: "Postcode" },
  { name: "country", label: "Country" },
  { name: "latitude", label: "Latitude", type: "number", step: "any" },
  { name: "longitude", label: "Longitude", type: "number", step: "any" },
];

const ManualAddressFields = ({
  register,
  errors,
}: ManualAddressFieldsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {addressFields.map(({ name, label, type = "text", step }) => (
        <InputField
          key={name}
          name={name}
          label={label}
          register={register}
          errors={errors}
          type={type}
          step={step}
        />
      ))}
    </div>
  );
};

export default ManualAddressFields;
