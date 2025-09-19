// filepath: /Users/yaguarete/Desktop/astro-meals-v1/src/utils/ensureProfile.js
import { supabase } from "../lib/supabaseClient";

/**
 * Ensure a row exists in profiles_v1 for the signed-in user.
 * profile_id must equal auth.uid().
 */
export async function ensureProfile(profileId) {
  if (!profileId) return;

  const { error } = await supabase
    .from("profiles_v1")
    .upsert(
      { profile_id: profileId },           // minimal payload
      { onConflict: "profile_id" }         // <-- not user_id
    );

  if (error) throw error;
}
