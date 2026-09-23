import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./style.css";

const container = document.getElementById("root");
if (!container) throw new Error("missing #root");
createRoot(container).render(<App />);
