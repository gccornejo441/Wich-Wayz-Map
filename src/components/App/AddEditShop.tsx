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
    <div className="max-w-6xl w-full mx-auto bg-white dark:bg-surface-dark text-text-base dark:text-text-inverted rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-secondary bg-lightGray dark:bg-surface-muted">
        <h2 className="text-2xl font-bold">
          {initialData ? `Edit ${initialData?.shopName}` : "Add New Shop"}
        </h2>
        <button
          onClick={() => navigate("/")}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primaryBorder flex gap-2 transition duration-300"
        >
          <HiMap className="w-5 h-5" /> To Map
        </button>
      </div>

      <div className="flex flex-col lg:flex-row">
        <div className="w-full lg:w-2/3 p-6">
          <ShopForm
            initialData={initialData}
            address={address}
            onAddressChange={setAddress}
            mode={initialData ? "edit" : "add"}
          />
        </div>
        <div className="w-full lg:w-1/3 p-6 bg-lightGray dark:bg-surface-muted border-t lg:border-t-0 lg:border-l border-lightGray dark:border-surface-light">
          <MapPreview address={address} onAddressUpdate={setAddress} />
        </div>
      </div>
    </div>
  );
};

export default AddEditShop;
