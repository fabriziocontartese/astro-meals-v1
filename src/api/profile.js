import { supabase } from "../lib/supabaseClient";

// load
export async function loadProfileInputs(userId) {
  const [{ data: prefs, error: e1 }, { data: metrics, error: e2 }] = await Promise.all([
    supabase.from("user_prefs").select("meals_per_day,meal_times").eq("user_id", userId).maybeSingle(),
    supabase
      .from("user_metrics")
      .select("dob,sex,height_cm,weight_kg,weekly_active_min,weight_goal_level")
      .eq("user_id", userId)
      .order("measured_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return { prefs, metrics };
}

// save + recompute + read view
export async function saveProfileInputs(userId, { prefs, metrics }) {
  const { error: pErr } = await supabase.from("user_prefs").upsert(
    { user_id: userId, meals_per_day: prefs.meals_per_day ?? 3, meal_times: prefs.meal_times ?? [] },
    { onConflict: "user_id" }
  );
  if (pErr) throw pErr;

  const { error: mErr } = await supabase.from("user_metrics").insert({
    user_id: userId,
    dob: metrics.dob,
    sex: metrics.sex,
    height_cm: metrics.height_cm,
    weight_kg: metrics.weight_kg,
    weekly_active_min: metrics.weekly_active_min,
    weight_goal_level: metrics.weight_goal_level,
  });
  if (mErr) throw mErr;

  const { error: cErr } = await supabase.rpc("compute_goals", { p_user: userId });
  if (cErr) throw cErr;

  const { data: row, error: rErr } = await supabase
    .from("user_energy_calcs")
    .select("age_years,bmr_kcal,activity_level,water_ml,tdee_kcal,target_kcal,protein_g,carbs_g,fat_g")
    .eq("user_id", userId)
    .maybeSingle();
  if (rErr) throw rErr;

  return row;
}
