// javascript
// src/api/recipes.js
import { supabase } from "../lib/supabaseClient.js";

const STORAGE_BUCKET = "recipes";

/**
 * Fetch categories visible to a user (public + user's own) or only public if no userId.
 */
export async function fetchCategories(userId) {
  try {
    let q = supabase.from("categories").select("id,name,user_id,created_at").order("name", { ascending: true });
    if (userId) {
      q = q.or(`user_id.eq.${userId},user_id.is.null`);
    } else {
      q = q.is("user_id", null);
    }
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.error("fetchCategories error:", e);
    throw e;
  }
}

/**
 * Fetch recipes visible to a user (public + user's own) or only public if no userId.
 * Supports optional search (title) and categoryIds (uuid[] contains).
 */
export async function fetchRecipes(userId, { search, categoryIds = [] } = {}) {
  try {
    let q = supabase.from("recipes").select("*").order("created_at", { ascending: false });
    if (userId) {
      q = q.or(`user_id.eq.${userId},user_id.is.null`);
    } else {
      q = q.is("user_id", null);
    }

    if (search) q = q.ilike("title", `%${search}%`);
    if (Array.isArray(categoryIds) && categoryIds.length) q = q.contains("category_ids", categoryIds);

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.error("fetchRecipes error:", e);
    throw e;
  }
}

/**
 * Single recipe by id
 */
export async function fetchRecipeById(id) {
  try {
    const { data, error } = await supabase.from("recipes").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ?? null;
  } catch (e) {
    console.error("fetchRecipeById error:", e);
    throw e;
  }
}

/**
 * Upsert a recipe. Expects recipe object:
 * { id?, user_id, title, description, image_url, macros, category_ids, ingredients, external_id, source }
 * Ingredients are now handled via ingredients and recipe_ingredients tables.
 */
export async function upsertRecipe(recipe) {
  try {
    if (!recipe || !recipe.title) throw new Error("recipe.title is required");
    const recipePayload = { ...recipe };
    delete recipePayload.ingredients; // Remove ingredients from recipe payload as it's now in separate tables
    const { data: recData, error } = await supabase.from("recipes").upsert(recipePayload, { onConflict: "id" }).select().maybeSingle();
    if (error) throw error;
    const recipeId = recData.id;

    // Delete existing recipe_ingredients for this recipe
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);

    // Handle ingredients: for each, find or create ingredient, then insert into recipe_ingredients
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      for (const ing of recipe.ingredients) {
        const ingredientId = await getOrCreateIngredient(ing.Ingredient_Name);
        await supabase.from("recipe_ingredients").insert({
          recipe_id: recipeId,
          ingredient_id: ingredientId,
          weight_g: ing.Weight_g,
          note: ing.Note,
        });
      }
    }

    return recData;
  } catch (e) {
    console.error("upsertRecipe error:", e);
    throw e;
  }
}

/**
 * Helper: Get ingredient id by name, or create if not exists.
 * Assumes default category_id=1, unit='g', etc. Adjust defaults as needed.
 */
async function getOrCreateIngredient(name) {
  try {
    // Check if exists
    const { data: existing } = await supabase.from("ingredients").select("id").eq("name", name).maybeSingle();
    if (existing) return existing.id;

    // Create new
    const { data: newIng, error } = await supabase.from("ingredients").insert({
      name,
      category: "Unknown", // Default
      unit: "g", // Default
      category_id: 1, // Assume default category exists
    }).select("id").single();
    if (error) throw error;
    return newIng.id;
  } catch (e) {
    console.error("getOrCreateIngredient error:", e);
    throw e;
  }
}

/**
 * Delete a recipe owned by userId. Returns true if deleted.
 */
export async function deleteRecipe(id, userId) {
  try {
    if (!userId) throw new Error("userId required to delete recipe");
    const { error } = await supabase.from("recipes").delete().eq("id", id).eq("user_id", userId);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("deleteRecipe error:", e);
    throw e;
  }
}

/**
 * Upload image to storage bucket and return public URL.
 * Accepts browser File/Blob or Node Buffer.
 *
 * path: destination path inside bucket (e.g. `user_<id>/file.png`)
 */
export async function uploadImage(fileOrBuffer, path, options = { upsert: true }) {
  try {
    if (!fileOrBuffer) throw new Error("file is required");
    // Supabase storage accepts File/Blob in browser and Buffer/Uint8Array in Node.
    const { data: upData, error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, fileOrBuffer, options);
    if (upErr) throw upErr;
    // v2 getPublicUrl returns { data: { publicUrl } }
    const { data: urlData, error: urlErr } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(upData.path);
    if (urlErr) throw urlErr;
    return urlData?.publicUrl ?? null;
  } catch (e) {
    console.error("uploadImage error:", e);
    throw e;
  }
}

/**
 * Convenience: returns a public url for an existing object path in the bucket.
 */
export function getPublicUrlFor(path) {
  try {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch (e) {
    console.error("getPublicUrlFor error:", e);
    return null;
  }
}