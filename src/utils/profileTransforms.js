// filepath: /Users/yaguarete/Desktop/astro-meals-v1/src/utils/profileTransforms.js

/**
 * UI helpers aligned to new schema, with:
 * - Activity level derived ONLY from active_time minutes (no labels).
 * - Client 1–5 goal scale handled via mapping (server stores text lose/maintain/gain).
 * - Prioritizes stored macro/micro from goals_v1, else computes via formulas below.
 */

export function toNumberOrNull(v) {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  
  export function parseDate(input) {
    if (!input) return null;
    const d = input instanceof Date ? input : new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  
  /* Age */
  export function computeAgeFromDOB(dob) {
    const d = parseDate(dob);
    if (!d) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age >= 0 ? age : null;
  }
  
  /* Activity factors */
  export function activityLevelFromMinutes(weeklyMinutes) {
    const m = toNumberOrNull(weeklyMinutes);
    if (m === null) return null;
    if (m <= 60) return 1;
    if (m <= 180) return 2;
    if (m <= 360) return 3;
    if (m <= 600) return 4;
    return 5;
  }
  
  export const ACTIVITY_FACTOR = { 1: 1.2, 2: 1.375, 3: 1.55, 4: 1.725, 5: 1.9 };
  export const ACTIVITY_LEVEL_NAMES = {
    1: "Inactive",
    2: "Lightly active",
    3: "Active",
    4: "Very active",
    5: "Extremely active",
  };
  export const WATER_MULTIPLIER_FOR_LEVEL = { 1: 0.9, 2: 1, 3: 1.125, 4: 1.25, 5: 1.4 };
  
  /* BMR & TDEE */
  export function computeBmr({ sex, age, heightCm, weightKg }) {
    const a = toNumberOrNull(age);
    const h = toNumberOrNull(heightCm);
    const w = toNumberOrNull(weightKg);
    if (a === null || h === null || w === null) return null;
    const s = (sex || "").toString().toLowerCase();
    const sexAdj = s === "male" || s === "m" ? 5 : -161;
    return Math.round(10 * w + 6.25 * h - 5 * a + sexAdj);
  }
  
  export function computeTdee(bmr, activityLevel) {
    const b = toNumberOrNull(bmr);
    const al = toNumberOrNull(activityLevel);
    if (b === null || al === null) return null;
    const factor = ACTIVITY_FACTOR[al] ?? null;
    return factor ? Math.round(b * factor) : null;
  }
  
  /* Goal mapping: 1–5 client scale */
  export const GOAL_LEVEL_NAMES = {
    1: "Fast Weight Loss",
    2: "Progressive Weight Loss",
    3: "Maintenance",
    4: "Progressive Weight Gain",
    5: "Fast Weight Gain",
  };
  export const GOAL_KCAL_ADJ = { 1: -500, 2: -250, 3: 0, 4: 250, 5: 500 };
  export function goalTextFromLevel(level) {
    const n = toNumberOrNull(level);
    if (n === 1 || n === 2) return "lose";
    if (n === 3) return "maintain";
    if (n === 4 || n === 5) return "gain";
    return "maintain";
  }
  
  /* Recommended Calories */
  export function computeRecommendedCalories({
    bmr,
    activityLevel,
    explicitTargetKcal = null,
    goalLevel = 3,
  }) {
    const explicit = toNumberOrNull(explicitTargetKcal);
    if (explicit !== null) return Math.round(explicit);
    const b = toNumberOrNull(bmr);
    if (b === null) return null;
    const factor = ACTIVITY_FACTOR[toNumberOrNull(activityLevel) ?? 1] ?? 1.2;
    const adj = GOAL_KCAL_ADJ[toNumberOrNull(goalLevel) ?? 3] ?? 0;
    return Math.round(b * factor + adj);
  }
  
  /* Macro splits by your rules */
  const PROTEIN_PCT_BY_GOAL = { 1: 0.40, 2: 0.35, 3: 0.30, 4: 0.30, 5: 0.35 };
  const FAT_PCT_BY_ACTIVITY = { 1: 0.20, 2: 0.25, 3: 0.30, 4: 0.30, 5: 0.30 };
  
  /**
   * Compute detailed macros per your formulas.
   * Sugar = (kcal/1000)*10 g
   * Fiber = (kcal/1000)*14 g
   * Poly = 30% of total fat, Sat = 16% of total fat, Trans = 0, Mono = remainder.
   */
  export function computeMacroDetails({ kcal, goalLevel, activityLevel }) {
    const C = toNumberOrNull(kcal);
    const gl = toNumberOrNull(goalLevel);
    const al = toNumberOrNull(activityLevel);
    if (C == null || gl == null || al == null) return null;
  
    const proteinPct = PROTEIN_PCT_BY_GOAL[gl] ?? 0.30;
    const fatPct = FAT_PCT_BY_ACTIVITY[al] ?? 0.30;
    const protein_g = Math.round((C * proteinPct) / 4);
  
    const fat_g = Math.round((C * fatPct) / 9);
  
    // Carbs depend on protein and fat energy
    const carbs_g = Math.round((C - (protein_g * 4 + fat_g * 9)) / 4);
  
    // Carb subtypes
    const carbs_sugar_g = Math.round((C / 1000) * 10);   // per spec
    const carbs_fiber_g = Math.round((C / 1000) * 14);   // per spec
    const carbs_starch_g = Math.max(0, Math.round(carbs_g - carbs_sugar_g - carbs_fiber_g));
  
    // Fat subtypes
    const fat_polyunsat_g = Math.round(fat_g * 0.30);
    const fat_sat_g = Math.round(fat_g * 0.16);
    const fat_trans_g = 0;
    const fat_mono_g = Math.max(0, fat_g - fat_sat_g - fat_polyunsat_g - fat_trans_g);
  
    return {
      protein_g,
      carbs_g,
      carbs_sugar_g,
      carbs_fiber_g,
      carbs_starch_g,
      fat_g,
      fat_saturated_g: fat_sat_g,
      fat_monosaturated_g: fat_mono_g,
      fat_polyunsaturated_g: fat_polyunsat_g,
      fat_trans_g: fat_trans_g,
      proteinPct,
      fatPct,
    };
  }
  
  /* Water */
  export function computeWaterMl(weightKg, activityLevel = null) {
    const w = toNumberOrNull(weightKg);
    if (w === null || w <= 0) return null;
    const al = toNumberOrNull(activityLevel);
    const mul = al ? WATER_MULTIPLIER_FOR_LEVEL[al] ?? 1 : 1;
    return Math.round(w * 40 * mul);
  }
  
  /* Recipe aggregation */
  export function aggregateIngredientsNutrition(ingredientsArray = []) {
    if (!Array.isArray(ingredientsArray)) return null;
    const sum = {
      kcal: 0,
      water: 0,
      macro_protein_total: 0,
      macro_carb_total: 0,
      macro_carb_fiber: 0,
      macro_fat_total: 0,
    };
    for (const it of ingredientsArray) {
      const qty = toNumberOrNull(it.qty) ?? 1;
      sum.kcal += (toNumberOrNull(it.kcal) ?? 0) * qty;
      sum.water += (toNumberOrNull(it.water) ?? 0) * qty;
      sum.macro_protein_total += (toNumberOrNull(it.macro_protein_total) ?? 0) * qty;
      sum.macro_carb_total += (toNumberOrNull(it.macro_carb_total) ?? 0) * qty;
      sum.macro_carb_fiber += (toNumberOrNull(it.macro_carb_fiber) ?? 0) * qty;
      sum.macro_fat_total += (toNumberOrNull(it.macro_fat_total) ?? 0) * qty;
    }
    Object.keys(sum).forEach((k) => {
      if (k === "kcal" || k.startsWith("macro_") || k === "water")
        sum[k] = Math.round(sum[k] * 100) / 100;
    });
    return sum;
  }
  
  /* Micros per your rules */
  export function computeMicrosFromRules({ sex, age }) {
    const sMale = (sex || "").toString().toLowerCase().startsWith("m");
    const a = toNumberOrNull(age);
  
    const pick = (maleVal, femaleVal) => (sMale ? maleVal : femaleVal);
  
    const vitA_mcg = sMale ? 900 : 700;
  
    // B1 (Thiamin) and B6 per your age splits
    const B1_mg = (a != null && a > 50) ? pick(1.5, 1.5) : pick(1.3, 1.3);
    const B6_mg = (a != null && a > 50) ? pick(1.5, 1.5) : pick(1.3, 1.3);
  
    // Provided as "coming soon" -> keep nulls to signal missing
    const B2_mg = null;
    const B3_mg = null;
    const B5_mg = null;
    const B9_mcg = null;
  
    const B12_mcg = 2.44;
  
    const vitC_mg = sMale ? 90 : 75;
    const vitD_mcg = (a != null && a > 70) ? 20 : 15;
    const vitE_mg = 15;
    const vitK_mcg = sMale ? 120 : 90;
  
    // Synonyms to expose explicitly too
    const thiamin_mg = sMale ? 1.2 : 1.1;
    const riboflavin_mg = sMale ? 1.3 : 1.1;
    const niacin_mg = sMale ? 16 : 14;
    const folate_mcg = 400;
    const pantothenic_mg = 5;
    const biotin_mcg = 30;
    const choline_mg = sMale ? 550 : 425;
  
    const calcium_mg =
      a == null ? 1000 :
      a <= 50 ? 1000 :
      a <= 70 ? (sMale ? 1000 : 1200) :
      1200;
  
    const chloride_mg = a == null ? 2300 : (a <= 50 ? 2300 : (a <= 70 ? 2000 : 1800));
    const chromium_mcg = (a != null && a > 50) ? pick(30, 20) : pick(35, 25);
    const copper_mg = 0.9;
    const fluoride_mg = sMale ? 4 : 3;
    const iodine_mcg = 150;
    const iron_mg = (a != null && a > 50) ? pick(8, 8) : pick(8, 18);
    const magnesium_mg = (a != null && a > 50) ? pick(420, 320) : pick(400, 310);
    const manganese_mg = pick(2.3, 1.8);
    const molybdenum_mcg = 45;
    const phosphorus_mg = 700;
    const potassium_mg = pick(3400, 2600); // per your spec
    const selenium_mcg = 55;
    const sodium_mg = 1500; // per your spec
    const zinc_mg = pick(11, 8);
  
    return {
      vitA_mcg,
      B1_mg, B2_mg, B3_mg, B5_mg, B6_mg, B9_mcg, B12_mcg,
      vitC_mg, vitD_mcg, vitE_mg, vitK_mcg,
      thiamin_mg, riboflavin_mg, niacin_mg, folate_mcg, pantothenic_mg, biotin_mcg, choline_mg,
      calcium_mg, chloride_mg, chromium_mcg, copper_mg, fluoride_mg, iodine_mcg,
      iron_mg, magnesium_mg, manganese_mg, molybdenum_mcg, phosphorus_mg,
      potassium_mg, selenium_mcg, sodium_mg, zinc_mg,
    };
  }
  
  /* Derive summary */
  export function deriveProfileSummary({ profileRow = null, goalsRow = null, energyRow = null } = {}) {
    const sexRaw = profileRow?.sex ?? null;
    const sex = sexRaw
      ? String(sexRaw).toLowerCase().startsWith("m")
        ? "male"
        : String(sexRaw).toLowerCase().startsWith("f")
        ? "female"
        : null
      : null;
  
    const dob = profileRow?.birth_date ?? null;
    const age = computeAgeFromDOB(dob);
  
    const heightCm = toNumberOrNull(goalsRow?.height);
    const weightKg = toNumberOrNull(goalsRow?.weight);
  
    // Activity: prefer server numeric if present, else derive ONLY from minutes
    let activityLevel =
      toNumberOrNull(energyRow?.activity_level) ??
      activityLevelFromMinutes(goalsRow?.active_time) ??
      null;
  
    const bmr_kcal =
      toNumberOrNull(energyRow?.bmr_kcal) ??
      computeBmr({ sex, age, heightCm, weightKg }) ??
      null;
  
    const tdee_kcal =
      toNumberOrNull(energyRow?.tdee_kcal) ??
      (bmr_kcal != null && activityLevel != null
        ? computeTdee(bmr_kcal, activityLevel)
        : null);
  
    // Map server goal text to level
    const serverGoalText = energyRow?.weight_goal ?? goalsRow?.weight_goal ?? "maintain";
    const inferredGoalLevel =
      serverGoalText === "lose" ? 2 :
      serverGoalText === "gain" ? 4 :
      3;
  
    const recommended_kcal = computeRecommendedCalories({
      bmr: bmr_kcal,
      activityLevel,
      explicitTargetKcal: toNumberOrNull(energyRow?.recommended_kcal),
      goalLevel: inferredGoalLevel,
    });
  
    // Stored macros from goals_v1
    const storedMacros = {
      protein_g: toNumberOrNull(goalsRow?.macro_protein_total),
      carbs_g: toNumberOrNull(goalsRow?.macro_carb_total),
      carbs_sugar_g: toNumberOrNull(goalsRow?.macro_carb_sugar),
      carbs_fiber_g: toNumberOrNull(goalsRow?.macro_carb_fiber),
      carbs_starch_g: toNumberOrNull(goalsRow?.macro_carb_starch),
      fat_g: toNumberOrNull(goalsRow?.macro_fat_total),
      fat_saturated_g: toNumberOrNull(goalsRow?.macro_fat_saturated),
      fat_monosaturated_g: toNumberOrNull(goalsRow?.macro_fat_monosaturated),
      fat_polyunsaturated_g: toNumberOrNull(goalsRow?.macro_fat_polyunsaturated),
      fat_trans_g: toNumberOrNull(goalsRow?.macro_fat_trans),
    };
  
    const computedMacros =
      (recommended_kcal != null && activityLevel != null)
        ? computeMacroDetails({ kcal: recommended_kcal, goalLevel: inferredGoalLevel, activityLevel })
        : null;
  
    const macros =
      storedMacros.protein_g != null ? storedMacros : computedMacros;
  
    const water_ml = computeWaterMl(weightKg, activityLevel);
  
    // Micros: prioritize stored subset, else compute full set from rules
    const computedMicros = computeMicrosFromRules({ sex, age, kcal: recommended_kcal });
  
    const micros = {
      vitA_mcg: toNumberOrNull(goalsRow?.micro_vitA) ?? computedMicros.vitA_mcg,
      B6_mg: toNumberOrNull(goalsRow?.micro_B6) ?? computedMicros.B6_mg,
      B12_mcg: toNumberOrNull(goalsRow?.micro_B12) ?? computedMicros.B12_mcg,
      vitC_mg: toNumberOrNull(goalsRow?.micro_vitC) ?? computedMicros.vitC_mg,
      vitD_mcg: toNumberOrNull(goalsRow?.micro_vitD) ?? computedMicros.vitD_mcg,
      vitE_mg: toNumberOrNull(goalsRow?.micro_vitE) ?? computedMicros.vitE_mg,
      vitK_mcg: toNumberOrNull(goalsRow?.micro_vitK) ?? computedMicros.vitK_mcg,
      calcium_mg: toNumberOrNull(goalsRow?.micro_calcium) ?? computedMicros.calcium_mg,
      copper_mg: toNumberOrNull(goalsRow?.micro_copper) ?? computedMicros.copper_mg,
      iron_mg: toNumberOrNull(goalsRow?.micro_iron) ?? computedMicros.iron_mg,
      magnesium_mg: toNumberOrNull(goalsRow?.micro_magnesium) ?? computedMicros.magnesium_mg,
      manganese_mg: toNumberOrNull(goalsRow?.micro_manganese) ?? computedMicros.manganese_mg,
      phosphorus_mg: toNumberOrNull(goalsRow?.micro_phosphorus) ?? computedMicros.phosphorus_mg,
      potassium_mg: toNumberOrNull(goalsRow?.micro_potassium) ?? computedMicros.potassium_mg,
      selenium_mcg: toNumberOrNull(goalsRow?.micro_selenium) ?? computedMicros.selenium_mcg,
      sodium_mg: toNumberOrNull(goalsRow?.micro_sodium) ?? computedMicros.sodium_mg,
      zinc_mg: toNumberOrNull(goalsRow?.micro_zinc) ?? computedMicros.zinc_mg,
  
      // expose extras even if not stored
      chloride_mg: computedMicros.chloride_mg,
      chromium_mcg: computedMicros.chromium_mcg,
      fluoride_mg: computedMicros.fluoride_mg,
      iodine_mcg: computedMicros.iodine_mcg,
      thiamin_mg: computedMicros.thiamin_mg,
      riboflavin_mg: computedMicros.riboflavin_mg,
      niacin_mg: computedMicros.niacin_mg,
      folate_mcg: computedMicros.folate_mcg,
      pantothenic_mg: computedMicros.pantothenic_mg,
      biotin_mcg: computedMicros.biotin_mcg,
      choline_mg: computedMicros.choline_mg,
      B1_mg: computedMicros.B1_mg,
      B2_mg: computedMicros.B2_mg,
      B3_mg: computedMicros.B3_mg,
      B5_mg: computedMicros.B5_mg,
      B9_mcg: computedMicros.B9_mcg,
    };
  
    return {
      profileRow,
      goalsRow,
      energyRow,
      sex,
      dob,
      age,
      heightCm,
      weightKg,
      activityLevel,
      activityName: activityLevel ? ACTIVITY_LEVEL_NAMES[activityLevel] : null,
      goalLevel: inferredGoalLevel,
      goalName: GOAL_LEVEL_NAMES[inferredGoalLevel],
      bmr_kcal,
      tdee_kcal,
      recommended_kcal,
      macros,
      micros,
      water_ml,
    };
  }
  
  export default {
    toNumberOrNull,
    parseDate,
    computeAgeFromDOB,
    activityLevelFromMinutes,
    computeBmr,
    computeTdee,
    computeRecommendedCalories,
    computeMacroDetails,
    computeWaterMl,
    aggregateIngredientsNutrition,
    deriveProfileSummary,
    ACTIVITY_FACTOR,
    ACTIVITY_LEVEL_NAMES,
    WATER_MULTIPLIER_FOR_LEVEL,
    GOAL_LEVEL_NAMES,
    GOAL_KCAL_ADJ,
    goalTextFromLevel,
  };
  