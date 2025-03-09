import { Suspense } from "react";
import AppLayout from "./components/App/AppLayout";
import { BrowserRouter as Router } from "react-router-dom";
import Routes from "./components/App/Routes";
import { ModalProvider } from "./context/modalContext";
import { MapProvider } from "./context/mapContext";
import { ToastProvider } from "./context/toastContext";
import { VoteProvider } from "./context/voteContext";
import { UserLeaderboardProvider } from "./context/userLeaderboardContext";
import { ShopSidebarProvider } from "./context/ShopSidebarContext";

function App() {
  return (
    <Router>
      <MapProvider>
        <ToastProvider>
          <ModalProvider>
            <VoteProvider>
              <UserLeaderboardProvider>
                <ShopSidebarProvider>
                  <AppLayout>
                    <Suspense fallback={<div>Loading...</div>}>
                      <Routes />
                    </Suspense>
                  </AppLayout>
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
