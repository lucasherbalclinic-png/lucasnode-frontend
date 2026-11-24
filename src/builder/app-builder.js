(() => {
  "use strict";

  const API_CONTRACTS = Object.freeze({
    createProject: {
      method: "POST",
      path: "/api/v2/projects",
      body: {
        name: "string",
        slug: "string",
        type: "web",
        framework: "html",
        language: "javascript",
        description: "string"
      }
    },
    listProjects: {
      method: "GET",
      path: "/api/v2/projects"
    },
    projectDetail: {
      method: "GET",
      path: "/api/v2/projects/:projectId"
    }
  });

  const frameworks = {
    web: [
      ["html", "HTML / CSS / JavaScript"],
      ["react", "React"],
      ["vue", "Vue"]
    ],
    backend: [
      ["node", "Node.js API"]
    ],
    fullstack: [
      ["react-node", "React + Node.js"]
    ]
  };

  let root;
  let selectedType = "web";

  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[char]);

  function renderFrameworks() {
    const select = root.querySelector("#ln-builder-framework");
    if (!select) return;

    select.innerHTML = frameworks[selectedType]
      .map(([value, label]) =>
        `<option value="${escapeHTML(value)}">${escapeHTML(label)}</option>`
      ).join("");
  }

  function render() {
    root.innerHTML = `
      <div class="ln-builder-shell">
        <header class="ln-builder-heading">
          <div>
            <h2>LucasNode App Builder</h2>
            <p>Unda na usanidi wa project yako.</p>
          </div>
          <span class="ln-builder-mark">◆</span>
        </header>

        <section class="ln-builder-panel">
          <h3>01 · Project Information</h3>

          <label>
            Project Name
            <input id="ln-builder-name" maxlength="80"
              placeholder="Mfano: My Website" autocomplete="off">
          </label>

          <label>
            Project Slug
            <input id="ln-builder-slug" maxlength="80"
              placeholder="my-website" autocomplete="off">
          </label>

          <label>
            Description
            <textarea id="ln-builder-description" rows="3"
              maxlength="1000" placeholder="Eleza kazi ya project yako"></textarea>
          </label>
        </section>

        <section class="ln-builder-panel">
          <h3>02 · Project Type</h3>
          <label>
            Application Type
            <select id="ln-builder-type">
              <option value="web">Web Application</option>
              <option value="backend">Backend / API</option>
              <option value="fullstack">Full-stack Application</option>
            </select>
          </label>

          <label>
            Framework
            <select id="ln-builder-framework"></select>
          </label>

          <label>
            Main Language
            <select id="ln-builder-language">
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
            </select>
          </label>
        </section>

        <section class="ln-builder-panel">
          <h3>03 · Project Configuration</h3>
          <label>
            Initial Structure
            <select id="ln-builder-structure">
              <option value="standard">Standard project</option>
              <option value="minimal">Minimal project</option>
              <option value="modular">Modular project</option>
            </select>
          </label>

          <label>
            Visibility
            <select id="ln-builder-visibility">
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </label>
        </section>


        <section class="ln-builder-panel" id="ln-builder-workspace">
          <h3>04 · Project Workspace & File Manager</h3>
          <p>Unda na simamia mafaili ya project yako.</p>

          <form id="ln-file-create-form" class="ln-file-create">
            <label>
              Jina la faili
              <input id="ln-file-new-name" maxlength="120"
                placeholder="Mfano: index.html" autocomplete="off" required>
            </label>
            <button type="submit" class="ln-file-button">＋ Unda Faili</button>
          </form>

          <div class="ln-file-layout">
            <div class="ln-file-list-panel">
              <strong>Mafaili ya Project</strong>
              <div id="ln-file-list" aria-live="polite">
                <p>Hakuna faili bado.</p>
              </div>
            </div>

            <div class="ln-file-editor-panel">
              <label>
                Faili lililochaguliwa
                <input id="ln-file-active-name" readonly
                  placeholder="Chagua faili">
              </label>

              <label>
                Maudhui ya faili
                <textarea id="ln-file-content" rows="12"
                  spellcheck="false" placeholder="Chagua au unda faili ili kuanza kuhariri."></textarea>
              </label>

              <div class="ln-file-actions">
                <button type="button" class="ln-file-button"
                  id="ln-file-rename">Rename</button>
                <button type="button" class="ln-file-button"
                  id="ln-file-delete">Delete</button>
              </div>
              <p id="ln-file-status" role="status" aria-live="polite"></p>
            </div>
          </div>
          <p class="ln-file-note">
            Mabadiliko ya sasa yanashikiliwa kwenye workspace ya ukurasa.
            Hifadhi ya kudumu itapatikana baada ya integration.
          </p>
        </section>

        <div class="ln-builder-actions">
          <button type="button" id="ln-builder-create">
            <span aria-hidden="true">＋</span> Create Project
          </button>
          <p id="ln-builder-message" role="status" aria-live="polite"></p>
        </div>
      </div>
    `;

    const style = document.createElement("style");
    style.id = "ln-builder-style";
    style.textContent = `
      #ln-builder-app .ln-builder-shell{display:grid;gap:18px;max-width:900px}
      #ln-builder-app .ln-builder-heading{display:flex;justify-content:space-between;align-items:center}
      #ln-builder-app h2,#ln-builder-app h3{margin:0 0 10px}
      #ln-builder-app p{color:var(--muted,#9ca3af)}
      #ln-builder-app .ln-builder-mark{font-size:28px;color:#818cf8}
      #ln-builder-app .ln-builder-panel{padding:20px;border:1px solid var(--border,#263244);border-radius:14px;background:var(--panel,#0b1220);display:grid;gap:13px}
      #ln-builder-app label{display:grid;gap:7px;font-size:14px}
      #ln-builder-app input,#ln-builder-app select,#ln-builder-app textarea{width:100%;min-width:0;padding:12px;border:1px solid var(--border,#334155);border-radius:9px;background:var(--bg,#030712);color:var(--text,#f8fafc);font:inherit}
      #ln-builder-app .ln-builder-actions button{padding:12px 18px;border:0;border-radius:9px;background:#4f46e5;color:white;font-weight:700;cursor:pointer;min-height:44px}
      #ln-builder-app .ln-builder-actions button:disabled{opacity:.6;cursor:wait}
      #ln-builder-app #ln-builder-message{margin-top:10px}
    `;

    style.textContent += `
      #ln-builder-app .ln-file-create{display:flex;gap:10px;align-items:end;flex-wrap:wrap}
      #ln-builder-app .ln-file-create label{flex:1;min-width:180px}
      #ln-builder-app .ln-file-layout{display:grid;grid-template-columns:minmax(130px,.75fr) minmax(0,1.5fr);gap:14px}
      #ln-builder-app .ln-file-list-panel,#ln-builder-app .ln-file-editor-panel{min-width:0}
      #ln-builder-app .ln-file-list-panel{border:1px solid var(--border,#334155);border-radius:10px;padding:12px}
      #ln-builder-app .ln-file-item{display:block;width:100%;text-align:left;margin-top:7px;padding:10px;border:1px solid var(--border,#334155);border-radius:8px;background:var(--bg,#030712);color:var(--text,#f8fafc);overflow-wrap:anywhere}
      #ln-builder-app .ln-file-item[aria-current="true"]{border-color:#818cf8;background:var(--accent-bg,#172554)}
      #ln-builder-app .ln-file-actions{display:flex;gap:8px;flex-wrap:wrap}
      #ln-builder-app .ln-file-button{padding:10px 14px;border:1px solid var(--border,#334155);border-radius:8px;background:var(--bg,#030712);color:var(--text,#f8fafc);min-height:42px}
      #ln-builder-app .ln-file-note{font-size:12px}
      @media(max-width:600px){#ln-builder-app .ln-file-layout{grid-template-columns:1fr}}
    `;

    if (!document.getElementById("ln-builder-style")) {
      document.head.appendChild(style);
    }

    root.querySelector("#ln-builder-type").addEventListener("change", event => {
      selectedType = event.target.value;
      renderFrameworks();
    });

    const nameInput = root.querySelector("#ln-builder-name");
    const slugInput = root.querySelector("#ln-builder-slug");

    nameInput.addEventListener("input", () => {
      if (!slugInput.dataset.edited) {
        slugInput.value = nameInput.value
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      }
    });

    slugInput.addEventListener("input", () => {
      slugInput.dataset.edited = "true";
    });

    root.querySelector("#ln-builder-create").addEventListener("click", createProject);

    root.querySelector("#ln-file-create-form").addEventListener("submit", createWorkspaceFile);
    root.querySelector("#ln-file-content").addEventListener("input", updateWorkspaceFile);
    root.querySelector("#ln-file-rename").addEventListener("click", renameWorkspaceFile);
    root.querySelector("#ln-file-delete").addEventListener("click", deleteWorkspaceFile);
    renderWorkspaceFiles();

    renderFrameworks();
  }

  async function createProject() {
    const button = root.querySelector("#ln-builder-create");
    const message = root.querySelector("#ln-builder-message");

    const project = {
      name: root.querySelector("#ln-builder-name").value.trim(),
      slug: root.querySelector("#ln-builder-slug").value.trim(),
      description: root.querySelector("#ln-builder-description").value.trim(),
      type: selectedType,
      framework: root.querySelector("#ln-builder-framework").value,
      language: root.querySelector("#ln-builder-language").value,
      structure: root.querySelector("#ln-builder-structure").value,
      visibility: root.querySelector("#ln-builder-visibility").value
    };

    if (!project.name) {
      message.textContent = "Weka jina la project.";
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) {
      message.textContent = "Slug iwe na herufi ndogo, namba na hyphen pekee.";
      return;
    }

    if (project.name.length > 80 || project.description.length > 1000) {
      message.textContent = "Baadhi ya taarifa zimezidi urefu unaoruhusiwa.";
      return;
    }

    button.disabled = true;
    message.textContent =
      "Taarifa zimehakikiwa. Project creation inasubiri muunganisho wa Backend v2.";

    button.disabled = false;

    window.dispatchEvent(new CustomEvent("lucasnode:builder-project-prepared", {
      detail: { project, contract: API_CONTRACTS.createProject }
    }));
  }


  let activeWorkspaceFile = "";

  const FILE_API_CONTRACTS = Object.freeze({
    list: { method: "GET", path: "/api/v2/projects/:projectId/files" },
    create: { method: "POST", path: "/api/v2/projects/:projectId/files" },
    update: { method: "PUT", path: "/api/v2/projects/:projectId/files/:fileId" },
    rename: { method: "PATCH", path: "/api/v2/projects/:projectId/files/:fileId" },
    delete: { method: "DELETE", path: "/api/v2/projects/:projectId/files/:fileId" }
  });

  function renderWorkspaceFiles() {
    const list = root.querySelector("#ln-file-list");
    if (!list) return;

    const bridge = window.LucasNodeEditorBridge;
    if (!bridge) {
      list.textContent = "Editor Bridge haijaanza.";
      return;
    }
    const names = bridge.list();
    list.innerHTML = names.length ? names.map(path =>
      '<button type="button" class="ln-file-item" data-file-path="' +
      escapeHTML(path) + '" aria-current="' +
      (path === activeWorkspaceFile ? "true" : "false") + '">' +
      escapeHTML(path) + "</button>"
    ).join("") : "<p>Hakuna faili kwenye Editor.</p>";

    list.querySelectorAll("[data-file-path]").forEach(button => {
      button.addEventListener("click", () => openWorkspaceFile(button.dataset.filePath));
    });
  }

  function createWorkspaceFile(event) {
    event.preventDefault();

    const input = root.querySelector("#ln-file-new-name");
    const path = input.value.trim();
    const status = root.querySelector("#ln-file-status");

    try {
      window.LucasNodeEditorBridge.create(path);
      input.value = "";
      openWorkspaceFile(path);
      status.textContent = "Faili limeongezwa kwenye Editor.";
      renderWorkspaceFiles();
    } catch (error) {
      status.textContent = error.message;
    }
  }

  function openWorkspaceFile(path) {
    const bridge = window.LucasNodeEditorBridge;
    if (!bridge || !bridge.open(path)) return;

    activeWorkspaceFile = path;
    root.querySelector("#ln-file-active-name").value = path;
    root.querySelector("#ln-file-content").value = bridge.read(path);
    root.querySelector("#ln-file-status").textContent = "Faili limefunguliwa kwenye Editor.";
    renderWorkspaceFiles();
  }

  function updateWorkspaceFile() {
    if (!activeWorkspaceFile) return;
    try {
      window.LucasNodeEditorBridge.update(
        activeWorkspaceFile,
        root.querySelector("#ln-file-content").value
      );
      root.querySelector("#ln-file-status").textContent =
        "Mabadiliko yamepelekwa kwenye Editor na Preview.";
    } catch (error) {
      root.querySelector("#ln-file-status").textContent = error.message;
    }
  }

  function renameWorkspaceFile() {
    if (!activeWorkspaceFile) return;

    const next = prompt("Ingiza jina jipya la faili:", activeWorkspaceFile);
    if (next === null) return;

    const path = next.trim();
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,119}$/.test(path) ||
        path.split("/").some(part => !part || part === "." || part === "..")) {
      root.querySelector("#ln-file-status").textContent = "Jina jipya si sahihi.";
      return;
    }

    if (window.LucasNodeEditorBridge.list().includes(path)) {
      root.querySelector("#ln-file-status").textContent = "Jina hilo tayari linatumika.";
      return;
    }

    try {
      window.LucasNodeEditorBridge.rename(activeWorkspaceFile, path);
      openWorkspaceFile(path);
      root.querySelector("#ln-file-status").textContent =
        "Jina limebadilishwa kwenye Editor.";
    } catch (error) {
      root.querySelector("#ln-file-status").textContent = error.message;
    }
  }

  function deleteWorkspaceFile() {
    if (!activeWorkspaceFile) return;

    if (!confirm("Una uhakika unataka kufuta faili hili kwenye workspace ya sasa?")) return;

    try {
      window.LucasNodeEditorBridge.delete(activeWorkspaceFile);
      activeWorkspaceFile = "";
      root.querySelector("#ln-file-active-name").value = "";
      root.querySelector("#ln-file-content").value = "";
      root.querySelector("#ln-file-status").textContent =
        "Faili limeondolewa kwenye Editor.";
      renderWorkspaceFiles();
    } catch (error) {
      root.querySelector("#ln-file-status").textContent = error.message;
    }
  }

  function mount() {
    const page = document.querySelector("#page-editor");
    if (!page) return;

    root = document.createElement("div");
    root.id = "ln-builder-app";
    page.prepend(root);
    render();

    window.LucasNodeAppBuilder = Object.freeze({
      contracts: API_CONTRACTS,
      fileContracts: FILE_API_CONTRACTS,
      open: () => {
        if (typeof window.showPage === "function") window.showPage("editor");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
