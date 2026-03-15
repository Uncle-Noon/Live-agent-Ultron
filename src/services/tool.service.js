// tool.service.js

const COMMANDS_STORAGE_KEY = "ultronCommands";

const DEFAULT_COMMANDS = [
  {
    keyword: "open youtube",
    url: "https://www.youtube.com",
    label: "YouTube",
    aliases: ["youtube", "yt"],
  },
  {
    keyword: "open instagram",
    url: "https://www.instagram.com",
    label: "Instagram",
    aliases: ["instagram", "insta", "ig"],
  },
];

let customCommands = [];

function loadCommands() {
  try {
    const raw = localStorage.getItem(COMMANDS_STORAGE_KEY);
    const items = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(items)) return;
    customCommands = items
      .filter((cmd) => cmd && cmd.keyword && cmd.url)
      .map((cmd) => ({
        keyword: cmd.keyword,
        url: cmd.url,
        label: cmd.label || cmd.keyword,
        aliases: cmd.aliases || [],
      }));
  } catch (err) {
    console.warn("Failed to load commands", err);
    customCommands = [];
  }
}

function saveCommands() {
  try {
    localStorage.setItem(COMMANDS_STORAGE_KEY, JSON.stringify(customCommands));
  } catch (err) {
    console.warn("Failed to save commands", err);
  }
}

function getAllCommands() {
  return [...DEFAULT_COMMANDS, ...customCommands];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findCommand(message) {
  const normalized = message.trim().toLowerCase();
  const commands = getAllCommands();

  const buildTokens = (cmd) => {
    const base = (cmd.keyword || "").trim().toLowerCase();
    const aliases = Array.isArray(cmd.aliases) ? cmd.aliases : [];
    return [base, ...aliases.map((a) => (a || "").trim().toLowerCase())].filter(
      Boolean
    );
  };

  const isWordMatch = (text, token) => {
    const regexp = new RegExp(`\\b${escapeRegExp(token)}\\b`, "i");
    return regexp.test(text);
  };

  const exact = commands.find((c) => {
    const tokens = buildTokens(c);
    return tokens.some((token) => token === normalized);
  });
  if (exact) return exact;

  return commands.find((c) => {
    const tokens = buildTokens(c);
    return tokens.some((token) => isWordMatch(normalized, token));
  });
}

export function tryHandleCommand(message) {
  const cmd = findCommand(message);
  if (!cmd) return false;

  window.open(cmd.url, "_blank");
  // UI message itself is still handled in chat.ui.html via appendMessage
  return true;
}

export function initCommandTools({
  listEl,
  formEl,
  keywordInput,
  urlInput,
  errorEl,
}) {
  loadCommands();
  renderCommands(listEl);

  if (!formEl) return;

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    if (errorEl) errorEl.style.display = "none";

    const keyword = (keywordInput.value || "").trim();
    const url = (urlInput.value || "").trim();

    if (!keyword || !url) {
      if (errorEl) {
        errorEl.textContent = "Both keyword and URL are required.";
        errorEl.style.display = "block";
      }
      return;
    }

    try {
      new URL(url);
    } catch (err) {
      if (errorEl) {
        errorEl.textContent =
          "Please enter a valid URL (e.g. https://example.com).";
        errorEl.style.display = "block";
      }
      return;
    }

    const exists = getAllCommands().some(
      (c) => c.keyword.trim().toLowerCase() === keyword.toLowerCase()
    );
    if (exists) {
      if (errorEl) {
        errorEl.textContent = "A command with that keyword already exists.";
        errorEl.style.display = "block";
      }
      return;
    }

    customCommands.push({ keyword, url, label: keyword });
    saveCommands();
    renderCommands(listEl);

    keywordInput.value = "";
    urlInput.value = "";
    keywordInput.focus();
  });
}

function renderCommands(listEl) {
  if (!listEl) return;

  const commands = getAllCommands();
  if (!commands.length) {
    listEl.innerHTML =
      '<div class="empty-state">No commands configured yet.</div>';
    return;
  }

  listEl.innerHTML = "";
  commands.forEach((cmd) => {
    const row = document.createElement("div");
    row.className = "msg-row";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.padding = "8px 10px";
    row.style.borderBottom = "1px solid rgba(148, 163, 184, 0.1)";

    const label = document.createElement("div");
    label.innerHTML = `<span style="font-weight:600">${cmd.keyword}</span><br/><span style="font-size:11px;color:rgba(148,163,184,0.9)">${cmd.url}</span>`;
    row.appendChild(label);

    const isCustom = !DEFAULT_COMMANDS.some(
      (d) => d.keyword.toLowerCase() === cmd.keyword.toLowerCase()
    );
    if (isCustom) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-secondary";
      btn.style.padding = "4px 8px";
      btn.style.fontSize = "11px";
      btn.textContent = "Delete";
      btn.addEventListener("click", () => {
        customCommands = customCommands.filter(
          (c) => c.keyword.toLowerCase() !== cmd.keyword.toLowerCase()
        );
        saveCommands();
        renderCommands(listEl);
      });
      row.appendChild(btn);
    }

    listEl.appendChild(row);
  });
}