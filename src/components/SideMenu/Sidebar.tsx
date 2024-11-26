import { Link } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import { SidebarToggleButton } from "./SidebarButtons";
import SidebarFooter from "./SidebarFooter";
import { HiPlus, HiSearch } from "react-icons/hi";
import { useModal } from "../../context/modalContext";

interface TopMenuProps {
  onToggleSidebar: () => void;
}

interface SidebarProps extends TopMenuProps {
  isOpen: boolean;
  onToggleLocation: () => void;
  onToggleSearch: () => void;
}

interface SidebarItemProps {
  onClick?: () => void;
  icon: JSX.Element;
  text: string;
  disabled?: boolean;
  linkTo?: string;
  badge?: string;
}

const SidebarTopMenu = ({ onToggleSidebar }: TopMenuProps) => {
  return (
    <div className="flex justify-between pt-1 mb-5 items-center md:h-header-height">
      <span className="flex" data-state="closed">
        <SidebarToggleButton onClick={onToggleSidebar} />
      </span>
    </div>
  );
};

const SidebarItem = ({
  onClick,
  icon,
  text,
  disabled,
  linkTo,
  badge,
}: SidebarItemProps) => {
  const { openSignupModal } = useModal();

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onClick?.();
  };

  const content = (
    <div
      className={`relative flex justify-between p-2 w-full text-white rounded-lg ${
        disabled
          ? "bg-white/10 cursor-not-allowed"
          : "hover:bg-white/20 focus:ring-white/20 cursor-pointer"
      }`}
      onClick={handleClick}
    >
      <span
        className={`w-6 h-6 text-white mr-3 ${disabled ? "opacity-50" : ""}`}
      >
        {icon}
      </span>
      <span className={`text-md font-light ${disabled ? "opacity-50" : ""}`}>
        {text}
      </span>
      {badge && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            openSignupModal();
          }}
          className="absolute top-0 right-0 mt-1 mr-2 bg-secondary text-gray-800 text-xs font-bold rounded px-1 cursor-pointer"
        >
          {badge}
        </span>
      )}
    </div>
  );

  return linkTo ? (
    <Link to={linkTo} className="w-full">
      {content}
    </Link>
  ) : (
    <div className="w-full">{content}</div>
  );
};

const Sidebar = ({
  isOpen,
  onToggleLocation,
  onToggleSidebar,
  onToggleSearch,
}: SidebarProps) => {
  const { isAuthenticated, user } = useAuth();

  const isMember = isAuthenticated && user?.membership_status === "member";
  return (
    <aside
      id="default-sidebar"
      className={`fixed top-0 left-0 z-40 w-64 h-screen bg-primary border-primary border-r transition-all duration-500 ease-in-out transform shadow-2xl shadow-black-500 ${
        isOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
      }`}
      aria-label="Sidebar"
    >
      <div className="flex flex-col h-full px-3 pb-4">
        <ul className="flex-1 overflow-y-auto space-y-2 font-medium">
          <li>
            <SidebarTopMenu onToggleSidebar={onToggleSidebar} />
          </li>
          <li>
            <SidebarItem
              icon={<HiSearch className="w-6 h-6 text-white" />}
              text="Search"
              onClick={onToggleSearch}
              disabled={!isMember}
              badge={!isMember ? "Members Only" : undefined}
            />
          </li>
          <li>
            <SidebarItem
              onClick={onToggleLocation}
              icon={<HiPlus className="w-6 h-6 text-white" />}
              text="Add A New Shop"
              badge={!isMember ? "Members Only" : undefined}
              disabled={!isMember}
            />
          </li>
        </ul>
        <SidebarFooter />
      </div>
    </aside>
  );
};

export default Sidebar;
