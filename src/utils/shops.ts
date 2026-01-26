import type { ShopWithUser } from "@/models/ShopWithUser";
import type { LocationStatus } from "@/types/dataTypes";

export function applyLocationStatusToShop(
  shop: ShopWithUser,
  locationId: number,
  locationStatus: LocationStatus,
): ShopWithUser {
  const nextLocations = (shop.locations ?? []).map((l) =>
    l.id === locationId ? { ...l, locationStatus } : l,
  );

  return { ...shop, locations: nextLocations };
}
