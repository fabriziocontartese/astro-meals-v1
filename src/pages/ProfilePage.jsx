// filepath: /Users/yaguarete/Desktop/astro-meals-v1/src/pages/ProfilePage.jsx

import React, { useEffect, useState } from "react";
import { useAuth } from "../auth/hooks/useAuth";
import { fetchUserEnergyRow, upsertUserMetrics } from "../api/goals";
import { loadProfileInputs } from "../api/profile";
import {
  Container, Card, Flex, Grid, Heading, Text, Button, Separator, Badge, Callout
} from "@radix-ui/themes";
import { PersonIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import {
  deriveProfileSummary,
  computeAgeFromDOB,
  GOAL_LEVEL_NAMES,
  goalTextFromLevel,
} from "../utils/profileTransforms";

function roundIfNumber(val) {
  return typeof val === "number" && Number.isFinite(val) ? Math.round(val) : val;
}

function KeyNumber({ label, value }) {
  return (
    <Card variant="classic" size="2">
      <Text size="1" color="gray">{label}</Text>
      <Heading as="div" size="6" style={{ lineHeight: 1, marginTop: 6 }}>{value}</Heading>
    </Card>
  );
}

function StatRow({ label, value, compact=false }) {
  return (
    <Flex
      align="center"
      justify="between"
      py={compact ? "1" : "2"}
      style={{ borderBottom: "1px dashed var(--gray-4)" }}
    >
      <Text size={compact ? "1" : "2"} color="gray">{label}</Text>
      <Text size={compact ? "1" : "2"} weight="medium">{value}</Text>
    </Flex>
  );
}

function SectionCard({ title, right, children, sticky=false }) {
  return (
    <Card size="3" style={sticky ? { position: "sticky", top: 16, height: "fit-content" } : undefined}>
      <Flex align="center" justify="between">
        <Heading size="4" style={{ marginTop: 0 }}>{title}</Heading>
        {right}
      </Flex>
      <Separator my="3" />
      {children}
    </Card>
  );
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
    weight_goal_level: "3",
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
          loadProfileInputs(user.id),
          fetchUserEnergyRow(user.id),
        ]);
        if (!mounted) return;
        const profile = bundle?.profile ?? null;
        const goals = bundle?.goals ?? null;
        setRows({ profile, goals, energy: energy ?? null });
      } catch {
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
    const weight_goal = goalTextFromLevel(level);

    const payload = {
      profile_id: user.id,
      birth_date: form.birth_date || null,
      sex: form.sex ? String(form.sex).toLowerCase() : null,
      height: toPositiveNumberOrNull(form.height),
      weight: toPositiveNumberOrNull(form.weight),
      active_time: toNonNegativeIntOrNull(form.active_time),
      weight_goal,
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
      } catch {
        // Ignore error refreshing energy data as it's not critical
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
    "Weekly Active Time": active_time != null ? `${active_time} min` : "Complete profile",
    "Activity Level": summary?.activityName ?? "Complete profile",
    "Weight Goal": GOAL_LEVEL_NAMES[summary?.goalLevel ?? inferredLevel] ?? "Complete profile",
  };

  const dailyValues = {
    BMR: summary?.bmr_kcal != null ? `${roundIfNumber(summary.bmr_kcal)} kcal` : "—",
    TDEE: summary?.tdee_kcal != null ? `${roundIfNumber(summary.tdee_kcal)} kcal` : "—",
    "Recommended kcal": summary?.recommended_kcal != null ? `${summary.recommended_kcal} kcal` : "—",
    Water: summary?.water_ml != null ? `${(summary.water_ml / 1000).toFixed(1)} L` : "—",
  };

  // Grouped macros for visual hierarchy
  const macrosGrouped = summary?.macros
    ? {
        Protein: {
          total: `${summary.macros.protein_g ?? "—"} g`,
          subs: [],
        },
        Carbs: {
          total: `${summary.macros.carbs_g ?? "—"} g`,
          subs: [
            ["Sugar", `${summary.macros.carbs_sugar_g ?? "—"} g`],
            ["Fiber", `${summary.macros.carbs_fiber_g ?? "—"} g`],
            ["Starch", `${summary.macros.carbs_starch_g ?? "—"} g`],
          ],
        },
        Fat: {
          total: `${summary.macros.fat_g ?? "—"} g`,
          subs: [
            ["Saturated", `${summary.macros.fat_saturated_g ?? "—"} g`],
            ["Monounsaturated", `${summary.macros.fat_monosaturated_g ?? "—"} g`],
            ["Polyunsaturated", `${summary.macros.fat_polyunsaturated_g ?? "—"} g`],
            ["Trans", `${summary.macros.fat_trans_g ?? "—"} g`],
          ],
        },
      }
    : null;

  const micros = summary?.micros
    ? [
        ["Vitamin A", `${summary.micros.vitA_mcg ?? "—"} μg`],
        ["Vitamin B6", `${summary.micros.B6_mg ?? "—"} mg`],
        ["Vitamin B12", `${summary.micros.B12_mcg ?? "—"} μg`],
        ["Vitamin C", `${summary.micros.vitC_mg ?? "—"} mg`],
        ["Vitamin D", `${summary.micros.vitD_mcg ?? "—"} μg`],
        ["Vitamin E", `${summary.micros.vitE_mg ?? "—"} mg`],
        ["Vitamin K", `${summary.micros.vitK_mcg ?? "—"} μg`],
        ["Calcium", `${summary.micros.calcium_mg ?? "—"} mg`],
        ["Copper", `${summary.micros.copper_mg ?? "—"} mg`],
        ["Iron", `${summary.micros.iron_mg ?? "—"} mg`],
        ["Magnesium", `${summary.micros.magnesium_mg ?? "—"} mg`],
        ["Manganese", `${summary.micros.manganese_mg ?? "—"} mg`],
        ["Phosphorus", `${summary.micros.phosphorus_mg ?? "—"} mg`],
        ["Potassium", `${summary.micros.potassium_mg ?? "—"} mg`],
        ["Selenium", `${summary.micros.selenium_mcg ?? "—"} μg`],
        ["Sodium", `${summary.micros.sodium_mg ?? "—"} mg`],
        ["Zinc", `${summary.micros.zinc_mg ?? "—"} mg`],
      ]
    : null;

  return (
    <Container size="3" px="4" py="6" style={{ width: "100%", maxWidth: "1120px", marginInline: "auto" }}>
      <Flex justify="between" align="center" mb="3">
        <div>
          <Heading>Profile Report</Heading>
          <Text size="2" color="gray">Based in population data. Not medical advice.</Text>
        </div>
        <Flex align="center" gap="2">
          {!editing ? (
            <Button variant="soft" onClick={() => { setEditing(true); setError(null); }}>
              <PersonIcon style={{ marginRight: 8 }} /> Edit
            </Button>
          ) : (
            <Button variant="soft" onClick={() => { setEditing(false); setError(null); }}>
              Cancel
            </Button>
          )}
        </Flex>
      </Flex>

      {error && (
        <Callout.Root color="red" mb="3">
          <Callout.Icon><InfoCircledIcon /></Callout.Icon>
          <Callout.Text>{String(error)}</Callout.Text>
        </Callout.Root>
      )}

      {/* Primary responsive layout */}
      <Grid
        columns={{ initial: "1", sm: "2", md: "3" }}
        gap="4"
      >
        {/* Energy */}
        <SectionCard title="Daily Energy">
          <Grid columns={{ initial: "2" }} gap="3">
            <KeyNumber label="BMR" value={dailyValues.BMR} />
            <KeyNumber label="TDEE" value={dailyValues.TDEE} />
            <KeyNumber label="Recommended" value={dailyValues["Recommended kcal"]} />
            <KeyNumber label="Water" value={dailyValues.Water} />
          </Grid>
        </SectionCard>

        {/* Macros grouped */}
        <SectionCard title="Macronutrient Targets">
          {!macrosGrouped ? (
            <Text color="gray">Complete profile to compute targets.</Text>
          ) : (
            <Grid columns={{ initial: "1", sm: "1", md: "1" }} gap="3">
              {/* Protein */}
              <Card variant="surface" size="2">
                <Text size="2" weight="medium">Protein</Text>
                <StatRow label="Total" value={macrosGrouped.Protein.total} />
              </Card>

              {/* Carbs */}
              <Card variant="surface" size="2">
                <Text size="2" weight="medium">Carbs</Text>
                <StatRow label="Total" value={macrosGrouped.Carbs.total} />
                <div style={{ paddingLeft: 8 }}>
                  {macrosGrouped.Carbs.subs.map(([k, v]) => (
                    <StatRow key={k} label={`• ${k}`} value={v} compact />
                  ))}
                </div>
              </Card>

              {/* Fat */}
              <Card variant="surface" size="2">
                <Text size="2" weight="medium">Fat</Text>
                <StatRow label="Total" value={macrosGrouped.Fat.total} />
                <div style={{ paddingLeft: 8 }}>
                  {macrosGrouped.Fat.subs.map(([k, v]) => (
                    <StatRow key={k} label={`• ${k}`} value={v} compact />
                  ))}
                </div>
              </Card>
            </Grid>
          )}
        </SectionCard>

        {/* Personal / Edit */}
        <SectionCard title="Body Metrics">
          {!editing ? (
            <div>
              {Object.entries(personalInfo).map(([k, v]) => (
                <StatRow key={k} label={k} value={v} />
              ))}
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                Date of birth
                <input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm(f => ({ ...f, birth_date: e.target.value }))}
                  style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 8, border: "1px solid var(--gray-5)" }}
                />
              </label>

              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                Sex
                <select
                  value={form.sex}
                  onChange={(e) => setForm(f => ({ ...f, sex: e.target.value }))}
                  style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 8, border: "1px solid var(--gray-5)" }}
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>

              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                Height (cm)
                <input
                  type="number"
                  step="0.1"
                  value={form.height}
                  onChange={(e) => setForm(f => ({ ...f, height: e.target.value }))}
                  style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 8, border: "1px solid var(--gray-5)" }}
                />
              </label>

              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                Weight (kg)
                <input
                  type="number"
                  step="0.1"
                  value={form.weight}
                  onChange={(e) => setForm(f => ({ ...f, weight: e.target.value }))}
                  style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 8, border: "1px solid var(--gray-5)" }}
                />
              </label>

              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                Weekly Active Minutes
                <input
                  type="number"
                  value={form.active_time}
                  onChange={(e) => setForm(f => ({ ...f, active_time: e.target.value }))}
                  style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 8, border: "1px solid var(--gray-5)" }}
                />
                <Text size="1" color="gray">Minutes per week</Text>
              </label>

              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                Weight Goal
                <select
                  value={form.weight_goal_level}
                  onChange={(e) => setForm(f => ({ ...f, weight_goal_level: e.target.value }))}
                  style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 8, border: "1px solid var(--gray-5)" }}
                >
                  <option value="1">Fast Weight Loss</option>
                  <option value="2">Progressive Weight Loss</option>
                  <option value="3">Maintenance</option>
                  <option value="4">Progressive Weight Gain</option>
                  <option value="5">Fast Weight Gain</option>
                </select>
              </label>

              <Flex gap="2" mt="3">
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                <Button type="button" variant="soft" onClick={() => { setEditing(false); setError(null); }}>Cancel</Button>
              </Flex>

              {lastSaveInfo && (
                <Text size="1" color="gray" style={{ marginTop: 8, display: "block" }}>
                  Last save: {new Date(lastSaveInfo.ts).toLocaleString()}
                </Text>
              )}
            </form>
          )}
        </SectionCard>
      </Grid>

      {/* Micros */}
      <SectionCard
        title="Micronutrients"
        right={<Badge variant="soft" color="gray">From goals_v1</Badge>}
        sticky={false}
        style={{ marginTop: 16 }}
      >
        {!micros ? (
          <Text color="gray">Complete profile to compute micronutrients.</Text>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 12,
            }}
          >
            {/* Auto-balancing columns via CSS grid; switch to 2 cols on md */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 8,
              }}
              className="micros-grid"
            >
              {/* Split into two columns at ≥768px via CSS-in-JS */}
              <style>
                {`
                @media (min-width: 768px) {
                  .micros-grid {
                    grid-template-columns: 1fr 1fr;
                    column-gap: 16px;
                  }
                }
              `}
              </style>
              <div>
                {micros.slice(0, Math.ceil(micros.length / 2)).map(([k, v]) => (
                  <StatRow key={k} label={k} value={v} />
                ))}
              </div>
              <div>
                {micros.slice(Math.ceil(micros.length / 2)).map(([k, v]) => (
                  <StatRow key={k} label={k} value={v} />
                ))}
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {loading && (
        <Flex mt="3" align="center" gap="2">
          <InfoCircledIcon /> <Text color="gray">Loading…</Text>
        </Flex>
      )}
      {!loading && !rows.profile && !rows.goals && (
        <Text color="gray" mt="3">No metrics available — complete your measurements to generate a full report.</Text>
      )}
    </Container>
  );
}
