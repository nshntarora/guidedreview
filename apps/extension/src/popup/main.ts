import { parsePRUrl } from "../lib/github/diffFetch";
import type { StartGuidedReviewMessage } from "../lib/types";
import "./popup.css";

const NOT_ON_PR = "Open a GitHub pull request page to start a review.";
const RELOAD_PR = "Reload this pull request page, then try again.";

/** Path registered as `options_page` in the manifest (stable across builds). */
const OPTIONS_PAGE = "src/options/index.html";

init();

async function init(): Promise<void> {
  const root = document.getElementById("root");
  const messageEl = document.getElementById("message");
  const settingsLink = document.getElementById("settings");
  const aboutLink = document.getElementById("about");
  if (!(root instanceof HTMLElement) || !(messageEl instanceof HTMLElement)) return;

  const markUrl = chrome.runtime.getURL("logomark.svg");
  root.style.setProperty("--mark-url", `url("${markUrl}")`);

  settingsLink?.addEventListener("click", (event) => {
    event.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // openOptionsPage() cannot take a hash; open the options URL with #about.
  aboutLink?.addEventListener("click", (event) => {
    event.preventDefault();
    void chrome.tabs.create({
      url: chrome.runtime.getURL(`${OPTIONS_PAGE}#about`),
    });
  });

  const tab = await getActiveTab();
  const tabId = tab?.id;
  const pr = tab?.url ? parsePRUrl(tab.url) : null;

  if (tabId != null && pr) {
    const message: StartGuidedReviewMessage = { type: "START_GUIDED_REVIEW" };
    try {
      await chrome.tabs.sendMessage(tabId, message);
      window.close();
      return;
    } catch {
      showMessage(root, messageEl, RELOAD_PR);
      return;
    }
  }

  showMessage(root, messageEl, NOT_ON_PR);
}

function showMessage(root: HTMLElement, messageEl: HTMLElement, text: string): void {
  messageEl.textContent = text;
  root.hidden = false;
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}
