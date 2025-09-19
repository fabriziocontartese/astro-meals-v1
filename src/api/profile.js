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
          "profile_id, update_time, height, weight, active_time, active_level, weight_goal, macro_protein_total, macro_carb_total, macro_carb_sugar, macro_carb_fiber, macro_carb_starch, macro_fat_total, macro_fat_saturated, macro_fat_monosaturated, macro_fat_polyunsaturated, macro_fat_trans, micro_vitA, micro_B6, micro_B12, micro_vitC, micro_vitD, micro_vitE, micro_vitK, micro_calcium, micro_copper, micro_iron, micro_magnesium, micro_manganese, micro_phosphorus, micro_potassium, micro_selenium, micro_sodium, micro_zinc"
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
 *     goals:   { height, weight, active_time, weight_goal, active_level?, macro_protein_total?, macro_carb_total?, ... (all macro/micro fields) }
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

  // goals_v1 upsert (now includes all macro/micro fields)
  const goalsPayload = {
    profile_id: profileId,
    height: isFiniteNum(goals.height),
    weight: isFiniteNum(goals.weight),
    active_time: isFiniteInt(goals.active_time),
    active_level: goals.active_level ?? null,
    weight_goal: goals.weight_goal ?? "maintain",
    macro_protein_total: isFiniteNum(goals.macro_protein_total),
    macro_carb_total: isFiniteNum(goals.macro_carb_total),
    macro_carb_sugar: isFiniteNum(goals.macro_carb_sugar),
    macro_carb_fiber: isFiniteNum(goals.macro_carb_fiber),
    macro_carb_starch: isFiniteNum(goals.macro_carb_starch),
    macro_fat_total: isFiniteNum(goals.macro_fat_total),
    macro_fat_saturated: isFiniteNum(goals.macro_fat_saturated),
    macro_fat_monosaturated: isFiniteNum(goals.macro_fat_monosaturated),
    macro_fat_polyunsaturated: isFiniteNum(goals.macro_fat_polyunsaturated),
    macro_fat_trans: isFiniteNum(goals.macro_fat_trans),
    micro_vitA: isFiniteNum(goals.micro_vitA),
    micro_B6: isFiniteNum(goals.micro_B6),
    micro_B12: isFiniteNum(goals.micro_B12),
    micro_vitC: isFiniteNum(goals.micro_vitC),
    micro_vitD: isFiniteNum(goals.micro_vitD),
    micro_vitE: isFiniteNum(goals.micro_vitE),
    micro_vitK: isFiniteNum(goals.micro_vitK),
    micro_calcium: isFiniteNum(goals.micro_calcium),
    micro_copper: isFiniteNum(goals.micro_copper),
    micro_iron: isFiniteNum(goals.micro_iron),
    micro_magnesium: isFiniteNum(goals.micro_magnesium),
    micro_manganese: isFiniteNum(goals.micro_manganese),
    micro_phosphorus: isFiniteNum(goals.micro_phosphorus),
    micro_potassium: isFiniteNum(goals.micro_potassium),
    micro_selenium: isFiniteNum(goals.micro_selenium),
    micro_sodium: isFiniteNum(goals.micro_sodium),
    micro_zinc: isFiniteNum(goals.micro_zinc),
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