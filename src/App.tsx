import { Suspense } from "react";
import AppLayout from "./components/App/AppLayout";
import { BrowserRouter as Router } from "react-router-dom";
import Routes from "./components/App/Routes";
import { ModalProvider } from "./context/modalContext";
import { MapProvider } from "./context/mapContext";
import { ToastProvider } from "./context/toastContext";

function App() {
  return (
    <Router>
      <MapProvider>
        <ToastProvider>
          <ModalProvider>
            <AppLayout>
              <Suspense fallback={<div>Loading...</div>}>
                <Routes />
              </Suspense>
            </AppLayout>
          </ModalProvider>
        </ToastProvider>
      </MapProvider>
    </Router>
  );
}

export default App;
