import { Link } from "react-router-dom";
import { HiHome } from "react-icons/hi";

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background font-sans text-dark">
      <div className="text-primary text-5xl font-bold">Lost in the Sauce?</div>
      <h1 className="text-3xl font-semibold mt-4">Sandwich Not Found</h1>
      <Link to="/" className="mt-8">
        <button className="flex items-center px-6 py-3 bg-primary text-white font-semibold rounded-xl shadow-card hover:bg-secondary transition duration-300 ease-in-out">
          <HiHome className="w-6 h-6 mr-2" />
          Go Back
        </button>
      </Link>
    </div>
  );
};

export default NotFound;
