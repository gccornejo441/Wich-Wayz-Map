import { useState } from "react";

const tabs = ["Lists", "Labeled", "Visited", "Maps"];

export const ShopListTabs = () => {
    const [activeTab, setActiveTab] = useState("Lists");

    return (
        <div className="border-b px-4 pt-4 pb-2">
            {/* Tabs */}
            <div className="flex items-center justify-between">
                <div className="flex space-x-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`text-sm font-medium pb-1 ${activeTab === tab
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-gray-500 hover:text-black"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* New list */}
                {activeTab === "Lists" && (
                    <button
                        className="text-sm text-blue-600 font-medium hover:underline"
                        onClick={() => console.log("New list clicked")}
                    >
                        + New list
                    </button>
                )}
            </div>
        </div>
    );
};

export default ShopListTabs;
