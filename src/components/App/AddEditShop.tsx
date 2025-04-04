import { useLocation, useNavigate } from "react-router-dom";
import { HiMap } from "react-icons/hi";
import ShopForm from "../Form/ShopForm";

const AddEditShop = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialData = location.state?.initialData;

  return (
    <div className="max-w-3xl w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-secondary">
        <h2 className="text-2xl font-bold text-dark">
          {initialData ? `Edit ${initialData?.shopName}` : "Add New Shop"}
        </h2>
        <button
          onClick={() => navigate("/")}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary flex gap-2 transition duration-300"
        >
          <HiMap className="w-5 h-5" /> To Map
        </button>
      </div>
      <ShopForm initialData={initialData} mode={initialData ? "edit" : "add"} />
    </div>
  );
};

export default AddEditShop;
