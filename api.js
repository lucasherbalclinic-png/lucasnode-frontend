// LucasNode API Client — inaoendana na backend endpoint zote
class LucasNodeAPI {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem("lucasnode_access_token");
    this.refreshToken = localStorage.getItem("lucasnode_refresh_token");
  }

  // ─── Session ──────────────────────────────────────────
  saveSession(session) {
    if (session?.access_token) {
      this.token = session.access_token;
      localStorage.setItem("lucasnode_access_token", session.access_token);
    }
    if (session?.refresh_token) {
      this.refreshToken = session.refresh_token;
      localStorage.setItem("lucasnode_refresh_token", session.refresh_token);
    }
  }

  clearSession() {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem("lucasnode_access_token");
    localStorage.removeItem("lucasnode_refresh_token");
    localStorage.removeItem("lucasnode_user");
  }

  isLoggedIn() { return !!this.token; }

  getStoredUser() {
    try { return JSON.parse(localStorage.getItem("lucasnode_user")); }
    catch { return null; }
  }

  saveUser(user) {
    if (user) localStorage.setItem("lucasnode_user", JSON.stringify(user));
  }

  // ─── Core Request ──────────────────────────────────────
  async request(method, path, body = null) {
    const headers = { "Content-Type": "application/json" };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, options);
      const data = await res.json();

      // Auto-refresh on 401 (except auth routes)
      if (res.status === 401 && this.refreshToken && !path.includes("/idhini/")) {
        const refreshed = await this.refresh();
        if (refreshed) {
          headers["Authorization"] = `Bearer ${this.token}`;
          const retryRes = await fetch(`${this.baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : null });
          const retryData = await retryRes.json();
          return { success: retryRes.ok, status: retryRes.status, ...retryData };
        }
      }

      return { success: res.ok, status: res.status, ...data };
    } catch (err) {
      return { success: false, error: "Imeshindikana kuwasiliana na seva. Jaribu tena." };
    }
  }

  // ─── Auth (Idhini) ─────────────────────────────────────
  async register(email, password, displayName) {
    const body = { email, password };
    if (displayName) body.display_name = displayName;
    const result = await this.request("POST", "/api/idhini/jisajili", body);
    if (result.success && result.session) {
      this.saveSession(result.session);
      if (result.user) this.saveUser(result.user);
    }
    return result;
  }

  async login(email, password) {
    const result = await this.request("POST", "/api/idhini/kuingia", { email, password });
    if (result.success && result.session) {
      this.saveSession(result.session);
      if (result.user) this.saveUser(result.user);
    }
    return result;
  }

  async refresh() {
    if (!this.refreshToken) return false;
    const result = await this.request("POST", "/api/idhini/upya", { refresh_token: this.refreshToken });
    if (result.success && result.session) {
      this.saveSession(result.session);
      return true;
    }
    this.clearSession();
    return false;
  }

  async me() {
    return await this.request("GET", "/api/idhini/mimi");
  }

  async logout() {
    const result = await this.request("POST", "/api/idhini/toka");
    this.clearSession();
    return result;
  }

  // ─── Profile (Wasifu) ──────────────────────────────────
  async getProfile()      { return await this.request("GET", "/api/v1/me"); }
  async updateProfile(d)  { return await this.request("PATCH", "/api/v1/me", d); }
  async getStats()        { return await this.request("GET", "/api/v1/me/stats"); }

  // ─── Websites (Tovuti) ─────────────────────────────────
  async getWebsites()         { return await this.request("GET", "/api/v1/websites"); }
  async getWebsite(id)        { return await this.request("GET", `/api/v1/websites/${id}`); }
  async createWebsite(d)      { return await this.request("POST", "/api/v1/websites", d); }
  async updateWebsite(id, d)  { return await this.request("PATCH", `/api/v1/websites/${id}`, d); }
  async deleteWebsite(id)     { return await this.request("DELETE", `/api/v1/websites/${id}`); }

  // ─── Domains (Domeini) ─────────────────────────────────
  async getDomains()          { return await this.request("GET", "/api/v1/domains"); }
  async getDomain(id)         { return await this.request("GET", `/api/v1/domains/${id}`); }
  async createDomain(d)       { return await this.request("POST", "/api/v1/domains", d); }
  async updateDomain(id, d)   { return await this.request("PATCH", `/api/v1/domains/${id}`, d); }
  async deleteDomain(id)      { return await this.request("DELETE", `/api/v1/domains/${id}`); }
  async checkDomain(domain)   { return await this.request("GET", `/api/domains/check?domain=${encodeURIComponent(domain)}`); }

  // ─── Projects (Miradi) ────────────────────────────────
  async getProjects()         { return await this.request("GET", "/api/v1/projects"); }
  async getProject(id)        { return await this.request("GET", `/api/v1/projects/${id}`); }
  async createProject(d)      { return await this.request("POST", "/api/v1/projects", d); }
  async updateProject(id, d)  { return await this.request("PATCH", `/api/v1/projects/${id}`, d); }
  async deleteProject(id)     { return await this.request("DELETE", `/api/v1/projects/${id}`); }

  // ─── Deployments (Uwekaji) ─────────────────────────────
  async getDeployments()      { return await this.request("GET", "/api/v1/deployments"); }
  async getDeployment(id)     { return await this.request("GET", `/api/v1/deployments/${id}`); }

  // ─── Hosted Sites (Tovuti za Kuhosti) ──────────────────
  async getTovuti()           { return await this.request("GET", "/api/tovuti"); }
  async createTovuti(d)       { return await this.request("POST", "/api/tovuti", d); }

  // ─── Health (Afya) ─────────────────────────────────────
  async health()              { return await this.request("GET", "/api/health"); }
  async ready()               { return await this.request("GET", "/api/ready"); }
}
