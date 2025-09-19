// filepath: /Users/yaguarete/Desktop/astro-meals-v1/src/pages/ProfilePage.jsx

import React, { useEffect, useState } from "react";
import { useAuth } from "../auth/hooks/useAuth";
import { fetchUserEnergyRow, upsertUserMetrics } from "../api/goals";
import { loadProfileInputs } from "../api/profile"; // returns { profile, goals }
import { Container, Card, Flex, Heading, Text, Button } from "@radix-ui/themes";
import { PersonIcon } from "@radix-ui/react-icons";
import {
  deriveProfileSummary,
  computeAgeFromDOB,
  GOAL_LEVEL_NAMES,
  goalTextFromLevel,
} from "../utils/profileTransforms";

function roundIfNumber(val) {
  return typeof val === "number" && Number.isFinite(val) ? Math.round(val) : val;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [rows, setRows] = useState({ profile: null, goals: null, energy: null });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    birth_date: "",
    sex: "",
    height: "",
    weight: "",
    active_time: "",
    weight_goal_level: "3", // 1..5 client-only
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [lastSaveInfo, setLastSaveInfo] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const [bundle, energy] = await Promise.all([
          loadProfileInputs(user.id), // -> { profile, goals }
          fetchUserEnergyRow(user.id),
        ]);
        if (!mounted) return;
        const profile = bundle?.profile ?? null;
        const goals = bundle?.goals ?? null;
        setRows({ profile, goals, energy: energy ?? null });
      } catch (e) {
        console.error("profile load error:", e);
        if (mounted) setRows({ profile: null, goals: null, energy: null });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  const summary = deriveProfileSummary({
    profileRow: rows.profile ?? undefined,
    goalsRow: rows.goals ?? undefined,
    energyRow: rows.energy ?? undefined,
  });

  const sex = summary?.sex ?? null;
  const birth_date = rows.profile?.birth_date ?? "";
  const age = summary?.age ?? (birth_date ? computeAgeFromDOB(birth_date) : null);
  const height = summary?.heightCm ?? null;
  const weight = summary?.weightKg ?? null;
  const active_time = rows.goals?.active_time ?? null;

  // infer client goal level from stored text for display
  const storedGoalText = rows.goals?.weight_goal ?? "maintain";
  const inferredLevel = storedGoalText === "lose" ? 2 : storedGoalText === "gain" ? 4 : 3;

  useEffect(() => {
    if (!editing && (rows.profile || rows.goals)) {
      setForm({
        birth_date: birth_date || "",
        sex: sex || "",
        height: height != null && height > 0 ? String(height) : "",
        weight: weight != null && weight > 0 ? String(weight) : "",
        active_time: active_time != null ? String(active_time) : "",
        weight_goal_level: String(inferredLevel),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.profile, rows.goals, editing]);

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

    const level = Number(form.weight_goal_level);
    const weight_goal = goalTextFromLevel(level); // map 1–5 -> lose/maintain/gain

    const payload = {
      profile_id: user.id,
      // profiles_v1
      birth_date: form.birth_date || null,
      sex: form.sex ? String(form.sex).toLowerCase() : null,
      // goals_v1
      height: toPositiveNumberOrNull(form.height),
      weight: toPositiveNumberOrNull(form.weight),
      active_time: toNonNegativeIntOrNull(form.active_time),
      weight_goal, // text stored in DB
    };

    try {
      const res = await upsertUserMetrics(payload);
      const next = {
        profile: {
          ...(rows.profile ?? {}),
          profile_id: user.id,
          birth_date: payload.birth_date,
          sex: payload.sex,
        },
        goals: {
          ...(rows.goals ?? {}),
          profile_id: user.id,
          height: payload.height,
          weight: payload.weight,
          active_time: payload.active_time,
          weight_goal: payload.weight_goal,
        },
        energy: rows.energy ?? null,
      };
      setRows(next);
      setLastSaveInfo({ payload, response: res, ts: Date.now() });

      try {
        const energyRefreshed = await fetchUserEnergyRow(user.id);
        if (energyRefreshed) setRows((prev) => ({ ...prev, energy: energyRefreshed }));
      } catch (e) {
        console.warn("fetch after save failed:", e);
      }
      setEditing(false);
    } catch (e) {
      const msg = e?.message ?? e?.error?.message ?? JSON.stringify(e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const personalInfo = {
    Sex: sex ? sex.charAt(0).toUpperCase() + sex.slice(1) : "Complete profile",
    Age: age != null ? `${age} yrs` : "Complete profile",
    Height: height && height > 0 ? `${height} cm` : "Complete profile",
    Weight: weight && weight > 0 ? `${weight} kg` : "Complete profile",
    "Weekly Active Time":
      active_time != null ? `${active_time} min` : "Complete profile",
    "Activity Level":
      summary?.activityName ?? "Complete profile",
    "Weight Goal":
      GOAL_LEVEL_NAMES[summary?.goalLevel ?? inferredLevel] ?? "Complete profile",
  };

  const dailyValues = {
    "Basal Metabolic Rate":
      summary?.bmr_kcal != null ? `${roundIfNumber(summary.bmr_kcal)} kcal` : "Complete profile",
    "Daily Energy Expenditure":
      summary?.tdee_kcal != null ? `${roundIfNumber(summary.tdee_kcal)} kcal` : "Complete profile",
    "Recommended Calories":
      summary?.recommended_kcal != null ? `${summary.recommended_kcal} kcal` : "Complete profile",
    "Rec. Water Intake":
      summary?.water_ml != null ? `${summary.water_ml / 1000} liters` : "Complete profile",
  };

  const macros = summary?.macros
    ? {
        Proteins: `${summary.macros.protein_g} g (${Math.round(summary.macros.proteinPct * 100)}%)`,
        Carbohydrates: `${summary.macros.carbs_g} g (${Math.round(summary.macros.carbsPct * 100)}%)`,
        Fats: `${summary.macros.fat_g} g (${Math.round(summary.macros.fatPct * 100)}%)`,
      }
    : {
        Proteins: "Complete profile",
        Carbohydrates: "Complete profile",
        Fats: "Complete profile",
      };


  return (
    <Container size="3" px="4" py="6">
      <Flex direction="column" gap="4">
        <Flex justify="between" align="center">
          <div>
            <Heading>Profile Report</Heading>
            <Text size="2" color="gray">
              This personalized nutrition plan is built from population data and is not a substitute for professional dietary advice.
            </Text>
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
                  <input
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => setForm(f => ({ ...f, birth_date: e.target.value }))}
                    style={{ width: "100%", padding: 6, marginTop: 4 }}
                  />
                </label>

                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                  Sex
                  <select
                    value={form.sex}
                    onChange={(e) => setForm(f => ({ ...f, sex: e.target.value }))}
                    style={{ width: "100%", padding: 6, marginTop: 4 }}
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>

                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                  Height (cm)
                  <input
                    type="number"
                    step="0.1"
                    value={form.height}
                    onChange={(e) => setForm(f => ({ ...f, height: e.target.value }))}
                    style={{ width: "100%", padding: 6, marginTop: 4 }}
                  />
                </label>

                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                  Weight (kg)
                  <input
                    type="number"
                    step="0.1"
                    value={form.weight}
                    onChange={(e) => setForm(f => ({ ...f, weight: e.target.value }))}
                    style={{ width: "100%", padding: 6, marginTop: 4 }}
                  />
                </label>

                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                  Weekly Active Minutes
                  <input
                    type="number"
                    value={form.active_time}
                    onChange={(e) => setForm(f => ({ ...f, active_time: e.target.value }))}
                    style={{ width: "100%", padding: 6, marginTop: 4 }}
                  />
                  <small style={{ color: "#666" }}>Minutes per week</small>
                </label>

                <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
                  Weight Goal
                  <select
                    value={form.weight_goal_level}
                    onChange={(e) => setForm(f => ({ ...f, weight_goal_level: e.target.value }))}
                    style={{ width: "100%", padding: 6, marginTop: 4 }}
                  >
                    <option value="1">Fast Weight Loss</option>
                    <option value="2">Progressive Weight Loss</option>
                    <option value="3">Maintenance</option>
                    <option value="4">Progressive Weight Gain)</option>
                    <option value="5">Fast Weight Gain</option>
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
        {!loading && !rows.profile && !rows.goals && (
          <Text color="gray">No metrics available — complete your measurements to generate a full report.</Text>
        )}
      </Flex>
    </Container>
  );
}
