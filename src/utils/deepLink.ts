export interface DeepLinkParams {
  lat: number;
  lng: number;
  z?: number;
  shopId?: number;
}

export const parseDeepLink = (search: string): DeepLinkParams | null => {
  const params = new URLSearchParams(search);

  const latStr = params.get("lat");
  const lngStr = params.get("lng");
  const zStr = params.get("z");
  const shopIdStr = params.get("shopId");

  if (!latStr || !lngStr) {
    return null;
  }

  const lat = Number(latStr);
  const lng = Number(lngStr);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const result: DeepLinkParams = { lat, lng };

  if (zStr) {
    const z = Number(zStr);
    if (Number.isFinite(z) && z > 0) {
      result.z = z;
    }
  }

  if (shopIdStr) {
    const shopId = Number(shopIdStr);
    if (Number.isFinite(shopId) && shopId > 0 && Number.isInteger(shopId)) {
      result.shopId = shopId;
    }
  }

  return result;
};

export const buildDeepLink = (
  params: DeepLinkParams,
  baseUrl?: string,
): string => {
  const base = baseUrl || window.location.origin + window.location.pathname;
  const urlParams = new URLSearchParams();

  urlParams.append("lat", params.lat.toFixed(6));
  urlParams.append("lng", params.lng.toFixed(6));

  if (params.z !== undefined) {
    urlParams.append("z", params.z.toString());
  }

  if (params.shopId !== undefined) {
    urlParams.append("shopId", params.shopId.toString());
  }

  return `${base}?${urlParams.toString()}`;
};
