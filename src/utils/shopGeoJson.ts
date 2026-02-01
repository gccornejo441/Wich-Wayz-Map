import { buildStreetAddress } from "@utils/address";
import type { Location } from "@models/Location";
import type { ShopWithUser } from "@models/ShopWithUser";
import type { LocationDataVariants, ShopDataVariants } from "@/types/dataTypes";

export type ShopGeoJsonProperties = {
  shopId: number;
  shopName: string;
  categories: string;

  imageUrl?: string;
  description?: string;

  usersAvatarEmail?: string;
  usersAvatarId?: string;
  createdBy?: string;
  created_by?: number;

  votes?: number;
  categoryIds?: number[];

  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;

  phone?: string;
  website?: string;
  website_url?: string;

  latitude?: number;
  longitude?: number;

  locationStatus?: "open" | "temporarily_closed" | "permanently_closed";
  locationId?: number;

  [key: string]: unknown;
};

export type ShopFeature = GeoJSON.Feature<GeoJSON.Point, ShopGeoJsonProperties>;
export type ShopFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  ShopGeoJsonProperties
>;

const isNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const getString = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

const toNumber = (v: unknown): number | undefined => {
  if (isNumber(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

const getLngLat = (loc: Location): { lng: number; lat: number } | null => {
  const maybeLng = loc.longitude;
  const maybeLat = loc.latitude;

  if (!isNumber(maybeLng) || !isNumber(maybeLat)) return null;
  return { lng: maybeLng, lat: maybeLat };
};

const getShopName = (shop: ShopWithUser): string => {
  if (typeof shop.name === "string" && shop.name.length) return shop.name;
  return "";
};

const getCategoriesString = (shop: ShopWithUser): string => {
  if (Array.isArray(shop.categories)) {
    return shop.categories
      .map((cat) => cat.category_name)
      .filter((x): x is string => typeof x === "string")
      .join(",");
  }
  return "";
};

const buildAddress = (locAny: LocationDataVariants): string | undefined => {
  // Check for pre-built address field first
  const direct = getString(locAny.address);
  if (direct && direct.trim().length) return direct;

  // Build ONLY from street lines, never city/state/postal
  return buildStreetAddress(
    getString(locAny.street_address),
    getString(locAny.street_address_second),
  );
};

const pickWebsite = (
  shopAny: ShopDataVariants,
  locAny: LocationDataVariants,
): string | undefined =>
  getString(shopAny.website) ??
  getString(shopAny.websiteUrl) ??
  getString(shopAny.website_url) ??
  getString(locAny.website);

const pickWebsiteUrl = (
  shopAny: ShopDataVariants,
  locAny: LocationDataVariants,
): string | undefined =>
  getString(shopAny.website_url) ??
  getString(shopAny.websiteUrl) ??
  getString(shopAny.website) ??
  getString(locAny.website);

const pickPhone = (
  shopAny: ShopDataVariants,
  locAny: LocationDataVariants,
): string | undefined => getString(shopAny.phone) ?? getString(locAny.phone);

const buildShopPropsFromShopAndLocation = (
  shop: ShopWithUser,
  loc: Location,
  ll: { lng: number; lat: number },
): ShopGeoJsonProperties | null => {
  if (typeof shop.id !== "number") return null;

  const shopAny = shop as unknown as ShopDataVariants;
  const locAny = loc as unknown as LocationDataVariants;

  const categoryIds =
    Array.isArray(shopAny.categoryIds) &&
    shopAny.categoryIds.every((x) => typeof x === "number")
      ? shopAny.categoryIds
      : Array.isArray(shopAny.category_ids) &&
          shopAny.category_ids.every((x) => typeof x === "number")
        ? shopAny.category_ids
        : undefined;

  const address = buildAddress(locAny);

  const phone = pickPhone(shopAny, locAny);
  const website = pickWebsite(shopAny, locAny);
  const website_url = pickWebsiteUrl(shopAny, locAny);

  const locationStatus = loc.locationStatus ?? "open";

  return {
    shopId: shop.id,
    shopName: getShopName(shop),
    categories: getCategoriesString(shop),

    imageUrl: getString(shopAny.imageUrl) ?? getString(shopAny.image_url),
    description:
      getString(shopAny.description) ?? getString(shopAny.shop_description),

    usersAvatarEmail:
      getString(shopAny.usersAvatarEmail) ??
      getString(shopAny.users_avatar_email) ??
      getString(shopAny.user_email),
    usersAvatarId:
      getString(shopAny.usersAvatarId) ??
      getString(shopAny.users_avatar_id) ??
      getString(shopAny.user_avatar_id),

    createdBy:
      getString(shopAny.createdBy) ??
      getString(shopAny.created_by_username) ??
      getString(shopAny.created_by),
    created_by: isNumber(shop.created_by) ? shop.created_by : undefined,

    votes: isNumber(shopAny.votes) ? shopAny.votes : undefined,
    categoryIds,

    address,
    city: getString(locAny.city),
    state: getString(locAny.state),
    postalCode: getString(locAny.postalCode) ?? getString(locAny.postal_code),
    country: getString(locAny.country),

    phone,
    website,
    website_url,

    latitude: ll.lat,
    longitude: ll.lng,

    locationStatus:
      locationStatus === "open" ||
      locationStatus === "temporarily_closed" ||
      locationStatus === "permanently_closed"
        ? locationStatus
        : "open",
    locationId: isNumber(loc.id) ? loc.id : undefined,
  };
};

export const buildShopGeoJson = (
  displayedShops: ShopWithUser[],
): ShopFeatureCollection => {
  const features: ShopFeature[] = [];

  for (const shop of displayedShops) {
    if (typeof shop.id !== "number") continue;

    const locs = shop.locations ?? [];
    for (const loc of locs) {
      const ll = getLngLat(loc);
      if (!ll) continue;

      const props = buildShopPropsFromShopAndLocation(shop, loc, ll);
      if (!props) continue;

      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [ll.lng, ll.lat] },
        properties: props,
      });
    }
  }

  return { type: "FeatureCollection", features };
};

export const coercePropsFromFeatureProperties = (
  raw: Record<string, unknown>,
): ShopGeoJsonProperties | null => {
  const shopId = toNumber(raw.shopId);
  if (!shopId) return null;

  const locationStatusRaw = getString(raw.locationStatus);
  const locationStatus:
    | "open"
    | "temporarily_closed"
    | "permanently_closed"
    | undefined =
    locationStatusRaw === "open" ||
    locationStatusRaw === "temporarily_closed" ||
    locationStatusRaw === "permanently_closed"
      ? locationStatusRaw
      : undefined;

  return {
    ...(raw as unknown as ShopGeoJsonProperties),
    shopId,
    shopName: getString(raw.shopName) ?? "",
    categories: getString(raw.categories) ?? "",
    address: getString(raw.address),
    phone: getString(raw.phone),
    website: getString(raw.website),
    website_url: getString(raw.website_url),
    city: getString(raw.city),
    state: getString(raw.state),
    postalCode: getString(raw.postalCode),
    country: getString(raw.country),
    imageUrl: getString(raw.imageUrl),
    description: getString(raw.description),
    usersAvatarEmail: getString(raw.usersAvatarEmail),
    usersAvatarId: getString(raw.usersAvatarId),
    createdBy: getString(raw.createdBy),
    created_by: toNumber(raw.created_by),
    locationStatus,
    locationId: toNumber(raw.locationId),
  };
};
