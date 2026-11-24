(() => {
  "use strict";

  const API = "/api/api-keys";

  const SCOPES = [
    ["projects:read", "Kusoma Projects"],
    ["projects:write", "Kusimamia Projects"],
    ["builds:read", "Kusoma Builds"],
    ["builds:write", "Kuendesha Builds"],
    ["deployments:read", "Kusoma Deployments"],
    ["deployments:write", "Kusimamia Deployments"],
    ["domains:read", "Kusoma Domains"],
    ["domains:write", "Kusimamia Domains"],
    ["storage:read", "Kusoma Storage"],
    ["storage:write", "Kusimamia Storage"]
  ];

  let keys = [];
  let busy = false;
  let revealedSecret = null;

  const root = () => document.getElementById("ln-api-keys");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[c]);

  const request = async (method, path, body) => {
    if (typeof window.apiRequest !== "function") {
      throw new Error("API client haipatikani.");
    }

    const result = await window.apiRequest(method, path, body);

    if (!result.ok || result.data?.success === false) {
      throw new Error(
        result.data?.error || `Ombi limekataa (${result.status}).`
      );
    }

    return result.data;
  };

  function notify(message, type = "err") {
    if (typeof window.toast === "function") {
      window.toast(message, type);
    } else {
      alert(message);
    }
  }

  function styles() {
    if (document.getElementById("ln-api-key-styles")) return;

    const style = document.createElement("style");
    style.id = "ln-api-key-styles";
    style.textContent = `
      #ln-api-keys { display:grid; gap:16px; }
      #ln-api-keys .ak-panel {
        background:var(--card,#0b1220);
        border:1px solid var(--border,#263247);
        border-radius:14px;padding:16px;
      }
      #ln-api-keys .ak-row {
        display:flex;align-items:center;justify-content:space-between;
        gap:12px;flex-wrap:wrap;
      }
      #ln-api-keys .ak-muted { opacity:.7;font-size:13px; }
      #ln-api-keys .ak-list { display:grid;gap:12px; }
      #ln-api-keys .ak-key {
        border:1px solid var(--border,#263247);
        border-radius:12px;padding:15px;
      }
      #ln-api-keys button {
        cursor:pointer;border:1px solid var(--border,#334155);
        border-radius:9px;padding:9px 13px;
        background:var(--card,#111827);color:inherit;
      }
      #ln-api-keys button.ak-primary {
        background:var(--accent,#2563eb);color:white;
      }
      #ln-api-keys button:disabled { opacity:.5;cursor:not-allowed; }
      #ln-api-keys input, #ln-api-keys select {
        width:100%;padding:11px;border-radius:9px;
        border:1px solid var(--border,#334155);
        background:var(--bg,#030712);color:inherit;
      }
      #ln-api-keys .ak-field { display:grid;gap:7px;margin:12px 0; }
      #ln-api-keys .ak-scopes {
        display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));
        gap:9px;margin:12px 0;
      }
      #ln-api-keys .ak-scope {
        display:flex;align-items:center;gap:8px;font-size:13px;
      }
      #ln-api-keys .ak-scope input { width:auto; }
      #ln-api-keys .ak-actions { display:flex;gap:8px;flex-wrap:wrap;margin-top:12px; }
      #ln-api-keys .ak-status {
        display:inline-block;border:1px solid var(--border,#334155);
        border-radius:20px;padding:3px 9px;font-size:12px;
      }
      #ln-api-keys .ak-secret {
        overflow-wrap:anywhere;padding:12px;border-radius:9px;
        background:var(--bg,#030712);border:1px solid var(--border,#334155);
        margin:12px 0;
      }
      #ln-api-keys .ak-danger { color:#f87171; }
    `;
    document.head.appendChild(style);
  }

  function render() {
    const el = root();
    if (!el) return;

    const list = keys.map(key => `
      <article class="ak-key">
        <div class="ak-row">
          <strong>${esc(key.name)}</strong>
          <span class="ak-status">${esc(key.status || "active")}</span>
        </div>
        <p class="ak-muted">${esc(key.key_prefix || "")}••••••••</p>
        <p class="ak-muted">Ruhusa: ${esc((key.scopes || []).join(", "))}</p>
        <p class="ak-muted">Imetengenezwa: ${esc(key.created_at || "—")}</p>
        <p class="ak-muted">Imetumika mwisho: ${esc(key.last_used_at || "Haijatumika")}</p>
        <p class="ak-muted">Inaisha: ${esc(key.expires_at || "Hakuna muda maalumu")}</p>
        ${key.status === "active" ? `
          <div class="ak-actions">
            <button type="button" data-action="rotate" data-id="${esc(key.id)}">↻ Rotate</button>
            <button type="button" class="ak-danger" data-action="revoke" data-id="${esc(key.id)}">Revoke</button>
          </div>` : ""}
      </article>
    `).join("");

    el.innerHTML = `
      <div class="ak-panel">
        <div class="ak-row">
          <div>
            <strong>🔑 API Key Management</strong>
            <p class="ak-muted">Dhibiti API keys za akaunti yako.</p>
          </div>
          <button type="button" class="ak-primary" data-action="open-create">＋ Tengeneza API Key</button>
        </div>
      </div>

      ${revealedSecret ? `
        <div class="ak-panel">
          <strong>⚠️ API Key yako mpya</strong>
          <p class="ak-muted">Hii ndiyo nafasi pekee ya kuona secret hii. Ihifadhi mahali salama.</p>
          <div class="ak-secret" id="ak-secret">${esc(revealedSecret)}</div>
          <div class="ak-actions">
            <button type="button" class="ak-primary" data-action="copy-secret">Nakili Secret</button>
            <button type="button" data-action="dismiss-secret">Nimeihifadhi</button>
          </div>
        </div>` : ""}

      <div class="ak-panel">
        <div class="ak-row">
          <strong>API Keys zako</strong>
          <button type="button" data-action="refresh">↻ Sasisha</button>
        </div>
        <div class="ak-list" style="margin-top:14px">
          ${list || '<p class="ak-muted">Hakuna API key iliyopatikana kwenye akaunti hii.</p>'}
        </div>
      </div>

      <div class="ak-panel" id="ak-create-panel" hidden>
        <strong>＋ Tengeneza API Key</strong>
        <form id="ak-create-form">
          <label class="ak-field">
            Jina la API Key
            <input name="name" required minlength="1" maxlength="80"
              placeholder="Mfano: My Application">
          </label>

          <div class="ak-field">
            <strong>Chagua ruhusa</strong>
            <div class="ak-scopes">
              ${SCOPES.map(([value, label]) => `
                <label class="ak-scope">
                  <input type="checkbox" name="scopes" value="${value}">
                  ${label}
                </label>
              `).join("")}
            </div>
          </div>

          <label class="ak-field">
            Tarehe ya kuisha (si lazima)
            <input type="datetime-local" name="expires_at">
          </label>

          <div class="ak-actions">
            <button class="ak-primary" type="submit">Tengeneza Key</button>
            <button type="button" data-action="close-create">Ghairi</button>
          </div>
        </form>
      </div>
    `;
  }

  async function load() {
    if (busy) return;
    busy = true;
    try {
      const response = await request("GET", API);
      const data = response.data;
      keys = Array.isArray(data) ? data : [];
      render();
    } catch (error) {
      notify(error.message);
    } finally {
      busy = false;
    }
  }

  async function create(form) {
    const fd = new FormData(form);
    const scopes = fd.getAll("scopes");

    if (!scopes.length) {
      notify("Chagua angalau ruhusa moja.");
      return;
    }

    const expiry = fd.get("expires_at");
    const expires_at = expiry ? new Date(expiry).toISOString() : null;

    const response = await request("POST", API, {
      name: String(fd.get("name") || "").trim(),
      scopes,
      expires_at
    });

    const secret = response.data?.secret;
    if (!secret) throw new Error("Backend haikurudisha secret ya API Key.");

    revealedSecret = secret;
    notify("API Key imetengenezwa. Nakili secret yako sasa.", "ok");
    await load();
    render();
  }

  async function rotate(id) {
    if (!confirm("Rotate API Key hii? Key ya zamani itafutwa na mpya itatengenezwa.")) return;

    const response = await request("POST", `${API}/${encodeURIComponent(id)}/rotate`);
    const secret = response.data?.secret;
    if (!secret) throw new Error("Backend haikurudisha secret mpya.");

    revealedSecret = secret;
    notify("API Key imezungushwa. Nakili secret mpya sasa.", "ok");
    await load();
    render();
  }

  async function revoke(id) {
    if (!confirm("Una uhakika unataka kufuta matumizi ya API Key hii? Hatua hii haiwezi kutenguliwa.")) return;

    await request("DELETE", `${API}/${encodeURIComponent(id)}`);
    notify("API Key imeondolewa.", "ok");
    await load();
  }

  async function copySecret() {
    if (!revealedSecret) return;
    try {
      await navigator.clipboard.writeText(revealedSecret);
      notify("Secret imenakiliwa.", "ok");
    } catch {
      notify("Imeshindikana kunakili. Chagua na unakili secret mwenyewe.");
    }
  }

  function init() {
    const el = root();
    if (!el || el.dataset.initialized === "true") return;

    el.dataset.initialized = "true";
    styles();
    render();

    el.addEventListener("click", async event => {
      const button = event.target.closest("[data-action]");
      if (!button || button.disabled) return;

      const action = button.dataset.action;
      const id = button.dataset.id;

      try {
        button.disabled = true;

        if (action === "open-create") {
          const panel = el.querySelector("#ak-create-panel");
          panel.hidden = false;
          panel.querySelector('input[name="name"]').focus();
        } else if (action === "close-create") {
          el.querySelector("#ak-create-panel").hidden = true;
        } else if (action === "refresh") {
          await load();
        } else if (action === "rotate") {
          await rotate(id);
        } else if (action === "revoke") {
          await revoke(id);
        } else if (action === "copy-secret") {
          await copySecret();
        } else if (action === "dismiss-secret") {
          revealedSecret = null;
          render();
        }
      } catch (error) {
        notify(error.message);
      } finally {
        button.disabled = false;
      }
    });

    el.addEventListener("submit", async event => {
      if (event.target.id !== "ak-create-form") return;
      event.preventDefault();

      const submit = event.target.querySelector('[type="submit"]');
      submit.disabled = true;

      try {
        await create(event.target);
      } catch (error) {
        notify(error.message);
      } finally {
        submit.disabled = false;
      }
    });

    load();
  }

  window.LucasNodeApiKeys = { init, load };
})();
