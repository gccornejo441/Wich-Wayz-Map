import { useAuth } from "../../context/authContext";
import SidebarFooter from "./SidebarFooter";
import { SidebarItem } from "./SidebarItem";
import { HiChartBar, HiMap, HiPlus, HiUser } from "react-icons/hi";
import { FiCompass } from "react-icons/fi";
import { ROUTES, useRouteCheck } from "../../constants/routes";
import { BsFillAwardFill } from "react-icons/bs";
import { FiBookmark } from "react-icons/fi";
import { useOverlay } from "@/context/overlayContext";

const Sidebar = () => {
  const { showAddShop, showUserProfile, showMap } = useRouteCheck(ROUTES);
  const { isOpen, toggle } = useOverlay();

  const { isAuthenticated, user } = useAuth();
  const isMember = isAuthenticated && user?.emailVerified;

  return (
    <aside
      id="default-sidebar"
      className={`fixed top-0 left-0 z-30 w-64 h-[100dvh]
        bg-brand-primary dark:bg-surface-darker
        text-white dark:text-text-inverted
        dark:border-r dark:border-gray-700
        transition-all duration-500 ease-in-out transform ${
          isOpen("nav")
            ? "translate-x-0 opacity-100 shadow-2xl pointer-events-auto"
            : "-translate-x-full opacity-0 shadow-none pointer-events-none"
        }`}
      aria-label="Sidebar"
    >
      <div className="flex flex-col h-full px-3">
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
          {isAuthenticated && showUserProfile && (
            <li>
              <SidebarItem
                icon={<FiCompass className="w-6 h-6 text-white" />}
                text={isOpen("nearby") ? "Close Nearby" : "Nearby"}
                onClick={() => {
                  toggle("nearby");
                }}
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
          <li>
            <SidebarItem
              icon={<FiBookmark className="w-6 h-6 text-white" />}
              text={isOpen("saved") ? "Close Saved" : "Saved"}
              onClick={() => {
                toggle("saved");
              }}
            />
          </li>
        </ul>
        <SidebarFooter />
      </div>
    </aside>
  );
};

export default Sidebar;
