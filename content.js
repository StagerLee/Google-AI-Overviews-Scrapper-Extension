(() => {
  const EXTENSION_FLAG = "__gao_logged__";
  const STORAGE_MESSAGE_TYPE = "SAVE_SEARCH_RECORD";

  function normalizeText(s) {
    return (s || "").replace(/\s+/g, " ").trim();
  }

  function getQueryFromUrl() {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get("q") || "";
    } catch {
      return "";
    }
  }

  function isGoogleSearchPage() {
    return location.hostname === "www.google.com" && location.pathname === "/search";
  }

  function uniqueByUrl(items) {
    const seen = new Set();
    const out = [];
    for (const item of items) {
      if (!item || !item.url) continue;
      const key = item.url;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }

  function extractResultLinks() {
    const anchors = [...document.querySelectorAll('a[href]')];
    const items = [];

    for (const a of anchors) {
      const href = a.href;
      if (!href) continue;
      if (href.startsWith("javascript:")) continue;
      if (href.includes("google.com/search")) continue;
      if (href.includes("webcache.googleusercontent.com")) continue;

      const titleEl = a.querySelector("h3");
      if (!titleEl) continue;

      const title = normalizeText(titleEl.innerText || titleEl.textContent);
      const snippetContainer =
        a.closest("div[data-snc]") ||
        a.closest("div[class]") ||
        a.parentElement;

      const snippet = normalizeText(snippetContainer?.innerText || "");
      items.push({ title, url: href, snippet });
    }

    return uniqueByUrl(items).slice(0, 20);
  }

  function candidateContainers() {
    const nodes = [...document.querySelectorAll("div, section, main, article")];
    return nodes.filter((el) => {
      const t = normalizeText(el.innerText || "");
      return t.length > 40 && t.length < 12000;
    });
  }

  function extractAiOverview() {
    const allNodes = [...document.querySelectorAll("div, section, main, article, h1, h2, h3, h4")];

    const headingCandidates = allNodes.filter((el) => {
      const t = normalizeText(el.innerText || "");
      return /^(AI Overview|Overview|AI-generated overview)$/i.test(t) || t === "AI Overview";
    });

    // Try to locate a real block near the heading
    for (const heading of headingCandidates) {
      let scope =
        heading.closest("section") ||
        heading.closest("div") ||
        heading.parentElement ||
        heading;

      // Common strategy: the actual content is in the next sizable sibling or nearby descendant
      const neighbors = [];
      if (scope.nextElementSibling) neighbors.push(scope.nextElementSibling);
      if (scope.parentElement?.nextElementSibling) neighbors.push(scope.parentElement.nextElementSibling);
      if (scope.parentElement) neighbors.push(...[...scope.parentElement.children].filter((x) => x !== scope));

      for (const node of neighbors) {
        const text = normalizeText(node?.innerText || "");
        if (!text) continue;
        if (/^AI Overview$/i.test(text)) continue;
        if (text.length < 30) continue;

        const links = [...(node.querySelectorAll?.("a[href]") || [])]
          .map((a) => ({
            title: normalizeText(a.innerText || a.textContent),
            url: a.href
          }))
          .filter((x) => x.url && !x.url.startsWith("javascript:"));

        // Avoid just grabbing the heading repeated
        if (text === "AI Overview") continue;

        return {
          text,
          links: uniqueByUrl(links)
        };
      }
    }

    // Heuristic fallback:
    // Find a block containing "AI Overview" and the most additional text around it
    const blocks = candidateContainers()
      .map((el) => {
        const text = normalizeText(el.innerText || "");
        const links = [...el.querySelectorAll("a[href]")]
          .map((a) => ({
            title: normalizeText(a.innerText || a.textContent),
            url: a.href
          }))
          .filter((x) => x.url && !x.url.startsWith("javascript:"));

        const hasAIO = /AI Overview/i.test(text);
        const sentenceCount = (text.match(/[.!?]\s/g) || []).length;
        const score =
          (hasAIO ? 1000 : 0) +
          Math.min(text.length, 3000) / 10 +
          sentenceCount * 12 +
          Math.min(links.length, 10) * 15;

        return { el, text, links: uniqueByUrl(links), score, hasAIO };
      })
      .filter((x) => x.hasAIO);

    blocks.sort((a, b) => b.score - a.score);

    const best = blocks[0];
    if (!best) return null;

    // Remove the heading-only case
    if (best.text.trim() === "AI Overview") return null;

    return {
      text: best.text,
      links: best.links
    };
  }

  function extractSearchRecord() {
    const query = getQueryFromUrl();
    const resultLinks = extractResultLinks();
    const aiOverview = extractAiOverview();

    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      url: location.href,
      pageTitle: document.title || "",
      query,
      aiOverview: aiOverview || { text: "", links: [] },
      resultLinks
    };
  }

  function shouldLogNow() {
    return isGoogleSearchPage() && getQueryFromUrl().trim().length > 0;
  }

  function sendRecordWhenReady() {
    if (!shouldLogNow()) return;
    if (window[EXTENSION_FLAG]) return;

    const record = extractSearchRecord();

    // Avoid saving trivial empty AI overview objects repeatedly
    if (!record.query && record.resultLinks.length === 0) return;

    window[EXTENSION_FLAG] = true;

    chrome.runtime.sendMessage(
      { type: STORAGE_MESSAGE_TYPE, payload: record },
      () => {
        // ignore runtime errors on navigation / reload
      }
    );
  }

  let debounceTimer = null;
  function scheduleCapture() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      window[EXTENSION_FLAG] = false;
      sendRecordWhenReady();
    }, 2500);
  }

  function observeDom() {
    const target = document.documentElement || document.body;
    if (!target) return;

    const observer = new MutationObserver(() => {
      scheduleCapture();
    });

    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // initial tries
    scheduleCapture();
    setTimeout(scheduleCapture, 3000);
    setTimeout(scheduleCapture, 6000);
  }

  function observeHistory() {
    const pushState = history.pushState;
    const replaceState = history.replaceState;

    history.pushState = function (...args) {
      const result = pushState.apply(this, args);
      scheduleCapture();
      return result;
    };

    history.replaceState = function (...args) {
      const result = replaceState.apply(this, args);
      scheduleCapture();
      return result;
    };

    window.addEventListener("popstate", scheduleCapture);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      observeHistory();
      observeDom();
    }, { once: true });
  } else {
    observeHistory();
    observeDom();
  }
})();
