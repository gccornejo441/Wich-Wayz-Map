import { HiMenuAlt2 } from "react-icons/hi";
import { Callback } from "../../types/dataTypes";

interface SidebarToggleButtonProps {
  onClick: Callback;
}

export const SidebarToggleButton = ({ onClick }: SidebarToggleButtonProps) => (
  <button
    type="button"
    aria-label="Side menu toggle"
    className="p-2 cursor-pointer bg-primary dark:hover:bg-surface-dark dark:bg-transparent dark:border dark:border-gray-700 text-white rounded-lg hover:bg-secondary-dark focus:outline-none"
    onClick={onClick}
  >
    <span className="sr-only">Open sidebar</span>
    <HiMenuAlt2 className="h-6 w-6" />
  </button>
);
