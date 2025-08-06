import { Link } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import SidebarFooter from "./SidebarFooter";
import { HiChartBar, HiMap, HiPlus, HiUser } from "react-icons/hi";
import { ROUTES, useRouteCheck } from "../../constants/routes";
import { ReactNode } from "react";
import { BsFillAwardFill } from "react-icons/bs";
import { MdFormatListBulletedAdd } from "react-icons/md";
import { useShopSidebar } from "@/context/ShopSidebarContext";
import { useSidebar } from "@/context/sidebarContext";

export interface BaseItemProps {
  onClick?: () => void;
  icon: ReactNode;
  text: string;
  disabled?: boolean;
  linkTo?: string;
  badge?: string;
  external?: boolean;
}

export const SidebarItem = ({
  onClick,
  icon,
  text,
  disabled,
  linkTo,
  badge,
  external,
}: BaseItemProps) => {
  const { closeSidebar } = useSidebar();

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }

    closeSidebar();

    onClick?.();
  };

  const content = (
    <div
      className={`relative flex items-center justify-between p-2 w-full rounded-lg ${
        disabled
          ? "bg-white/10 cursor-not-allowed"
          : "hover:bg-white/20 focus:ring-white/20 cursor-pointer"
      }`}
      onClick={handleClick}
    >
      <span className={`w-6 h-6 mr-3 ${disabled ? "opacity-50" : ""}`}>
        {icon}
      </span>
      <span
        className={`text-md font-light text-white dark:text-text-inverted ${
          disabled ? "opacity-50" : ""
        }`}
      >
        {text}
      </span>
      {badge && (
        <span className="absolute top-0 right-0 mt-1 mr-2 bg-brand-secondary text-gray-800 text-xs font-bold rounded px-1 cursor-pointer">
          {badge}
        </span>
      )}
    </div>
  );

  if (linkTo) {
    return external ? (
      <a
        href={linkTo}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full"
      >
        {content}
      </a>
    ) : (
      <Link to={linkTo} className="w-full">
        {content}
      </Link>
    );
  }

  return <div className="w-full">{content}</div>;
};

const Sidebar = () => {
  const { showAddShop, showUserProfile, showMap } = useRouteCheck(ROUTES);
  const { openShopList } = useShopSidebar();
  const { isOpen, toggleSidebar } = useSidebar();

  const { isAuthenticated, user } = useAuth();
  const isMember = isAuthenticated && user?.emailVerified;

  return (
    <aside
      id="default-sidebar"
      className={`fixed top-0 left-0 z-30 w-64 h-screen 
        bg-brand-primary dark:bg-surface-darker 
        text-white dark:text-text-inverted 
        dark:border-r dark:border-gray-700 
        transition-all duration-500 ease-in-out transform shadow-2xl ${
          isOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
        }`}
      aria-label="Sidebar"
    >
      <div className="flex flex-col h-full px-3 pb-4">
        <ul className="flex-1 overflow-y-auto space-y-2 font-medium">
          <li className="h-12" />
          {showMap && (
            <li>
              <SidebarItem
                icon={<HiMap className="w-6 h-6 text-white" />}
                text="Map"
                linkTo={ROUTES.HOME}
              />
            </li>
          )}
          {isAuthenticated && showUserProfile && (
            <li>
              <SidebarItem
                icon={<HiUser className="w-6 h-6 text-white" />}
                text="Profile"
                linkTo={ROUTES.ACCOUNT.PROFILE}
              />
            </li>
          )}
          {showAddShop && (
            <li>
              <SidebarItem
                linkTo={ROUTES.SHOPS.ADD}
                icon={<HiPlus className="w-6 h-6 text-white" />}
                text="Add A New Shop"
                badge={!isMember ? "Members Only" : undefined}
                disabled={!isMember}
              />
            </li>
          )}
          <li>
            <SidebarItem
              linkTo={ROUTES.ANALYTICS}
              icon={<HiChartBar className="w-6 h-6 text-white" />}
              text="Map Analytics"
            />
          </li>
          <li>
            <SidebarItem
              linkTo={ROUTES.USER_LEADERBOARD}
              icon={<BsFillAwardFill className="w-6 h-6 text-white" />}
              text="Leaderboard"
              badge="New"
            />
          </li>
          <li className="hidden">
            <SidebarItem
              icon={<MdFormatListBulletedAdd className="w-6 h-6 text-white" />}
              text="Saved Shops"
              onClick={() => {
                openShopList();
                toggleSidebar();
              }}
              badge="New"
            />
          </li>
        </ul>
        <SidebarFooter />
      </div>
    </aside>
  );
};

export default Sidebar;
