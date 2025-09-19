// filepath: /Users/yaguarete/Desktop/astro-meals-v1/src/utils/profileTransforms.js

/**
 * UI helpers aligned to new schema, with:
 * - Activity level derived ONLY from active_time minutes (no labels).
 * - Client 1–5 goal scale handled via mapping (server stores text lose/maintain/gain).
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
  
  /* Macros using original splits by activity level */
  export function macroSplitFromActivityLevel(level) {
    const pFor = { 1: 0.35, 2: 0.3, 3: 0.25, 4: 0.2, 5: 0.25 };
    const cFor = { 1: 0.4, 2: 0.45, 3: 0.45, 4: 0.6, 5: 0.6 };
    const al = toNumberOrNull(level);
    const proteinPct = pFor[al] ?? 0.25;
    const carbsPct = cFor[al] ?? 0.45;
    const fatPct = Math.max(0, 1 - (proteinPct + carbsPct));
    return { proteinPct, carbsPct, fatPct };
  }
  
  export function computeMacrosFromCalories(calories, activityLevel) {
    const cals = toNumberOrNull(calories);
    if (cals === null) return null;
    const { proteinPct, carbsPct, fatPct } = macroSplitFromActivityLevel(activityLevel);
    const protein_g = Math.round((proteinPct * cals) / 4);
    const carbs_g = Math.round((carbsPct * cals) / 4);
    const fat_g = Math.round((fatPct * cals) / 9);
    return { protein_g, carbs_g, fat_g, proteinPct, carbsPct, fatPct };
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
  
  /* Derive summary from rows */
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
  
    // Goal level is client-only; if server returns a text, map it roughly to level for display
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
  
    const macros = computeMacrosFromCalories(recommended_kcal, activityLevel);
    const water_ml = computeWaterMl(weightKg, activityLevel);
  
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
    computeMacrosFromCalories,
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
  