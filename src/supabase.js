/**
 * ============================================================
 * LUCASNODE — SUPABASE CLIENT
 * File: src/supabase.js
 * ============================================================
 *
 * Frontend Supabase client.
 *
 * IMPORTANT:
 * - Use only the Supabase publishable key or legacy anon key.
 * - NEVER put the service-role key in frontend code.
 * - Protect database access using Supabase RLS policies.
 * ============================================================
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Supabase project configuration.
 *
 * These values are public client configuration, not server secrets.
 */
const SUPABASE_URL = "https://cajrbghmvmxxzrwievse.supabase.co";

/**
 * Replace this value with your project's actual publishable key
 * (or legacy anon key) from Supabase.
 *
 * Do not put the service_role key here.
 */
const SUPABASE_PUBLISHABLE_KEY = "WEKA_SUPABASE_PUBLISHABLE_KEY_HAPA";

if (
  !SUPABASE_URL.startsWith("https://") ||
  !SUPABASE_PUBLISHABLE_KEY ||
  SUPABASE_PUBLISHABLE_KEY === "WEKA_SUPABASE_PUBLISHABLE_KEY_HAPA"
) {
  console.error(
    "LucasNode: Weka Supabase publishable key sahihi kwenye src/supabase.js."
  );
}

/**
 * Shared Supabase client.
 */
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/**
 * Register a new user.
 */
export async function registerUser({ email, password }) {
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail || !password) {
    throw new Error("Weka barua pepe na nenosiri.");
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Sign in an existing user.
 */
export async function loginUser({ email, password }) {
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail || !password) {
    throw new Error("Weka barua pepe na nenosiri.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Get the current authenticated session.
 */
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

/**
 * Get the currently authenticated user.
 * Supabase verifies the access token when retrieving the user.
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (error.name === "AuthSessionMissingError") {
      return null;
    }

    throw new Error(error.message);
  }

  return data.user;
}

/**
 * Sign out the current user.
 */
export async function logoutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Listen for authentication changes.
 */
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange(
    (event, session) => {
      callback({ event, session });
    }
  );

  return data.subscription;
}
