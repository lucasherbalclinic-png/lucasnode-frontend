(() => {
  "use strict";

  const ROOT_ID = "lucasnode-hosting-app";

  const API_CONTRACTS = Object.freeze({
    overview: {
      summary: { method: "GET", path: "/api/v2/hosting/sites/:siteId/overview" },
      health: { method: "GET", path: "/api/v2/hosting/sites/:siteId/health" },
      healthChecks: { method: "POST", path: "/api/v2/hosting/sites/:siteId/health-checks" },
      activity: { method: "GET", path: "/api/v2/hosting/sites/:siteId/activity" },
      services: { method: "GET", path: "/api/v2/hosting/service-status" }
    },
    lifecycle: {
      status: { method: "GET", path: "/api/v2/hosting/sites/:siteId/lifecycle" },
      history: { method: "GET", path: "/api/v2/hosting/sites/:siteId/lifecycle/history" },
      impact: { method: "GET", path: "/api/v2/hosting/sites/:siteId/lifecycle/impact" },
      requestStart: { method: "POST", path: "/api/v2/hosting/sites/:siteId/lifecycle/start" },
      requestSuspend: { method: "POST", path: "/api/v2/hosting/sites/:siteId/lifecycle/suspend" },
      requestResume: { method: "POST", path: "/api/v2/hosting/sites/:siteId/lifecycle/resume" },
      requestClosure: { method: "POST", path: "/api/v2/hosting/sites/:siteId/lifecycle/closure" },
      requestStatus: { method: "GET", path: "/api/v2/hosting/sites/:siteId/lifecycle/requests/:requestId" }
    },
    notifications: {
      list: { method: "GET", path: "/api/v2/hosting/sites/:siteId/notifications" },
      detail: { method: "GET", path: "/api/v2/hosting/sites/:siteId/notifications/:notificationId" },
      markRead: { method: "PUT", path: "/api/v2/hosting/sites/:siteId/notifications/:notificationId/read" },
      markAllRead: { method: "PUT", path: "/api/v2/hosting/sites/:siteId/notifications/read-all" },
      rules: { method: "GET", path: "/api/v2/hosting/sites/:siteId/alert-rules" },
      createRule: { method: "POST", path: "/api/v2/hosting/sites/:siteId/alert-rules" },
      updateRule: { method: "PUT", path: "/api/v2/hosting/sites/:siteId/alert-rules/:ruleId" },
      deleteRule: { method: "DELETE", path: "/api/v2/hosting/sites/:siteId/alert-rules/:ruleId" },
      preferences: { method: "GET", path: "/api/v2/hosting/notification-preferences" },
      updatePreferences: { method: "PUT", path: "/api/v2/hosting/notification-preferences" }
    },
    teamAccess: {
      members: { method: "GET", path: "/api/v2/hosting/sites/:siteId/members" },
      invite: { method: "POST", path: "/api/v2/hosting/sites/:siteId/members/invitations" },
      updateRole: { method: "PUT", path: "/api/v2/hosting/sites/:siteId/members/:memberId/role" },
      updatePermissions: { method: "PUT", path: "/api/v2/hosting/sites/:siteId/members/:memberId/permissions" },
      removeMember: { method: "DELETE", path: "/api/v2/hosting/sites/:siteId/members/:memberId" },
      invitations: { method: "GET", path: "/api/v2/hosting/sites/:siteId/members/invitations" },
      audit: { method: "GET", path: "/api/v2/hosting/sites/:siteId/access-audit" }
    },
    diagnostics: {
      run: { method: "POST", path: "/api/v2/hosting/sites/:siteId/diagnostics" },
      report: { method: "GET", path: "/api/v2/hosting/sites/:siteId/diagnostics/:diagnosticId" },
      history: { method: "GET", path: "/api/v2/hosting/sites/:siteId/diagnostics" },
      errorPages: { method: "GET", path: "/api/v2/hosting/sites/:siteId/error-pages" },
      updateErrorPage: { method: "PUT", path: "/api/v2/hosting/sites/:siteId/error-pages/:statusCode" },
      httpErrors: { method: "GET", path: "/api/v2/hosting/sites/:siteId/http-errors" },
      validateConfig: { method: "POST", path: "/api/v2/hosting/sites/:siteId/validate-config" }
    },
    versionHistory: {
      list: { method: "GET", path: "/api/v2/hosting/sites/:siteId/versions" },
      detail: { method: "GET", path: "/api/v2/hosting/sites/:siteId/versions/:versionId" },
      compare: { method: "GET", path: "/api/v2/hosting/sites/:siteId/versions/compare" },
      restorePoints: { method: "GET", path: "/api/v2/hosting/sites/:siteId/restore-points" },
      createRestorePoint: { method: "POST", path: "/api/v2/hosting/sites/:siteId/restore-points" },
      requestRestore: { method: "POST", path: "/api/v2/hosting/sites/:siteId/versions/:versionId/restore" },
      restoreStatus: { method: "GET", path: "/api/v2/hosting/sites/:siteId/restores/:restoreId" }
    },
    releases: {
      list: { method: "GET", path: "/api/v2/hosting/sites/:siteId/releases" },
      detail: { method: "GET", path: "/api/v2/hosting/sites/:siteId/releases/:releaseId" },
      create: { method: "POST", path: "/api/v2/hosting/sites/:siteId/releases" },
      deploymentHistory: { method: "GET", path: "/api/v2/hosting/sites/:siteId/deployments" },
      requestDeployment: { method: "POST", path: "/api/v2/hosting/sites/:siteId/deployments" },
      deploymentStatus: { method: "GET", path: "/api/v2/hosting/sites/:siteId/deployments/:deploymentId" },
      approvals: { method: "GET", path: "/api/v2/hosting/sites/:siteId/deployment-approvals" },
      approve: { method: "POST", path: "/api/v2/hosting/sites/:siteId/deployments/:deploymentId/approve" },
      rollback: { method: "POST", path: "/api/v2/hosting/sites/:siteId/releases/:releaseId/rollback" }
    },
    apiManagement: {
      access: { method: "GET", path: "/api/v2/hosting/sites/:siteId/api/access" },
      updateAccess: { method: "PUT", path: "/api/v2/hosting/sites/:siteId/api/access" },
      tokens: { method: "GET", path: "/api/v2/hosting/sites/:siteId/api/tokens" },
      createToken: { method: "POST", path: "/api/v2/hosting/sites/:siteId/api/tokens" },
      revokeToken: { method: "DELETE", path: "/api/v2/hosting/sites/:siteId/api/tokens/:tokenId" },
      permissions: { method: "GET", path: "/api/v2/hosting/sites/:siteId/api/permissions" },
      updatePermissions: { method: "PUT", path: "/api/v2/hosting/sites/:siteId/api/permissions" },
      usage: { method: "GET", path: "/api/v2/hosting/sites/:siteId/api/usage" },
      logs: { method: "GET", path: "/api/v2/hosting/sites/:siteId/api/logs" }
    },
    billing: {
      plans: { method: "GET", path: "/api/v2/hosting/plans" },
      currentPlan: { method: "GET", path: "/api/v2/hosting/sites/:siteId/billing/plan" },
      changePlan: { method: "POST", path: "/api/v2/hosting/sites/:siteId/billing/plan" },
      usage: { method: "GET", path: "/api/v2/hosting/sites/:siteId/billing/usage" },
      charges: { method: "GET", path: "/api/v2/hosting/sites/:siteId/billing/charges" },
      invoices: { method: "GET", path: "/api/v2/hosting/sites/:siteId/billing/invoices" },
      invoiceDetail: { method: "GET", path: "/api/v2/hosting/sites/:siteId/billing/invoices/:invoiceId" },
      paymentHistory: { method: "GET", path: "/api/v2/hosting/sites/:siteId/billing/payments" }
    },
    recovery: {
      list: { method: "GET", path: "/api/v2/hosting/sites/:siteId/backups" },
      create: { method: "POST", path: "/api/v2/hosting/sites/:siteId/backups" },
      detail: { method: "GET", path: "/api/v2/hosting/sites/:siteId/backups/:backupId" },
      delete: { method: "DELETE", path: "/api/v2/hosting/sites/:siteId/backups/:backupId" },
      policy: { method: "GET", path: "/api/v2/hosting/sites/:siteId/backup-policy" },
      updatePolicy: { method: "PUT", path: "/api/v2/hosting/sites/:siteId/backup-policy" },
      restore: { method: "POST", path: "/api/v2/hosting/sites/:siteId/restore" },
      recoveryStatus: { method: "GET", path: "/api/v2/hosting/sites/:siteId/recovery/:recoveryId" }
    },
    security: {
      policy: { method: "GET", path: "/api/v2/hosting/sites/:siteId/security/policy" },
      updatePolicy: { method: "PUT", path: "/api/v2/hosting/sites/:siteId/security/policy" },
      headers: { method: "GET", path: "/api/v2/hosting/sites/:siteId/security/headers" },
      updateHeaders: { method: "PUT", path: "/api/v2/hosting/sites/:siteId/security/headers" },
      audit: { method: "GET", path: "/api/v2/hosting/sites/:siteId/security/audit" },
      ipRules: { method: "GET", path: "/api/v2/hosting/sites/:siteId/security/ip-rules" },
      updateIpRules: { method: "PUT", path: "/api/v2/hosting/sites/:siteId/security/ip-rules" }
    },
    settings: {
      read: { method: "GET", path: "/api/v2/hosting/sites/:siteId/settings" },
      update: { method: "PUT", path: "/api/v2/hosting/sites/:siteId/settings" }
    },
    domains: {
      list: { method: "GET", path: "/api/v2/hosting/sites/:siteId/domains" },
      assign: { method: "POST", path: "/api/v2/hosting/sites/:siteId/domains" },
      remove: { method: "DELETE", path: "/api/v2/hosting/sites/:siteId/domains/:domainId" }
    },
    dns: {
      list: { method: "GET", path: "/api/v2/hosting/sites/:siteId/dns" },
      create: { method: "POST", path: "/api/v2/hosting/sites/:siteId/dns" },
      update: { method: "PUT", path: "/api/v2/hosting/sites/:siteId/dns/:recordId" },
      remove: { method: "DELETE", path: "/api/v2/hosting/sites/:siteId/dns/:recordId" }
    },
    certificates: {
      status: { method: "GET", path: "/api/v2/hosting/sites/:siteId/certificates" },
      issue: { method: "POST", path: "/api/v2/hosting/sites/:siteId/certificates" },
      renew: { method: "POST", path: "/api/v2/hosting/sites/:siteId/certificates/renew" }
    },

    sites: {
      list:   { method: "GET",    path: "/api/v2/hosting/sites" },
      create: { method: "POST",   path: "/api/v2/hosting/sites" },
      detail: { method: "GET",    path: "/api/v2/hosting/sites/:siteId" },
      update: { method: "PATCH",  path: "/api/v2/hosting/sites/:siteId" },
      delete: { method: "DELETE", path: "/api/v2/hosting/sites/:siteId" }
    },
    files: {
      create:  { method: "POST", path: "/api/v2/hosting/sites/:siteId/files/create" },
      content: { method: "GET", path: "/api/v2/hosting/sites/:siteId/files/:fileId/content" },
      update:  { method: "PUT", path: "/api/v2/hosting/sites/:siteId/files/:fileId" },

      list:   { method: "GET",    path: "/api/v2/hosting/sites/:siteId/files" },
      upload: { method: "POST",   path: "/api/v2/hosting/sites/:siteId/files" },
      delete: { method: "DELETE", path: "/api/v2/hosting/sites/:siteId/files/:fileId" }
    },
    runtime: {
      configure: { method: "PUT", path: "/api/v2/hosting/sites/:siteId/runtime/configuration" },
      health:    { method: "GET", path: "/api/v2/hosting/sites/:siteId/runtime/health" },
      processes: { method: "GET", path: "/api/v2/hosting/sites/:siteId/runtime/processes" },

      status:  { method: "GET",  path: "/api/v2/hosting/sites/:siteId/runtime" },
      start:   { method: "POST", path: "/api/v2/hosting/sites/:siteId/runtime/start" },
      stop:    { method: "POST", path: "/api/v2/hosting/sites/:siteId/runtime/stop" },
      restart: { method: "POST", path: "/api/v2/hosting/sites/:siteId/runtime/restart" }
    },
    logs: {
      access:   { method: "GET", path: "/api/v2/hosting/sites/:siteId/logs/access" },
      errors:   { method: "GET", path: "/api/v2/hosting/sites/:siteId/logs/errors" },
      events:   { method: "GET", path: "/api/v2/hosting/sites/:siteId/logs/events" },
      download: { method: "GET", path: "/api/v2/hosting/sites/:siteId/logs/export" },

      list: { method: "GET", path: "/api/v2/hosting/sites/:siteId/logs" }
    },
    usage: {
      metrics: { method: "GET", path: "/api/v2/hosting/sites/:siteId/usage/metrics" },
      history: { method: "GET", path: "/api/v2/hosting/sites/:siteId/usage/history" },
      limits:  { method: "GET", path: "/api/v2/hosting/sites/:siteId/usage/limits" },
      updateLimits: { method: "PUT", path: "/api/v2/hosting/sites/:siteId/usage/limits" },

      read: { method: "GET", path: "/api/v2/hosting/sites/:siteId/usage" }
    }
  });

  const pages = [
    ["overview", "Muhtasari", "▦"],
    ["websites", "Tovuti Zangu", "▤"],
    ["details", "Website Details", "ⓘ"],
    ["create", "Tengeneza Tovuti", "+"],
    ["files", "File Manager", "▧"],
    ["runtime", "Runtime", "◉"],
    ["logs", "Logs", "≡"],
    ["usage", "Matumizi", "◫"],
    ["settings", "Mipangilio", "⚙"]
    ["security", "Usalama", "⬡"]
    ["recovery", "Backup & Recovery", "⟲"]
    ["billing", "Billing & Plans", "◈"]
    ["api", "API Management", "⌘"]
    ["releases", "Deployments & Releases", "⇧"]
    ["history", "Version History", "◷"]
    ["diagnostics", "Error Pages & Diagnostics", "⚕"]
    ["access", "Team & Permissions", "♙"]
    ["alerts", "Notifications & Alerts", "♢"]
    ["lifecycle", "Site Lifecycle", "⏻"]
  ];

  const state = { active: "overview", siteId: "" };

  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[char]);

  function pageContent(name) {
    switch (name) {
      case "overview":
        return `
          <div class="ln-host-hero">
            <div><span class="ln-host-kicker">LUCASNODE HOSTING</span>
              <h2>Hosting Center</h2>
              <p>Simamia tovuti, mafaili, runtime na matumizi yako sehemu moja.</p>
            </div>
            <button class="ln-host-primary" data-go="create">＋ Tengeneza Tovuti</button>
          </div>
          <div class="ln-host-stats">
            <article><span>▤</span><small>Tovuti</small><strong>—</strong></article>
            <article><span>◉</span><small>Runtime</small><strong>—</strong></article>
            <article><span>◫</span><small>Matumizi</small><strong>—</strong></article>
          </div>
          <section class="ln-host-panel">
            <h3>Huduma za Hosting</h3>
            <div class="ln-host-grid">
              ${pages.slice(1).map(([id,label,icon]) => `
                <button class="ln-host-tile" data-go="${id}">
                  <span>${icon}</span><strong>${label}</strong><small>Fungua huduma →</small>
                </button>`).join("")}
            </div>
          </section>`;
      case "websites":
        return `
          <div class="ln-host-heading"><div><h2>Tovuti Zangu</h2>
          <p>Usimamizi wa tovuti zako.</p></div>
          <button class="ln-host-primary" data-go="create">＋ Tovuti Mpya</button></div>
          <div class="ln-host-panel ln-host-form">
            <label>Site ID
              <input id="ln-host-site-lookup" placeholder="Weka Site ID">
            </label>
            <button class="ln-host-primary" type="button" id="ln-host-open-details">Fungua Taarifa za Tovuti</button>
            <div class="ln-host-empty"><span>▤</span>
              <h3>Orodha ya tovuti</h3>
              <p>Orodha halisi itajazwa kupitia Hosting Sites API wakati wa integration.</p>
            </div>
          </div>`;
      case "details":
        return `
          <h2>Website Details</h2>
          <p class="ln-host-muted">Taarifa na usimamizi wa tovuti iliyochaguliwa.</p>
          <div class="ln-host-panel ln-host-form">
            <label>Site ID
              <input id="ln-host-detail-id" value="${esc(state.siteId)}" placeholder="Site ID">
            </label>
            <label>Jina la tovuti
              <input id="ln-host-detail-name" maxlength="80" placeholder="Jina la tovuti">
            </label>
            <label>Domain
              <input id="ln-host-detail-domain" maxlength="253" placeholder="www.mfano.com">
            </label>
            <label>Aina ya tovuti
              <select id="ln-host-detail-type">
                <option value="static">Static HTML/CSS/JS</option>
                <option value="application">Application</option>
              </select>
            </label>
            <div class="ln-host-grid">
              <button class="ln-host-tile" type="button" data-go="files"><span>▧</span><strong>Mafaili</strong></button>
              <button class="ln-host-tile" type="button" data-go="runtime"><span>◉</span><strong>Runtime</strong></button>
              <button class="ln-host-tile" type="button" data-go="logs"><span>≡</span><strong>Logs</strong></button>
              <button class="ln-host-tile" type="button" data-go="usage"><span>◫</span><strong>Matumizi</strong></button>
            </div>
            <p class="ln-host-note">Taarifa zitapakiwa na kuhifadhiwa kupitia Sites API baada ya integration.</p>
          </div>`;
      case "create":
        return `
          <h2>Tengeneza Tovuti</h2>
          <p class="ln-host-muted">Jaza taarifa za msingi za tovuti yako.</p>
          <form id="ln-host-create-form" class="ln-host-panel ln-host-form">
            <label>Jina la tovuti<input name="name" required maxlength="80" placeholder="Mfano: Biashara Yangu"></label>
            <label>Domain<input name="domain" maxlength="253" placeholder="www.mfano.com"></label>
            <label>Aina ya tovuti
              <select name="type"><option value="static">Static HTML/CSS/JS</option><option value="application">Application</option></select>
            </label>
            <label>Maelezo<textarea name="description" maxlength="500" rows="3"></textarea></label>
            <button class="ln-host-primary" type="submit">Thibitisha Taarifa</button>
            <p class="ln-host-note" id="ln-host-create-message" role="status">Hii ni hatua ya maandalizi. Usajili halisi utafanyika baada ya integration.</p>
          </form>`;
      case "files":
        return `
          <h2>File Manager</h2><p class="ln-host-muted">Usimamizi wa mafaili ya tovuti.</p>
          <div class="ln-host-panel">
            <div class="ln-host-field"><label for="ln-host-file-site">Site ID</label>
              <input id="ln-host-file-site" placeholder="Site ID"></div>
            <div class="ln-host-empty"><span>▧</span><h3>Mafaili ya tovuti</h3>
              <p>Orodha ya mafaili itapatikana kupitia Hosting API.</p></div>
          </div>`;
      case "files":
        return `
          <h2>File Manager</h2>
          <p class="ln-host-muted">Muundo wa mafaili ya tovuti na usimamizi wake.</p>
          <div class="ln-host-panel ln-host-form">
            <label>Site ID<input id="ln-host-file-site" value="${esc(state.siteId)}" placeholder="Site ID"></label>
            <label>Tafuta faili<input id="ln-host-file-search" type="search" placeholder="Tafuta kwa jina la faili"></label>
            <label>Aina ya faili
              <select id="ln-host-file-filter">
                <option value="all">Aina zote</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="js">JavaScript</option>
                <option value="json">JSON</option>
                <option value="image">Picha</option>
                <option value="other">Nyingine</option>
              </select>
            </label>
            <div class="ln-host-file-toolbar">
              <button class="ln-host-tile" type="button" id="ln-host-new-file">＋ Unda Faili</button>
              <button class="ln-host-tile" type="button" id="ln-host-upload-file">↑ Chagua Faili</button>
              <input type="file" id="ln-host-file-input" hidden>
            </div>
            <div id="ln-host-file-editor" hidden>
              <label>Jina la faili<input id="ln-host-new-file-name" maxlength="180" placeholder="index.html"></label>
              <label>Maudhui<textarea id="ln-host-new-file-content" rows="8" spellcheck="false"></textarea></label>
              <p class="ln-host-note">Faili litahakikiwa kabla ya kuhifadhiwa wakati wa integration.</p>
            </div>
            <div class="ln-host-empty">
              <span>▧</span><h3>File Explorer</h3>
              <p>Faili halisi zitasomwa kupitia Hosting Files API baada ya integration.</p>
            </div>
          </div>`;
      case "runtime":
        return `
          <h2>Runtime Management</h2><p class="ln-host-muted">Hali na udhibiti wa runtime ya tovuti.</p>
          <div class="ln-host-panel">
            <label>Site ID<input id="ln-host-runtime-site" placeholder="Site ID"></label>
            <div class="ln-host-runtime-status"><span></span><strong>Haijathibitishwa</strong></div>
            <p class="ln-host-note">Hali ya runtime itaonekana baada ya kuunganishwa na Runtime API.</p>
          </div>`;
      case "runtime":
        return `
          <h2>Runtime Management</h2>
          <p class="ln-host-muted">Usimamizi wa mchakato unaoendesha tovuti yako.</p>
          <div class="ln-host-panel ln-host-form">
            <label>Site ID
              <input id="ln-host-runtime-site" value="${esc(state.siteId)}" placeholder="Site ID">
            </label>
            <label>Runtime Type
              <select id="ln-host-runtime-type">
                <option value="static">Static Runtime</option>
                <option value="node">Node Runtime</option>
                <option value="web">Web Application Runtime</option>
              </select>
            </label>
            <label>Start Command
              <input id="ln-host-runtime-command" maxlength="300" placeholder="Command ya kuanzisha application">
            </label>
            <label>Application Port
              <input id="ln-host-runtime-port" type="number" min="1" max="65535" placeholder="Port">
            </label>
            <div class="ln-host-runtime-status">
              <span></span><strong>Hali haijathibitishwa</strong>
            </div>
            <div class="ln-host-runtime-actions">
              <button class="ln-host-tile" type="button" data-runtime-action="start">▶ Start</button>
              <button class="ln-host-tile" type="button" data-runtime-action="stop">■ Stop</button>
              <button class="ln-host-tile" type="button" data-runtime-action="restart">↻ Restart</button>
            </div>
            <p class="ln-host-note">Vitendo vya runtime vitawezeshwa baada ya Runtime API kuunganishwa. Hakuna mchakato unaoanzishwa na ukurasa huu kwa sasa.</p>
          </div>`;
      case "logs":
        return `
          <h2>Hosting Logs</h2><p class="ln-host-muted">Matukio na rekodi za tovuti.</p>
          <div class="ln-host-panel ln-host-empty"><span>≡</span>
            <h3>Log Viewer</h3><p>Rekodi halisi zitasomwa kutoka Hosting Logs API.</p></div>`;
      case "logs":
        return `
          <h2>Logs & Monitoring</h2>
          <p class="ln-host-muted">Rekodi za runtime, access, errors na matukio ya tovuti.</p>
          <div class="ln-host-panel ln-host-form">
            <label>Site ID
              <input id="ln-host-logs-site" value="${esc(state.siteId)}" placeholder="Site ID">
            </label>
            <label>Aina ya rekodi
              <select id="ln-host-log-type">
                <option value="all">Rekodi zote</option>
                <option value="access">Access logs</option>
                <option value="error">Error logs</option>
                <option value="runtime">Runtime events</option>
                <option value="system">System events</option>
                <option value="security">Security events</option>
              </select>
            </label>
            <label>Kiwango
              <select id="ln-host-log-level">
                <option value="all">Viwango vyote</option>
                <option value="info">INFO</option>
                <option value="warning">WARNING</option>
                <option value="error">ERROR</option>
                <option value="critical">CRITICAL</option>
              </select>
            </label>
            <label>Tafuta kwenye rekodi
              <input id="ln-host-log-search" type="search" placeholder="Tafuta ujumbe au event">
            </label>
            <div class="ln-host-log-toolbar">
              <label>Kuanzia<input id="ln-host-log-from" type="datetime-local"></label>
              <label>Mpaka<input id="ln-host-log-to" type="datetime-local"></label>
            </div>
            <div class="ln-host-empty" id="ln-host-log-results">
              <span>≡</span>
              <h3>Log Viewer</h3>
              <p>Rekodi zitasomwa kutoka Logs API wakati wa integration.</p>
            </div>
          </div>`;
      case "usage":
        return `
          <h2>Resource Usage</h2><p class="ln-host-muted">Ufuatiliaji wa matumizi ya rasilimali.</p>
          <div class="ln-host-stats">
            <article><span>◫</span><small>Storage</small><strong>—</strong></article>
            <article><span>⇅</span><small>Bandwidth</small><strong>—</strong></article>
            <article><span>◷</span><small>Requests</small><strong>—</strong></article>
          </div>
          <div class="ln-host-panel"><p>Vipimo halisi vitasomwa kutoka Usage API.</p></div>`;
      case "usage":
        return `
          <h2>Resource Usage & Limits</h2>
          <p class="ln-host-muted">Ufuatiliaji wa rasilimali na mipaka ya matumizi ya tovuti.</p>
          <div class="ln-host-panel ln-host-form">
            <label>Site ID
              <input id="ln-host-usage-site" value="${esc(state.siteId)}" placeholder="Site ID">
            </label>
            <label>Kipindi cha matumizi
              <select id="ln-host-usage-period">
                <option value="24h">Saa 24 zilizopita</option>
                <option value="7d">Siku 7</option>
                <option value="30d">Siku 30</option>
                <option value="90d">Siku 90</option>
              </select>
            </label>
          </div>
          <div class="ln-host-stats">
            <article><span>▤</span><small>Storage</small><strong>—</strong><small>Data haijasomwa</small></article>
            <article><span>⇅</span><small>Bandwidth</small><strong>—</strong><small>Data haijasomwa</small></article>
            <article><span>◷</span><small>Requests</small><strong>—</strong><small>Data haijasomwa</small></article>
            <article><span>▥</span><small>CPU</small><strong>—</strong><small>Data haijasomwa</small></article>
            <article><span>▦</span><small>Memory</small><strong>—</strong><small>Data haijasomwa</small></article>
            <article><span>◉</span><small>Processes</small><strong>—</strong><small>Data haijasomwa</small></article>
          </div>
          <div class="ln-host-panel ln-host-form">
            <h3>Resource Limits</h3>
            <label>Storage Limit (MB)<input id="ln-host-limit-storage" type="number" min="0" step="1" placeholder="Storage limit"></label>
            <label>Bandwidth Limit (GB)<input id="ln-host-limit-bandwidth" type="number" min="0" step="1" placeholder="Bandwidth limit"></label>
            <label>Memory Limit (MB)<input id="ln-host-limit-memory" type="number" min="0" step="1" placeholder="Memory limit"></label>
            <label>CPU Limit (%)<input id="ln-host-limit-cpu" type="number" min="1" max="100" placeholder="CPU limit"></label>
            <p class="ln-host-note">Mipaka itahifadhiwa kupitia Resource Limits API baada ya integration.</p>
          </div>`;
      case "settings":
        return `
          <h2>Hosting Settings</h2><p class="ln-host-muted">Mipangilio ya huduma za hosting.</p>
          <div class="ln-host-panel ln-host-form">
            <label>Site ID<input id="ln-host-settings-site" placeholder="Site ID"></label>
            <p class="ln-host-note">Mipangilio ya tovuti itahifadhiwa kupitia Hosting Settings API baada ya integration.</p>
          </div>`;
      case "settings":
        return `
          <h2>Hosting Settings</h2>
          <p class="ln-host-muted">Mipangilio ya domain, DNS, SSL/TLS na tovuti.</p>
          <div class="ln-host-panel ln-host-form">
            <label>Site ID<input id="ln-host-settings-site" value="${esc(state.siteId)}" placeholder="Site ID"></label>
            <label>Primary Domain<input id="ln-host-primary-domain" maxlength="253" placeholder="www.mfano.com"></label>
            <label>Document Root<input id="ln-host-document-root" maxlength="240" value="/public_html"></label>
            <label>Default Entry File<input id="ln-host-entry-file" maxlength="120" value="index.html"></label>
            <label>HTTPS
              <select id="ln-host-https">
                <option value="enabled">Require HTTPS</option>
                <option value="redirect">Redirect HTTP to HTTPS</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>
            <label>Directory Listing
              <select id="ln-host-directory-listing">
                <option value="disabled">Disabled</option>
                <option value="enabled">Enabled</option>
              </select>
            </label>
            <label>Deployment Mode
              <select id="ln-host-deployment-mode">
                <option value="manual">Manual</option>
                <option value="automatic">Automatic</option>
              </select>
            </label>
            <p class="ln-host-note">Mipangilio itahifadhiwa kupitia Hosting Settings API baada ya integration.</p>
          </div>
          <div class="ln-host-panel ln-host-form">
            <h3>DNS Management</h3>
            <label>Record Type
              <select id="ln-host-dns-type">
                <option>A</option><option>AAAA</option><option>CNAME</option>
                <option>TXT</option><option>MX</option><option>NS</option>
              </select>
            </label>
            <label>Host / Name<input id="ln-host-dns-name" maxlength="253" placeholder="@ au www"></label>
            <label>Record Value<input id="ln-host-dns-value" maxlength="2048" placeholder="Thamani ya DNS"></label>
            <label>TTL (seconds)<input id="ln-host-dns-ttl" type="number" min="60" max="86400" value="3600"></label>
            <p class="ln-host-note">DNS records zitasimamiwa kupitia Native DNS API baada ya integration.</p>
          </div>
          <div class="ln-host-panel ln-host-form">
            <h3>SSL / TLS</h3>
            <label>Certificate Mode
              <select id="ln-host-certificate-mode">
                <option value="automatic">Automatic Certificate</option>
                <option value="managed">Managed Certificate</option>
                <option value="custom">Custom Certificate</option>
              </select>
            </label>
            <label>Minimum TLS Version
              <select id="ln-host-tls-version">
                <option value="1.2">TLS 1.2</option>
                <option value="1.3">TLS 1.3</option>
              </select>
            </label>
            <p class="ln-host-note">Certificate status na TLS configuration vitathibitishwa na Native SSL Engine.</p>
          </div>`;
      case "security":
        return `
          <h2>Hosting Security</h2>
          <p class="ln-host-muted">Udhibiti wa ufikiaji na usalama wa tovuti.</p>
          <div class="ln-host-panel ln-host-form">
            <label>Site ID<input id="ln-host-security-site" value="${esc(state.siteId)}" placeholder="Site ID"></label>
            <label>Authentication
              <select id="ln-host-auth-mode">
                <option value="public">Public Website</option>
                <option value="protected">Protected Website</option>
                <option value="private">Private Website</option>
              </select>
            </label>
            <label>Default Access Policy
              <select id="ln-host-access-policy">
                <option value="deny_sensitive">Deny sensitive paths</option>
                <option value="public_read">Public read only</option>
                <option value="restricted">Restricted access</option>
              </select>
            </label>
            <label>Allowed IP Addresses
              <textarea id="ln-host-allowed-ips" rows="3" placeholder="IP moja kwa kila mstari"></textarea>
            </label>
            <label>Blocked IP Addresses
              <textarea id="ln-host-blocked-ips" rows="3" placeholder="IP moja kwa kila mstari"></textarea>
            </label>
          </div>
          <div class="ln-host-panel ln-host-form">
            <h3>Security Headers</h3>
            <label><input type="checkbox" id="ln-host-hsts" checked> HSTS</label>
            <label><input type="checkbox" id="ln-host-nosniff" checked> X-Content-Type-Options</label>
            <label><input type="checkbox" id="ln-host-frame" checked> Frame protection</label>
            <label><input type="checkbox" id="ln-host-referrer" checked> Referrer Policy</label>
            <label>Content Security Policy
              <textarea id="ln-host-csp" rows="3" maxlength="4000" placeholder="CSP policy"></textarea>
            </label>
          </div>
          <div class="ln-host-panel">
            <h3>Audit & Security Events</h3>
            <p>Authentication events, access denials, policy changes na security incidents zitasomwa kupitia Security Audit API.</p>
          </div>
          <p class="ln-host-note">Mipangilio hii bado haijatumwa kwenye server. Utekelezaji halisi utafanyika wakati wa integration.</p>`;
      case "recovery":
        return `
          <h2>Backup & Recovery</h2>
          <p class="ln-host-muted">Udhibiti wa restore points na urejeshaji wa tovuti.</p>
          <div class="ln-host-panel ln-host-form">
            <label>Site ID
              <input id="ln-host-recovery-site" value="${esc(state.siteId)}" placeholder="Site ID">
            </label>
            <label>Backup Scope
              <select id="ln-host-backup-scope">
                <option value="full">Full Website</option>
                <option value="files">Website Files</option>
                <option value="database">Database</option>
                <option value="configuration">Configuration</option>
              </select>
            </label>
            <label>Backup Frequency
              <select id="ln-host-backup-frequency">
                <option value="manual">Manual</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <label>Retention (days)
              <input id="ln-host-backup-retention" type="number" min="1" max="3650" value="30">
            </label>
            <p class="ln-host-note">Ratiba na retention vitahifadhiwa kupitia Backup Policy API.</p>
          </div>
          <div class="ln-host-panel">
            <h3>Restore Points</h3>
            <p>Restore points zitaorodheshwa kutoka Backup API. Hakuna backup iliyoundwa katika hatua hii.</p>
          </div>
          <div class="ln-host-panel ln-host-form">
            <h3>Recovery</h3>
            <label>Restore Point ID
              <input id="ln-host-restore-point" placeholder="Restore Point ID">
            </label>
            <label>Recovery Target
              <select id="ln-host-recovery-target">
                <option value="original">Original Website</option>
                <option value="new">New Recovery Environment</option>
              </select>
            </label>
            <p class="ln-host-note">Restore itahitaji uthibitisho wa mtumiaji na ukaguzi wa athari kabla ya kutekelezwa.</p>
          </div>`;
      case "billing":
        return `
          <h2>Hosting Billing & Plans</h2>
          <p class="ln-host-muted">Usimamizi wa kifurushi, gharama na matumizi ya hosting.</p>
          <div class="ln-host-panel ln-host-form">
            <label>Site ID
              <input id="ln-host-billing-site" value="${esc(state.siteId)}" placeholder="Site ID">
            </label>
            <label>Hosting Plan
              <select id="ln-host-billing-plan">
                <option value="">Chagua kifurushi</option>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="business">Business</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label>Billing Cycle
              <select id="ln-host-billing-cycle">
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>
            <label>Currency
              <select id="ln-host-billing-currency">
                <option value="TZS">TZS</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <p class="ln-host-note">Bei halisi, kifurushi kinachotumika na tarehe za malipo vitatoka kwenye Billing API.</p>
          </div>
          <div class="ln-host-grid">
            <div class="ln-host-panel"><h3>Plan Cost</h3><strong>—</strong><p>Gharama ya kifurushi</p></div>
            <div class="ln-host-panel"><h3>Next Invoice</h3><strong>—</strong><p>Tarehe ya invoice inayofuata</p></div>
            <div class="ln-host-panel"><h3>Outstanding</h3><strong>—</strong><p>Deni linalosubiri</p></div>
          </div>
          <div class="ln-host-panel">
            <h3>Plan Limits</h3>
            <p>Storage, bandwidth, CPU, memory, domains na idadi ya tovuti vitaonyeshwa kulingana na kifurushi halisi.</p>
          </div>
          <div class="ln-host-panel">
            <h3>Usage Charges</h3>
            <p>Matumizi yanayozidi kiwango cha kifurushi yatahesabiwa kwa mujibu wa sera ya Billing Engine.</p>
          </div>
          <div class="ln-host-panel">
            <h3>Invoices & Payment History</h3>
            <p>Invoice na historia ya malipo vitaonyeshwa baada ya kuunganishwa na Billing API.</p>
          </div>`;
      case "api":
        return `
          <h2>Hosting API Management</h2>
          <p class="ln-host-muted">Dhibiti API access, ruhusa na matumizi ya tovuti zako.</p>
          <div class="ln-host-panel ln-host-form">
            <label>Site ID
              <input id="ln-host-api-site" value="${esc(state.siteId)}" placeholder="Site ID">
            </label>
            <label>API Access
              <select id="ln-host-api-access">
                <option value="disabled">Disabled</option>
                <option value="read">Read only</option>
                <option value="read_write">Read & write</option>
              </select>
            </label>
            <label>Token Name
              <input id="ln-host-api-token-name" maxlength="80" placeholder="Jina la token">
            </label>
            <label>Token Permission
              <select id="ln-host-api-permission">
                <option value="read">Read</option>
                <option value="write">Write</option>
                <option value="deploy">Deploy</option>
                <option value="manage">Manage</option>
              </select>
            </label>
            <label>Token Expiry
              <select id="ln-host-api-expiry">
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">365 days</option>
              </select>
            </label>
            <p class="ln-host-note">Token itatengenezwa na Backend v2 pekee. Thibitisha ruhusa na utambulisho kabla ya kuitoa.</p>
            <button class="ln-host-btn" id="ln-host-api-create" type="button">Request API Token</button>
          </div>
          <div class="ln-host-panel">
            <h3>Active API Tokens</h3>
            <p>Orodha ya token halisi itaonekana baada ya kuunganishwa na API Management service.</p>
          </div>
          <div class="ln-host-panel">
            <h3>API Permissions</h3>
            <p>Read, Write, Deploy na Manage — ruhusa zitatekelezwa na Backend v2.</p>
          </div>
          <div class="ln-host-panel">
            <h3>API Usage & Logs</h3>
            <p>Requests, response codes, rate limits na matumizi vitaonyeshwa kutoka kwenye rekodi halisi.</p>
          </div>`;
      case "releases":
        return `
          <h2>Deployments & Releases</h2>
          <p class="ln-host-muted">Dhibiti matoleo, approvals na historia ya deployment ya tovuti.</p>
          <div class="ln-host-panel ln-host-form">
            <label>Site ID
              <input id="ln-host-release-site" value="${esc(state.siteId)}" placeholder="Site ID">
            </label>
            <label>Release Version
              <input id="ln-host-release-version" maxlength="80" placeholder="Mfano: v1.0.0">
            </label>
            <label>Source Revision
              <input id="ln-host-release-revision" maxlength="120" placeholder="Commit au revision ID">
            </label>
            <label>Deployment Environment
              <select id="ln-host-release-environment">
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="preview">Preview</option>
              </select>
            </label>
            <label>Deployment Strategy
              <select id="ln-host-release-strategy">
                <option value="rolling">Rolling</option>
                <option value="blue_green">Blue / Green</option>
                <option value="canary">Canary</option>
              </select>
            </label>
            <label>Release Notes
              <textarea id="ln-host-release-notes" rows="3" maxlength="4000" placeholder="Maelezo ya mabadiliko"></textarea>
            </label>
            <p class="ln-host-note">Deployment itahitaji validation, security checks, approval na uthibitisho kabla ya kuanza.</p>
            <button class="ln-host-btn" id="ln-host-release-request" type="button">Request Deployment</button>
          </div>
          <div class="ln-host-panel">
            <h3>Deployment History</h3>
            <p>Historia halisi itaonekana baada ya kuunganishwa na Deployment Engine.</p>
          </div>
          <div class="ln-host-panel">
            <h3>Release Approvals</h3>
            <p>Approval status, aliyeidhinisha na muda wa idhini vitaonyeshwa kutoka kwenye rekodi halisi.</p>
          </div>
          <div class="ln-host-panel">
            <h3>Rollback</h3>
            <label>Target Release ID
              <input id="ln-host-release-rollback-id" placeholder="Release ID">
            </label>
            <button class="ln-host-btn" id="ln-host-release-rollback" type="button">Request Rollback</button>
            <p class="ln-host-note">Rollback itahitaji kuonyesha athari na kupata idhini kabla ya utekelezaji.</p>
          </div>`;
      case "history":
        return `
          <h2>Version History & Restore Points</h2>
          <p class="ln-host-muted">Historia ya mabadiliko na pointi za kurejesha tovuti.</p>
          <div class="ln-host-panel ln-host-form">
            <label>Site ID
              <input id="ln-host-history-site" value="${esc(state.siteId)}" placeholder="Site ID">
            </label>
            <label>Filter by Version
              <input id="ln-host-history-filter" maxlength="100" placeholder="Tafuta version au revision">
            </label>
            <label>Start Date
              <input id="ln-host-history-from" type="datetime-local">
            </label>
            <label>End Date
              <input id="ln-host-history-to" type="datetime-local">
            </label>
            <button class="ln-host-btn" id="ln-host-history-compare" type="button">Compare Versions</button>
          </div>
          <div class="ln-host-panel">
            <h3>Version Timeline</h3>
            <p>Matoleo, muda wa mabadiliko, chanzo na mtumiaji aliyefanya mabadiliko vitaonyeshwa kutoka kwenye rekodi halisi.</p>
          </div>
          <div class="ln-host-panel">
            <h3>Version Comparison</h3>
            <p>Tofauti za files na mabadiliko ya content zitaonyeshwa baada ya kuunganishwa na Version History API.</p>
          </div>
          <div class="ln-host-panel">
            <h3>Restore Point</h3>
            <label>Target Version ID
              <input id="ln-host-history-target" placeholder="Version ID">
            </label>
            <label>Reason for Restore
              <textarea id="ln-host-history-reason" rows="3" maxlength="1000" placeholder="Sababu ya kurejesha toleo"></textarea>
            </label>
            <button class="ln-host-btn" id="ln-host-history-restore" type="button">Request Version Restore</button>
            <p class="ln-host-note">Restore itaonyesha athari na kuhitaji idhini kabla ya kubadilisha tovuti.</p>
          </div>`;
      case "diagnostics":
        return `
          <h2>Error Pages & Site Diagnostics</h2>
          <p class="ln-host-muted">Dhibiti kurasa za hitilafu na chunguza matatizo ya tovuti.</p>
          <div class="ln-host-panel ln-host-form">
            <label>Site ID
              <input id="ln-host-diagnostic-site" value="${esc(state.siteId)}" placeholder="Site ID">
            </label>
            <label>HTTP Error Code
              <select id="ln-host-error-code">
                <option value="400">400 — Bad Request</option>
                <option value="401">401 — Unauthorized</option>
                <option value="403">403 — Forbidden</option>
                <option value="404">404 — Not Found</option>
                <option value="429">429 — Too Many Requests</option>
                <option value="500">500 — Internal Server Error</option>
                <option value="502">502 — Bad Gateway</option>
                <option value="503">503 — Service Unavailable</option>
                <option value="504">504 — Gateway Timeout</option>
              </select>
            </label>
            <label>Error Page Content
              <textarea id="ln-host-error-content" rows="5" maxlength="20000" placeholder="Andika HTML ya ukurasa wa hitilafu"></textarea>
            </label>
            <button class="ln-host-btn" id="ln-host-error-save" type="button">Request Error Page Update</button>
          </div>
          <div class="ln-host-panel">
            <h3>Site Diagnostics</h3>
            <p>Configuration, file permissions, runtime health na routing vitachunguzwa na Diagnostics Engine.</p>
            <button class="ln-host-btn" id="ln-host-diagnostic-run" type="button">Run Diagnostics</button>
          </div>
          <div class="ln-host-panel">
            <h3>HTTP Error Reports</h3>
            <p>HTTP status codes, request IDs, timestamps na error details vitaonyeshwa kutoka kwenye rekodi halisi.</p>
          </div>
          <div class="ln-host-panel">
            <h3>Configuration Validation</h3>
            <p>Domain, document root, entry file, runtime na security configuration vitathibitishwa kabla ya deployment.</p>
          </div>`;
      case "access":
        return `
          <h2>Hosting Team & Permissions</h2>
          <p class="ln-host-muted">Dhibiti watumiaji na ruhusa za kufikia tovuti.</p>
          <div class="ln-host-panel ln-host-form">
            <label>Site ID
              <input id="ln-host-access-site" value="${esc(state.siteId)}" placeholder="Site ID">
            </label>
            <label>Member Email
              <input id="ln-host-access-email" type="email" maxlength="254" placeholder="Barua pepe ya mwanachama">
            </label>
            <label>Role
              <select id="ln-host-access-role">
                <option value="viewer">Viewer</option>
                <option value="developer">Developer</option>
                <option value="operator">Operator</option>
                <option value="manager">Manager</option>
              </select>
            </label>
            <label>Permission Scope
              <select id="ln-host-access-scope">
                <option value="site_read">Site read</option>
                <option value="site_write">Site write</option>
                <option value="deployment">Deployment</option>
                <option value="domain">Domain management</option>
                <option value="full_site">Full site access</option>
              </select>
            </label>
            <button class="ln-host-btn" id="ln-host-access-invite" type="button">Request Member Invitation</button>
          </div>
          <div class="ln-host-panel">
            <h3>Site Members</h3>
            <p>Wanachama halisi na roles zao zitaonyeshwa baada ya kuunganishwa na Access API.</p>
          </div>
          <div class="ln-host-panel">
            <h3>Permission Policies</h3>
            <p>Ruhusa zitatekelezwa na Backend v2 kwa kila ombi; frontend haitakuwa chanzo cha mamlaka.</p>
          </div>
          <div class="ln-host-panel">
            <h3>Access Activity</h3>
            <p>Invitation, role changes na access events zitaonekana kutoka kwenye audit records.</p>
          </div>`;
      case "alerts":
        return `
          <h2>Hosting Notifications & Alerts</h2>
          <p class="ln-host-muted">Fuatilia matukio muhimu yanayoathiri tovuti zako.</p>
          <div class="ln-host-panel ln-host-form">
            <label>Site ID
              <input id="ln-host-alert-site" value="${esc(state.siteId)}" placeholder="Site ID">
            </label>
            <label>Alert Category
              <select id="ln-host-alert-category">
                <option value="all">All categories</option>
                <option value="deployment">Deployment</option>
                <option value="runtime">Runtime</option>
                <option value="resources">Resource usage</option>
                <option value="security">Security</option>
                <option value="domain">Domain & TLS</option>
                <option value="errors">Errors</option>
              </select>
            </label>
            <label>Severity
              <select id="ln-host-alert-severity">
                <option value="all">All levels</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Information</option>
              </select>
            </label>
            <label>Search Alerts
              <input id="ln-host-alert-search" maxlength="160" placeholder="Tafuta arifa">
            </label>
          </div>
          <div class="ln-host-panel">
            <h3>Alert Center</h3>
            <p>Arifa halisi zitaonekana hapa baada ya kuunganishwa na Notifications API.</p>
          </div>
          <div class="ln-host-panel">
            <h3>Alert Rules</h3>
            <label>Resource threshold (%)
              <input id="ln-host-alert-threshold" type="number" min="1" max="100" value="85">
            </label>
            <label>Notification channel
              <select id="ln-host-alert-channel">
                <option value="in_app">In-app</option>
                <option value="email">Email</option>
              </select>
            </label>
            <button class="ln-host-btn" id="ln-host-alert-save" type="button">Save Alert Rule</button>
            <p class="ln-host-note">Kanali na threshold vitahifadhiwa baada ya API kuunganishwa.</p>
          </div>
          <div class="ln-host-panel">
            <h3>Notification Preferences</h3>
            <p>Uchaguzi wa arifa na delivery status vitadhibitiwa na akaunti yako na Backend v2.</p>
          </div>`;
      case "lifecycle":
        return `
          <h2>Hosting Site Lifecycle</h2>
          <p class="ln-host-muted">Dhibiti hali na mzunguko wa maisha wa tovuti.</p>
          <div class="ln-host-panel ln-host-form">
            <label>Site ID
              <input id="ln-host-life-site" value="${esc(state.siteId)}" placeholder="Site ID">
            </label>
            <label>Current Site State
              <select id="ln-host-life-state" disabled>
                <option value="">Hali itasomwa kutoka Backend v2</option>
              </select>
            </label>
            <label>Action
              <select id="ln-host-life-action">
                <option value="start">Start site</option>
                <option value="suspend">Suspend temporarily</option>
                <option value="resume">Resume site</option>
                <option value="close">Request site closure</option>
              </select>
            </label>
            <label>Reason
              <textarea id="ln-host-life-reason" rows="3" maxlength="1000" placeholder="Eleza sababu ya hatua hii"></textarea>
            </label>
            <button class="ln-host-btn" id="ln-host-life-request" type="button">Review Lifecycle Request</button>
          </div>
          <div class="ln-host-panel">
            <h3>Lifecycle History</h3>
            <p>Historia ya kuanzisha, kusimamisha na kurejesha tovuti itaonyeshwa kutoka kwenye rekodi halisi.</p>
          </div>
          <div class="ln-host-panel">
            <h3>Closure Impact</h3>
            <p>Kabla ya kufunga tovuti, mfumo utaonyesha athari kwa files, domains, runtime, backups na billing. Kufunga kutahitaji uthibitisho tofauti.</p>
          </div>
          <div class="ln-host-panel">
            <h3>Pending Requests</h3>
            <p>Maombi yanayosubiri idhini yataonekana hapa baada ya Lifecycle API kuunganishwa.</p>
          </div>`;
      default:
        return "<p>Ukurasa haupatikani.</p>";
    }
  }

  function render() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    root.innerHTML = `
      <div class="ln-host-shell">
        <nav class="ln-host-nav" aria-label="Hosting navigation">
          ${pages.map(([id,label,icon]) => `
            <button type="button" data-page="${id}" class="${state.active === id ? "active" : ""}">
              <span>${icon}</span>${label}
            </button>`).join("")}
        </nav>
        <main class="ln-host-content">${pageContent(state.active)}</main>
      </div>`;

    root.querySelectorAll("[data-page]").forEach(button => {
      button.addEventListener("click", () => {
        state.active = button.dataset.page;
        render();
      });
    });

    root.querySelectorAll("[data-go]").forEach(button => {
      button.addEventListener("click", () => {
        state.active = button.dataset.go;
        render();
      });
    });

    const openDetails = root.querySelector("#ln-host-open-details");
    if (openDetails) openDetails.addEventListener("click", () => {
      const id = root.querySelector("#ln-host-site-lookup").value.trim();
      if (!id) {
        root.querySelector("#ln-host-site-lookup").focus();
        return;
      }
      state.siteId = id;
      state.active = "details";
      render();
    });

    const detailId = root.querySelector("#ln-host-detail-id");
    if (detailId) detailId.addEventListener("input", () => {
      state.siteId = detailId.value.trim();
    });

    const fileSite = root.querySelector("#ln-host-file-site");
    if (fileSite) fileSite.addEventListener("input", () => {
      state.siteId = fileSite.value.trim();
    });

    const newFile = root.querySelector("#ln-host-new-file");
    if (newFile) newFile.addEventListener("click", () => {
      root.querySelector("#ln-host-file-editor").hidden = false;
      root.querySelector("#ln-host-new-file-name").focus();
    });

    const uploadButton = root.querySelector("#ln-host-upload-file");
    const fileInput = root.querySelector("#ln-host-file-input");
    if (uploadButton && fileInput) {
      uploadButton.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", () => {
        const selected = fileInput.files?.[0];
        if (!selected) return;
        root.querySelector("#ln-host-new-file-name").value = selected.name;
        root.querySelector("#ln-host-file-editor").hidden = false;
      });
    }

    const fileSearch = root.querySelector("#ln-host-file-search");
    if (fileSearch) fileSearch.addEventListener("input", () => {
      const query = fileSearch.value.trim();
      fileSearch.setAttribute("aria-label", query ? "Kutafuta: " + query : "Tafuta faili");
    });

    const runtimeSite = root.querySelector("#ln-host-runtime-site");
    if (runtimeSite) runtimeSite.addEventListener("input", () => {
      state.siteId = runtimeSite.value.trim();
    });

    const runtimePort = root.querySelector("#ln-host-runtime-port");
    if (runtimePort) runtimePort.addEventListener("change", () => {
      const port = Number(runtimePort.value);
      if (runtimePort.value && (!Number.isInteger(port) || port < 1 || port > 65535)) {
        runtimePort.setCustomValidity("Port lazima iwe kati ya 1 na 65535.");
      } else {
        runtimePort.setCustomValidity("");
      }
    });

    root.querySelectorAll("[data-runtime-action]").forEach(button => {
      button.addEventListener("click", () => {
        const siteId = runtimeSite?.value.trim();
        if (!siteId) {
          runtimeSite?.focus();
          return;
        }
        const note = root.querySelector(".ln-host-note");
        if (note) note.textContent =
          "Runtime API integration bado haijafanyika. Hakuna action iliyotumwa.";
      });
    });

    const logsSite = root.querySelector("#ln-host-logs-site");
    if (logsSite) logsSite.addEventListener("input", () => {
      state.siteId = logsSite.value.trim();
    });

    const logFrom = root.querySelector("#ln-host-log-from");
    const logTo = root.querySelector("#ln-host-log-to");
    if (logFrom && logTo) {
      const validateRange = () => {
        if (logFrom.value && logTo.value && logTo.value < logFrom.value) {
          logTo.setCustomValidity("Mwisho wa muda hauwezi kuwa kabla ya mwanzo.");
        } else {
          logTo.setCustomValidity("");
        }
      };
      logFrom.addEventListener("change", validateRange);
      logTo.addEventListener("change", validateRange);
    }

    const logSearch = root.querySelector("#ln-host-log-search");
    if (logSearch) logSearch.addEventListener("input", () => {
      const result = root.querySelector("#ln-host-log-results");
      if (result) result.dataset.search = logSearch.value.trim();
    });

    const usageSite = root.querySelector("#ln-host-usage-site");
    if (usageSite) usageSite.addEventListener("input", () => {
      state.siteId = usageSite.value.trim();
    });

    root.querySelectorAll('[id^="ln-host-limit-"]').forEach(input => {
      input.addEventListener("change", () => {
        const value = Number(input.value);
        const valid = input.value === "" ||
          (Number.isFinite(value) && value >= Number(input.min || 0) &&
          (input.max === "" || value <= Number(input.max)));
        input.setCustomValidity(valid ? "" : "Thamani ya limit si sahihi.");
      });
    });

    const settingsSite = root.querySelector("#ln-host-settings-site");
    if (settingsSite) settingsSite.addEventListener("input", () => {
      state.siteId = settingsSite.value.trim();
    });

    const dnsTtl = root.querySelector("#ln-host-dns-ttl");
    if (dnsTtl) dnsTtl.addEventListener("change", () => {
      const value = Number(dnsTtl.value);
      dnsTtl.setCustomValidity(Number.isInteger(value) && value >= 60 && value <= 86400
        ? "" : "TTL lazima iwe kati ya sekunde 60 na 86400.");
    });

    const primaryDomain = root.querySelector("#ln-host-primary-domain");
    if (primaryDomain) primaryDomain.addEventListener("change", () => {
      const value = primaryDomain.value.trim();
      const valid = !value || /^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,63}$/.test(value);
      primaryDomain.setCustomValidity(valid ? "" : "Domain si sahihi.");
    });

    const securitySite = root.querySelector("#ln-host-security-site");
    if (securitySite) securitySite.addEventListener("input", () => {
      state.siteId = securitySite.value.trim();
    });

    for (const id of ["ln-host-allowed-ips", "ln-host-blocked-ips"]) {
      const input = root.querySelector("#" + id);
      if (input) input.addEventListener("change", () => {
        const valid = input.value.split(/\\r?\\n/).map(v => v.trim()).filter(Boolean)
          .every(v => /^(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)$/.test(v) || /^[0-9a-fA-F:]+$/.test(v));
        input.setCustomValidity(valid ? "" : "Kuna IP address isiyo sahihi.");
      });
    }

    const recoverySite = root.querySelector("#ln-host-recovery-site");
    if (recoverySite) recoverySite.addEventListener("input", () => {
      state.siteId = recoverySite.value.trim();
    });

    const retention = root.querySelector("#ln-host-backup-retention");
    if (retention) retention.addEventListener("change", () => {
      const value = Number(retention.value);
      retention.setCustomValidity(
        Number.isInteger(value) && value >= 1 && value <= 3650
          ? "" : "Retention lazima iwe kati ya siku 1 na 3650."
      );
    });

    const billingSite = root.querySelector("#ln-host-billing-site");
    if (billingSite) billingSite.addEventListener("input", () => {
      state.siteId = billingSite.value.trim();
    });

    const apiSite = root.querySelector("#ln-host-api-site");
    if (apiSite) apiSite.addEventListener("input", () => {
      state.siteId = apiSite.value.trim();
    });
    const apiCreate = root.querySelector("#ln-host-api-create");
    if (apiCreate) apiCreate.addEventListener("click", () => {
      const name = root.querySelector("#ln-host-api-token-name")?.value.trim();
      if (!state.siteId) return notify("Weka Site ID kwanza.");
      if (!name) return notify("Weka jina la token.");
      notify("Ombi limeandaliwa. Token haitatengenezwa hadi Backend v2 iunganishwe.");
    });

    const releaseSite = root.querySelector("#ln-host-release-site");
    if (releaseSite) releaseSite.addEventListener("input", () => {
      state.siteId = releaseSite.value.trim();
    });
    const releaseRequest = root.querySelector("#ln-host-release-request");
    if (releaseRequest) releaseRequest.addEventListener("click", () => {
      const version = root.querySelector("#ln-host-release-version")?.value.trim();
      const revision = root.querySelector("#ln-host-release-revision")?.value.trim();
      if (!state.siteId) return notify("Weka Site ID kwanza.");
      if (!version || !revision) return notify("Weka Release Version na Source Revision.");
      notify("Deployment request imeandaliwa. Utekelezaji unasubiri Backend v2 na approval.");
    });
    const rollbackRequest = root.querySelector("#ln-host-release-rollback");
    if (rollbackRequest) rollbackRequest.addEventListener("click", () => {
      const releaseId = root.querySelector("#ln-host-release-rollback-id")?.value.trim();
      if (!state.siteId) return notify("Weka Site ID kwanza.");
      if (!releaseId) return notify("Weka Release ID ya kurejesha.");
      notify("Rollback request imeandaliwa. Hakuna mabadiliko yaliyotekelezwa.");
    });

    const historySite = root.querySelector("#ln-host-history-site");
    if (historySite) historySite.addEventListener("input", () => {
      state.siteId = historySite.value.trim();
    });

    const historyCompare = root.querySelector("#ln-host-history-compare");
    if (historyCompare) historyCompare.addEventListener("click", () => {
      const from = root.querySelector("#ln-host-history-from")?.value;
      const to = root.querySelector("#ln-host-history-to")?.value;
      if (!state.siteId) return notify("Weka Site ID kwanza.");
      if (from && to && new Date(from) > new Date(to)) {
        return notify("Start Date haiwezi kuwa baada ya End Date.");
      }
      notify("Comparison request imeandaliwa. Inasubiri Version History API.");
    });

    const historyRestore = root.querySelector("#ln-host-history-restore");
    if (historyRestore) historyRestore.addEventListener("click", () => {
      const target = root.querySelector("#ln-host-history-target")?.value.trim();
      const reason = root.querySelector("#ln-host-history-reason")?.value.trim();
      if (!state.siteId) return notify("Weka Site ID kwanza.");
      if (!target || !reason) return notify("Weka Version ID na sababu ya restore.");
      notify("Restore request imeandaliwa. Hakuna toleo lililobadilishwa.");
    });

    const diagnosticSite = root.querySelector("#ln-host-diagnostic-site");
    if (diagnosticSite) diagnosticSite.addEventListener("input", () => {
      state.siteId = diagnosticSite.value.trim();
    });

    const diagnosticRun = root.querySelector("#ln-host-diagnostic-run");
    if (diagnosticRun) diagnosticRun.addEventListener("click", () => {
      if (!state.siteId) return notify("Weka Site ID kwanza.");
      notify("Diagnostics request imeandaliwa. Inasubiri Backend v2.");
    });

    const errorSave = root.querySelector("#ln-host-error-save");
    if (errorSave) errorSave.addEventListener("click", () => {
      const content = root.querySelector("#ln-host-error-content")?.value.trim();
      if (!state.siteId) return notify("Weka Site ID kwanza.");
      if (!content) return notify("Weka maudhui ya Error Page.");
      notify("Error Page update request imeandaliwa. Hakuna mabadiliko yaliyotumwa.");
    });

    const accessSite = root.querySelector("#ln-host-access-site");
    if (accessSite) accessSite.addEventListener("input", () => {
      state.siteId = accessSite.value.trim();
    });

    const accessInvite = root.querySelector("#ln-host-access-invite");
    if (accessInvite) accessInvite.addEventListener("click", () => {
      const email = root.querySelector("#ln-host-access-email")?.value.trim();
      if (!state.siteId) return notify("Weka Site ID kwanza.");
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return notify("Weka barua pepe sahihi.");
      }
      notify("Invitation request imeandaliwa. Inasubiri Backend v2.");
    });

    const alertSite = root.querySelector("#ln-host-alert-site");
    if (alertSite) alertSite.addEventListener("input", () => {
      state.siteId = alertSite.value.trim();
    });

    const alertSave = root.querySelector("#ln-host-alert-save");
    if (alertSave) alertSave.addEventListener("click", () => {
      const threshold = Number(root.querySelector("#ln-host-alert-threshold")?.value);
      if (!state.siteId) return notify("Weka Site ID kwanza.");
      if (!Number.isInteger(threshold) || threshold < 1 || threshold > 100) {
        return notify("Threshold iwe kati ya 1 na 100.");
      }
      notify("Alert rule imeandaliwa. Inasubiri Notifications API.");
    });

    const lifeSite = root.querySelector("#ln-host-life-site");
    if (lifeSite) lifeSite.addEventListener("input", () => {
      state.siteId = lifeSite.value.trim();
    });

    const lifeRequest = root.querySelector("#ln-host-life-request");
    if (lifeRequest) lifeRequest.addEventListener("click", () => {
      const action = root.querySelector("#ln-host-life-action")?.value;
      const reason = root.querySelector("#ln-host-life-reason")?.value.trim();
      if (!state.siteId) return notify("Weka Site ID kwanza.");
      if (!reason) return notify("Eleza sababu ya ombi.");
      if (action === "close") {
        const confirmed = window.confirm("Ombi la kufunga tovuti linaweza kuathiri files, domains, runtime na billing. Unataka kuendelea na hatua ya kupitia ombi?");
        if (!confirmed) return;
      }
      notify("Lifecycle request imeandaliwa kwa ajili ya review. Hakuna mabadiliko yaliyotekelezwa.");
    });

    const overviewSite = root.querySelector("#ln-host-overview-site");
    if (overviewSite) overviewSite.addEventListener("input", () => {
      state.siteId = overviewSite.value.trim();
    });

    const overviewRefresh = root.querySelector("#ln-host-overview-refresh");
    if (overviewRefresh) overviewRefresh.addEventListener("click", () => {
      if (!state.siteId) return notify("Weka Site ID kwanza.");
      notify("Overview refresh request imeandaliwa. Inasubiri Hosting API integration.");
    });

    const form = root.querySelector("#ln-host-create-form");
    if (form) form.addEventListener("submit", event => {
      event.preventDefault();
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const domain = String(data.get("domain") || "").trim();

      if (!name) return;
      if (domain && !/^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,63}$/.test(domain)) {
        form.querySelector("#ln-host-create-message").textContent =
          "Domain si sahihi. Hakikisha umeandika domain halali.";
        return;
      }

      form.querySelector("#ln-host-create-message").textContent =
        "Taarifa zimehakikiwa kwenye fomu. Usajili unasubiri integration ya Hosting API.";
    });
  }

  function mount() {
    const page = document.getElementById("page-hosting");
    if (!page || document.getElementById(ROOT_ID)) return;

    const root = document.createElement("div");
    root.id = ROOT_ID;
    page.prepend(root);
    render();
  }

  const style = document.createElement("style");
  style.textContent = `\n    #${ROOT_ID} .ln-host-log-toolbar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    #${ROOT_ID} .ln-host-log-toolbar label{min-width:0}
    #${ROOT_ID} .ln-host-runtime-actions,#${ROOT_ID} .ln-host-file-toolbar{display:flex;gap:10px;flex-wrap:wrap}
\n    #page-hosting > :not(#lucasnode-hosting-app){display:none!important}\n
    #${ROOT_ID}{color:var(--text,#e5e7eb);width:100%}
    #${ROOT_ID} *{box-sizing:border-box}
    #${ROOT_ID} .ln-host-shell{display:grid;grid-template-columns:190px minmax(0,1fr);gap:18px}
    #${ROOT_ID} .ln-host-nav{display:flex;flex-direction:column;gap:7px}
    #${ROOT_ID} .ln-host-nav button,#${ROOT_ID} .ln-host-tile{
      border:1px solid var(--border,rgba(148,163,184,.16));background:rgba(15,23,42,.55);
      color:inherit;border-radius:12px;padding:12px;text-align:left;cursor:pointer
    }
    #${ROOT_ID} .ln-host-nav button{display:flex;align-items:center;gap:10px}
    #${ROOT_ID} .ln-host-nav button span{width:22px;text-align:center;color:#8b9cff}
    #${ROOT_ID} .ln-host-nav button.active{border-color:#6578ed;background:rgba(79,70,229,.17)}
    #${ROOT_ID} .ln-host-content{min-width:0}
    #${ROOT_ID} h2{font-size:22px;margin:0 0 8px}
    #${ROOT_ID} h3{font-size:16px;margin:0 0 12px}
    #${ROOT_ID} p{color:var(--muted,#94a3b8);line-height:1.6}
    #${ROOT_ID} .ln-host-hero,#${ROOT_ID} .ln-host-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:18px}
    #${ROOT_ID} .ln-host-kicker{font-size:11px;letter-spacing:2px;color:#9aa8ff}
    #${ROOT_ID} .ln-host-primary{border:0;border-radius:10px;padding:11px 15px;background:linear-gradient(110deg,#4f46e5,#2563eb);color:white;font-weight:700;cursor:pointer}
    #${ROOT_ID} .ln-host-stats,#${ROOT_ID} .ln-host-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:16px 0}
    #${ROOT_ID} .ln-host-stats article,#${ROOT_ID} .ln-host-panel{background:rgba(15,23,42,.55);border:1px solid var(--border,rgba(148,163,184,.16));border-radius:14px;padding:17px}
    #${ROOT_ID} .ln-host-stats article{display:grid;gap:8px}
    #${ROOT_ID} .ln-host-stats article span{font-size:21px;color:#9aa8ff}
    #${ROOT_ID} .ln-host-stats small,#${ROOT_ID} .ln-host-muted{color:var(--muted,#94a3b8)}
    #${ROOT_ID} .ln-host-stats strong{font-size:23px}
    #${ROOT_ID} .ln-host-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
    #${ROOT_ID} .ln-host-tile{display:grid;gap:9px;min-height:105px}
    #${ROOT_ID} .ln-host-tile span{font-size:22px;color:#9aa8ff}
    #${ROOT_ID} .ln-host-tile small{color:var(--muted,#94a3b8)}
    #${ROOT_ID} .ln-host-empty{text-align:center;padding:34px 12px}
    #${ROOT_ID} .ln-host-empty span{font-size:30px;color:#9aa8ff}
    #${ROOT_ID} .ln-host-form{display:grid;gap:15px;max-width:650px}
    #${ROOT_ID} label{display:grid;gap:7px;font-size:13px}
    #${ROOT_ID} input,#${ROOT_ID} select,#${ROOT_ID} textarea{width:100%;min-width:0;padding:11px;border-radius:9px;border:1px solid var(--border,rgba(148,163,184,.25));background:#080f20;color:inherit;font:inherit}
    #${ROOT_ID} .ln-host-note{font-size:12px}
    #${ROOT_ID} .ln-host-runtime-status{display:flex;align-items:center;gap:9px;margin-top:16px}
    #${ROOT_ID} .ln-host-runtime-status span{width:9px;height:9px;border-radius:50%;background:#94a3b8}
    @media(max-width:700px){
      #${ROOT_ID} .ln-host-shell{grid-template-columns:1fr}
      #${ROOT_ID} .ln-host-nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
      #${ROOT_ID} .ln-host-stats{grid-template-columns:1fr}
    }
  `;
  document.head.appendChild(style);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }

  window.LucasNodeHosting = Object.freeze({
    contracts: API_CONTRACTS,
    open(section = "overview") {
      if (!pages.some(([id]) => id === section)) return false;
      state.active = section;
      mount();
      render();
      return true;
    }
  });
})();
