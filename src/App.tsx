import { Suspense } from "react";
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

function App() {
  return (
    <Router>
      <UpdatePrompt />
      <OverlayProvider>
        <MapProvider>
          <ToastProvider>
            <ModalProvider>
              <VoteProvider>
                <UserLeaderboardProvider>
                  <ShopSidebarProvider>
                    <SavedProvider>
                      <MetadataErrorBanner />
                      <Suspense fallback={<div>Loading...</div>}>
                        <MainRoutes />
                      </Suspense>
                    </SavedProvider>
                  </ShopSidebarProvider>
                </UserLeaderboardProvider>
              </VoteProvider>
            </ModalProvider>
          </ToastProvider>
        </MapProvider>
      </OverlayProvider>
    </Router>
  );
}

export default App;
