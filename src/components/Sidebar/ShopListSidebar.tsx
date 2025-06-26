import { useSavedShops } from "@/context/useSavedShop";
import { useState } from "react";

interface SidebarProps {
  isOpen: boolean;
}

const tabs = ["Lists", "Labeled", "Visited", "Maps"];

const SavedShopSidebar = ({ isOpen }: SidebarProps) => {
  const [activeTab, setActiveTab] = useState("Lists");
  const { savedShops, removeShop } = useSavedShops();

  return (
    <aside
      className={`fixed top-8 left-0 z-30 w-64 h-screen bg-primary dark:bg-dark border-primary border-r dark:border-gray-700 transition-all duration-500 ease-in-out transform shadow-2xl shadow-black-500 ${
        isOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
      }`}
      aria-label="Shop List Sidebar"
    >
      <div className="flex flex-col h-full px-2 pb-4">
        {/* Tabs */}
        <div className="border-b border-primary dark:border-gray-600 px-2 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex overflow-x-auto scrollbar-hide space-x-3">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap text-xs font-medium px-2 py-1 rounded transition-colors ${
                    activeTab === tab
                      ? "bg-white text-primary dark:bg-gray-100 dark:text-dark shadow"
                      : "text-white dark:text-gray-300 hover:bg-white/10 dark:hover:bg-gray-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "Lists" && (
              <button
                className="text-xs text-secondary font-medium hover:underline ml-2 whitespace-nowrap"
                onClick={() => console.log("New list clicked")}
              >
                + New list
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {activeTab === "Lists" && (
          <div className="mt-4 space-y-2 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600">
            {savedShops.length === 0 ? (
              <p className="text-xs text-white/80 dark:text-gray-300 px-4">
                No shops saved yet.
              </p>
            ) : (
              savedShops.map((shop) => (
                <div
                  key={shop.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-card p-3 text-sm text-gray-800 dark:text-gray-100 animate-fade-in-up"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-sm">{shop.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {shop.address}
                      </p>
                    </div>
                    <button
                      onClick={() => removeShop(shop.id!)}
                      className="text-red-600 dark:text-red-400 text-xs hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default SavedShopSidebar;
