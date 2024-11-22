import { Suspense } from "react";
import AppLayout from "./components/App/AppLayout";
import { BrowserRouter as Router } from "react-router-dom";
import Routes from "./components/App/Routes";
import { ModalProvider } from "./context/modalContext";

function App() {
  return (
    <Router>
      <ModalProvider>
        <AppLayout>
          <Suspense fallback={<div>Loading...</div>}>
            <Routes />
          </Suspense>
        </AppLayout>
      </ModalProvider>
    </Router>
  );
}

export default App;
