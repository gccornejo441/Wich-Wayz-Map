import { useShopSidebar } from "@/context/ShopSidebarContext";
import { FiX, FiMapPin, FiClock, FiPhone, FiGlobe, FiUser } from "react-icons/fi";

const Sidebar = () => {
  const { selectedShop, sidebarOpen, closeSidebar } = useShopSidebar();

  return (
    <aside
      className={`fixed top-[48px] left-0 z-30 w-80 h-screen bg-background border-r border-primaryBorder shadow-lg transition-transform duration-500 ease-in-out transform ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Close Button */}
      <button
        onClick={closeSidebar}
        className="absolute top-3 right-3 text-accent hover:text-primary transition-colors"
      >
        <FiX size={24} />
      </button>

      <div className="flex flex-col h-full overflow-y-auto p-5">
        {selectedShop ? (
          <>
            {/* Shop Image */}
            <div className="w-full h-48 bg-lightGray rounded-lg overflow-hidden shadow-card">
              <img
                src={selectedShop.imageUrl || "/default-shop.jpg"} // Fallback image
                alt={selectedShop.shopName}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Shop Name */}
            <h2 className="text-2xl font-semibold mt-4 text-accent">{selectedShop.shopName}</h2>

            {/* Address */}
            <div className="flex items-center mt-2 text-dark">
              <FiMapPin size={18} className="mr-2 text-primary" />
              <span>{selectedShop.address}</span>
            </div>

            {/* Categories */}
            {selectedShop.categories && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedShop.categories.split(",").map((category, index) => (
                  <span
                    key={index}
                    className="bg-secondary text-dark px-3 py-1 rounded-full text-sm font-semibold"
                  >
                    {category.trim()}
                  </span>
                ))}
              </div>
            )}

            {/* Opening Hours */}
            {selectedShop.locationOpen !== undefined && (
              <div className="flex items-center mt-3 text-dark">
                <FiClock size={18} className={`mr-2 ${selectedShop.locationOpen ? "text-primary" : "text-accent"}`} />
                <span className={`${selectedShop.locationOpen ? "text-primary" : "text-accent"}`}>
                  {selectedShop.locationOpen ? "Open Now" : "Closed"}
                </span>
              </div>
            )}

            {/* Contact Information */}
            <div className="mt-4 space-y-3">
              {selectedShop.phone && (
                <div className="flex items-center text-dark">
                  <FiPhone size={18} className="mr-2 text-primary" />
                  <a href={`tel:${selectedShop.phone}`} className="hover:underline hover:text-primary">
                    {selectedShop.phone}
                  </a>
                </div>
              )}
              {selectedShop.usersAvatarEmail && (
                <div className="flex items-center text-dark">
                  <FiUser size={18} className="mr-2 text-primary" />
                  <a href={`mailto:${selectedShop.usersAvatarEmail}`} className="hover:underline hover:text-primary">
                    {selectedShop.usersAvatarEmail}
                  </a>
                </div>
              )}
              {selectedShop.website && (
                <div className="flex items-center text-dark">
                  <FiGlobe size={18} className="mr-2 text-primary" />
                  <a
                    href={selectedShop.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline hover:text-primary"
                  >
                    Visit Website
                  </a>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col space-y-3">
              <button
                className="w-full bg-primary hover:bg-primaryBorder text-white py-2 rounded-lg text-center shadow-md transition-colors"
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${selectedShop.address}`,
                    "_blank"
                  )
                }
              >
                Get Directions
              </button>
              <button
                className="w-full bg-lightGray hover:bg-gray-200 text-dark py-2 rounded-lg text-center shadow-md transition-colors"
                onClick={closeSidebar}
              >
                Close Sidebar
              </button>
            </div>
          </>
        ) : (
          <p className="text-dark text-center">No shop selected</p>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
