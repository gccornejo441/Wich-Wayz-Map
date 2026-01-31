import { Suspense } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import MainRoutes from "./components/App/Routes";
import { ModalProvider } from "./context/modalContext";
import { MapProvider } from "./context/mapContext";
import { ToastProvider } from "./context/toastContext";
import { VoteProvider } from "./context/voteContext";
import { UserLeaderboardProvider } from "./context/userLeaderboardContext";
import { ShopSidebarProvider } from "./context/ShopSidebarContext";
import { SidebarProvider } from "./context/sidebarContext";
import { SavedProvider } from "./context/savedContext";

function App() {
  return (
    <Router>
      <MapProvider>
        <ToastProvider>
          <ModalProvider>
            <VoteProvider>
              <UserLeaderboardProvider>
                <ShopSidebarProvider>
                  <SavedProvider>
                    <SidebarProvider>
                      <Suspense fallback={<div>Loading...</div>}>
                        <MainRoutes />
                      </Suspense>
                    </SidebarProvider>
                  </SavedProvider>
                </ShopSidebarProvider>
              </UserLeaderboardProvider>
            </VoteProvider>
          </ModalProvider>
        </ToastProvider>
      </MapProvider>
    </Router>
  );
}

export default App;
