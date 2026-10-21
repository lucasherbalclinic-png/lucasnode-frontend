mkdir -p /home/claude/build2 && cd /home/claude/build2 && cat > app.js <<'EOF'
"use strict";
/* ===== Config (anon key pekee — usiweke service_role hapa) ===== */
const SUPABASE_URL = "https://vrpmntqwanoxokjjllgr.supabase.co";
const SUPABASE_ANON_KEY = "PASTE_ANON_KEY_HERE";
const API_BASE = "https://lucasnode-backend.lucasherbalclinic.workers.dev";
const REQUEST_TIMEOUT_MS = 15000;

let sb = null, initError = null, appStarted = false, authMode = "login", ghRequestId = 0;
const state = { session: null, user: null, projects: [], ghPath: "", ghOwner: "", ghRepo: "", ghBranch: "main" };
const counts = { projects: 0, domains: 0, deployments: 0, tovuti: 0 };

/* ---------- helpers ---------- */
const $ = (id) => document.getElementById(id);
const uid = () => state.session?.user?.id || null;
const isLoggedIn = () => !!state.session;
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
function toast(msg, kind){
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast show" + (kind === "ok" ? " ok" : kind === "err" ? " err" : "");
  clearTimeout(t._tm);
  t._tm = setTimeout(() => { t.className = "toast"; }, 3600);
}
function errMsg(e, fb){
  if(!e) return fb;
  if(e.code === "23505") return "Thamani hii tayari ipo (slug au domain inatumika).";
  if(e.code === "23514") return "Thamani si sahihi.";
  if(e.code === "42501" || /permission denied|row-level security/i.test(e.message || "")) return "Huna ruhusa ya kufanya kitendo hiki.";
  return e.message || fb;
}
async function withBusy(e, fn){
  const btn = e?.submitter || e?.target?.querySelector?.('[type="submit"]');
  if(btn){ if(btn.disabled) return; btn.disabled = true; }
  try{ await fn(); } finally { if(btn) btn.disabled = false; }
}
function slugify(s){
  const v = String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/g, "");
  return v.length >= 3 ? v : "project-" + Math.random().toString(36).slice(2, 6);
}
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/;

/* ---------- Supabase client ---------- */
function keyIsUnsafe(k){
  if(/^sb_secret_/.test(k)) return true;
  try{
    const p = JSON.parse(atob(k.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return p.role === "service_role";
  }catch{ return false; }
}
function initClient(){
  if(!window.supabase?.createClient) return "Maktaba ya Supabase haikupakiwa.";
  if(!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.startsWith("PASTE_")) return "Weka anon key kwenye app.js.";
  if(keyIsUnsafe(SUPABASE_ANON_KEY)) return "Key hii ni ya siri (service_role). Tumia anon key pekee.";
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
  return null;
}
function updateAvatar(){
  const a = $("avatarBtn");
  if(a) a.textContent = (state.user?.email?.[0] || "L").toUpperCase();
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
function submitAuth(e){
  e.preventDefault();
  return withBusy(e, async () => {
    if(!sb){ toast(initError || "Mfumo haujawekwa vizuri.", "err"); return; }
    const email = $("authEmail").value.trim().toLowerCase();
    const password = $("authPassword").value;
    if(!email || !password){ toast("Jaza barua pepe na nenosiri.", "err"); return; }
    if(authMode === "register"){
      if(password.length < 10){ toast("Nenosiri liwe na angalau herufi 10.", "err"); return; }
      const full_name = $("authName").value.trim();
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name } } });
      if(error){ toast(errMsg(error, "Usajili umeshindikana."), "err"); return; }
      if(data.session) toast("Akaunti imetengenezwa. Karibu!", "ok");
      else { toast("Akaunti imetengenezwa. Angalia barua pepe kuthibitisha, kisha ingia.", "ok"); setAuthTab("login"); }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if(error){ toast("Barua pepe au nenosiri si sahihi.", "err"); return; }
      $("authPassword").value = "";
      toast("Karibu!", "ok");
    }
  });
}
async function logout(){
  if(sb) await sb.auth.signOut();
  state.session = null; state.user = null; updateAvatar(); showAuthGate();
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
  else if(name === "support") loadTickets();
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

/* ---------- list rendering ---------- */
function fillList(container, emptyEl, items, render){
  if(!items.length){ container.style.display = "none"; container.innerHTML = ""; emptyEl.style.display = "block"; return; }
  container.style.display = "grid"; emptyEl.style.display = "none";
  container.innerHTML = items.map(render).join("");
}
const metaDiv = (t) => `<div class="project-meta">${t}</div>`;
function card(icon, title, meta, action = ""){
  return `<div class="project-card"><div class="project-main"><div class="project-icon">${icon}</div><div><div class="project-name">${escapeHtml(title)}</div>${meta}</div></div>${action}</div>`;
}

/* ---------- stats ---------- */
function renderStats(){
  $("statProjects").textContent = counts.projects;
  $("statDomains").textContent = counts.domains;
  $("statDeployments").textContent = counts.deployments;
  $("statLive").textContent = counts.tovuti;
}
async function refreshStats(){
  const c = (t) => sb.from(t).select("id", { count: "exact", head: true });
  const [p, d, dep, t] = await Promise.all([c("projects"), c("domains"), c("deployments"), c("hosted_sites")]);
  counts.projects = p.count || 0; counts.domains = d.count || 0;
  counts.deployments = dep.count || 0; counts.tovuti = t.count || 0;
  renderStats();
}

/* ---------- projects ---------- */
async function loadProjects(){
  const { data, error } = await sb.from("projects")
    .select("id,name,slug,framework,repository_url,repository_branch,created_at")
    .order("created_at", { ascending: false });
  if(error){ toast(errMsg(error, "Imeshindikana kusoma projects."), "err"); return; }
  state.projects = data || [];
  counts.projects = state.projects.length; renderStats();
  const render = (p) => {
    const repo = p.repository_url
      ? metaDiv(`🔗 ${escapeHtml(p.repository_url)}${p.repository_branch ? " · " + escapeHtml(p.repository_branch) : ""}`) : "";
    const meta = metaDiv(`${escapeHtml(p.slug || p.name || "")} ${p.framework ? "· " + escapeHtml(p.framework) : ""}`) + repo;
    return card("📁", p.name || "", meta, `<button class="del-btn" data-action="delete-project" data-id="${escapeHtml(p.id)}" aria-label="Futa">🗑</button>`);
  };
  fillList($("homeProjects"), $("homeEmpty"), state.projects, render);
  fillList($("projectsList"), $("projectsEmpty"), state.projects, render);
}
function createProject(e){
  e.preventDefault();
  return withBusy(e, async () => {
    const v = (id) => $(id).value.trim() || null;
    const name = $("projName").value.trim();
    if(!name){ toast("Jina la project linahitajika.", "err"); return; }
    let slug = $("projSlug").value.trim().toLowerCase();
    if(slug && (slug.length < 3 || !SLUG_RE.test(slug))){ toast("Slug: herufi ndogo, namba na '-' (angalau 3).", "err"); return; }
    if(!slug) slug = slugify(name);
    const row = { user_id: uid(), name, slug, description: v("projDesc"), framework: v("projFramework"),
      repository_url: v("projRepo"), repository_branch: v("projBranch") };
    const { error } = await sb.from("projects").insert(row);
    if(error){ toast(errMsg(error, "Imeshindikana kuunda project."), "err"); return; }
    toast("Project imeundwa!", "ok"); closeModal("modalProject"); e.target.reset(); loadProjects();
  });
}
async function deleteProject(id){
  if(!confirm("Futa project hii?")) return;
  const { data, error } = await sb.from("projects").delete().eq("id", id).select("id");
  if(error) toast(errMsg(error, "Imeshindikana kufuta."), "err");
  else if(!data?.length) toast("Project haikufutwa.", "err");
  else toast("Project imefutwa.", "ok");
  loadProjects();
}

/* ---------- domains ---------- */
async function loadDomains(){
  const { data, error } = await sb.from("domains")
    .select("id,domain,domain_type,status,ssl_status,dns_status")
    .order("created_at", { ascending: false });
  if(error){ toast(errMsg(error, "Imeshindikana kusoma domains."), "err"); return; }
  const list = data || [];
  counts.domains = list.length; renderStats();
  fillList($("domainsList"), $("domainsEmpty"), list, d => card("🌐", d.domain || "",
    metaDiv(`${escapeHtml(d.status || "—")} · SSL ${escapeHtml(d.ssl_status || "—")} · DNS ${escapeHtml(d.dns_status || "—")}`),
    `<button class="del-btn" data-action="delete-domain" data-id="${escapeHtml(d.id)}" aria-label="Futa">🗑</button>`));
}
async function deleteDomain(id){
  if(!confirm("Futa domain hii?")) return;
  const { data, error } = await sb.from("domains").delete().eq("id", id).select("id");
  if(error) toast(errMsg(error, "Imeshindikana kufuta."), "err");
  else if(!data?.length) toast("Domain haikufutwa.", "err");
  else toast("Domain imefutwa.", "ok");
  loadDomains();
}
async function checkDomain(inputId, outId, withName){
  const domain = ($(inputId).value || "").trim().toLowerCase();
  const out = $(outId);
  if(!DOMAIN_RE.test(domain)){ toast("Weka domain sahihi (mfano: example.com).", "err"); return; }
  out.textContent = "Inatafuta...";
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try{
    const res = await fetch(API_BASE + "/api/domains/check?domain=" + encodeURIComponent(domain), {
      headers: { Authorization: "Bearer " + (state.session?.access_token || "") }, signal: ctrl.signal
    });
    const d = await res.json().catch(() => null);
    if(res.ok && d?.success){
      const name = withName ? ` <b>${escapeHtml(domain)}</b>` : "";
      out.innerHTML = d.registered
        ? `✅${name} imekwisha sajiliwa${d.source ? " (" + escapeHtml(d.source) + ")" : ""}.`
        : `🟢${name} inapatikana!`;
    } else out.textContent = d?.error || "Imeshindikana.";
  }catch{ out.textContent = "Imeshindikana kuunganisha na huduma ya domain."; }
  finally{ clearTimeout(tm); }
}
const searchDomain = () => checkDomain("domainSearchInput", "domainSearchResult", true);
const checkDomainInModal = () => checkDomain("domainInput", "domainCheckResult", false);
function addDomain(e){
  e.preventDefault();
  return withBusy(e, async () => {
    const domain = ($("domainInput").value || "").trim().toLowerCase();
    if(!DOMAIN_RE.test(domain)){ toast("Weka domain sahihi (mfano: example.com).", "err"); return; }
    const { error } = await sb.from("domains").insert({ user_id: uid(), domain, domain_type: "custom" });
    if(error){ toast(errMsg(error, "Imeshindikana kuhifadhi domain."), "err"); return; }
    toast("Domain imehifadhiwa!", "ok"); closeModal("modalDomain"); e.target.reset();
    $("domainCheckResult").textContent = ""; loadDomains();
  });
}

/* ---------- tovuti (hosted_sites) ---------- */
const MAX_APP_BYTES = 500 * 1024;
function validateSite({ name, slug, html }){
  if(!name){ toast("Weka jina.", "err"); return false; }
  if(slug.length < 3 || slug.length > 40 || !SLUG_RE.test(slug)){ toast("Slug: herufi ndogo, namba na '-' (angalau 3).", "err"); return false; }
  if(!html.trim()){ toast("Weka HTML code.", "err"); return false; }
  if(!/<html|<body/i.test(html)){ toast("HTML lazima iwe na <html> au <body>.", "err"); return false; }
  if(new Blob([html]).size > MAX_APP_BYTES){ toast("HTML ni kubwa mno (zaidi ya 500 KB).", "err"); return false; }
  return true;
}
async function saveSite({ name, slug, html }){
  const { error } = await sb.from("hosted_sites").insert({ user_id: uid(), name, slug, html });
  if(error?.code !== "23505") return { error };
  const { data, error: e2 } = await sb.from("hosted_sites").update({ name, html })
    .eq("slug", slug).eq("user_id", uid()).select("id");
  if(e2) return { error: e2 };
  if(!data?.length) return { error: { message: "Slug hii tayari inatumika." } };
  return { updated: true };
}
async function loadTovuti(){
  const { data, error } = await sb.from("hosted_sites").select("id,name,slug,created_at")
    .order("created_at", { ascending: false });
  if(error){ toast(errMsg(error, "Imeshindikana kusoma tovuti."), "err"); return; }
  const list = data || [];
  counts.tovuti = list.length; renderStats();
  fillList($("tovutiList"), $("tovutiEmpty"), list,
    s => card("🌍", s.name || "", metaDiv(`/${escapeHtml(s.slug || "")} · ${escapeHtml(fmtDate(s.created_at))}`)));
}
function createTovuti(e){
  e.preventDefault();
  return withBusy(e, async () => {
    const site = { name: $("tovutiName").value.trim(), slug: $("tovutiSlug").value.trim().toLowerCase(), html: $("tovutiHtml").value };
    if(!validateSite(site)) return;
    const r = await saveSite(site);
    if(r.error){ toast(errMsg(r.error, "Imeshindikana kuhifadhi tovuti."), "err"); return; }
    toast(r.updated ? "Tovuti imesasishwa!" : "Tovuti imehifadhiwa!", "ok");
    closeModal("modalTovuti"); e.target.reset(); loadTovuti();
  });
}

/* ---------- deployments (soma tu) ---------- */
async function loadDeployProjects(){
  const { data } = await sb.from("projects").select("id,name").order("created_at", { ascending: false });
  state.projects = data || state.projects;
  $("deployProject").innerHTML = '<option value="">Chagua project</option>' +
    state.projects.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join("");
  loadDeployHistory();
}
async function loadDeployHistory(){
  const { data, error } = await sb.from("deployments").select("id,project_id,version,status,created_at")
    .order("created_at", { ascending: false }).limit(50);
  if(error){ toast(errMsg(error, "Imeshindikana kusoma deployments."), "err"); return; }
  const list = data || [];
  counts.deployments = list.length; renderStats();
  const names = Object.fromEntries(state.projects.map(p => [p.id, p.name]));
  fillList($("deployHistoryList"), $("deployHistoryEmpty"), list,
    d => card("🚀", names[d.project_id] || "Deployment",
      metaDiv(`v${escapeHtml(d.version ?? "")} · ${escapeHtml(d.status || "")} · ${escapeHtml(fmtDate(d.created_at))}`)));
}
function startDeployment(e){
  e.preventDefault();
  if(!$("deployProject").value){ toast("Chagua project kwanza.", "err"); return; }
  toast("Deployment engine haijaunganishwa bado.", "err");
}

/* ---------- monitoring ---------- */
async function checkBackend(){
  const el = $("healthResult");
  if(el) el.textContent = "Inakagua...";
  const { error } = await sb.from("plans").select("id", { head: true, count: "exact" });
  let worker = "—";
  try{
    const r = await fetch(API_BASE + "/api/afya");
    const d = await r.json().catch(() => null);
    worker = (r.ok && d?.success) ? "✅" : "❌";
  }catch{ worker = "❌"; }
  if(el) el.innerHTML = `Supabase: ${error ? "❌ " + escapeHtml(errMsg(error, "")) : "✅ <b>Hai</b>"}<br>Worker API: ${worker}`;
  if(error) toast("Supabase haipatikani.", "err");
}

/* ---------- profile ---------- */
async function loadProfile(){
  if(!isLoggedIn()) return;
  const { data, error } = await sb.from("profiles").select("full_name,phone,country").eq("id", uid()).maybeSingle();
  if(error){ $("profileInfo").textContent = errMsg(error, "Imeshindikana kusoma wasifu."); return; }
  const p = data || {};
  $("profileInfo").innerHTML = `📧 ${escapeHtml(state.user?.email || "-")}<br>👤 ${escapeHtml(p.full_name || "-")}<br>📱 ${escapeHtml(p.phone || "-")}<br>🌍 ${escapeHtml(p.country || "-")}`;
}

/* ---------- support tickets ---------- */
async function loadTickets(){
  const el = $("ticketsList");
  const { data, error } = await sb.from("support_tickets").select("id,subject,status,priority,created_at")
    .order("created_at", { ascending: false }).limit(50);
  if(error){ toast(errMsg(error, "Imeshindikana kusoma tickets."), "err"); return; }
  const list = data || [];
  if(!list.length){
    el.className = "empty"; el.style.display = "";
    el.innerHTML = '<div class="empty-icon">🎫</div><h3>Hakuna support ticket</h3><p>Tickets zako zitaonekana hapa.</p>';
    return;
  }
  el.className = "project-list"; el.style.display = "grid";
  el.innerHTML = list.map(t => card("🎫", t.subject,
    metaDiv(`${escapeHtml(t.status || "")} · ${escapeHtml(fmtDate(t.created_at))}`))).join("");
}
function createTicket(e){
  e.preventDefault();
  return withBusy(e, async () => {
    const subject = $("ticketSubject").value.trim(), description = $("ticketMessage").value.trim();
    if(!subject || !description){ toast("Jaza sehemu zote.", "err"); return; }
    const { error } = await sb.from("support_tickets").insert({ user_id: uid(), subject, description, priority: "normal" });
    if(error){ toast(errMsg(error, "Imeshindikana kutuma ticket."), "err"); return; }
    toast("Ticket imetumwa!", "ok"); closeModal("modalSupport"); e.target.reset(); loadTickets();
  });
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

/* ---------- HTML app: preview + deploy ---------- */
function previewApp(){
  const html = $("appHtml").value;
  if(!html.trim()){ toast("Weka HTML code.", "err"); return; }
  $("appPreview").srcdoc = html;
  $("appPreview").scrollIntoView({ behavior: "smooth", block: "start" });
}
function deployApp(e){
  e.preventDefault();
  return withBusy(e, async () => {
    const site = { name: $("appName").value.trim(), slug: $("appSlug").value.trim().toLowerCase(), html: $("appHtml").value };
    if(!validateSite(site)) return;
    $("appPreview").srcdoc = site.html;
    const r = await saveSite(site);
    if(r.error){ toast(errMsg(r.error, "Imeshindikana kuhifadhi tovuti."), "err"); return; }
    toast((r.updated ? "Imesasishwa" : "Imehifadhiwa") + " kama tovuti /" + site.slug + ".", "ok");
    refreshStats();
  });
}

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
  refreshStats();
  showPage("home");
}
function bootstrap(){
  initError = initClient();
  if(initError){ showAuthGate(); toast(initError, "err"); return; }
  sb.auth.onAuthStateChange((event, session) => {
    state.session = session; state.user = session?.user || null; updateAvatar();
    if(!session){ appStarted = false; showAuthGate(); return; }
    if(!appStarted){ appStarted = true; setTimeout(initApp, 0); }
  });
}
bootstrap();
EOF
node --check app.js && echo JS_OK
python3 - <<'EOF'
import re
h=open('/home/claude/build/index.html',encoding='utf-8').read()
j=open('/home/claude/build2/app.js',encoding='utf-8').read()
ids=set(re.findall(r'id="([^"]+)"',h))
print("MISSING IDS:",sorted(i for i in set(re.findall(r'\$\("([^"]+)"\)',j)) if i not in ids))
calls=set(re.findall(r'on(?:click|submit)="([A-Za-z_]+)\(',h))
funcs=set(re.findall(r'(?:function|const)\s+([A-Za-z_]+)',j))
print("UNDEFINED:",sorted(c for c in calls if c not in funcs and c not in('toast','event')))
print("leftover apiRequest:", 'apiRequest' in j)
h=h.replace('<script src="app.js?v=1"></script>','<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>\n<script src="app.js?v=2"></script>')
h=h.replace('Backend: lucasnode-backend • Supabase Auth','Supabase Auth')
open('/home/claude/build2/index.html','w',encoding='utf-8').write(h)
print(h.count('supabase-js@2.45.4'), h.count('app.js?v=2'))
EOF
cp -f index.html app.js /mnt/user-data/outputs/ && ls -la /mnt/user-data/outputs | head -20
