// javascript (replace src/api/goals.js)

import { supabase } from '../lib/supabaseClient';

export async function computeGoals(userId) {
  const { data, error } = await supabase.rpc('compute_goals', { p_user: userId });
  if (error) throw error;
  return data;
}

export async function fetchUserEnergyRow(userId) {
  const { data, error } = await supabase
    .from('user_energy_calcs')
    .select('age_years,bmr_kcal,tdee_kcal,target_kcal,protein_g,carbs_g,fat_g')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// new: insert metrics for a user, trigger recompute
export async function upsertUserMetrics(payload) {
  if (!payload?.user_id) throw new Error('user_id required');
  const { error: insertErr } = await supabase.from('user_metrics').insert(payload);
  if (insertErr) throw insertErr;

  // recompute goals for this user
  await computeGoals(payload.user_id);
  return true;
}