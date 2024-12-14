import { HiMenuAlt2, HiSearch } from "react-icons/hi";
import { Callback } from "../../types/dataTypes";

interface SideNavProps {
  onToggleSidebar: Callback;
  onSearch: Callback;
}

function SideNav({ onToggleSidebar, onSearch }: SideNavProps) {
  const handleToggleSidebar = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSidebar();
  };

  return (
    <div className="fixed top-12 left-0 z-40 flex flex-col h-screen bg-primary text-white w-16">
      <nav className="flex flex-1 flex-col items-center space-y-4 pb-4">
        {/* Menu Toggle Button */}
        <button
          title="Menu"
          aria-label="Side menu toggle"
          onClick={handleToggleSidebar}
          className="p-2 text-white rounded-lg cursor-pointer hover:bg-transparent bg-white/10 focus:ring-white/20"
        >
          <HiMenuAlt2 className="w-6 h-6" />
        </button>

        {/* Search Button (hidden on larger screens) */}
        <button
          title="Search"
          onClick={onSearch}
          className="md:hidden p-2 text-white rounded-lg cursor-pointer hover:bg-transparent bg-white/10 focus:ring-white/20"
        >
          <HiSearch className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
}

export default SideNav;
