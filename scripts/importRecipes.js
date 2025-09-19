import fs from "fs/promises";
import path from "path";
import process from "process";
import { supabase } from "../src/lib/supabaseClient.js";

const JSON_PATH = path.resolve(process.cwd(), "Xmisc/recipes.json");
const UPLOAD_LOCAL_IMAGES = false; // set true to upload local image files found under project
const STORAGE_BUCKET = "recipes";

async function uploadLocalImage(localPath, destPath) {
  try {
    const fullPath = path.resolve(process.cwd(), localPath.replace(/^\//, ""));
    const buf = await fs.readFile(fullPath);
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).upload(destPath, buf, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (e) {
    console.warn("Image upload failed for", localPath, e.message || e);
    return null;
  }
}

async function main() {
  const raw = await fs.readFile(JSON_PATH, "utf-8");
  const arr = JSON.parse(raw);
  let inserted = 0;
  for (const item of arr) {
    const externalId = item.Meal_ID ?? null;
    const title = item.Meal_Name ?? `Recipe ${externalId ?? ""}`;
    const ingredients = item.Ingredients ?? [];
    // create a small description from ingredients
    const description = ingredients.map(i => `${i.Ingredient_Name}${i.Note ? ` (${i.Note})` : ""}`).slice(0,8).join(", ");
    let imageUrl = item.Image || null;

    if (UPLOAD_LOCAL_IMAGES && imageUrl) {
      // image paths like "/public/meal-images/recipeX-pizza.jpg"
      const localPath = imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl;
      const ext = path.extname(localPath) || ".jpg";
      const destPath = `imports/${externalId ?? Date.now()}${ext}`;
      const uploaded = await uploadLocalImage(localPath, destPath);
      if (uploaded) imageUrl = uploaded;
    }

    const payload = {
      external_id: externalId,
      user_id: null,
      title,
      description,
      image_url: imageUrl,
      category_ids: [],
      source: "import:recipes.json",
    };

    // Upsert recipe first
    const { data: recData, error: recError } = await supabase
      .from("recipes")
      .upsert(payload, { onConflict: "external_id" })
      .select()
      .maybeSingle();

    if (recError) {
      console.error("Upsert recipe error for", title, recError.message || recError);
      continue;
    }

    const recipeId = recData.id;

    // Delete existing recipe_ingredients
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);

    // Insert ingredients and recipe_ingredients
    for (const ing of ingredients) {
      try {
        // Get or create ingredient
        const ingredientId = await getOrCreateIngredient(ing.Ingredient_Name);
        await supabase.from("recipe_ingredients").insert({
          recipe_id: recipeId,
          ingredient_id: ingredientId,
          weight_g: ing.Weight_g,
          note: ing.Note,
        });
      } catch (e) {
        console.error("Error inserting ingredient for", title, ing.Ingredient_Name, e.message || e);
      }
    }

    inserted++;
    console.log("Upserted:", title, "id:", recipeId);
  }

  console.log(`Done. Processed ${arr.length} items, upserted ${inserted}.`);
}

// Helper: Get or create ingredient (same as in recipes.js)
async function getOrCreateIngredient(name) {
  try {
    const { data: existing } = await supabase.from("ingredients").select("id").eq("name", name).maybeSingle();
    if (existing) return existing.id;
    const { data: newIng, error } = await supabase.from("ingredients").insert({
      name,
      category: "Unknown",
      unit: "g",
      category_id: 1, // Assume default
    }).select("id").single();
    if (error) throw error;
    return newIng.id;
  } catch (e) {
    console.error("getOrCreateIngredient error:", e);
    throw e;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});