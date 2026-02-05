import { useCallback, useEffect, useState } from "react";
import { Tabs, TabItem, CustomFlowbiteTheme } from "flowbite-react";
import { HiAdjustments, HiClipboardList, HiRefresh } from "react-icons/hi";
import FilterForm from "./FilterForm";
import { ShopFilters } from "@/types/shopFilter";

interface FilterDropdownProps {
  open: boolean;
  navRef?: React.RefObject<HTMLElement>;
  onFilterChange: (filters: ShopFilters) => void;
}
export const tabsTheme: CustomFlowbiteTheme["tabs"] = {
  base: "flex flex-col",
  tablist: {
    base: "flex text-center",
    variant: {
      default:
        "flex-wrap border-b border-surface-muted dark:border-surface-dark",
    },
    tabitem: {
      base: "flex items-center justify-center rounded-t-lg p-4 text-sm font-medium first:ml-0 focus:outline-none disabled:cursor-not-allowed disabled:text-text-muted",
      icon: "mr-2 h-5 w-5",
      variant: {
        default: {
          base: "rounded-t-lg border-b-2 border-transparent text-text-base dark:text-text-inverted hover:bg-surface-muted dark:hover:bg-surface-darker hover:text-text-base dark:hover:text-text-inverted",
          active: {
            on: "bg-white dark:bg-surface-darker text-text-base dark:text-text-inverted border-b-2 border-brand-primary dark:border-white",
            off: "text-text-base dark:text-text-muted hover:bg-surface-muted dark:hover:bg-surface-darker hover:text-text-base dark:hover:text-text-inverted",
          },
        },
      },
    },
  },
  tabitemcontainer: {
    base: "",
    variant: {
      default: "",
    },
  },
};

export function FilterDropdown({
  open,
  navRef,
  onFilterChange,
}: FilterDropdownProps) {
  const [top, setTop] = useState(0);
  const [filters, setFilters] = useState<ShopFilters>({});
  const [tab, setTab] = useState("general");

  const updateTop = useCallback(() => {
    if (navRef?.current) {
      setTop(navRef.current.offsetHeight);
    }
  }, [navRef]);

  useEffect(() => {
    if (open) updateTop();
    const handleResize = () => updateTop();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open, updateTop]);

  const handleReset = () => {
    setFilters({});
    onFilterChange({});
  };

  if (!open) return null;

  return (
    <div
      className="fixed left-0 z-40 w-screen md:max-h-full overflow-y-auto border-t border-surface-muted dark:border-gray-700 bg-surface-muted dark:bg-surface-dark text-text-base dark:text-text-inverted shadow-md transition-all duration-300"
      style={{ top }}
    >
      <div className="mx-auto w-full max-w-screen-xl px-4">
        <Tabs
          aria-label="Filter tabs"
          theme={tabsTheme}
          onActiveTabChange={(i) => setTab(i === 0 ? "general" : "categories")}
        >
          <TabItem
            active={tab === "general"}
            title="General"
            icon={HiAdjustments}
          >
            <FilterForm
              section="general"
              value={filters}
              onChange={setFilters}
            />
          </TabItem>
          <TabItem
            active={tab === "categories"}
            title="Categories"
            icon={HiClipboardList}
          >
            <FilterForm
              section="categories"
              value={filters}
              onChange={setFilters}
            />
          </TabItem>
        </Tabs>

        <div className="flex justify-end pb-4 gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 text-sm px-4 py-2 text-text-inverted rounded-lg bg-brand-primary hover:bg-brand-primaryHover dark:border-none"
          >
            <HiRefresh className="w-4 h-4" />
            Reset
          </button>

          <button
            onClick={() => onFilterChange(filters)}
            className="flex items-center gap-2 text-sm px-4 py-2 text-text-inverted rounded-lg bg-brand-primary hover:bg-brand-primaryHover dark:border-none"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
