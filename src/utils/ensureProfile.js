// src/utils/ensureProfile.js
import { supabase } from "../lib/supabaseClient";


export async function ensureProfile(userId) {
if (!userId) return;
const { error } = await supabase
.from("profiles")
.upsert({ user_id: userId }, { onConflict: "user_id" });
if (error) throw error;
}