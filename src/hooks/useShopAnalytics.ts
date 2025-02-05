import { useState, useEffect } from "react";
import {
  getCachedShops,
  getShopsPerCategory,
  getShopsPerState,
  ShopCountByCategory,
  ShopCountByState,
} from "@/services/mapService";

const useShopAnalytics = () => {
  const [shopStateData, setShopStateData] = useState<ShopCountByState[]>([]);
  const [shopCategoryData, setShopCategoryData] = useState<
    ShopCountByCategory[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cachedShops = await getCachedShops();
        let stateData: ShopCountByState[] = [];
        let categoryData: ShopCountByCategory[] = [];

        if (cachedShops.length) {
          const stateMap = new Map<string, number>();
          cachedShops.forEach((shop) => {
            shop.locations.forEach((location) => {
              stateMap.set(
                location.state,
                (stateMap.get(location.state) || 0) + 1,
              );
            });
          });
          stateData = Array.from(stateMap, ([state, shop_count]) => ({
            state,
            shop_count,
          }));
        } else {
          stateData = await getShopsPerState();
        }

        if (cachedShops.length) {
          const categoryMap = new Map<string, number>();
          cachedShops.forEach((shop) => {
            shop.categories.forEach((category) => {
              categoryMap.set(
                category.category_name,
                (categoryMap.get(category.category_name) || 0) + 1,
              );
            });
          });
          categoryData = Array.from(categoryMap, ([category, shop_count]) => ({
            category,
            shop_count,
          }));
        } else {
          categoryData = await getShopsPerCategory();
        }

        setShopStateData(stateData);
        setShopCategoryData(categoryData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { shopStateData, shopCategoryData, loading };
};

export default useShopAnalytics;
