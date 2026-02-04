import Logo from "../Logo/Logo";
import { Link } from "react-router-dom";
import { ROUTES, useRouteCheck } from "../../constants/routes";
import SearchBar from "../Search/SearchBar";
import { SidebarToggleButton } from "../Sidebar/SidebarButtons";
import { useOverlay } from "@/context/overlayContext";

interface NavBarProps {
  searchBar: boolean;
  onToggleSidebar: () => void;
  navRef?: React.RefObject<HTMLElement>;
}

const NavBar = ({ searchBar, onToggleSidebar, navRef }: NavBarProps) => {
  const { showSearchBar, showMap } = useRouteCheck(ROUTES);
  const { isOpen } = useOverlay();

  const shouldShowSearch = showSearchBar && searchBar;
  const shouldShowSearchMobile = shouldShowSearch && !isOpen("nearby") && !isOpen("saved");

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 h-12 transition-colors duration-500"
    >
      <div className="w-full bg-brand-primary dark:bg-surface-darker text-white dark:text-text-inverted py-1 px-4 transition-colors duration-500">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            {(showSearchBar || showMap) && (
              <SidebarToggleButton onClick={onToggleSidebar} />
            )}
            <Link to="/" className="flex items-center gap-2 cursor-pointer">
              <Logo imageSource="/Wich-Wayz-Logo.svg" className="h-10" />
            </Link>
          </div>

          {shouldShowSearch && (
            <div className="hidden md:flex flex-1 justify-center mx-4">
              <div className="w-full max-w-2xl">
                <SearchBar navRef={navRef} />
              </div>
            </div>
          )}

          {/* Empty div for layout balance */}
          <div className="w-0" />
        </div>
      </div>

      {shouldShowSearchMobile && (
        <div className="flex md:hidden w-full p-2">
          <SearchBar navRef={navRef} />
        </div>
      )}
    </nav>
  );
};

export default NavBar;
