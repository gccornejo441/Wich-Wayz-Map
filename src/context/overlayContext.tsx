import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";

export type PanelId = "nav" | "shop" | "nearby" | "saved";

type OverlayState = Record<PanelId, boolean>;

type Action =
  | { type: "OPEN"; id: PanelId }
  | { type: "CLOSE"; id: PanelId }
  | { type: "TOGGLE"; id: PanelId }
  | { type: "CLOSE_ALL" };

const initialState: OverlayState = {
  nav: false,
  shop: false,
  nearby: false,
  saved: false,
};

function reducer(state: OverlayState, action: Action): OverlayState {
  switch (action.type) {
    case "OPEN": {
      return {
        nav: false,
        shop: false,
        nearby: false,
        saved: false,
        [action.id]: true,
      };
    }

    case "CLOSE": {
      if (!state[action.id]) return state;
      return { ...state, [action.id]: false };
    }

    case "TOGGLE": {
      if (state[action.id]) return reducer(state, { type: "CLOSE", id: action.id });
      return reducer(state, { type: "OPEN", id: action.id });
    }

    case "CLOSE_ALL":
      return initialState;

    default:
      return state;
  }
}

type OverlayContextValue = {
  isOpen: (id: PanelId) => boolean;
  open: (id: PanelId) => void;
  close: (id: PanelId) => void;
  toggle: (id: PanelId) => void;
  closeAll: () => void;
  getActivePanel: () => PanelId | null;
  closeActive: () => void;
};

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const isOpen = useCallback((id: PanelId) => state[id], [state]);

  const open = useCallback((id: PanelId) => {
    dispatch({ type: "OPEN", id });
  }, []);

  const close = useCallback((id: PanelId) => {
    dispatch({ type: "CLOSE", id });
  }, []);

  const toggle = useCallback((id: PanelId) => {
    dispatch({ type: "TOGGLE", id });
  }, []);

  const closeAll = useCallback(() => {
    dispatch({ type: "CLOSE_ALL" });
  }, []);

  const getActivePanel = useCallback((): PanelId | null => {
    // Check in priority order: nearby -> saved -> shop -> nav
    if (state.nearby) return "nearby";
    if (state.saved) return "saved";
    if (state.shop) return "shop";
    if (state.nav) return "nav";
    return null;
  }, [state]);

  const closeActive = useCallback(() => {
    const active = getActivePanel();
    if (active) {
      close(active);
    }
  }, [getActivePanel, close]);

  const value = useMemo<OverlayContextValue>(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      closeAll,
      getActivePanel,
      closeActive,
    }),
    [isOpen, open, close, toggle, closeAll, getActivePanel, closeActive]
  );

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

export function useOverlay() {
  const ctx = useContext(OverlayContext);
  if (!ctx) {
    throw new Error("useOverlay must be used within an OverlayProvider");
  }
  return ctx;
}