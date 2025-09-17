// javascript
// filepath: /Users/yaguarete/Desktop/astro-meals-v1/src/pages/ProfilePage.jsx
// jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../auth/hooks/useAuth";
import { fetchUserEnergyRow, upsertUserMetrics } from "../api/goals";
import { loadProfileInputs } from "../api/profile";
import { Container, Card, Flex, Heading, Text, Button } from "@radix-ui/themes";
import { PersonIcon } from "@radix-ui/react-icons";

function computeAgeFromDOB(dob) {
  try {
    const birth = new Date(dob);
    if (isNaN(birth)) return null;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  } catch {
    return null;
  }
}
function roundIfNumber(val) {
  return typeof val === "number" && Number.isFinite(val) ? Math.round(val) : val;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    dob: "",
    sex: "",
    height_cm: "",
    weight_kg: "",
    weekly_active_min: "",
    weight_goal_level: "3", // default maintenance
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [lastSaveInfo, setLastSaveInfo] = useState(null);

// javascript
useEffect(() => {
  if (!user?.id) return;
  let mounted = true;
  setLoading(true);

  (async () => {
    try {
      // load latest metrics + prefs and the computed energy row in parallel
      const [profileRes, energyRow] = await Promise.all([
        loadProfileInputs(user.id), // returns { prefs, metrics }
        fetchUserEnergyRow(user.id),
      ]);

      if (!mounted) return;

      const { prefs, metrics } = profileRes ?? {};
      // metrics may be null if user never saved; energyRow contains computed fields
      // merge metrics first then energy computed row to allow computed fields to override/show
      const merged = {
        ...(metrics ?? {}),
        ...(prefs ? { prefs } : {}),
        ...(energyRow ?? {}),
      };
      setUserData(merged);
    } catch (e) {
      console.error("profile load error:", e);
      if (mounted) setUserData(null);
    } finally {
      if (mounted) setLoading(false);
    }
  })();

  return () => { mounted = false; };
}, [user?.id]);

  // Normalize DB fields
  const sexRaw = (userData?.sex ?? userData?.Sex ?? userData?.gender ?? "")?.toString?.().toLowerCase?.() ?? "";
  const sex = sexRaw === "male" || sexRaw === "m" ? "male" : sexRaw === "female" || sexRaw === "f" ? "female" : null;

  const dob = userData?.dob ?? userData?.DOB ?? null;
  const ageFromDob = dob ? computeAgeFromDOB(dob) : null;
  const ageRaw = userData?.age_years ?? userData?.Age ?? userData?.age ?? ageFromDob;
  const age = Number.isFinite(Number(ageRaw)) ? Number(ageRaw) : ageFromDob ?? null;

  const heightRaw = userData?.height_cm ?? userData?.height ?? userData?.Height ?? null;
  const height = Number.isFinite(Number(heightRaw)) ? Number(heightRaw) : null; // cm
  const heightDisplay = height > 0 ? `${height} cm` : "Coming Soon";

  const weightRaw = userData?.weight_kg ?? userData?.weight ?? userData?.Weight ?? null;
  const weight = Number.isFinite(Number(weightRaw)) ? Number(weightRaw) : null; // kg
  const weightDisplay = weight > 0 ? `${weight} kg` : "Coming Soon";

  const weeklyActiveMinRaw = userData?.weekly_active_min ?? userData?.weeklyActiveMin ?? userData?.activeMinutes ?? null;
  const weeklyActiveMin = Number.isFinite(Number(weeklyActiveMinRaw)) ? Number(weeklyActiveMinRaw) : null;
  const weeklyActiveDisplay = weeklyActiveMin != null ? `${weeklyActiveMin} min` : "Coming Soon";

  // Weight goal level from DB or default (1-5)
  const weightGoalLevelRaw = userData?.weight_goal_level ?? userData?.weightGoalLevel ?? userData?.goal_level ?? null;
  const weightGoalLevel = Number.isFinite(Number(weightGoalLevelRaw)) ? Number(weightGoalLevelRaw) : null;

  // Map weekly active minutes to activity level 1-5
  const computeActivityLevelFromMinutes = (mins) => {
    if (mins == null || !Number.isFinite(mins)) return null;
    if (mins <= 60) return 1;
    if (mins <= 180) return 2;
    if (mins <= 360) return 3;
    if (mins <= 600) return 4;
    return 5;
  };
  const activityLevelFromMinutes = computeActivityLevelFromMinutes(weeklyActiveMin);

  const tdeeFactorForLevel = { 1: 1.2, 2: 1.375, 3: 1.55, 4: 1.725, 5: 1.9 };
  const waterMulForLevel = { 1: 0.9, 2: 1, 3: 1.125, 4: 1.25, 5: 1.4 };

  // Determine effective activity level:
  let activityLevel = null;
  if (userData?.activity_level != null) {
    const al = Number(userData.activity_level);
    activityLevel = Number.isFinite(al) ? al : null;
  }
  if (!activityLevel && userData?.activity_factor != null) {
    const af = Number(userData.activity_factor);
    if (Number.isFinite(af)) {
      activityLevel = Object.keys(tdeeFactorForLevel).map(Number).reduce((best, lvl) => {
        const diff = Math.abs(tdeeFactorForLevel[lvl] - af);
        const bestDiff = best == null ? Infinity : Math.abs(tdeeFactorForLevel[best] - af);
        return best == null || diff < bestDiff ? lvl : best;
      }, null);
    }
  }
  if (!activityLevel) activityLevel = activityLevelFromMinutes;

  const activityLevelNames = {
    1: "Inactive",
    2: "Lightly active",
    3: "Active",
    4: "Very active",
    5: "Extremely active",
  };
  const activityName = activityLevel ? activityLevelNames[activityLevel] : "Coming Soon";

  // BMR (Mifflin-St Jeor) — prefer DB bmr_kcal if present
  const bmrRaw = userData?.bmr_kcal ?? userData?.bmr ?? null;
  const bmrFromDb = Number.isFinite(Number(bmrRaw)) ? Number(bmrRaw) : null;
  let computedBmr = null;
  if (!bmrFromDb && sex && age != null && height != null && weight != null) {
    computedBmr = Math.round(10 * weight + 6.25 * height - 5 * age + (sex === "male" ? 5 : -161));
  }
  const bmrFinal = bmrFromDb ?? computedBmr;

  // TDEE prefer DB tdee_kcal then compute
  const tdeeRaw = userData?.tdee_kcal ?? userData?.tdee ?? null;
  const tdeeFromDb = Number.isFinite(Number(tdeeRaw)) ? Number(tdeeRaw) : null;
  const activityFactor = activityLevel ? tdeeFactorForLevel[activityLevel] : null;
  let computedTdee = null;
  if (!tdeeFromDb && bmrFinal != null && activityFactor != null) {
    computedTdee = Math.round(bmrFinal * activityFactor);
  }
  const tdeeFinal = tdeeFromDb ?? computedTdee;

  // goal names and used values
  const goalNames = {
    1: "Fast Weight Loss (-0.5 kg/week)",
    2: "Progressive Weight Loss (-0.25 kg/week)",
    3: "Maintenance",
    4: "Progressive Weight Gain (+0.1 kg/week)",
    5: "Fast Weight Gain (+0.15 kg/week)",
  };
  const effectiveGoalLevel = Number.isFinite(Number(weightGoalLevel)) ? Number(weightGoalLevel) : 3;
  const goalName = goalNames[effectiveGoalLevel] ?? "Coming Soon";

  // goal adjustment used internally
  const goalKcalAdjForLevel = { 1: -500, 2: -250, 3: 0, 4: 250, 5: 500 };
  const goalAdj = goalKcalAdjForLevel[effectiveGoalLevel] ?? 0;

  // Recommended calories
  const recommendedCalories = (bmrFinal != null && activityFactor != null) ? Math.round(bmrFinal * activityFactor + goalAdj) : null;

  // Macronutrient splits per activity level
  const proteinPctForLevel = { 1: 0.35, 2: 0.3, 3: 0.25, 4: 0.2, 5: 0.25 };
  const carbsPctForLevel = { 1: 0.4, 2: 0.45, 3: 0.45, 4: 0.6, 5: 0.6 };
  const proteinPct = proteinPctForLevel[activityLevel] ?? 0.25;
  const carbsPct = carbsPctForLevel[activityLevel] ?? 0.45;
  const fatPct = Math.max(0, 1 - (proteinPct + carbsPct));

  const proteinGr = recommendedCalories != null ? Math.round((proteinPct * recommendedCalories) / 4) : null;
  const carbsGr = recommendedCalories != null ? Math.round((carbsPct * recommendedCalories) / 4) : null;
  const fatsGr = recommendedCalories != null ? Math.round((fatPct * recommendedCalories) / 9) : null;

  // Water ml = weight (kg) × 40 × activity multiplier
  const waterActivityMul = activityLevel ? waterMulForLevel[activityLevel] : null;
  const waterMl = (weight != null && weight > 0 && waterActivityMul != null) ? Math.round(weight * 40 * waterActivityMul) : null;

  const personalInfo = {
    Sex: sex ? sex.charAt(0).toUpperCase() + sex.slice(1) : "Coming Soon",
    Age: age != null ? `${age} yrs` : "Coming Soon",
    Height: heightDisplay,
    Weight: weightDisplay,
    "Weekly Active Time": weeklyActiveDisplay,
    "Activity Level": activityName,
    "Weight Goal": goalName,
  };

  const dailyValues = {
    "Basal Metabolic Rate": bmrFinal != null ? `${roundIfNumber(bmrFinal)} kcal/day` : "Coming Soon",
    "Daily Energy Expenditure": tdeeFinal != null ? `${roundIfNumber(tdeeFinal)} kcal/day` : "Coming Soon",
    "Recommended Calories": recommendedCalories != null ? `${recommendedCalories} kcal/day` : "Coming Soon",
    "Rec. Water Intake": waterMl != null ? `${waterMl} ml/day` : "Coming Soon",
  };

  const macros = {
    Proteins: proteinGr != null ? `${proteinGr} g (${Math.round(proteinPct * 100)}%)` : "Coming Soon",
    Carbohydrates: carbsGr != null ? `${carbsGr} g (${Math.round(carbsPct * 100)}%)` : "Coming Soon",
    Fats: fatsGr != null ? `${fatsGr} g (${Math.round(fatPct * 100)}%)` : "Coming Soon",
  };

  // populate form when entering edit mode or when userData changes
  useEffect(() => {
    if (!editing && userData) {
      setForm({
        dob: dob ?? "",
        sex: sex ?? "",
        height_cm: height != null && height > 0 ? String(height) : "",
        weight_kg: weight != null && weight > 0 ? String(weight) : "",
        weekly_active_min: weeklyActiveMin != null ? String(weeklyActiveMin) : "",
        weight_goal_level: weightGoalLevel != null ? String(weightGoalLevel) : "3",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData, editing]);

  function toPositiveNumberOrNull(s) {
    if (s == null || s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  function toNonNegativeIntOrNull(s) {
    if (s == null || s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) && Number.isInteger(n) && n >= 0 ? n : null;
  }

  async function handleSave() {
    if (!user?.id) return;
    setSaving(true);
    setError(null);

    const payload = {
      user_id: user.id,
      dob: form.dob || null,
      sex: form.sex ? String(form.sex).toLowerCase() : null,
      height_cm: toPositiveNumberOrNull(form.height_cm),
      weight_kg: toPositiveNumberOrNull(form.weight_kg),
      weekly_active_min: toNonNegativeIntOrNull(form.weekly_active_min),
      weight_goal_level: form.weight_goal_level ? Number(form.weight_goal_level) : null,
    };

    console.log("upsertUserMetrics payload:", payload);
    try {
      const res = await upsertUserMetrics(payload);
      console.log("upsertUserMetrics response:", res);
      // merge local optimistic update so UI reflects saved values immediately
      const merged = { ...(userData ?? {}), ...payload };
      setUserData(merged);
      setLastSaveInfo({ payload, response: res, ts: Date.now() });
      // re-fetch authoritative row
      try {
        const row = await fetchUserEnergyRow(user.id);
        console.log("fetchUserEnergyRow after save:", row);
        if (row) setUserData(row);
      } catch (e) {
        console.warn("fetch after save failed:", e);
      }
      setEditing(false);
    } catch (e) {
      console.error("upsertUserMetrics error:", e);
      const msg = e?.message ?? (e?.error?.message) ?? JSON.stringify(e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Container size="3" px="4" py="6">
      <Flex direction="column" gap="4">
        <Flex justify="between" align="center">
          <div>
            <Heading>Profile Report</Heading>
            <Text size="2" color="gray">Summary of current metrics and recommended energy targets</Text>
          </div>
          <Flex align="center" gap="2">
            {!editing && (
              <Button variant="soft" onClick={() => { setEditing(true); setError(null); }}>
                <PersonIcon style={{ marginRight: 8 }} /> Edit
              </Button>
            )}
            {editing && (
              <Button variant="soft" onClick={() => { setEditing(false); setError(null); }}>
                Cancel
              </Button>
            )}
          </Flex>
        </Flex>

        <Flex gap="4" wrap>
          <Card size="3" style={{ flex: 1 }}>
            <Heading size="4" style={{ marginTop: 0 }}>Daily Energy Summary</Heading>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
              <div>
                <Text size="2" color="gray">Basal Metabolic Rate</Text>
                <div style={{ fontWeight: 600, fontSize: 18 }}>{dailyValues["Basal Metabolic Rate"]}</div>
              </div>
              <div>
                <Text size="2" color="gray">Daily Energy Expenditure</Text>
                <div style={{ fontWeight: 600, fontSize: 18 }}>{dailyValues["Daily Energy Expenditure"]}</div>
              </div>
              <div>
                <Text size="2" color="gray">Recommended Intake</Text>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{dailyValues["Recommended Calories"]}</div>
              </div>
              <div>
                <Text size="2" color="gray">Daily Water Intake</Text>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{dailyValues["Rec. Water Intake"]}</div>
              </div>
            </div>
          </Card>

          <Card size="3" style={{ width: 360 }}>
            <Heading size="5" style={{ marginTop: 0 }}>Personal Info</Heading>

            {!editing && (
              <dl style={{ marginTop: 8 }}>
                {Object.entries(personalInfo).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed var(--gray-3)" }}>
                    <dt style={{ color: "var(--gray-8)" }}>{k}</dt>
                    <dd style={{ margin: 0, color: "var(--gray-12)", fontWeight: 600 }}>{v}</dd>
                  </div>
                ))}
              </dl>
            )}

            {editing && (
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} style={{ marginTop: 8 }}>
                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                  Date of birth
                  <input type="date" value={form.dob} onChange={(e) => setForm(f => ({ ...f, dob: e.target.value }))} style={{ width: "100%", padding: 6, marginTop: 4 }} />
                </label>

                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                  Sex
                  <select value={form.sex} onChange={(e) => setForm(f => ({ ...f, sex: e.target.value }))} style={{ width: "100%", padding: 6, marginTop: 4 }}>
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>

                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                  Height (cm)
                  <input type="number" step="0.1" value={form.height_cm} onChange={(e) => setForm(f => ({ ...f, height_cm: e.target.value }))} style={{ width: "100%", padding: 6, marginTop: 4 }} />
                </label>

                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                  Weight (kg)
                  <input type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm(f => ({ ...f, weight_kg: e.target.value }))} style={{ width: "100%", padding: 6, marginTop: 4 }} />
                </label>

                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                  Weekly Active Minutes
                  <input type="number" value={form.weekly_active_min} onChange={(e) => setForm(f => ({ ...f, weekly_active_min: e.target.value }))} style={{ width: "100%", padding: 6, marginTop: 4 }} />
                  <small style={{ color: "#666" }}>Include indoor/outdoor exercise, walking, active jobs — minutes per week</small>
                </label>

                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                  Weight Goal
                  <select value={form.weight_goal_level} onChange={(e) => setForm(f => ({ ...f, weight_goal_level: e.target.value }))} style={{ width: "100%", padding: 6, marginTop: 4 }}>
                    <option value="1">Fast Weight Loss (-0.5 kg/week)</option>
                    <option value="2">Progressive Weight Loss (-0.25 kg/week)</option>
                    <option value="3">Maintenance (0 kg/week)</option>
                    <option value="4">Progressive Weight Gain (+0.1 kg/week)</option>
                    <option value="5">Fast Weight Gain (+0.15 kg/week)</option>
                  </select>
                </label>

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
                  <button type="button" onClick={() => { setEditing(false); setError(null); }}>Cancel</button>
                </div>

                {error && <div style={{ color: "red", marginTop: 8 }}>{String(error)}</div>}
                {lastSaveInfo && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#444" }}>
                    Last save: {new Date(lastSaveInfo.ts).toLocaleString()}
                  </div>
                )}
              </form>
            )}
          </Card>
        </Flex>

        <Card size="3">
          <Heading size="5" style={{ marginTop: 0 }}>Macronutrient Targets</Heading>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "2px solid #eee" }}>Macro</th>
                <th style={{ textAlign: "right", padding: "8px 6px", borderBottom: "2px solid #eee" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(macros).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: "10px 6px", color: "var(--gray-8)" }}>{k}</td>
                  <td style={{ padding: "10px 6px", textAlign: "right", fontWeight: 600 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card size="3">
          <Heading size="5" style={{ marginTop: 0 }}>Micronutrients</Heading>
          <Text color="gray" style={{ marginTop: 6 }}>Coming Soon — will fetch from Supabase</Text>
          <ul style={{ marginTop: 8 }}>
            <li>Calcium: Coming Soon</li>
            <li>Iron: Coming Soon</li>
            <li>Vitamin D: Coming Soon</li>
            <li>Vitamin B12: Coming Soon</li>
            <li>Potassium: Coming Soon</li>
            <li>Sodium: Coming Soon</li>
            <li>Magnesium: Coming Soon</li>
          </ul>
        </Card>

        {loading && <Text color="gray">Loading…</Text>}
        {!loading && !userData && <Text color="gray">No metrics available — complete your measurements to generate a full report.</Text>}
      </Flex>
    </Container>
  );
}