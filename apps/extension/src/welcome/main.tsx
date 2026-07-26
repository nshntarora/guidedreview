import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Welcome } from "./Welcome";
import "./styles.css";
import "./welcome.scss";

const root = document.getElementById("root");
if (!root) throw new Error("Welcome page is missing its #root element.");

createRoot(root).render(
  <StrictMode>
    <Welcome />
  </StrictMode>,
);
