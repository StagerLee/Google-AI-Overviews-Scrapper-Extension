const STORAGE_KEY = "google_ai_overview_logs";

function loadLogs() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (res) => {
      resolve(Array.isArray(res[STORAGE_KEY]) ? res[STORAGE_KEY] : []);
    });
  });
}

function saveLogs(logs) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: logs }, resolve);
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  const logs = await loadLogs();
  if (!Array.isArray(logs)) {
    await saveLogs([]);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") return;

  if (message.type === "SAVE_SEARCH_RECORD") {
    (async () => {
      const logs = await loadLogs();
      logs.unshift(message.payload);
      await saveLogs(logs.slice(0, 500)); // keep latest 500 records
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message.type === "GET_LOGS") {
    (async () => {
      const logs = await loadLogs();
      sendResponse({ ok: true, logs });
    })();
    return true;
  }

  if (message.type === "CLEAR_LOGS") {
    (async () => {
      await saveLogs([]);
      sendResponse({ ok: true });
    })();
    return true;
  }
});
