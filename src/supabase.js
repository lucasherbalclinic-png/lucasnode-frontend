/**
 * LucasNode — Supabase Frontend Client
 * Public publishable key only. Never place service-role keys here.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://tligicyjxhmvggubytbp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_B6ENCwwlVa4v3xv65-s3OQ_Tfq-jmBh";

if (
  !SUPABASE_URL.startsWith("https://") ||
  !SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")
) {
  throw new Error("LucasNode: Supabase configuration si sahihi.");
}

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

export async function registerUser({ email, password }) {
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail || typeof password !== "string" || !password) {
    throw new Error("Weka barua pepe na nenosiri.");
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function loginUser({ email, password }) {
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail || typeof password !== "string" || !password) {
    throw new Error("Weka barua pepe na nenosiri.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (error.name === "AuthSessionMissingError") return null;
    throw new Error(error.message);
  }

  return data.user;
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange(
    (event, session) => callback({ event, session })
  );

  return data.subscription;
}
