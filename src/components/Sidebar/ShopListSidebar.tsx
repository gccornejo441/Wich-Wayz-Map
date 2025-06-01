import ShopListTabs from "../SavedShops";

interface SidebarProps {
    isOpen: boolean;
}

const ShopListSidebar = ({ isOpen }: SidebarProps) => {
    return (
        <aside
            id="shoplist-sidebar"
            className={`fixed top-0 left-0 z-30 w-64 h-screen bg-primary border-primary border-r transition-all duration-500 ease-in-out transform shadow-2xl shadow-black-500 ${isOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
                }`}
            aria-label="Shop List Sidebar"
        >
            <div className="flex flex-col h-full px-3 pb-4">
            <ShopListTabs />
            </div>
        </aside>
    );
};

export default ShopListSidebar;

