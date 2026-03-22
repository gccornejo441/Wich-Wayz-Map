import { ReactNode, Suspense } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import MainRoutes from "./components/App/Routes";
import { ModalProvider } from "./context/modalContext";
import { MapProvider } from "./context/mapContext";
import { ToastProvider } from "./context/toastContext";
import { VoteProvider } from "./context/voteContext";
import { UserLeaderboardProvider } from "./context/userLeaderboardContext";
import { ShopSidebarProvider } from "./context/ShopSidebarContext";
import { SavedProvider } from "./context/savedContext";
import { OverlayProvider } from "./context/overlayContext";
import { MetadataErrorBanner } from "./components/Utilites/MetadataErrorBanner";
import { UpdatePrompt } from "./components/Utilites/UpdatePrompt";
import { ErrorBoundary } from "./components/Utilites/ErrorBoundary";

/** Composes all context providers in a single, readable wrapper. */
function AppProviders({ children }: { children: ReactNode }) {
  return (
    <OverlayProvider>
      <MapProvider>
        <ToastProvider>
          <ModalProvider>
            <VoteProvider>
              <UserLeaderboardProvider>
                <ShopSidebarProvider>
                  <SavedProvider>{children}</SavedProvider>
                </ShopSidebarProvider>
              </UserLeaderboardProvider>
            </VoteProvider>
          </ModalProvider>
        </ToastProvider>
      </MapProvider>
    </OverlayProvider>
  );
}

/** Accessible loading fallback shown while lazy route chunks are fetched. */
function PageLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      className="flex min-h-screen items-center justify-center bg-surface-dark"
    >
      <span className="text-text-muted text-sm">Loading&hellip;</span>
    </div>
  );
}

function App() {
  return (
    <Router>
      <UpdatePrompt />
      <ErrorBoundary>
        <AppProviders>
          <MetadataErrorBanner />
          <Suspense fallback={<PageLoadingFallback />}>
            <MainRoutes />
          </Suspense>
        </AppProviders>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
