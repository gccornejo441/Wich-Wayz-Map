export interface DeepLinkParams {
  lat: number;
  lng: number;
  shopId: number;
}

export const parseDeepLink = (search: string): DeepLinkParams | null => {
  const params = new URLSearchParams(search);

  const latStr = params.get("lat");
  const lngStr = params.get("lng");
  const shopIdStr = params.get("shopId");

  if (!latStr || !lngStr || !shopIdStr) {
    return null;
  }

  const lat = Number(latStr);
  const lng = Number(lngStr);
  const shopId = Number(shopIdStr);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  if (!Number.isFinite(shopId) || shopId <= 0 || !Number.isInteger(shopId)) {
    return null;
  }

  return { lat, lng, shopId };
};
