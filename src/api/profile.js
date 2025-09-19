// filepath: /Users/yaguarete/Desktop/astro-meals-v1/src/api/profile.js
import { supabase } from "../lib/supabaseClient";

/**
 * New schema:
 * - profiles_v1(profile_id, sex, birth_date, name, surname, language, country_of_origin, address, notifications)
 * - goals_v1(profile_id, update_time, height, weight, active_time, active_level, weight_goal, …macro/micro fields)
 *
 * No legacy views (user_energy_calcs, user_metrics, user_prefs). No RPC required.
 */

// load -> { profile, goals }
export async function loadProfileInputs(profileId) {
  if (!profileId) throw new Error("profileId required");

  const [{ data: profile, error: pErr }, { data: goals, error: gErr }] =
    await Promise.all([
      supabase
        .from("profiles_v1")
        .select(
          "profile_id, sex, birth_date, name, surname, language, country_of_origin, address, notifications"
        )
        .eq("profile_id", profileId)
        .maybeSingle(),
      supabase
        .from("goals_v1")
        .select(
          "profile_id, update_time, height, weight, active_time, active_level, weight_goal, macro_protein_total, macro_carb_total, macro_fat_total"
        )
        .eq("profile_id", profileId)
        .maybeSingle(),
    ]);

  if (pErr && pErr.code !== "PGRST116") throw pErr; // ignore no-rows
  if (gErr && gErr.code !== "PGRST116") throw gErr;

  return {
    profile: profile ?? null,
    goals: goals ?? null,
  };
}

/**
 * save -> upsert profiles_v1 and goals_v1.
 * Accepts:
 *   saveProfileInputs(profileId, {
 *     profile: { sex, birth_date, name, surname, language, country_of_origin, address, notifications },
 *     goals:   { height, weight, active_time, weight_goal, active_level? }
 *   })
 * Returns fresh { profile, goals }.
 */
export async function saveProfileInputs(profileId, { profile = {}, goals = {} } = {}) {
  if (!profileId) throw new Error("profileId required");

  // profiles_v1 upsert
  const profilePayload = {
    profile_id: profileId,
    sex: profile.sex ?? null,
    birth_date: profile.birth_date ?? null,
    name: profile.name ?? null,
    surname: profile.surname ?? null,
    language: profile.language ?? null,
    country_of_origin: profile.country_of_origin ?? null,
    address: profile.address ?? null,
    notifications: Array.isArray(profile.notifications) ? profile.notifications : [],
  };

  const { error: pErr } = await supabase
    .from("profiles_v1")
    .upsert(profilePayload, { onConflict: "profile_id" });
  if (pErr) throw pErr;

  // goals_v1 upsert
  const goalsPayload = {
    profile_id: profileId,
    height: isFiniteNum(goals.height),
    weight: isFiniteNum(goals.weight),
    active_time: isFiniteInt(goals.active_time),
    // optional label; safe to omit if you only derive from minutes
    active_level: goals.active_level ?? null,
    // text enum: 'lose' | 'maintain' | 'gain' (store as-is)
    weight_goal: goals.weight_goal ?? "maintain",
  };

  const { error: gErr } = await supabase
    .from("goals_v1")
    .upsert(goalsPayload, { onConflict: "profile_id" });
  if (gErr) throw gErr;

  // return fresh rows
  return await loadProfileInputs(profileId);
}

/* ---------- helpers ---------- */
function isFiniteNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function isFiniteInt(v) {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}
