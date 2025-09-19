// filepath: /Users/yaguarete/Desktop/astro-meals-v1/src/api/goals.js
import { supabase } from "../lib/supabaseClient";

/** Resolve auth user id used as profile_id */
function resolveProfileId(payloadOrId) {
  if (typeof payloadOrId === "string") return payloadOrId;
  const pid = payloadOrId?.profile_id ?? payloadOrId?.user_id ?? null;
  if (!pid) throw new Error("profile_id required");
  return pid;
}
const num = (v) => (Number.isFinite(+v) ? +v : null);
const int = (v) => (Number.isInteger(+v) ? +v : null);

/** Legacy energy view gone. Return null so UI computes client-side. */
export async function fetchUserEnergyRow(id) {
  resolveProfileId(id);
  return null;
}

/**
 * Upsert to profiles_v1 and goals_v1.
 * Accepts { profile_id|user_id, birth_date?, sex?, height?, weight?, active_time?, weight_goal? }
 */
export async function upsertUserMetrics(payload) {
  const profile_id = resolveProfileId(payload);

  // profiles_v1
  const { error: pErr } = await supabase
    .from("profiles_v1")
    .upsert(
      {
        profile_id,
        birth_date: payload.birth_date ?? null,
        sex: payload.sex ?? null,
      },
      { onConflict: "profile_id" }     // <-- correct conflict target
    );
  if (pErr) throw pErr;

  // goals_v1
  const { error: gErr } = await supabase
    .from("goals_v1")
    .upsert(
      {
        profile_id,
        height: num(payload.height),
        weight: num(payload.weight),
        active_time: int(payload.active_time),
        weight_goal: payload.weight_goal ?? "maintain",
      },
      { onConflict: "profile_id" }
    );
  if (gErr) throw gErr;

  return true;
}
