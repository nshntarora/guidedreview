import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Options } from "./Options";
import "../styles/theme.css";
import "./options.scss";

const root = document.getElementById("root");
if (!root) throw new Error("Options page is missing its #root element.");

createRoot(root).render(
  <StrictMode>
    <Options />
  </StrictMode>,
);
