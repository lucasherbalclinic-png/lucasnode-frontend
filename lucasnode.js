/* =========================================================
   LUCASNODE — AUTHENTICATION MODULE
   Login • Register • Session • Refresh • Logout
   Cloudflare Worker + Supabase Auth

   SECURITY:
   - No service-role key in frontend.
   - Never store passwords in localStorage.
   - Use HTTPS for API communication.
   - Backend must validate every protected request.
========================================================= */

(function () {
  "use strict";

  const API_ORIGIN = "https://api.lucasnode.com";
  const SESSION_KEY = "lucasnode_session";

  const AUTH_ENDPOINTS = {
    login: "/api/idhini/kuingia",
    register: "/api/idhini/jisajili",
    logout: "/api/idhini/toka",
    refresh: "/api/idhini/upya",
    me: "/api/idhini/mimi"
  };

  let authMode = "login";
  let refreshPromise = null;
  let authInitialized = false;

  const $ = id => document.getElementById(id);

  /* =======================================================
     SESSION MANAGEMENT
  ======================================================= */

  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;

      const session = JSON.parse(raw);

      if (
        !session ||
        typeof session.access_token !== "string" ||
        !session.access_token
      ) {
        clearSession();
        return null;
      }

      return session;
    } catch {
      clearSession();
      return null;
    }
  }

  function saveSession(session, user) {
    if (!session || !session.access_token) {
      return false;
    }

    const previous = readSession() || {};

    const expiresAt =
      Number(session.expires_at) ||
      Math.floor(Date.now() / 1000) +
        (Number(session.expires_in) || 3600);

    const record = {
      access_token: session.access_token,
      refresh_token:
        session.refresh_token || previous.refresh_token || null,
      expires_at: expiresAt,
      email: user?.email || previous.email || ""
    };

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(record));
      return true;
    } catch (error) {
      console.error("LucasNode session storage error:", error);
      return false;
    }
  }

  function clearSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.error("LucasNode session cleanup error:", error);
    }
  }

  function sessionIsExpired(session) {
    if (!session || !session.access_token) return true;

    return (
      Number(session.expires_at || 0) <=
      Math.floor(Date.now() / 1000)
    );
  }

  /* =======================================================
     AUTH API REQUEST
  ======================================================= */

  async function publicAuthRequest(endpoint, body) {
    const response = await fetch(API_ORIGIN + endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      credentials: "omit",
      cache: "no-store",
      body: JSON.stringify(body)
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      // The server may return a non-JSON response.
    }

    if (!response.ok) {
      const error = new Error(
        data.error ||
        data.message ||
        "Ombi la akaunti limeshindwa."
      );

      error.status = response.status;
      throw error;
    }

    return data;
  }

  /* =======================================================
     REFRESH SESSION
     Requires a real refresh endpoint in the Worker.
  ======================================================= */

  async function refreshSession() {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async function () {
      const session = readSession();

      if (!session || !session.refresh_token) {
        return false;
      }

      try {
        const data = await publicAuthRequest(
          AUTH_ENDPOINTS.refresh,
          { refresh_token: session.refresh_token }
        );

        const updatedSession =
          data.session ||
          data.data?.session ||
          null;

        const user =
          data.user ||
          data.data?.user ||
          null;

        return saveSession(updatedSession, user);
      } catch (error) {
        console.error("LucasNode refresh failed:", error);
        return false;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  /* =======================================================
     ACCESS TOKEN
  ======================================================= */

  async function getAccessToken() {
    let session = readSession();

    if (!session) return null;

    const expiresAt = Number(session.expires_at || 0);
    const now = Math.floor(Date.now() / 1000);

    if (expiresAt && expiresAt - now < 60) {
      const refreshed = await refreshSession();

      if (!refreshed) {
        clearSession();
        return null;
      }

      session = readSession();
    }

    if (sessionIsExpired(session)) {
      clearSession();
      return null;
    }

    return session.access_token;
  }

  /* =======================================================
     PROTECTED API HELPER
  ======================================================= */

  async function authenticatedRequest(path, options = {}) {
    let token = await getAccessToken();

    if (!token) {
      return {
        ok: false,
        status: 401,
        data: { error: "Tafadhali ingia kwenye akaunti yako." }
      };
    }

    async function send(accessToken) {
      const headers = {
        Accept: "application/json",
        Authorization: "Bearer " + accessToken
      };

      const config = {
        method: options.method || "GET",
        headers,
        credentials: "omit",
        cache: "no-store"
      };

      if (options.body !== undefined) {
        headers["Content-Type"] = "application/json";
        config.body = JSON.stringify(options.body);
      }

      const response = await fetch(API_ORIGIN + path, config);

      let data = {};

      try {
        data = await response.json();
      } catch {
        // Ignore non-JSON responses.
      }

      return {
        ok: response.ok,
        status: response.status,
        data
      };
    }

    try {
      let result = await send(token);

      if (result.status === 401) {
        const refreshed = await refreshSession();

        if (refreshed) {
          const session = readSession();

          if (session?.access_token) {
            result = await send(session.access_token);
          }
        }
      }

      if (result.status === 401) {
        clearSession();
        updateLoginUI(false);
      }

      return result;
    } catch (error) {
      console.error("LucasNode API request failed:", error);

      return {
        ok: false,
        status: 0,
        data: {
          error: "API haipatikani. Angalia intaneti na ujaribu tena."
        }
      };
    }
  }

  /* =======================================================
     AUTH MODAL
  ======================================================= */

  function ensureAuthModal() {
    if ($("authModal")) return;

    const wrapper = document.createElement("div");

    wrapper.id = "authModal";
    wrapper.className = "modal-wrap";
    wrapper.setAttribute("role", "dialog");
    wrapper.setAttribute("aria-modal", "true");
    wrapper.setAttribute("aria-labelledby", "authTitle");

    wrapper.innerHTML = `
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title" id="authTitle">Ingia LucasNode</div>
          <button
            class="close"
            type="button"
            id="authClose"
            aria-label="Funga"
          >×</button>
        </div>

        <div class="modal-body">
          <form class="form" id="authForm" novalidate>

            <div class="field" id="authNameField" hidden>
              <label for="authName">Jina kamili</label>
              <input
                class="input"
                id="authName"
                name="name"
                type="text"
                maxlength="100"
                autocomplete="name"
              >
            </div>

            <div class="field">
              <label for="authEmail">Barua pepe</label>
              <input
                class="input"
                id="authEmail"
                name="email"
                type="email"
                maxlength="254"
                autocomplete="email"
                required
              >
            </div>

            <div class="field">
              <label for="authPassword">Nenosiri</label>
              <input
                class="input"
                id="authPassword"
                name="password"
                type="password"
                minlength="10"
                maxlength="128"
                autocomplete="current-password"
                required
              >
              <div class="hint" id="authHint">
                Weka nenosiri lako.
              </div>
            </div>

            <div
              class="hint"
              id="authError"
              role="alert"
              aria-live="polite"
            ></div>

            <button
              class="btn btn-primary btn-full"
              type="submit"
              id="authSubmit"
            >Ingia</button>

            <button
              class="btn btn-secondary btn-full"
              type="button"
              id="authToggle"
            >Huna akaunti? Jisajili</button>

          </form>
        </div>
      </div>
    `;

    document.body.appendChild(wrapper);

    $("authClose").addEventListener("click", closeAuthModal);

    $("authToggle").addEventListener("click", function () {
      setAuthMode(authMode === "login" ? "register" : "login");
    });

    $("authForm").addEventListener("submit", submitAuth);

    wrapper.addEventListener("click", function (event) {
      if (event.target === wrapper) closeAuthModal();
    });
  }

  function setAuthMode(mode) {
    authMode = mode === "register" ? "register" : "login";

    const registering = authMode === "register";

    $("authTitle").textContent =
      registering ? "Tengeneza akaunti ya LucasNode" : "Ingia LucasNode";

    $("authSubmit").textContent =
      registering ? "Jisajili" : "Ingia";

    $("authToggle").textContent =
      registering ? "Una akaunti? Ingia" : "Huna akaunti? Jisajili";

    $("authNameField").hidden = !registering;

    $("authPassword").setAttribute(
      "autocomplete",
      registering ? "new-password" : "current-password"
    );

    $("authPassword").minLength = registering ? 10 : 1;

    $("authHint").textContent = registering
      ? "Tumia nenosiri lenye angalau herufi 10."
      : "Weka nenosiri lako.";

    $("authError").textContent = "";
  }

  function openAuthModal(mode = "login") {
    ensureAuthModal();
    setAuthMode(mode);

    $("authModal").classList.add("show");

    setTimeout(function () {
      const input = $("authEmail");
      if (input) input.focus();
    }, 50);
  }

  function closeAuthModal() {
    const modal = $("authModal");
    if (modal) modal.classList.remove("show");
  }

  /* =======================================================
     LOGIN / REGISTER SUBMISSION
  ======================================================= */

  async function submitAuth(event) {
    event.preventDefault();

    const email = $("authEmail").value.trim().toLowerCase();
    const password = $("authPassword").value;
    const name = $("authName").value.trim();
    const registering = authMode === "register";
    const button = $("authSubmit");
    const error = $("authError");

    error.textContent = "";
    error.style.color = "#fecaca";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      error.textContent = "Weka barua pepe sahihi.";
      $("authEmail").focus();
      return;
    }

    if (!password) {
      error.textContent = "Weka nenosiri.";
      $("authPassword").focus();
      return;
    }

    if (registering && password.length < 10) {
      error.textContent =
        "Nenosiri lazima liwe na angalau herufi 10.";
      $("authPassword").focus();
      return;
    }

    if (registering && name.length > 100) {
      error.textContent = "Jina ni refu sana.";
      return;
    }

    button.disabled = true;
    button.textContent = registering
      ? "Inatengeneza akaunti..."
      : "Inaingia...";

    try {
      const body = { email, password };

      if (registering && name) {
        body.display_name = name;
      }

      const data = await publicAuthRequest(
        registering ? AUTH_ENDPOINTS.register : AUTH_ENDPOINTS.login,
        body
      );

      const session =
        data.session ||
        data.data?.session ||
        null;

      const user =
        data.user ||
        data.data?.user ||
        null;

      if (session && session.access_token) {
        const stored = saveSession(session, user);

        if (!stored) {
          throw new Error(
            "Session haijahifadhiwa. Hakikisha kivinjari kinaruhusu storage."
          );
        }

        $("authPassword").value = "";
        closeAuthModal();
        updateLoginUI(true);

        if (typeof window.loadDashboard === "function") {
          await window.loadDashboard();
        }

        showMessage(
          registering
            ? "Akaunti imetengenezwa na umeingia ✓"
            : "Umeingia kwenye LucasNode ✓"
        );

        return;
      }

      /*
       * Some Supabase projects require email verification.
       * Do not invent a session when the server did not return one.
       */
      $("authPassword").value = "";

      if (registering) {
        setAuthMode("login");
        error.style.color = "#bbf7d0";
        error.textContent =
          data.message ||
          "Usajili umepokelewa. Ikiwa uthibitisho wa barua pepe unahitajika, angalia inbox yako kisha ingia.";
      } else {
        error.textContent =
          "Login haikurudisha session halali. Hakikisha response ya backend iko sahihi.";
      }
    } catch (err) {
      console.error("LucasNode authentication error:", err);

      error.textContent =
        err.message || "Imeshindikana. Jaribu tena.";
    } finally {
      button.disabled = false;
      button.textContent =
        registering ? "Jisajili" : "Ingia";
    }
  }

  /* =======================================================
     LOGOUT
  ======================================================= */

  async function logout() {
    if (!readSession()) {
      openAuthModal("login");
      return;
    }

    if (!window.confirm("Unataka kutoka kwenye akaunti yako?")) {
      return;
    }

    const session = readSession();

    try {
      await fetch(API_ORIGIN + AUTH_ENDPOINTS.logout, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer " + session.access_token
        },
        credentials: "omit",
        cache: "no-store"
      });
    } catch (error) {
      console.error("LucasNode logout request failed:", error);
    }

    clearSession();
    updateLoginUI(false);

    if (typeof window.loadDashboard === "function") {
      await window.loadDashboard();
    }

    openAuthModal("login");
    showMessage("Umetoka kwenye akaunti.");
  }

  /* =======================================================
     LOGIN STATUS & AVATAR
  ======================================================= */

  function updateLoginUI(loggedIn) {
    const avatar = document.querySelector(".avatar");

    if (avatar) {
      const session = readSession();

      avatar.textContent =
        loggedIn && session?.email
          ? session.email.charAt(0).toUpperCase()
          : "L";

      avatar.setAttribute(
        "aria-label",
        loggedIn ? "Toka kwenye akaunti" : "Ingia kwenye akaunti"
      );
      avatar.title = loggedIn
        ? "Bonyeza kutoka kwenye akaunti"
        : "Bonyeza kuingia";
    }
  }

  function showMessage(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
    } else {
      console.info("LucasNode:", message);
    }
  }

  /* =======================================================
     VERIFY CURRENT SESSION
  ======================================================= */

  async function verifySession() {
    const session = readSession();

    if (!session) {
      updateLoginUI(false);
      openAuthModal("login");
      return false;
    }

    if (sessionIsExpired(session)) {
      const refreshed = await refreshSession();

      if (!refreshed) {
        clearSession();
        updateLoginUI(false);
        openAuthModal("login");
        return false;
      }
    }

    const result = await authenticatedRequest(AUTH_ENDPOINTS.me);

    if (!result.ok) {
      if (result.status === 401) {
        clearSession();
        updateLoginUI(false);
        openAuthModal("login");
      }

      return false;
    }

    updateLoginUI(true);
    return true;
  }

  /* =======================================================
     INITIALIZE
  ======================================================= */

  function initAuth() {
    if (authInitialized) return;
    authInitialized = true;

    ensureAuthModal();
    updateLoginUI(Boolean(readSession()));

    const avatar = document.querySelector(".avatar");

    if (avatar) {
      avatar.style.cursor = "pointer";

      avatar.addEventListener("click", function () {
        if (readSession()) {
          logout();
        } else {
          openAuthModal("login");
        }
      });
    }

    /*
     * Do not call loadDashboard twice if another module
     * already owns dashboard initialization.
     */
    if (!readSession()) {
      openAuthModal("login");
    } else {
      verifySession().then(function (valid) {
        if (
          valid &&
          typeof window.loadDashboard === "function"
        ) {
          window.loadDashboard();
        }
      });
    }
  }

  /* =======================================================
     PUBLIC AUTH FUNCTIONS
  ======================================================= */

  window.LucasNodeAuth = {
    login: function () {
      openAuthModal("login");
    },

    register: function () {
      openAuthModal("register");
    },

    logout: logout,

    getSession: readSession,

    getAccessToken: getAccessToken,

    request: authenticatedRequest,

    verifySession: verifySession
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuth, {
      once: true
    });
  } else {
    initAuth();
  }
})();
