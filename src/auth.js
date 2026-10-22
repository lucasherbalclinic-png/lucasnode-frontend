/* =========================================================
   LUCASNODE — AUTHENTICATION
   Register • Login • Current User • Session • Logout

   Backend:
   https://api.lucasnode.com

   Existing endpoints:
   POST /api/idhini/jisajili
   POST /api/idhini/kuingia
   GET  /api/idhini/mimi
   POST /api/idhini/toka
========================================================= */

const API_BASE_URL = "https://api.lucasnode.com";

const SESSION_KEY = "lucasnode_session";
const USER_KEY = "lucasnode_user";

/**
 * Send requests to the LucasNode backend.
 */
async function authRequest(path, options = {}) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || "GET",
      headers,
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
    });
  } catch {
    throw new Error(
      "Imeshindikana kuwasiliana na LucasNode API. Kagua mtandao na API."
    );
  }

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      "LucasNode API imerudisha majibu yasiyosomeka."
    );
  }

  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.error ||
      result?.message ||
      `Ombi limeshindwa. HTTP ${response.status}.`
    );
  }

  return result;
}

/**
 * Store a session returned by the backend.
 */
function saveAuthSession(session, user) {
  if (!session?.access_token) {
    throw new Error(
      "Hakuna access token. Huenda uthibitisho wa email unahitajika."
    );
  }

  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify(session)
  );

  if (user) {
    sessionStorage.setItem(
      USER_KEY,
      JSON.stringify(user)
    );
  }
}

/**
 * Read the saved session.
 */
function getAuthSession() {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

/**
 * Read the saved user.
 */
function getSavedUser() {
  try {
    const value = sessionStorage.getItem(USER_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

/**
 * Clear local session data.
 */
function clearAuthSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(USER_KEY);
}

/**
 * REGISTER
 *
 * POST /api/idhini/jisajili
 *
 * Backend accepts email and password.
 */
async function registerUser({ email, password }) {
  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    throw new Error("Weka email na password.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Weka email sahihi.");
  }

  if (password.length < 8 || password.length > 128) {
    throw new Error(
      "Password lazima iwe na herufi angalau 8."
    );
  }

  const result = await authRequest(
    "/api/idhini/jisajili",
    {
      method: "POST",
      body: {
        email: normalizedEmail,
        password,
      },
    }
  );

  if (result.session?.access_token) {
    saveAuthSession(result.session, result.user);
  }

  return {
    success: true,
    message: result.message,
    user: result.user || null,
    session: result.session || null,
    requiresEmailConfirmation: !result.session?.access_token,
  };
}

/**
 * LOGIN
 *
 * POST /api/idhini/kuingia
 */
async function loginUser({ email, password }) {
  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    throw new Error("Weka email na password.");
  }

  const result = await authRequest(
    "/api/idhini/kuingia",
    {
      method: "POST",
      body: {
        email: email.trim().toLowerCase(),
        password,
      },
    }
  );

  if (!result.session?.access_token) {
    throw new Error(
      "Login imejibu bila session token."
    );
  }

  saveAuthSession(result.session, result.user);

  return {
    success: true,
    user: result.user || null,
    session: result.session,
  };
}

/**
 * CURRENT USER
 *
 * GET /api/idhini/mimi
 *
 * The backend validates the bearer token.
 */
async function getCurrentUser() {
  const session = getAuthSession();

  if (!session?.access_token) {
    return null;
  }

  try {
    const result = await authRequest(
      "/api/idhini/mimi",
      {
        method: "GET",
        token: session.access_token,
      }
    );

    if (!result.user) {
      throw new Error(
        "Backend haikurudisha taarifa za mtumiaji."
      );
    }

    sessionStorage.setItem(
      USER_KEY,
      JSON.stringify(result.user)
    );

    return result.user;
  } catch (error) {
    // HTTP 401 means the token is invalid or expired.
    if (/HTTP 401/i.test(error.message)) {
      clearAuthSession();
      return null;
    }

    // Do not log the user out because of a network/server failure.
    throw error;
  }
}

/**
 * LOGOUT
 *
 * POST /api/idhini/toka
 *
 * Revoke the session through the backend, then clear local data.
 */
async function logoutUser() {
  const session = getAuthSession();

  try {
    if (session?.access_token) {
      await authRequest(
        "/api/idhini/toka",
        {
          method: "POST",
          token: session.access_token,
        }
      );
    }
  } finally {
    clearAuthSession();
  }

  return { success: true };
}

/**
 * Check whether a session token exists locally.
 *
 * This alone does not prove that the token is still valid.
 */
function isLoggedIn() {
  return Boolean(getAuthSession()?.access_token);
}

export {
  registerUser,
  loginUser,
  getCurrentUser,
  getAuthSession,
  getSavedUser,
  clearAuthSession,
  logoutUser,
  isLoggedIn,
};
