import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@context/toastContext";
import { ShopsProvider } from "@context/shopContext";
import { ShopSidebarProvider } from "@context/ShopSidebarContext";
import { MapProvider } from "@context/mapContext";

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  route?: string;
  initialEntries?: string[];
}

/**
 * Renders a component with all required app context providers.
 * Use this for component tests that need access to app contexts.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    route = "/",
    initialEntries = ["/"],
    ...renderOptions
  }: RenderWithProvidersOptions = {},
) {
  const entries = route !== "/" ? [route] : initialEntries;

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={entries}>
        <ToastProvider>
          <MapProvider>
            <ShopsProvider>
              <ShopSidebarProvider>{children}</ShopSidebarProvider>
            </ShopsProvider>
          </MapProvider>
        </ToastProvider>
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Creates a wrapper function for use with renderHook.
 * Use this when testing custom hooks that need context providers.
 */
export function makeProvidersWrapper(route = "/", initialEntries = ["/"]) {
  const entries = route !== "/" ? [route] : initialEntries;

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={entries}>
        <ToastProvider>
          <MapProvider>
            <ShopsProvider>
              <ShopSidebarProvider>{children}</ShopSidebarProvider>
            </ShopsProvider>
          </MapProvider>
        </ToastProvider>
      </MemoryRouter>
    );
  };
}
