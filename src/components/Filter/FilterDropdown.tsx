import { useEffect, useState } from "react";
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
      default: "flex-wrap border-b border-lightGray",
    },
    tabitem: {
      base: "flex items-center justify-center rounded-t-lg p-4 text-sm font-medium first:ml-0 focus:outline-none disabled:cursor-not-allowed disabled:text-gray-400",
      icon: "mr-2 h-5 w-5",
      variant: {
        default: {
          base: "rounded-t-lg border-b-2 border-transparent text-accent hover:bg-lightGray hover:text-primary",
          active: {
            on: "bg-white text-primary border-b-2 border-primary",
            off: "text-accent hover:bg-lightGray hover:text-primary",
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

export function FilterDropdown({ open, navRef, onFilterChange }: FilterDropdownProps) {
  const [top, setTop] = useState(0);
  const [filters, setFilters] = useState<ShopFilters>({});
  const [tab, setTab] = useState("general");

  const updateTop = () => {
    if (navRef?.current) {
      setTop(navRef.current.offsetHeight);
    }
  };

  useEffect(() => {
    if (open) updateTop();
    const handleResize = () => updateTop();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open]);

  const handleReset = () => {
    setFilters({});
    onFilterChange({});
  };

  if (!open) return null;

  return (
    <div
      className="fixed left-0 z-40 shadow-md w-screen bg-lightGray transition-all duration-300 max-h-[20rem] md:max-h-full overflow-y-auto border-t border-lightGray"
      style={{ top }}
    >
      <div className="mx-auto w-full max-w-screen-xl px-4">
        <Tabs
          aria-label="Filter tabs"
          theme={tabsTheme}
          onActiveTabChange={(i) => setTab(i === 0 ? "general" : "categories")}
        >
          <TabItem active={tab === "general"} title="General" icon={HiAdjustments}>
            <FilterForm section="general" value={filters} onChange={setFilters} />
          </TabItem>
          <TabItem active={tab === "categories"} title="Categories" icon={HiClipboardList}>
            <FilterForm section="categories" value={filters} onChange={setFilters} />
          </TabItem>
        </Tabs>

        <div className="flex justify-end pb-4 gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 text-sm px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-all duration-200"
          >
            <HiRefresh className="w-4 h-4" />
            Reset
          </button>

          <button
            onClick={() => onFilterChange(filters)}
            className="text-sm px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
