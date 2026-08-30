import { ToastProvider } from "./context/ToastContext";
import AppRouter from "./router/AppRouter";

function App() {
  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  );
}

export default App;
