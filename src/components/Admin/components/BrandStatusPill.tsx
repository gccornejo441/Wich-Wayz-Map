import React from "react";
import type { BrandStatus } from "../types/admin.types";
import { getBrandStatusClass } from "../utils/brandStatus.utils";

interface BrandStatusPillProps {
  status: BrandStatus;
}

export const BrandStatusPill: React.FC<BrandStatusPillProps> = ({ status }) => {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold",
        getBrandStatusClass(status),
      ].join(" ")}
    >
      {status}
    </span>
  );
};
