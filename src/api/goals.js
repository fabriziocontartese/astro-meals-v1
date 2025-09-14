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
