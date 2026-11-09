/**
 * LucasNode — Backend v2 Authentication
 *
 * POST /api/idhini/jisajili
 * POST /api/idhini/kuingia
 * POST /api/idhini/upya
 * POST /api/idhini/toka
 */

import { supabase } from "./supabase.js";

const API_BASE_URL = "https://api.lucasnode.com";

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
    throw new Error("LucasNode API imerudisha majibu yasiyosomeka.");
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

async function applyBackendSession(result) {
  if (!result?.session?.access_token || !result?.session?.refresh_token) {
    return null;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: result.session.access_token,
    refresh_token: result.session.refresh_token,
  });

  if (error) throw new Error(error.message);

  return {
    user: data.user || result.user || null,
    session: data.session,
  };
}

async function registerUser({ email, password, display_name }) {
  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  ) {
    throw new Error("Weka email sahihi na password yenye angalau herufi 8.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(normalizedEmail)) {
    throw new Error("Weka email sahihi.");
  }

  const result = await authRequest("/api/idhini/jisajili", {
    method: "POST",
    body: {
      email: normalizedEmail,
      password,
      ...(typeof display_name === "string" && display_name.trim()
        ? { display_name: display_name.trim() }
        : {}),
    },
  });

  const authenticated = await applyBackendSession(result);

  return {
    success: true,
    message: result.message,
    user: authenticated?.user || result.user || null,
    session: authenticated?.session || null,
    requiresEmailConfirmation: !authenticated,
  };
}

async function loginUser({ email, password }) {
  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    throw new Error("Weka email na password.");
  }

  const result = await authRequest("/api/idhini/kuingia", {
    method: "POST",
    body: {
      email: email.trim().toLowerCase(),
      password,
    },
  });

  const authenticated = await applyBackendSession(result);

  if (!authenticated) {
    throw new Error("Backend haikurudisha session halali.");
  }

  return {
    success: true,
    user: authenticated.user,
    session: authenticated.session,
  };
}

async function getCurrentUser() {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) throw new Error(sessionError.message);
  if (!sessionData.session) return null;

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (
      error.name === "AuthSessionMissingError" ||
      error.status === 401
    ) {
      return null;
    }

    throw new Error(error.message);
  }

  return data.user;
}

async function refreshAuthSession() {
  const { data: current, error: currentError } =
    await supabase.auth.getSession();

  if (currentError) throw new Error(currentError.message);

  const refreshToken = current.session?.refresh_token;
  if (!refreshToken) return null;

  const result = await authRequest("/api/idhini/upya", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });

  return applyBackendSession(result);
}

async function logoutUser() {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw new Error(error.message);

  const accessToken = data.session?.access_token;

  try {
    if (accessToken) {
      await authRequest("/api/idhini/toka", {
        method: "POST",
        token: accessToken,
      });
    }
  } finally {
    await supabase.auth.signOut();
  }

  return { success: true };
}

function getAuthSession() {
  // Session is owned by Supabase; use getCurrentSession() for async access.
  return null;
}

async function getSavedUser() {
  return getCurrentUser();
}

async function clearAuthSession() {
  await supabase.auth.signOut();
}

async function isLoggedIn() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return false;
  return Boolean(data.session?.access_token);
}

export {
  registerUser,
  loginUser,
  getCurrentUser,
  getAuthSession,
  getSavedUser,
  clearAuthSession,
  refreshAuthSession,
  logoutUser,
  isLoggedIn,
};
