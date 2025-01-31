import { useNavigate } from "react-router-dom";
import AddShopForm from "../Form/AddShopForm";
import { HiMap } from "react-icons/hi";

const AddShop = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl w-full mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-secondary">
        <h3 className="text-lg font-semibold text-dark">Add A Sandwich Shop</h3>
        <button
          onClick={() => navigate("/")}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary flex gap-2 transition duration-300"
        >
          <HiMap className="w-5 h-5" /> To Map
        </button>
      </div>
      <AddShopForm />
    </div>
  );
};

export default AddShop;
