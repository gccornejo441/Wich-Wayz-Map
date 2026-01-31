import { HiMenuAlt2 } from "react-icons/hi";
import { FiCompass } from "react-icons/fi";
import { Callback } from "@/types/dataTypes";

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

interface NearbyToggleButtonProps {
  onClick: Callback;
  active: boolean;
}

export const NearbyToggleButton = ({
  onClick,
  active,
}: NearbyToggleButtonProps) => (
  <button
    type="button"
    aria-label="Nearby shops toggle"
    className={`p-2 cursor-pointer rounded-lg border transition-colors ${
      active
        ? "bg-brand-secondary text-black border-brand-secondary"
        : "bg-primary text-white border-transparent hover:bg-secondary-dark"
    } dark:bg-surface-darker dark:text-text-inverted dark:border-gray-700 dark:hover:bg-surface-dark`}
    onClick={onClick}
  >
    <span className="sr-only">Toggle nearby shops</span>
    <FiCompass className="h-5 w-5" />
  </button>
);
