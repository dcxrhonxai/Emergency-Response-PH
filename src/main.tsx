import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";
import { initializeFirebase, setupErrorTracking } from "./lib/firebase";

// Initialize Firebase Analytics and error tracking
initializeFirebase();
setupErrorTracking();

createRoot(document.getElementById("root")!).render(<App />);
