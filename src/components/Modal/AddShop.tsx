import { useNavigate } from "react-router-dom";

const AddShop = () => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate("/");
  };
  return (
    <div className="bg-white w-full p-6 md:p-10">
      <div className="flex justify-between items-center my-5">
        <button
          onClick={handleBackClick}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition duration-300"
        >
          Back to Map
        </button>
      </div>

      <div className="rounded-xl overflow-hidden border border-lightGray">
        <iframe
          src="https://docs.google.com/forms/d/e/1FAIpQLSd-DZWQQWXQOalk7zB2NhJg39ULd4qRttmw4W636Ekv4pVClw/viewform?embedded=true"
          className="w-full h-[80vh] bg-lightGray border-0 shadow-card"
          frameBorder={0}
          marginHeight={0}
          marginWidth={0}
          title="Add Shop Form"
        >
          Loading…
        </iframe>
      </div>
    </div>
  );
};

export default AddShop;
