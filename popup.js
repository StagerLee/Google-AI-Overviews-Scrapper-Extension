const STORAGE_KEY = "google_ai_overview_logs";

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function truncate(str, n = 300) {
  str = String(str || "");
  return str.length > n ? str.slice(0, n) + "…" : str;
}

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

function render(logs) {
  const summary = document.getElementById("summary");
  const list = document.getElementById("list");

  summary.textContent = `${logs.length} saved search${logs.length === 1 ? "" : "es"}`;

  if (!logs.length) {
    list.innerHTML = `<div class="empty">No records yet. Run a Google search to capture one.</div>`;
    return;
  }

  list.innerHTML = logs.map((item) => {
    const aiText = item.aiOverview?.text || "";
    const aiLinks = Array.isArray(item.aiOverview?.links) ? item.aiOverview.links : [];
    const links = Array.isArray(item.resultLinks) ? item.resultLinks : [];

    const aiLinksHtml = aiLinks.length
      ? `<ul>${aiLinks.map(l => `<li><a href="${escapeHtml(l.url)}" target="_blank" rel="noreferrer">${escapeHtml(truncate(l.title || l.url, 110))}</a></li>`).join("")}</ul>`
      : `<div class="muted">No AI Overview links found.</div>`;

    const linksHtml = links.length
      ? `<ul>${links.map(l => `<li><a href="${escapeHtml(l.url)}" target="_blank" rel="noreferrer">${escapeHtml(truncate(l.title || l.url, 110))}</a><div class="snippet">${escapeHtml(truncate(l.snippet || "", 180))}</div></li>`).join("")}</ul>`
      : `<div class="muted">No result links found.</div>`;

    return `
      <section class="card">
        <div class="card-top">
          <div>
            <div class="query">${escapeHtml(item.query || "(no query)")}</div>
            <div class="meta">${escapeHtml(item.timestamp || "")}</div>
            <div class="meta">${escapeHtml(item.pageTitle || "")}</div>
          </div>
          <a class="open" href="${escapeHtml(item.url || "#")}" target="_blank" rel="noreferrer">Open</a>
        </div>

        <div class="block">
          <h2>AI Overview</h2>
          <div class="ai-text">${escapeHtml(aiText || "No AI Overview text captured.")}</div>
          <div class="subhead">AI Overview links</div>
          ${aiLinksHtml}
        </div>

        <div class="block">
          <h2>Search result links</h2>
          ${linksHtml}
        </div>
      </section>
    `;
  }).join("");
}

async function refresh() {
  const logs = await loadLogs();
  render(logs);
}

document.getElementById("refresh").addEventListener("click", refresh);

document.getElementById("export").addEventListener("click", async () => {
  const logs = await loadLogs();
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "google-ai-overview-logs.json";
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

document.getElementById("clear").addEventListener("click", async () => {
  if (!confirm("Clear all saved logs?")) return;
  await saveLogs([]);
  await refresh();
});

refresh();
