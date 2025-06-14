import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { HiMap } from "react-icons/hi";
import ShopForm from "../Form/ShopForm";
import MapPreview from "../Map/MapPreview";

const AddEditShop = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialData = location.state?.initialData;

  const [address, setAddress] = useState(initialData?.address || "");

  return (
    <div className="min-h-screen pt-16 md:pt-10 flex items-center justify-center dark:bg-surface-dark px-4">
      <div className="w-full max-w-6xl bg-white dark:bg-surface-darker p-6 rounded-xl shadow-md space-y-6">
        <div className="flex items-center justify-between border-b border-secondary pb-4">
          <h2 className="text-2xl font-bold text-text-base dark:text-text-inverted">
            {initialData ? `Edit ${initialData?.shopName}` : "Add New Shop"}
          </h2>
          <button
            onClick={() => navigate("/")}
            className="dark:bg-brand-primary cursor-pointer bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-primaryBorder flex gap-2 transition duration-300"
          >
            <HiMap className="w-5 h-5" /> To Map
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-2">
          <div className="w-full">
            <ShopForm
              initialData={initialData}
              address={address}
              onAddressChange={setAddress}
              mode={initialData ? "edit" : "add"}
            />
          </div>
          <div className="w-full pl-6 pt-6 md:pt-0 border-t lg:border-t-0 lg:border-l border-lightGray dark:border-surface-light">
            <MapPreview address={address} onAddressUpdate={setAddress} />
          </div>
        </div>
      </div>
    </div>

  );
};

export default AddEditShop;
