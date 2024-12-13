import { HiMenuAlt2 } from "react-icons/hi";
import { Callback } from "../../types/dataTypes";

interface SidebarToggleButtonProps {
  onClick: Callback;
}

export const SidebarToggleButton = ({ onClick }: SidebarToggleButtonProps) => (
  <button
    type="button"
    aria-label="Side menu toggle"
    className="p-2 mr-2 text-white rounded-lg cursor-pointer hover:bg-transparent bg-white/10  focus:ring-white/20"
    onClick={onClick}
  >
    <span className="sr-only">Open sidebar</span>
    <HiMenuAlt2 className="h-6 w-6" />
  </button>
);
