import { useShopSidebar } from "@/context/ShopSidebarContext";
import { useEffect, useState } from "react";
import { FiMapPin } from "react-icons/fi";
import { ShopGeoJsonProperties } from "@/components/Map/MapBox";

const ShopListSidebar = () => {
    const { savedShops, openSidebar } = useShopSidebar();
    const [filteredShops, setFilteredShops] = useState<ShopGeoJsonProperties[]>([]);

    useEffect(() => {
        setFilteredShops(savedShops);
    }, [savedShops]);

    const handleSelectShop = (shop: ShopGeoJsonProperties) => {
        openSidebar(shop);
    };

    return (
        <aside className="fixed left-0 top-[48px] z-20 w-[400px] h-[calc(100vh-48px)] bg-white dark:bg-gray-800 shadow-lg overflow-y-auto transition-all duration-300 ease-in-out">
            <div className="p-5">
                <h2 className="text-xl font-bold mb-4 text-accent">Your Lists</h2>

                {filteredShops.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10">
                        <img
                            src="/empty-list-illustration.svg"
                            alt="No shops saved yet"
                            className="mx-auto w-32 h-32 opacity-70"
                        />
                        <h3 className="mt-4 text-lg font-semibold">No shops saved yet</h3>
                        <p className="text-sm">Click a map pin to save it to your list.</p>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {filteredShops.map((shop) => (
                            <li
                                key={shop.shopId}
                                className="cursor-pointer rounded-lg border border-gray-200 dark:border-gray-600 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                onClick={() => handleSelectShop(shop)}
                            >
                                <div className="flex items-center gap-3">
                                    <img
                                        src={shop.imageUrl || "/sandwich-default.png"}
                                        alt={shop.shopName}
                                        className="w-14 h-14 rounded-md object-cover"
                                    />
                                    <div className="flex-1">
                                        <h3 className="text-md font-semibold text-dark dark:text-white">
                                            {shop.shopName}
                                        </h3>
                                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mt-1">
                                            <FiMapPin className="mr-1 text-primary" />
                                            <span className="truncate">{shop.address}</span>
                                        </div>
                                        {shop.categories && (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {shop.categories
                                                    .split(",")
                                                    .slice(0, 3)
                                                    .map((cat, index) => (
                                                        <span
                                                            key={index}
                                                            className="bg-secondary text-dark text-xs font-semibold px-2 py-0.5 rounded-full"
                                                        >
                                                            {cat.trim()}
                                                        </span>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </aside>
    );
};

export default ShopListSidebar;
