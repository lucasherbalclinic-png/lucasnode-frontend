

const API_ORIGIN = "https://api.lucasnode.com";
const LS_TOKEN = "lucasnode_access_token";
const LS_REFRESH = "lucasnode_refresh_token";
const LS_USER = "lucasnode_user";
const REQUEST_TIMEOUT_MS = 15000;
/* Anon key pekee (ni ya umma). Usiweke service_role hapa. Inatumika kwa Storage/project_files tu. */
const SUPABASE_URL = "https://vrpmntqwanoxokjjllgr.supabase.co";
const SUPABASE_ANON_KEY = "PASTE_ANON_KEY_HERE";
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/;
let sb = null;

let authMode = "login";
let refreshing = null;
let ghRequestId = 0;
const state = { user: null, ghPath: "", ghOwner: "", ghRepo: "", ghBranch: "main" };
const counts = { projects: 0, domains: 0, deployments: 0, tovuti: 0 };

/* ---------- helpers ---------- */
const $ = (id) => document.getElementById(id);
const store = {
  get(k){ try{ return localStorage.getItem(k); }catch{ return null; } },
  set(k, v){ try{ localStorage.setItem(k, v); }catch{} },
  del(k){ try{ localStorage.removeItem(k); }catch{} }
};
function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function fmtDate(s){ const d = new Date(s); return isNaN(d) ? "" : d.toLocaleString("sw"); }
function fmtSize(b){
  if(b == null) return "";
  if(b < 1024) return b + " B";
  if(b < 1048576) return (b/1024).toFixed(1) + " KB";
  return (b/1048576).toFixed(1) + " MB";
}
function listOf(r){
  if(!r.ok) return [];
  const b = r.data;
  if(Array.isArray(b)) return b;
  if(Array.isArray(b?.data)) return b.data;
  for(const k of Object.keys(b || {})) if(Array.isArray(b[k])) return b[k];
  return [];
}
function toast(msg, kind){
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast show" + (kind === "ok" ? " ok" : kind === "err" ? " err" : "");
  clearTimeout(t._tm);
  t._tm = setTimeout(() => { t.className = "toast"; }, 3200);
}
async function withBusy(e, fn){
  const btn = e?.submitter || e?.target?.querySelector?.('[type="submit"]');
  if(btn){ if(btn.disabled) return; btn.disabled = true; }
  try{ await fn(); } finally { if(btn) btn.disabled = false; }
}

/* ---------- Supabase (Storage + project_files, kwa token ya kikao) ---------- */
function keyIsUnsafe(k){
  if(/^sb_secret_/.test(k)) return true;
  try{ return JSON.parse(atob(k.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).role === "service_role"; }catch{ return false; }
}
function initSupabase(){
  try{
    if(!window.supabase?.createClient) return;
    if(!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.startsWith("PASTE_")) return;
    if(keyIsUnsafe(SUPABASE_ANON_KEY)){ console.error("service_role key haikubaliki kwenye frontend."); return; }
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (u, o = {}) => { const h = new Headers(o.headers || {}); const t = getToken(); if(t) h.set("Authorization", "Bearer " + t); return fetch(u, { ...o, headers: h }); } }
    });
  }catch{ sb = null; }
}

/* ---------- session ---------- */
const getToken = () => store.get(LS_TOKEN);
const getRefreshToken = () => store.get(LS_REFRESH);
const isLoggedIn = () => !!getToken();
function saveSession(session, user){
  if(session?.access_token) store.set(LS_TOKEN, session.access_token);
  if(session?.refresh_token) store.set(LS_REFRESH, session.refresh_token);
  if(user){ state.user = user; store.set(LS_USER, JSON.stringify(user)); updateAvatar(); }
}
function clearSession(){
  store.del(LS_TOKEN); store.del(LS_REFRESH); store.del(LS_USER);
  state.user = null;
  updateAvatar();
}
function updateAvatar(){
  const a = $("avatarBtn");
  if(a) a.textContent = (state.user?.email?.[0] || "L").toUpperCase();
}

/* ---------- API client ---------- */
async function rawFetch(path, opts = {}){
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try{ return await fetch(API_ORIGIN + path, { ...opts, signal: ctrl.signal }); }
  finally{ clearTimeout(tm); }
}
async function apiRequest(method, path, body, retry = true){
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if(token) headers.Authorization = "Bearer " + token;
  try{
    const res = await rawFetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({ success:false, error:"Jibu si JSON." }));
    if(res.status === 401 && retry && getRefreshToken() && await refreshSession()){
      return apiRequest(method, path, body, false);
    }
    return { ok: res.ok, status: res.status, data };
  }catch{
    return { ok:false, status:0, data:{ success:false, error:"Imeshindikana kuunganisha na backend." } };
  }
}
function refreshSession(){
  if(!getRefreshToken()) return Promise.resolve(false);
  if(refreshing) return refreshing;
  refreshing = (async () => {
    try{
      const r = await rawFetch("/api/idhini/upya", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ refresh_token: getRefreshToken() })
      });
      const d = await r.json().catch(() => null);
      if(r.ok && d?.success && d.session){ saveSession(d.session, d.user); return true; }
      if(r.status >= 400 && r.status < 500){ clearSession(); showAuthGate(); }
      return false;
    }catch{ return false; }
    finally{ refreshing = null; }
  })();
  return refreshing;
}

/* ---------- auth ---------- */
function showAuthGate(){ $("authGate").style.display = "flex"; }
function hideAuthGate(){ $("authGate").style.display = "none"; }
function setAuthTab(mode){
  authMode = mode;
  $("tabLogin").classList.toggle("active", mode === "login");
  $("tabRegister").classList.toggle("active", mode === "register");
  $("nameField").style.display = mode === "register" ? "grid" : "none";
  $("authSubmit").textContent = mode === "login" ? "Kuingia" : "Sajili";
}
async function authPost(path, body){
  try{
    const r = await rawFetch(path, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => null);
    return { ok: r.ok, data: d };
  }catch{
    return { ok:false, data:{ error:"Imeshindikana kuunganisha na backend." } };
  }
}
function submitAuth(e){
  e.preventDefault();
  return withBusy(e, async () => {
    const email = $("authEmail").value.trim().toLowerCase();
    const password = $("authPassword").value;
    if(!email || !password){ toast("Jaza barua pepe na nenosiri.", "err"); return; }
    if(authMode === "register"){
      if(password.length < 10){ toast("Nenosiri liwe na angalau herufi 10.", "err"); return; }
      const display_name = $("authName").value.trim();
      const { ok, data } = await authPost("/api/idhini/jisajili", { email, password, display_name });
      if(ok && data?.success){
        if(data.session){ saveSession(data.session, data.user); toast("Akaunti imetengenezwa. Karibu!", "ok"); initApp(); }
        else { toast("Akaunti imetengenezwa. Angalia barua pepe kuthibitisha, kisha ingia.", "ok"); setAuthTab("login"); }
      } else toast(data?.error || "Usajili umeshindikana.", "err");
    } else {
      const { ok, data } = await authPost("/api/idhini/kuingia", { email, password });
      if(ok && data?.success && data.session){
        saveSession(data.session, data.user);
        $("authPassword").value = "";
        toast("Karibu, " + (data.user?.email || "") + "!", "ok");
        initApp();
      } else toast(data?.error || "Barua pepe au nenosiri si sahihi.", "err");
    }
  });
}
async function logout(){
  if(isLoggedIn()) await apiRequest("POST", "/api/idhini/toka", {}, false);
  clearSession(); showAuthGate();
  if(typeof resetEditor === "function") resetEditor();
  toast("Umetoka kwenye akaunti.", "ok");
}

/* ---------- navigation ---------- */
function showPage(name){
  if(!isLoggedIn()){ showAuthGate(); return; }
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  $("page-" + name)?.classList.add("active");
  document.querySelectorAll(".bottom-item").forEach(b => b.classList.toggle("active", b.dataset.page === name));
  closeDrawer();
  window.scrollTo(0, 0);
  loadPageData(name);
}
function loadPageData(name){
  if(name === "home" || name === "projects") loadProjects();
  else if(name === "domains") loadDomains();
  else if(name === "hosting") loadTovuti();
  else if(name === "deploy") loadDeployProjects();
  else if(name === "monitoring") checkBackend();
  else if(name === "settings") loadProfile();
  else if(name === "support") renderTickets();
  else if(name === "editor" && typeof initEditor === "function") initEditor();
}
function openDrawer(){ if(!isLoggedIn()){ showAuthGate(); return; } $("drawerOverlay").classList.add("show"); }
function closeDrawer(){ $("drawerOverlay").classList.remove("show"); }

/* ---------- modals ---------- */
function openModal(id){ if(!isLoggedIn()){ showAuthGate(); return; } $(id).classList.add("show"); }
function closeModal(id){ $(id).classList.remove("show"); }
const openCreateProject = () => openModal("modalProject");
const openDomainModal = () => openModal("modalDomain");
const openTovutiModal = () => openModal("modalTovuti");
const openSupportModal = () => openModal("modalSupport");
const openGithubModal = () => openModal("modalGithub");

/* ---------- generic list rendering ---------- */
function fillList(container, emptyEl, items, render){
  if(!items.length){ container.style.display = "none"; container.innerHTML = ""; emptyEl.style.display = "block"; return; }
  container.style.display = "grid"; emptyEl.style.display = "none";
  container.innerHTML = items.map(render).join("");
}
function card(icon, title, meta, extra = "", action = ""){
  return `<div class="project-card"><div class="project-main"><div class="project-icon">${icon}</div><div><div class="project-name">${escapeHtml(title)}</div>${meta}</div></div>${action}</div>`;
}
const metaDiv = (t) => `<div class="project-meta">${t}</div>`;

/* ---------- stats ---------- */
function renderStats(){
  $("statProjects").textContent = counts.projects;
  $("statDomains").textContent = counts.domains;
  $("statDeployments").textContent = counts.deployments;
  $("statLive").textContent = counts.tovuti;
}
async function refreshStats(){
  const [p, d, dep, t] = await Promise.all([
    apiRequest("GET", "/api/projects"),
    apiRequest("GET", "/api/v1/domains"),
    apiRequest("GET", "/api/v1/deployments"),
    apiRequest("GET", "/api/tovuti")
  ]);
  counts.projects = listOf(p).length;
  counts.domains = listOf(d).length;
  counts.deployments = listOf(dep).length;
  counts.tovuti = listOf(t).length;
  renderStats();
}

/* ---------- projects ---------- */
async function loadProjects(){
  const r = await apiRequest("GET", "/api/projects");
  if(!r.ok){ toast(r.data?.error || "Imeshindikana kusoma projects.", "err"); return; }
  const list = listOf(r);
  counts.projects = list.length; renderStats();
  const render = (p) => {
    const repo = p.repository_url
      ? metaDiv(`🔗 ${escapeHtml(p.repository_url)}${p.repository_branch ? " · " + escapeHtml(p.repository_branch) : ""}`) : "";
    const meta = metaDiv(`${escapeHtml(p.slug || p.name || "")} ${p.framework ? "· " + escapeHtml(p.framework) : ""}`) + repo;
    return card("📁", p.name || "", meta, "", `<button class="del-btn" data-action="delete-project" data-id="${escapeHtml(p.id)}" aria-label="Futa">🗑</button>`);
  };
  fillList($("homeProjects"), $("homeEmpty"), list, render);
  fillList($("projectsList"), $("projectsEmpty"), list, render);
}
function createProject(e){
  e.preventDefault();
  return withBusy(e, async () => {
    const v = (id) => $(id).value.trim() || undefined;
    const body = { name: $("projName").value.trim(), slug: v("projSlug"), description: v("projDesc"),
      framework: v("projFramework"), repository_url: v("projRepo"), repository_branch: v("projBranch") };
    if(!body.name){ toast("Jina la project linahitajika.", "err"); return; }
    const r = await apiRequest("POST", "/api/projects", body);
    if(r.ok && r.data?.success){ toast("Project imeundwa!", "ok"); closeModal("modalProject"); e.target.reset(); loadProjects(); }
    else toast(r.data?.error || "Imeshindikana kuunda project.", "err");
  });
}
async function deleteProject(id){
  if(!confirm("Futa project hii?")) return;
  const r = await apiRequest("DELETE", "/api/projects/" + encodeURIComponent(id));
  toast(r.ok ? "Project imefutwa." : (r.data?.error || "Imeshindikana kufuta."), r.ok ? "ok" : "err");
  loadProjects();
}

/* ---------- domains ---------- */
async function loadDomains(){
  const r = await apiRequest("GET", "/api/v1/domains");
  if(!r.ok){ toast(r.data?.error || "Imeshindikana kusoma domains.", "err"); return; }
  const list = listOf(r);
  counts.domains = list.length; renderStats();
  fillList($("domainsList"), $("domainsEmpty"), list, d => card("🌐", d.domain || d.name || "",
    metaDiv(`${escapeHtml(d.status || "—")} · SSL ${escapeHtml(d.ssl_status || "—")} · DNS ${escapeHtml(d.dns_status || "—")}`),
    "", `<button class="del-btn" data-action="delete-domain" data-id="${escapeHtml(d.id)}" aria-label="Futa">🗑</button>`));
}
async function deleteDomain(id){
  if(!confirm("Futa domain hii?")) return;
  const r = await apiRequest("DELETE", "/api/v1/domains/" + encodeURIComponent(id));
  toast(r.ok ? "Domain imefutwa." : (r.data?.error || "Imeshindikana kufuta."), r.ok ? "ok" : "err");
  loadDomains();
}
async function dohLookup(domain){
  try{
    const r = await fetch("https://cloudflare-dns.com/dns-query?name=" + encodeURIComponent(domain) + "&type=A", { headers: { accept: "application/dns-json" } });
    const d = await r.json();
    if(d.Status === 3) return "nx";
    return d.Answer?.length ? "has" : "none";
  }catch{ return null; }
}
async function lookupDomain(inputId, outId, withName){
  const domain = ($(inputId).value || "").trim().toLowerCase();
  const out = $(outId);
  if(!DOMAIN_RE.test(domain)){ toast("Weka domain sahihi (mfano: example.com).", "err"); return; }
  out.textContent = "Inatafuta...";
  const name = withName ? ` <b>${escapeHtml(domain)}</b>` : "";
  const r = await apiRequest("GET", "/api/domains/check?domain=" + encodeURIComponent(domain));
  if(r.ok && r.data?.success){
    out.innerHTML = r.data.registered
      ? `✅${name} imekwisha sajiliwa${r.data.source ? " (" + escapeHtml(r.data.source) + ")" : ""}.`
      : `🟢${name} inapatikana!`;
    return;
  }
  const d = await dohLookup(domain);
  if(d === "has") out.innerHTML = `✅${name} ina rekodi za DNS (inatumika).`;
  else if(d === "nx") out.innerHTML = `🟢${name} haina rekodi za DNS (huenda inapatikana — si uthibitisho wa usajili).`;
  else if(d === "none") out.innerHTML = `ℹ️${name} haina rekodi ya A (huenda imesajiliwa).`;
  else out.textContent = r.data?.error || "Imeshindikana.";
}
async function checkDomain(e){
  e.preventDefault();
  const btn = $("domainSearchButton");
  if(btn.disabled) return;
  btn.disabled = true;
  try{ await lookupDomain("domainSearch", "domainSearchResult", true); } finally { btn.disabled = false; }
}
const checkDomainInModal = () => lookupDomain("domainInput", "domainCheckResult", false);
function addDomain(e){
  e.preventDefault();
  return withBusy(e, async () => {
    const domain = ($("domainInput").value || "").trim().toLowerCase();
    if(!domain){ toast("Weka domain.", "err"); return; }
    const r = await apiRequest("POST", "/api/v1/domains", { domain });
    if(r.ok && r.data?.success){ toast("Domain imehifadhiwa!", "ok"); closeModal("modalDomain"); e.target.reset(); $("domainCheckResult").textContent = ""; loadDomains(); }
    else toast(r.data?.error || "Imeshindikana kuhifadhi domain.", "err");
  });
}

/* ---------- tovuti (hosting) ---------- */
async function loadTovuti(){
  const r = await apiRequest("GET", "/api/tovuti");
  if(!r.ok){ toast(r.data?.error || "Imeshindikana kusoma tovuti.", "err"); return; }
  const list = listOf(r);
  counts.tovuti = list.length; renderStats();
  const hc = $("hostCount"); if(hc) hc.textContent = list.length ? list.length + " tovuti zimehifadhiwa kwenye backend." : "Hakuna tovuti iliyohifadhiwa bado.";
  fillList($("tovutiList"), $("tovutiEmpty"), list,
    s => card("🌍", s.name || "", metaDiv(`/${escapeHtml(s.slug || "")} · ${escapeHtml(fmtDate(s.created_at))}`)));
}
function createTovuti(e){
  e.preventDefault();
  return withBusy(e, async () => {
    const body = { name: $("tovutiName").value.trim(), slug: $("tovutiSlug").value.trim(), html: $("tovutiHtml").value };
    if(!body.name || !body.slug || !body.html){ toast("Jaza sehemu zote.", "err"); return; }
    const r = await apiRequest("POST", "/api/tovuti", body);
    if(r.ok && r.data?.success){ toast("Tovuti imehifadhiwa!", "ok"); closeModal("modalTovuti"); e.target.reset(); loadTovuti(); }
    else toast(r.data?.error || "Imeshindikana kuhifadhi tovuti.", "err");
  });
}

/* ---------- deployments ---------- */
async function loadDeployProjects(){
  const r = await apiRequest("GET", "/api/projects");
  $("deployProject").innerHTML = '<option value="">Chagua project</option>' +
    listOf(r).map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join("");
  loadDeployHistory();
}
async function loadDeployHistory(){
  const r = await apiRequest("GET", "/api/v1/deployments");
  const list = listOf(r);
  counts.deployments = list.length; renderStats();
  fillList($("deployHistoryList"), $("deployHistoryEmpty"), list,
    d => card("🚀", d.project_id || d.id || "Deployment", metaDiv(escapeHtml(d.status || ""))));
}
function startDeployment(e){
  e.preventDefault();
  if(!$("deployProject").value){ toast("Chagua project kwanza.", "err"); return; }
  toast("Deployment engine haijaunganishwa. Kwa tovuti tuli tumia Editor & Preview.", "err");
}

/* ---------- monitoring ---------- */
async function checkBackend(){
  const el = $("healthResult");
  if(!el) return;

  el.textContent = "Inakagua API...";
  const startedAt = performance.now();

  try {
    const response = await fetch(API_ORIGIN + "/api/health", {
      method: "GET",
      headers: { "Accept": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000)
    });

    const data = await response.json();
    const elapsed = Math.round(performance.now() - startedAt);

    if(response.ok && data?.success === true && data?.status === "ok"){
      el.innerHTML =
        `<span style="color:#86efac">● API ONLINE</span><br>` +
        `Service: ${escapeHtml(data.service || "LucasNode API")}<br>` +
        `Version: ${escapeHtml(data.version || "—")}<br>` +
        `Response: ${elapsed} ms`;
    } else {
      el.innerHTML =
        `<span style="color:#f87171">● API ERROR</span><br>` +
        `HTTP: ${response.status}<br>` +
        `${escapeHtml(data?.error || "Majibu ya API si sahihi.")}`;
    }
  } catch(error) {
    el.innerHTML =
      `<span style="color:#f87171">● API OFFLINE</span><br>` +
      `${escapeHtml(error?.name === "TimeoutError" ? "Ombi limepitwa na muda." : "Imeshindikana kuunganisha na API.")}`;
  }
}

/* ---------- profile ---------- */
async function loadProfile(){
  if(!isLoggedIn()) return;
  const r = await apiRequest("GET", "/api/v1/me");
  if(r.ok && r.data?.success){
    const u = r.data.user || {}, p = r.data.profile || {};
    $("profileInfo").innerHTML = `📧 ${escapeHtml(u.email || "-")}<br>👤 ${escapeHtml(p.full_name || "-")}<br>📱 ${escapeHtml(p.phone || "-")}<br>🌍 ${escapeHtml(p.country || "-")}`;
  } else $("profileInfo").textContent = r.data?.error || "Imeshindikana kusoma wasifu.";
}

/* ---------- support tickets (backend endpoint haipo bado) ---------- */
function createTicket(e){
  e.preventDefault();
  toast("Support tickets hazijaunganishwa na backend bado.", "err");
}
function renderTickets(){
  const el = $("ticketsList");
  el.className = "empty"; el.style.display = "";
  el.innerHTML = '<div class="empty-icon">🎫</div><h3>Support tickets hazijaunganishwa</h3><p>Backend haina endpoint ya tickets bado.</p>';
}

/* ---------- GitHub downloader ---------- */
const GH_NAME = /^[A-Za-z0-9_.-]+$/;
const ghEncode = (p) => p.split("/").filter(Boolean).map(encodeURIComponent).join("/");
const ghApi = (path) => `https://api.github.com/repos/${encodeURIComponent(state.ghOwner)}/${encodeURIComponent(state.ghRepo)}/contents/${ghEncode(path)}?ref=${encodeURIComponent(state.ghBranch)}`;
function ghHeaders(accept){
  const h = { Accept: accept };
  const token = $("ghToken").value.trim();
  if(token) h.Authorization = "Bearer " + token;
  return h;
}
function browseGithub(e){
  e.preventDefault();
  const owner = $("ghOwner").value.trim(), repo = $("ghRepo").value.trim();
  if(!GH_NAME.test(owner) || !GH_NAME.test(repo)){ toast("Owner au repo si sahihi.", "err"); return; }
  state.ghOwner = owner; state.ghRepo = repo;
  state.ghBranch = $("ghBranch").value.trim() || "main";
  return fetchGithubDir("");
}
async function fetchGithubDir(path){
  const id = ++ghRequestId;
  const status = $("ghStatus");
  status.textContent = "Inasoma...";
  try{
    const res = await fetch(ghApi(path), { headers: ghHeaders("application/vnd.github+json") });
    if(id !== ghRequestId) return;
    if(res.status === 404){ status.textContent = "Faili au saraka haipatikani (404)."; return; }
    if(res.status === 401 || res.status === 403){ status.textContent = "Upatikanaji umekataliwa (" + res.status + "). Kwa repo binafsi weka token sahihi, au subiri rate limit."; return; }
    if(!res.ok){ status.textContent = "Hitilafu: " + res.status; return; }
    const items = await res.json();
    if(id !== ghRequestId) return;
    state.ghPath = path;
    const arr = Array.isArray(items) ? items : [items];
    arr.sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : (a.type === "dir" ? -1 : 1));
    renderGhBreadcrumb();
    const tree = $("ghTree"); tree.style.display = "block";
    tree.innerHTML = (path ? `<div class="gh-row" data-action="gh-dir" data-path="${escapeHtml(parentPath(path))}">📁 <span class="gh-name">.. (nyuma)</span></div>` : "") + arr.map(ghRow).join("");
    status.textContent = `${arr.length} kipengee.`;
  }catch{ if(id === ghRequestId) status.textContent = "Imeshindikana kuunganisha na GitHub."; }
}
function ghRow(it){
  const isDir = it.type === "dir";
  const size = isDir ? "" : `<span class="gh-size">${fmtSize(it.size)}</span>`;
  return `<div class="gh-row" data-action="${isDir ? "gh-dir" : "gh-file"}" data-path="${escapeHtml(it.path)}">${isDir ? "📁" : "📄"} <span class="gh-name">${escapeHtml(it.name)}</span>${size}</div>`;
}
function renderGhBreadcrumb(){
  const bc = $("ghBreadcrumb"); bc.style.display = "block";
  const link = (path, label) => `<span style="cursor:pointer;color:#93c5fd" data-action="gh-dir" data-path="${escapeHtml(path)}">${escapeHtml(label)}</span>`;
  let html = link("", state.ghOwner + "/" + state.ghRepo) + " @ " + escapeHtml(state.ghBranch);
  let acc = "";
  for(const p of state.ghPath.split("/").filter(Boolean)){ acc = acc ? acc + "/" + p : p; html += " / " + link(acc, p); }
  bc.innerHTML = html;
}
async function downloadGithubFile(path){
  const status = $("ghStatus");
  status.textContent = "Inapakua: " + path;
  try{
    const res = await fetch(ghApi(path), { headers: ghHeaders("application/vnd.github.raw+json") });
    if(!res.ok){ status.textContent = "Imeshindikana kupakua: " + res.status; return; }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = path.split("/").pop();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    status.textContent = "✅ Imepakuliwa: " + path;
    toast("File imepakuliwa!", "ok");
  }catch{ status.textContent = "Imeshindikana kupakua."; }
}
function parentPath(p){ const i = p.lastIndexOf("/"); return i === -1 ? "" : p.slice(0, i); }

/* ---------- delegated actions ---------- */
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if(!el) return;
  const { action, id, path } = el.dataset;
  if(action === "delete-project") deleteProject(id);
  else if(action === "delete-domain") deleteDomain(id);
  else if(action === "gh-dir") fetchGithubDir(path || "");
  else if(action === "gh-file") downloadGithubFile(path);
});
document.querySelectorAll(".modal-wrap").forEach(m => m.addEventListener("click", (e) => { if(e.target === m) m.classList.remove("show"); }));
document.addEventListener("keydown", (e) => {
  if(e.key !== "Escape") return;
  document.querySelectorAll(".modal-wrap.show").forEach(m => m.classList.remove("show"));
  closeDrawer();
});

/* ---------- init ---------- */
function initApp(){
  hideAuthGate();
  updateAvatar();
  renderTickets();
  refreshStats();
  showPage("home");
}
async function bootstrap(){
  initSupabase();
  if(!getToken()){ showAuthGate(); return; }
  try{ state.user = JSON.parse(store.get(LS_USER) || "null"); }catch{ state.user = null; }
  const r = await apiRequest("GET", "/api/idhini/mimi", null, false);
  if(r.ok && r.data?.success && r.data.user){ state.user = r.data.user; initApp(); return; }
  if(r.status === 0){ toast("Backend haipatikani. Jaribu tena.", "err"); showAuthGate(); return; }
  if(await refreshSession()) initApp(); else showAuthGate();
}
bootstrap();

        "use strict";
/* LucasNode — Editor, Preview, Inspect, Approval gate, ZIP, Deploy (static) */
const ED = {
  projectId: "", files: {}, active: "index.html", ver: 0, saving: false, timer: null, console: [],
  gate: { testedVer: -1, passed: false, testedHash: "", previewedVer: -1, approvedVer: -1, approvedHash: "" }
};
const STARTER = {
  "index.html": '<!DOCTYPE html>\n<html lang="sw">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Tovuti Yangu</title>\n<link rel="stylesheet" href="styles.css">\n</head>\n<body>\n<main>\n  <h1>Karibu</h1>\n  <button id="btn">Bonyeza</button>\n  <p id="msg"></p>\n</main>\n<script src="script.js"><\/script>\n</body>\n</html>\n',
  "styles.css": 'body{font-family:Arial,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;background:#0f172a;color:#f8fafc}\nmain{text-align:center}\nbutton{padding:10px 18px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-size:15px}\n',
  "script.js": 'document.getElementById("btn").addEventListener("click", function () {\n  document.getElementById("msg").textContent = "Inafanya kazi!";\n});\n'
};
const ALLOWED_EXT = /\.(html|css|js|json|txt|svg|md)$/i;
const FILE_NAME_RE = /^(?!.*\.\.)(?!\/)[A-Za-z0-9._\/-]{1,80}$/;
const MAX_PROJECT_BYTES = 500 * 1024;
const PREVIEW_HOOK = '<script>(function(){function s(m){try{parent.postMessage({lnPreviewError:String(m)},"*")}catch(e){}}window.addEventListener("error",function(e){s((e.message||"Hitilafu")+(e.lineno?" (mstari "+e.lineno+")":""))});window.addEventListener("unhandledrejection",function(e){s("Promise: "+((e.reason&&e.reason.message)||e.reason))});})();<\/script>';

/* ---------- utils ---------- */
const sbReady = () => !!sb;
function sbErr(e){ return (e && (e.message || e.error_description || e.error)) || "hitilafu isiyojulikana"; }
function normPath(p){ return String(p || "").replace(/^\.\//, "").replace(/^\//, "").split(/[?#]/)[0]; }
function mimeOf(p){
  const e = (p.split(".").pop() || "").toLowerCase();
  return ({ html: "text/html", css: "text/css", js: "text/javascript", json: "application/json", svg: "image/svg+xml", md: "text/markdown", txt: "text/plain" }[e] || "text/plain") + "; charset=utf-8";
}
async function sha256Hex(text){
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function fileHash(){
  const keys = Object.keys(ED.files).sort();
  return sha256Hex(JSON.stringify(keys.map(k => [k, ED.files[k]])));
}
function totalBytes(files){ return Object.values(files).reduce((n, c) => n + new Blob([c]).size, 0); }
const draftKey = (id) => "lucasnode_draft_" + id;
function readDraft(id){ try{ const d = JSON.parse(localStorage.getItem(draftKey(id)) || "null"); return d && typeof d === "object" ? d : null; }catch{ return null; } }
function writeDraft(id, files){ try{ localStorage.setItem(draftKey(id), JSON.stringify(files)); return true; }catch{ return false; } }
function clearDraft(id){ try{ localStorage.removeItem(draftKey(id)); }catch{} }

/* ---------- server storage (Supabase: project_files + bucket project-files) ---------- */
async function sbLoadFiles(projectId){
  const { data, error } = await sb.from("project_files").select("path,storage_path").eq("project_id", projectId);
  if(error) return { error };
  if(!data?.length) return { files: null };
  const files = {};
  for(const row of data){
    const { data: blob, error: e2 } = await sb.storage.from("project-files").download(row.storage_path);
    if(e2) return { error: e2 };
    files[row.path] = await blob.text();
  }
  return { files };
}
async function sbSaveFiles(projectId, files){
  const bucket = sb.storage.from("project-files");
  for(const path of Object.keys(files)){
    const content = files[path], storagePath = projectId + "/" + path, type = mimeOf(path);
    const blob = new Blob([content], { type });
    await bucket.remove([storagePath]);
    const up = await bucket.upload(storagePath, blob, { contentType: type, upsert: false });
    if(up.error) return up.error;
    const { error } = await sb.from("project_files").upsert({
      project_id: projectId, path, storage_path: storagePath, file_name: path.split("/").pop(),
      content_type: type, size_bytes: blob.size, checksum: await sha256Hex(content), is_entrypoint: path === "index.html"
    }, { onConflict: "project_id,path" });
    if(error) return error;
  }
  const { data: existing, error: e3 } = await sb.from("project_files").select("path,storage_path").eq("project_id", projectId);
  if(e3) return e3;
  const stale = (existing || []).filter(r => !(r.path in files));
  if(stale.length){
    await bucket.remove(stale.map(r => r.storage_path));
    const { error } = await sb.from("project_files").delete().eq("project_id", projectId).in("path", stale.map(r => r.path));
    if(error) return error;
  }
  return null;
}

/* ---------- editor state ---------- */
function bumpVersion(){ ED.ver++; renderGate(); }
function resetEditor(){
  ED.projectId = ""; ED.files = {}; ED.active = "index.html"; ED.ver = 0;
  ED.gate = { testedVer: -1, passed: false, testedHash: "", previewedVer: -1, approvedVer: -1, approvedHash: "" };
  ED.console = [];
}
function setNote(t){ const n = $("editorNote"); if(n) n.textContent = t; }

async function initEditor(){
  const r = await apiRequest("GET", "/api/projects");
  const list = listOf(r);
  const sel = $("editorProject"), cur = sel.value;
  sel.innerHTML = '<option value="">Bila project (starter, haihifadhiwi)</option>' +
    list.map(p => `<option value="${escapeHtml(p.id)}" data-slug="${escapeHtml(p.slug || "")}" data-name="${escapeHtml(p.name || "")}">${escapeHtml(p.name || "")}</option>`).join("");
  sel.value = list.some(p => p.id === cur) ? cur : "";
  if(!Object.keys(ED.files).length) await loadEditorCode(); else { renderEditor(); runPreview(); }
}
async function generateWithLucasNodeBuilder(){
  const input = $("builderDescription");
  const note = $("builderNote");
  const description = input.value.trim();

  if(!description){
    note.textContent = "Andika maelezo ya app kwanza.";
    input.focus();
    return;
  }

  if(!confirm("Kutengeneza app mpya kutabadilisha mafaili yaliyo kwenye editor. Unaendelea?")){
    return;
  }

  try{
    note.textContent = "Inatengeneza mafaili na kufanya ukaguzi...";
    const builder = await import("./src/builder/engine.js");
    const result = builder.generateProjectFiles(description);
    const check = builder.validateGeneratedFiles(result.files);

    if(!check.valid) throw new Error("Ukaguzi wa mafaili haujapita.");

    ED.files = {...result.files};
    ED.active = "index.html";
    ED.ver++;
    ED.gate = {
      testedVer:-1, passed:false, testedHash:"",
      previewedVer:-1, approvedVer:-1, approvedHash:""
    };

    renderEditor();
    clearInspect();
    runPreview();

    note.textContent = "Mafaili yametengenezwa na kukaguliwa. Kagua Preview, kisha tumia Inspect na majaribio kabla ya kuidhinisha.";
    $("editorNote").textContent = "Builder imetengeneza mafaili ya kuanzia. Hifadhi na jaribu app kabla ya hatua yoyote ya deployment.";
  }catch(e){
    note.textContent = "Hitilafu ya Builder: " + (e.message || "Haikuweza kutengeneza app.");
  }
}

async function loadEditorCode(){
  const sel = $("editorProject"), id = sel.value;
  ED.projectId = id;
  let files = null, note = "";
  if(id){
    if(sbReady()){
      const r = await sbLoadFiles(id);
      if(r.error) note = "Server: " + sbErr(r.error) + ". ";
      else if(r.files){ files = r.files; note = "Code imesomwa kutoka server."; }
    }
    if(!files){
      const d = readDraft(id);
      if(d){ files = d; note += "Code ni draft ya kivinjari hiki (haijahifadhiwa server)."; }
    }
    const opt = sel.selectedOptions[0];
    if(opt && !$("deploySlug").value) $("deploySlug").value = opt.dataset.slug || "";
  }
  if(!files){
    files = { ...STARTER };
    note += id ? "Project haina files bado — starter code imewekwa. Bonyeza Hifadhi." : "Bila project, hii ni starter code (haihifadhiwi).";
  }
  ED.files = files;
  ED.active = ("index.html" in files) ? "index.html" : Object.keys(files)[0];
  ED.gate = { testedVer: -1, passed: false, testedHash: "", previewedVer: -1, approvedVer: -1, approvedHash: "" };
  ED.ver++;
  setNote(note);
  renderEditor();
  clearInspect();
  runPreview();
}
function renderEditor(){
  renderTabs();
  const ta = $("htmlEditor");
  ta.value = ED.files[ED.active] ?? "";
  $("editorLabel").textContent = "Code: " + ED.active;
  renderGate();
}
function renderTabs(){
  const names = Object.keys(ED.files).sort((a, b) => a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b));
  $("fileTabs").innerHTML = names.map(p =>
    `<button type="button" class="btn ${p === ED.active ? "btn-primary" : "btn-secondary"}" style="min-height:34px;padding:0 12px" data-action="ed-tab" data-path="${escapeHtml(p)}">${escapeHtml(p)}</button>`).join("");
}
function switchTab(path){
  if(!(path in ED.files)) return;
  ED.active = path;
  $("htmlEditor").value = ED.files[path];
  $("editorLabel").textContent = "Code: " + path;
  renderTabs();
}
function addEditorFile(){
  const name = (prompt("Jina la file (mfano: about.html, app.js, styles.css):") || "").trim();
  if(!name) return;
  if(!FILE_NAME_RE.test(name) || !ALLOWED_EXT.test(name)){ toast("Jina si sahihi. Aina zinazoruhusiwa: html, css, js, json, txt, svg, md.", "err"); return; }
  if(name in ED.files){ toast("File hilo tayari lipo.", "err"); return; }
  ED.files[name] = "";
  ED.active = name;
  renderEditor(); bumpVersion();
}
function deleteEditorFile(){
  const p = ED.active;
  if(p === "index.html"){ toast("index.html haiwezi kufutwa.", "err"); return; }
  if(!confirm("Futa " + p + "?")) return;
  delete ED.files[p];
  ED.active = "index.html";
  renderEditor(); bumpVersion(); runPreview();
}
function schedulePreview(){
  ED.files[ED.active] = $("htmlEditor").value;
  bumpVersion();
  clearTimeout(ED.timer);
  ED.timer = setTimeout(runPreview, 700);
}

/* ---------- compose + preview ---------- */
function composeHtml(files, forPreview){
  let html = files["index.html"] || "";
  html = html.replace(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi, (tag) => {
    const m = tag.match(/href=["']?([^"'\s>]+)/i);
    if(!m) return tag;
    const p = normPath(m[1]);
    return p in files ? "<style>\n" + files[p] + "\n</style>" : tag;
  });
  html = html.replace(/<script\b([^>]*)\bsrc=["']?([^"'\s>]+)["']?([^>]*)>\s*<\/script>/gi, (tag, a, src, b) => {
    const p = normPath(src);
    return p in files ? "<script" + a + b + ">\n" + String(files[p]).replace(/<\/script/gi, "<\\/script") + "\n<\/script>" : tag;
  });
  if(forPreview){
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + PREVIEW_HOOK) : PREVIEW_HOOK + html;
  }
  return html;
}
function logConsole(msg){
  ED.console.push(msg);
  if(ED.console.length > 20) ED.console.shift();
  renderConsole();
}
function renderConsole(){
  const el = $("consoleOut");
  el.innerHTML = ED.console.length
    ? ED.console.map(m => `<div class="check-row">❌ ${escapeHtml(m)}</div>`).join("")
    : '<div class="hint">Hakuna hitilafu za runtime.</div>';
}
function runPreview(){
  clearTimeout(ED.timer);
  ED.console = []; renderConsole();
  $("previewFrame").srcdoc = composeHtml(ED.files, true);
  ED.gate.previewedVer = ED.ver;
  renderGate();
}
window.addEventListener("message", (e) => {
  const frame = $("previewFrame");
  if(!frame || e.source !== frame.contentWindow) return;
  const m = e.data && e.data.lnPreviewError;
  if(typeof m === "string") logConsole(m);
});
function togglePreviewFullscreen(){
  const box = $("previewBox");
  const on = box.classList.toggle("fullscreen");
  $("closePreviewButton").style.display = on ? "inline-flex" : "none";
}
function closePreviewFullscreen(){
  $("previewBox").classList.remove("fullscreen");
  $("closePreviewButton").style.display = "none";
}

/* ---------- save ---------- */
async function saveEditorCode(){
  if(ED.saving) return;
  if(!ED.projectId){ toast("Chagua project ili kuhifadhi. Bila project code haihifadhiwi.", "err"); return; }
  ED.files[ED.active] = $("htmlEditor").value;
  if(totalBytes(ED.files) > MAX_PROJECT_BYTES){ toast("Project ni kubwa mno (zaidi ya 500 KB).", "err"); return; }
  ED.saving = true;
  try{
    if(sbReady()){
      const err = await sbSaveFiles(ED.projectId, ED.files);
      if(err){
        writeDraft(ED.projectId, ED.files);
        toast("Server imekataa: " + sbErr(err) + ". Draft imehifadhiwa kwenye kivinjari.", "err");
        return;
      }
      clearDraft(ED.projectId);
      toast("Files zimehifadhiwa kwenye server.", "ok");
      setNote("Imehifadhiwa kwenye server.");
    } else {
      const ok = writeDraft(ED.projectId, ED.files);
      toast(ok ? "Supabase haijawekwa: imehifadhiwa kwenye kivinjari hiki tu." : "Imeshindikana kuhifadhi.", ok ? "ok" : "err");
      if(ok) setNote("Draft ya kivinjari hiki tu (server haijaunganishwa).");
    }
  } finally { ED.saving = false; }
}

/* ---------- inspect (static tests + security checks) ---------- */
function checkJs(code, name, add){
  if(/^\s*(import|export)\s/m.test(code)){ add("warn", name + ": ES module — syntax haikukaguliwa."); return; }
  try{ new Function(code); }catch(e){ add("fail", name + ": hitilafu ya syntax — " + e.message); }
}
function inspectProject(files){
  const res = [], add = (level, msg) => res.push({ level, msg });
  const html = files["index.html"];
  if(html === undefined) add("fail", "index.html haipo.");
  else{
    if(!/<!doctype html>/i.test(html)) add("warn", "Hakuna <!DOCTYPE html>.");
    if(!/<title>[^<]+<\/title>/i.test(html)) add("warn", "Hakuna <title>.");
    if(!/<meta[^>]+viewport/i.test(html)) add("warn", "Hakuna meta viewport (responsive).");
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("link[href],script[src],img[src]").forEach(el => {
      const ref = el.getAttribute("href") || el.getAttribute("src");
      if(!ref || /^(https?:|data:|\/\/|#|mailto:)/i.test(ref)) return;
      const p = normPath(ref);
      if(!(p in files)) add("fail", 'Faili "' + ref + '" limetajwa lakini halipo kwenye project.');
      else if(!/\.(css|js)$/i.test(p) && el.tagName !== "SCRIPT") add("warn", '"' + ref + '" haitaunganishwa kwenye deploy ya HTML moja (tumia data: URI).');
    });
    doc.querySelectorAll("script:not([src])").forEach((s, i) => checkJs(s.textContent, "script ya ndani #" + (i + 1), add));
  }
  for(const [p, c] of Object.entries(files)){
    if(/\.js$/i.test(p)) checkJs(c, p, add);
    if(/\.css$/i.test(p)){
      const o = (c.match(/{/g) || []).length, cl = (c.match(/}/g) || []).length;
      if(o !== cl) add("fail", p + ": mabano { } hayalingani (" + o + "/" + cl + ").");
    }
    if(/service_role|sb_secret_|sk_live_|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(c)) add("fail", p + ": inaonekana kuna siri (key/token) kwenye code.");
    for(const m of c.matchAll(/eyJ[\w-]{10,}\.([\w-]{10,})\.[\w-]{10,}/g)){
      try{ if(JSON.parse(atob(m[1].replace(/-/g, "+").replace(/_/g, "/"))).role === "service_role") add("fail", p + ": JWT ya service_role imepatikana."); }catch{}
    }
    if(/\.(js|html)$/i.test(p) && /\beval\s*\(|document\.write\s*\(/.test(c)) add("warn", p + ": inatumia eval/document.write.");
  }
  if(totalBytes(files) > MAX_PROJECT_BYTES) add("fail", "Project ni kubwa kuliko 500 KB.");
  if(!res.some(r => r.level === "fail")) add("pass", "Ukaguzi wa msingi umepita (build ya HTML moja + syntax + usalama wa msingi).");
  return res;
}
function clearInspect(){ $("inspectResults").innerHTML = '<div class="hint">Bonyeza Inspect kuendesha ukaguzi.</div>'; }
async function runInspect(){
  ED.files[ED.active] = $("htmlEditor").value;
  const res = inspectProject(ED.files);
  const icon = { pass: "✅", warn: "⚠️", fail: "❌" };
  $("inspectResults").innerHTML = res.map(r => `<div class="check-row">${icon[r.level]} ${escapeHtml(r.msg)}</div>`).join("");
  ED.gate.testedVer = ED.ver;
  ED.gate.passed = !res.some(r => r.level === "fail");
  ED.gate.testedHash = await fileHash();
  renderGate();
  toast(ED.gate.passed ? "Ukaguzi umepita." : "Ukaguzi umeshindwa — rekebisha makosa.", ED.gate.passed ? "ok" : "err");
}

/* ---------- approval gate ---------- */
function gateState(){
  const g = ED.gate;
  const tested = g.testedVer === ED.ver, previewed = g.previewedVer === ED.ver, approved = g.approvedVer === ED.ver;
  return { tested, passed: tested && g.passed, previewed, approved, ready: tested && g.passed && previewed && approved };
}
function renderGate(){
  const s = gateState();
  const el = $("gateStatus");
  if(!el) return;
  const row = (ok, fail, t) => `<div class="check-row">${ok ? "✅" : fail ? "❌" : "⏳"} ${t}</div>`;
  el.innerHTML =
    row(s.passed, s.tested && !s.passed, "Inspect: " + (s.tested ? (s.passed ? "imepita" : "imeshindwa") : "haijaendeshwa kwa version hii")) +
    row(s.previewed, false, "Preview: " + (s.previewed ? "imeendeshwa" : "inasubiri")) +
    row(s.approved, false, "Idhini ya mtumiaji: " + (s.approved ? "imetolewa" : "inasubiri")) +
    (ED.gate.testedHash && s.tested ? `<div class="hint" style="margin-top:6px">Version: ${escapeHtml(ED.gate.testedHash.slice(0, 8))}</div>` : "");
  const box = $("approveCheck");
  box.disabled = !(s.passed && s.previewed);
  box.checked = s.approved;
  $("deployButton").disabled = !s.ready;
}
async function onApproveChange(){
  const box = $("approveCheck"), s = gateState();
  if(box.checked && s.passed && s.previewed){
    ED.gate.approvedVer = ED.ver;
    ED.gate.approvedHash = await fileHash();
  } else { ED.gate.approvedVer = -1; ED.gate.approvedHash = ""; }
  renderGate();
}

/* ---------- ZIP export (store, bila dependency) ---------- */
const CRC_TABLE = (() => { const t = []; for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(bytes){ let c = 0xFFFFFFFF; for(let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function makeZip(files){
  const enc = new TextEncoder(), parts = [], central = [];
  const u16 = (n) => [n & 255, (n >> 8) & 255];
  const u32 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  let offset = 0;
  for(const [name, content] of Object.entries(files)){
    const nb = enc.encode(name), data = enc.encode(content), crc = crc32(data);
    const head = [0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nb.length), ...u16(0)];
    parts.push(new Uint8Array(head), nb, data);
    central.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nb.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), nb);
    offset += head.length + nb.length + data.length;
  }
  const cdSize = central.reduce((n, p) => n + p.length, 0), count = Object.keys(files).length;
  const end = new Uint8Array([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(count), ...u16(count), ...u32(cdSize), ...u32(offset), ...u16(0)]);
  return new Blob([...parts, ...central, end], { type: "application/zip" });
}
function exportZip(){
  ED.files[ED.active] = $("htmlEditor").value;
  const opt = $("editorProject").selectedOptions[0];
  const base = (opt && opt.dataset.slug) || "lucasnode-project";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(makeZip(ED.files));
  a.download = base + ".zip";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast("ZIP imetengenezwa.", "ok");
}

/* ---------- deploy (static HTML kupitia /api/tovuti) ---------- */
async function deployEditor(){
  const btn = $("deployButton");
  if(btn.disabled) return;
  btn.disabled = true;
  try{
    ED.files[ED.active] = $("htmlEditor").value;
    const s = gateState();
    if(!s.ready){ toast("Kamilisha Inspect, Preview na idhini kwa version hii.", "err"); return; }
    if(await fileHash() !== ED.gate.approvedHash){
      ED.gate.approvedVer = -1; ED.gate.approvedHash = ""; renderGate();
      toast("Code imebadilika baada ya idhini. Jaribu na ukubali tena.", "err"); return;
    }
    const slug = $("deploySlug").value.trim().toLowerCase();
    if(slug.length < 3 || slug.length > 40 || !SLUG_RE.test(slug)){ toast("Slug: herufi ndogo, namba na '-' (angalau 3).", "err"); return; }
    const opt = $("editorProject").selectedOptions[0];
    const name = (opt && opt.dataset.name) || slug;
    const html = composeHtml(ED.files, false);
    if(new Blob([html]).size > MAX_PROJECT_BYTES){ toast("HTML ni kubwa mno (zaidi ya 500 KB).", "err"); return; }
    const r = await apiRequest("POST", "/api/tovuti", { name, slug, html });
    if(r.ok && r.data?.success){
      toast("Imehifadhiwa kama tovuti /" + slug + ". LIVE haijathibitishwa.", "ok");
      refreshStats();
    } else toast(r.data?.error || "Deploy imeshindikana.", "err");
  } finally { renderGate(); }
}

/* ---------- events ---------- */
document.addEventListener("click", (e) => {
  const el = e.target.closest('[data-action="ed-tab"]');
  if(el) switchTab(el.dataset.path);
});
