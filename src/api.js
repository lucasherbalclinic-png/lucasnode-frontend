/**
 * ============================================================
 * LUCASNODE — API CLIENT
 * File: src/api.js
 * ============================================================
 *
 * Centralized API communication for LucasNode.
 *
 * - One API origin
 * - Supabase access token support
 * - JSON request/response handling
 * - Timeout and network error handling
 * - No fake success responses
 *
 * IMPORTANT:
 * This file does not create backend endpoints.
 * Each requested endpoint must exist on the server.
 * ============================================================
 */

import { supabase } from "./supabase.js";

/**
 * Single backend origin.
 *
 * Keep this URL only while the corresponding API endpoints
 * are still served by the LucasNode backend.
 */
export const API_ORIGIN = "https://api.lucasnode.com";

/**
 * Default request timeout: 30 seconds.
 */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Custom API error.
 */
export class LucasNodeApiError extends Error {
  constructor(message, { status = 0, code = "API_ERROR", details = null } = {}) {
    super(message);
    this.name = "LucasNodeApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Build a safe API URL.
 */
function buildApiUrl(path) {
  if (typeof path !== "string" || !path.trim()) {
    throw new LucasNodeApiError("API path si sahihi.", {
      code: "INVALID_PATH",
    });
  }

  // Only allow paths relative to the configured API origin.
  if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith("//")) {
    throw new LucasNodeApiError(
      "Tumia API path ya ndani, si URL ya nje.",
      { code: "INVALID_PATH" }
    );
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, API_ORIGIN);

  if (url.origin !== API_ORIGIN) {
    throw new LucasNodeApiError("API origin hairuhusiwi.", {
      code: "INVALID_ORIGIN",
    });
  }

  return url;
}

/**
 * Get the current Supabase access token.
 *
 * This token is sent to the existing backend for authentication.
 * The backend must validate it before granting access.
 */
async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new LucasNodeApiError(
      "Imeshindikana kusoma session ya mtumiaji.",
      {
        code: "SESSION_ERROR",
        details: error.message,
      }
    );
  }

  return data.session?.access_token || null;
}

/**
 * Parse a response without assuming every response is JSON.
 */
async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      throw new LucasNodeApiError(
        "Backend imerudisha JSON isiyosomika.",
        {
          status: response.status,
          code: "INVALID_JSON",
        }
      );
    }
  }

  const text = await response.text();

  return {
    success: response.ok,
    message: text,
  };
}

/**
 * Unified API request function.
 *
 * Usage:
 *   const result = await apiRequest("GET", "/api/afya");
 *
 *   const result = await apiRequest(
 *     "POST",
 *     "/api/tovuti",
 *     { name, slug, html }
 *   );
 *
 * Returns:
 *   {
 *     ok: boolean,
 *     status: number,
 *     data: object | null
 *   }
 *
 * Throws LucasNodeApiError for network, timeout and
 * configuration failures.
 */
export async function apiRequest(
  method,
  path,
  body = undefined,
  requireAuth = true,
  options = {}
) {
  const normalizedMethod = String(method || "GET").toUpperCase();

  const allowedMethods = new Set([
    "GET",
    "POST",
    "PATCH",
    "DELETE",
  ]);

  if (!allowedMethods.has(normalizedMethod)) {
    throw new LucasNodeApiError("HTTP method hairuhusiwi.", {
      code: "INVALID_METHOD",
    });
  }

  const url = buildApiUrl(path);
  const timeoutMs = Number(options.timeoutMs) || DEFAULT_TIMEOUT_MS;

  const headers = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (requireAuth) {
    const token = await getAccessToken();

    if (!token) {
      throw new LucasNodeApiError(
        "Tafadhali ingia kwenye akaunti yako kwanza.",
        {
          status: 401,
          code: "AUTH_REQUIRED",
        }
      );
    }

    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    const response = await fetch(url.toString(), {
      method: normalizedMethod,
      headers,
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
      signal: controller.signal,
      credentials: "omit",
    });

    const data = await parseResponse(response);

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    if (error instanceof LucasNodeApiError) {
      throw error;
    }

    if (error.name === "AbortError") {
      throw new LucasNodeApiError(
        "Ombi limechukua muda mrefu sana. Jaribu tena.",
        {
          code: "REQUEST_TIMEOUT",
        }
      );
    }

    throw new LucasNodeApiError(
      "Imeshindikana kuwasiliana na LucasNode API.",
      {
        code: "NETWORK_ERROR",
        details: error.message,
      }
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Convenience helper for public endpoints.
 */
export function apiGetPublic(path, options = {}) {
  return apiRequest("GET", path, undefined, false, options);
}

/**
 * Convenience helper for authenticated GET requests.
 */
export function apiGet(path, options = {}) {
  return apiRequest("GET", path, undefined, true, options);
}

/**
 * Convenience helper for authenticated POST requests.
 */
export function apiPost(path, body, options = {}) {
  return apiRequest("POST", path, body, true, options);
}

/**
 * Convenience helper for authenticated PATCH requests.
 */
export function apiPatch(path, body, options = {}) {
  return apiRequest("PATCH", path, body, true, options);
}

/**
 * Convenience helper for authenticated DELETE requests.
 */
export function apiDelete(path, options = {}) {
  return apiRequest("DELETE", path, undefined, true, options);
}

/**
 * Health check against the existing backend.
 *
 * This checks the API only. It does not prove that every
 * LucasNode service is operational.
 */
export async function checkApiHealth() {
  return apiGetPublic("/api/afya", {
    timeoutMs: 10_000,
  });
}
