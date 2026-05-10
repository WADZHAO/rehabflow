import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
export const hasSupabase = Boolean(supabase);

export async function ensureSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error("Anonymous sign-in failed:", error.message);
    return null;
  }
  return data.user;
}

// Attach an email to the current (anonymous) user.
// Preserves user_id, so existing profile/logs/settings rows stay accessible.
// Sends a confirmation email; the user must click the link to finish the upgrade.
export async function upgradeToEmail(email) {
  if (!supabase) return { error: "Supabase not configured" };
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: window.location.origin }
  );
  if (error) return { error: error.message };
  return { ok: true };
}

// Send a magic link to sign into an existing email-bound account.
// Use this from a new URL/device to recover an account created via upgradeToEmail.
export async function signInWithEmail(email) {
  if (!supabase) return { error: "Supabase not configured" };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function loadAll(userId) {
  if (!supabase || !userId) return null;
  const [profileRes, logsRes, settingsRes] = await Promise.all([
    supabase.from("profile").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("daily_logs").select("*").eq("user_id", userId),
    supabase.from("settings").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  return {
    profile: profileRes.data || null,
    logs: logsRes.data || [],
    settings: settingsRes.data || null,
  };
}

export async function saveProfile(userId, profile) {
  if (!supabase || !userId) return;
  const { error } = await supabase.from("profile").upsert({
    user_id: userId,
    age: profile.age,
    height: profile.height,
    weight: profile.weight,
    level: profile.level,
    gender: profile.gender,
    has_gym: profile.hasGym,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error("saveProfile failed:", error.message);
}

export async function saveDailyLog(userId, date, log) {
  if (!supabase || !userId) return;
  const { error } = await supabase.from("daily_logs").upsert({
    user_id: userId,
    date,
    pain: log.checkin?.pain ?? null,
    swelling: log.checkin?.swelling ?? null,
    mood: log.checkin?.mood ?? null,
    areas: log.checkin?.areas ?? [],
    completed: log.completed ?? [],
    updated_at: new Date().toISOString(),
  });
  if (error) console.error("saveDailyLog failed:", error.message);
}

export async function saveSettings(userId, s) {
  if (!supabase || !userId) return;
  const { error } = await supabase.from("settings").upsert({
    user_id: userId,
    weekly_goal_days: s.weekly_goal_days,
    reminder_days: s.reminder_days,
    reminder_time: s.reminder_time,
    reminder_on: s.reminder_on,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error("saveSettings failed:", error.message);
}
