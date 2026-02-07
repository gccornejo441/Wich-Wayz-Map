import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@context/authContext";
import { useToast } from "@context/toastContext";
import {
  addShopToCollection as addShopToCollectionApi,
  createCollection as createCollectionApi,
  deleteCollection as deleteCollectionApi,
  getMyCollections,
  removeShopFromCollection as removeShopFromCollectionApi,
  updateCollection as updateCollectionApi,
} from "@services/collectionService";
import {
  getSavedShopIds,
  toggleSavedShop,
  SavedShopItem,
} from "@services/savedService";
import { Collection, CollectionVisibility } from "@models/Collection";

type SavedFilterMode = "all" | "nearby" | "collection";
type AnchorMode = "mapCenter" | "userLocation";

type SavedContextType = {
  savedShopIds: Set<number>;
  savedItems: SavedShopItem[];
  collections: Collection[];
  activeCollectionId: number | null;
  savedFilterMode: SavedFilterMode;
  radiusMiles: number;
  anchorMode: AnchorMode;
  setSavedFilterMode: (mode: SavedFilterMode) => void;
  setRadiusMiles: (miles: number) => void;
  setAnchorMode: (mode: AnchorMode) => void;
  setActiveCollectionId: (id: number | null) => void;
  refreshSaved: () => Promise<void>;
  toggleSaved: (shopId: number) => Promise<boolean>;
  refreshCollections: () => Promise<void>;
  createCollection: (payload: {
    name: string;
    description?: string;
    visibility?: CollectionVisibility;
  }) => Promise<Collection>;
  updateCollection: (
    id: number,
    payload: Partial<{
      name: string;
      description: string | null;
      visibility: CollectionVisibility;
    }>,
  ) => Promise<Collection>;
  deleteCollection: (id: number) => Promise<void>;
  addShopToCollection: (
    collectionId: number,
    shopId: number,
  ) => Promise<boolean>;
  removeShopFromCollection: (
    collectionId: number,
    shopId: number,
  ) => Promise<boolean>;
};

type SavedPrefs = {
  savedFilterMode: SavedFilterMode;
  radiusMiles: number;
  anchorMode: AnchorMode;
  activeCollectionId: number | null;
};

const PREFS_KEY = "wichwayz_saved_prefs_v1";

const loadPrefs = (): SavedPrefs | null => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedPrefs>;

    const savedFilterMode: SavedFilterMode =
      parsed.savedFilterMode === "nearby" ||
      parsed.savedFilterMode === "collection"
        ? parsed.savedFilterMode
        : "all";

    const anchorMode: AnchorMode =
      parsed.anchorMode === "userLocation" ? "userLocation" : "mapCenter";

    const radius =
      typeof parsed.radiusMiles === "number" &&
      Number.isFinite(parsed.radiusMiles)
        ? parsed.radiusMiles
        : 5;

    const activeCollectionId =
      typeof parsed.activeCollectionId === "number" &&
      Number.isFinite(parsed.activeCollectionId)
        ? parsed.activeCollectionId
        : null;

    return {
      savedFilterMode,
      radiusMiles: radius,
      anchorMode,
      activeCollectionId,
    };
  } catch (error) {
    console.error("Failed to load saved prefs:", error);
    return null;
  }
};

const persistPrefs = (prefs: SavedPrefs) => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    return;
  }
};

const SavedContext = createContext<SavedContextType | undefined>(undefined);

export const SavedProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, userMetadata } = useAuth();
  const { addToast } = useToast();

  const initialPrefs = useMemo(() => loadPrefs(), []);

  const [savedFilterMode, setSavedFilterMode] = useState<SavedFilterMode>(
    () => initialPrefs?.savedFilterMode ?? "all",
  );
  const [radiusMiles, setRadiusMiles] = useState<number>(
    () => initialPrefs?.radiusMiles ?? 5,
  );
  const [anchorMode, setAnchorMode] = useState<AnchorMode>(
    () => initialPrefs?.anchorMode ?? "mapCenter",
  );
  const [activeCollectionId, setActiveCollectionId] = useState<number | null>(
    () => initialPrefs?.activeCollectionId ?? null,
  );

  const [savedItems, setSavedItems] = useState<SavedShopItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);

  const userId = userMetadata?.id;

  const savedShopIds = useMemo(
    () => new Set(savedItems.map((item) => item.shopId)),
    [savedItems],
  );

  useEffect(() => {
    persistPrefs({
      savedFilterMode,
      radiusMiles,
      anchorMode,
      activeCollectionId,
    });
  }, [savedFilterMode, radiusMiles, anchorMode, activeCollectionId]);

  const refreshSaved = useCallback(async () => {
    if (!userId) {
      setSavedItems([]);
      return;
    }
    try {
      const items = await getSavedShopIds();
      setSavedItems(items);
    } catch (error) {
      console.error("Failed to refresh saved shops:", error);
      addToast("Could not load saved shops", "error");
    }
  }, [userId, addToast]);

  const refreshCollections = useCallback(async () => {
    if (!userId) {
      setCollections([]);
      return;
    }
    try {
      const list = await getMyCollections();
      setCollections(list);
    } catch (error) {
      console.error("Failed to refresh collections:", error);
      addToast("Could not load collections", "error");
    }
  }, [userId, addToast]);

  useEffect(() => {
    if (isAuthenticated && userId) {
      refreshSaved();
      refreshCollections();
    } else {
      setSavedItems([]);
      setCollections([]);
    }
  }, [isAuthenticated, userId, refreshSaved, refreshCollections]);

  const toggleSaved = useCallback(
    async (shopId: number) => {
      if (!userId) {
        addToast("Sign in to save shops", "error");
        throw new Error("Not authenticated");
      }

      try {
        const saved = await toggleSavedShop(shopId);
        setSavedItems((prev) => {
          const exists = prev.some((item) => item.shopId === shopId);
          if (saved && !exists) {
            return [{ shopId, dateCreated: new Date().toISOString() }, ...prev];
          }
          if (!saved) {
            return prev.filter((item) => item.shopId !== shopId);
          }
          return prev;
        });
        return saved;
      } catch (error) {
        console.error("Failed to toggle saved:", error);
        addToast("Could not update saved shop", "error");
        throw error;
      }
    },
    [userId, addToast],
  );

  const createCollection = useCallback(
    async (payload: {
      name: string;
      description?: string;
      visibility?: CollectionVisibility;
    }) => {
      if (!userId) {
        addToast("Sign in to create a list", "error");
        throw new Error("Not authenticated");
      }

      const created = await createCollectionApi(payload);
      setCollections((prev) => [created, ...prev]);
      return created;
    },
    [userId, addToast],
  );

  const updateCollection = useCallback(
    async (
      id: number,
      payload: Partial<{
        name: string;
        description: string | null;
        visibility: CollectionVisibility;
      }>,
    ) => {
      if (!userId) {
        addToast("Sign in to update lists", "error");
        throw new Error("Not authenticated");
      }
      const updated = await updateCollectionApi(id, payload);
      setCollections((prev) =>
        prev.map((col) => (col.id === id ? { ...col, ...updated } : col)),
      );
      return updated;
    },
    [userId, addToast],
  );

  const deleteCollection = useCallback(
    async (id: number) => {
      if (!userId) {
        addToast("Sign in to delete lists", "error");
        throw new Error("Not authenticated");
      }
      await deleteCollectionApi(id);
      setCollections((prev) => prev.filter((col) => col.id !== id));
      setActiveCollectionId((prev) => (prev === id ? null : prev));
    },
    [userId, addToast],
  );

  const addShopToCollection = useCallback(
    async (collectionId: number, shopId: number) => {
      if (!userId) {
        addToast("Sign in to save shops", "error");
        throw new Error("Not authenticated");
      }

      const added = await addShopToCollectionApi(collectionId, shopId);
      if (!added) return false;

      setCollections((prev) =>
        prev.map((col) => {
          if (col.id !== collectionId) return col;
          const existingIds = col.shopIds ?? [];
          if (existingIds.includes(shopId)) return col;
          return {
            ...col,
            shopIds: [shopId, ...existingIds],
            shopCount: (col.shopCount ?? existingIds.length) + 1,
          };
        }),
      );

      if (!savedShopIds.has(shopId)) {
        try {
          await toggleSavedShop(shopId);
          setSavedItems((prev) => [
            { shopId, dateCreated: new Date().toISOString() },
            ...prev,
          ]);
        } catch (error) {
          console.error(
            "Failed to auto-save shop when adding to collection:",
            error,
          );
        }
      }

      return true;
    },
    [userId, addToast, savedShopIds],
  );

  const removeShopFromCollection = useCallback(
    async (collectionId: number, shopId: number) => {
      if (!userId) {
        addToast("Sign in to manage lists", "error");
        throw new Error("Not authenticated");
      }

      const removed = await removeShopFromCollectionApi(collectionId, shopId);
      if (!removed) return false;

      setCollections((prev) =>
        prev.map((col) => {
          if (col.id !== collectionId) return col;
          const nextIds = (col.shopIds ?? []).filter((id) => id !== shopId);
          return {
            ...col,
            shopIds: nextIds,
            shopCount: nextIds.length,
          };
        }),
      );
      return true;
    },
    [userId, addToast],
  );

  const value: SavedContextType = {
    savedShopIds,
    savedItems,
    collections,
    activeCollectionId,
    savedFilterMode,
    radiusMiles,
    anchorMode,
    setSavedFilterMode,
    setRadiusMiles,
    setAnchorMode,
    setActiveCollectionId,
    refreshSaved,
    toggleSaved,
    refreshCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    addShopToCollection,
    removeShopFromCollection,
  };

  return (
    <SavedContext.Provider value={value}>{children}</SavedContext.Provider>
  );
};

export const useSaved = (): SavedContextType => {
  const ctx = useContext(SavedContext);
  if (!ctx) {
    throw new Error("useSaved must be used within a SavedProvider");
  }
  return ctx;
};
