/**
 * LucasNode Builder Engine
 * Local project planning and file generation foundation.
 * Does not overwrite existing project files.
 */

export class LucasNodeBuilderError extends Error {
  constructor(message) {
    super(message);
    this.name = "LucasNodeBuilderError";
  }
}

const MAX_PROJECT_BYTES = 500 * 1024;

function validateRequest(description) {
  if (typeof description !== "string" || !description.trim()) {
    throw new LucasNodeBuilderError(
      "Eleza app unayotaka kujenga kwanza."
    );
  }

  if (description.trim().length > 5000) {
    throw new LucasNodeBuilderError(
      "Maelezo ya project yasizidi herufi 5000."
    );
  }

  return description.trim();
}

export function planProject(description) {
  const request = validateRequest(description);

  return {
    name: "LucasNode Project",
    description: request,
    stack: ["HTML", "CSS", "JavaScript"],
    files: ["index.html", "styles.css", "main.js"],
    requiresBackend: false,
    status: "planned"
  };
}

export function generateProjectFiles(description) {
  const plan = planProject(description);
  const escapedDescription = plan.description
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const files = {
    "index.html": `<!DOCTYPE html>
<html lang="sw">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapedDescription.slice(0, 250)}">
  <title>LucasNode Project</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="app">
    <header>
      <p class="brand">LucasNode</p>
      <h1>Project yako mpya</h1>
      <p class="description">${escapedDescription}</p>
    </header>

    <section class="workspace" aria-label="Project workspace">
      <h2>Karibu</h2>
      <p>Huu ni mwanzo wa project yako. Endelea kuiboresha kwenye LucasNode Editor.</p>
      <button id="startButton" type="button">Anza</button>
      <p id="status" role="status" aria-live="polite"></p>
    </section>
  </main>
  <script src="main.js"><\/script>
</body>
</html>
`,
    "styles.css": `:root {
  color-scheme: dark;
  font-family: system-ui, sans-serif;
  background: #030712;
  color: #f8fafc;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  padding: 24px;
  background: radial-gradient(ellipse at top, #172554, #030712 65%);
}

.app {
  width: min(760px, 100%);
  margin: 8vh auto;
}

.brand {
  color: #60a5fa;
  font-weight: 800;
  letter-spacing: .08em;
}

h1 {
  font-size: clamp(2rem, 6vw, 3.5rem);
  margin-bottom: 12px;
}

.description {
  color: #cbd5e1;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.workspace {
  margin-top: 32px;
  padding: 24px;
  border: 1px solid #334155;
  border-radius: 20px;
  background: rgb(15 23 42 / 85%);
}

button {
  padding: 12px 20px;
  border: 0;
  border-radius: 10px;
  background: #2563eb;
  color: white;
  font: inherit;
  cursor: pointer;
}

button:focus-visible {
  outline: 3px solid #93c5fd;
  outline-offset: 3px;
}

#status {
  color: #86efac;
}
`,
    "main.js": `const button = document.getElementById("startButton");
const status = document.getElementById("status");

button?.addEventListener("click", () => {
  if (status) {
    status.textContent = "Project iko tayari kuendelea kuboreshwa.";
  }
});
`
  };

  validateGeneratedFiles(files);

  return {
    plan,
    files,
    status: "generated"
  };
}

export function validateGeneratedFiles(files) {
  if (!files || typeof files !== "object" || Array.isArray(files)) {
    throw new LucasNodeBuilderError("Muundo wa files si sahihi.");
  }

  const allowed = new Set([
    "index.html",
    "styles.css",
    "main.js"
  ]);

  for (const [path, content] of Object.entries(files)) {
    if (!allowed.has(path)) {
      throw new LucasNodeBuilderError(
        `Faili haliruhusiwi kwenye generator hii: ${path}`
      );
    }

    if (typeof content !== "string") {
      throw new LucasNodeBuilderError(
        `Maudhui ya ${path} si maandishi.`
      );
    }
  }

  if (!("index.html" in files)) {
    throw new LucasNodeBuilderError("index.html inahitajika.");
  }

  const totalBytes = Object.values(files).reduce(
    (sum, content) => sum + new TextEncoder().encode(content).length,
    0
  );

  if (totalBytes > MAX_PROJECT_BYTES) {
    throw new LucasNodeBuilderError(
      "Project imezidi kikomo cha 500 KB."
    );
  }

  return {
    valid: true,
    totalBytes,
    fileCount: Object.keys(files).length
  };
}
