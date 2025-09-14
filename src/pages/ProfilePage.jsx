// src/pages/ProfilePage.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Button, Card, Container, Flex, Grid, Heading, Separator,
  Table, Text, TextField, Select, Callout, Badge
} from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useAuth } from '../auth/hooks/useAuth.js';
import { fetchUserEnergyRow } from '../api/goals.js';
import { loadProfileInputs, saveProfileInputs } from '../api/profile.js';

const ACTIVITY = [
  { key: 1, label: 'Inactive • <1h/wk', minutes: 60 },
  { key: 2, label: 'Lightly active • 1–3h/wk', minutes: 180 },
  { key: 3, label: 'Active • 4–6h/wk', minutes: 360 },
  { key: 4, label: 'Very active • 7–10h/wk', minutes: 600 },
  { key: 5, label: 'Extremely active • >10h/wk', minutes: 720 },
];
const GOALS = [
  { key: 1, label: 'Fast Weight Loss' },
  { key: 2, label: 'Progressive Weight Loss' },
  { key: 3, label: 'Maintenance' },
  { key: 4, label: 'Progressive Weight Gain' },
  { key: 5, label: 'Fast Weight Gain' },
];

export default function ProfilePage() {
  const { user } = useAuth();

  const [row, setRow] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // editable fields
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState('female');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [actLevel, setActLevel] = useState(1);
  const [goalLevel, setGoalLevel] = useState(3);

  const minutesForLevel = (lvl) => ACTIVITY.find(a => a.key === Number(lvl))?.minutes ?? 60;
  const labelForLevel = (lvl) => ACTIVITY.find(a => a.key === Number(lvl))?.label ?? '';

  const loadAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true); setErr('');
    try {
      const targets = await fetchUserEnergyRow(user.id);
      setRow(targets || null);

      const { metrics } = await loadProfileInputs(user.id);
      if (metrics) {
        setDob(metrics.dob ?? '');
        setSex(metrics.sex ?? 'female');
        setHeight(metrics.height_cm ?? '');
        setWeight(metrics.weight_kg ?? '');
        const m = Number(metrics.weekly_active_min ?? 0);
        const derived = m <= 60 ? 1 : m <= 180 ? 2 : m <= 360 ? 3 : m <= 600 ? 4 : 5;
        setActLevel(derived);
        setGoalLevel(Number(metrics.weight_goal_level ?? 3));
      }
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function onSave() {
    if (!user?.id) return;
    setLoading(true); setErr('');
    try {
      // recompute happens in saveProfileInputs (RPC + view read)
      const updated = await saveProfileInputs(user.id, {
        metrics: {
          dob: dob || null,
          sex,
          height_cm: height === '' ? null : Number(height),
          weight_kg: weight === '' ? null : Number(weight),
          weekly_active_min: minutesForLevel(actLevel),
          weight_goal_level: Number(goalLevel),
        },
        // keep backend signature happy; not shown in UI
        prefs: { meals_per_day: 3, meal_times: ['08:00','13:00','19:00'] },
      });
      setRow(updated || null);
      setEditing(false);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const facts = useMemo(() => [
    ['Date of birth', dob || '—'],
    ['Sex', sex],
    ['Height', height ? `${height} cm` : '—'],
    ['Weight', weight ? `${weight} kg` : '—'],
    ['Activity', labelForLevel(row?.activity_level ?? actLevel) || '—'],
    ['Goal', GOALS.find(g => g.key === Number(goalLevel))?.label ?? '—'],
  ], [dob, sex, height, weight, row?.activity_level, actLevel, goalLevel]);

  return (
    <Container py="6" size="3">
      <Flex align="center" justify="between" mb="4">
        <Heading>Profile</Heading>
        {editing ? (
          <Flex gap="2">
            <Button variant="soft" onClick={() => { setEditing(false); loadAll(); }} disabled={loading}>Cancel</Button>
            <Button onClick={onSave} disabled={loading}>{loading ? 'Saving…' : 'Save changes'}</Button>
          </Flex>
        ) : (
          <Button variant="soft" onClick={() => setEditing(true)}>Edit</Button>
        )}
      </Flex>

      {err && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
          <Callout.Text>{err}</Callout.Text>
        </Callout.Root>
      )}

      {/* Overview card */}
      <Card size="3" mb="5">
        <Flex justify="between" align="center" mb="3">
          <Heading size="4">Your details</Heading>
          <Flex gap="2">
            <Badge color="gray" variant="soft">{facts[2][1]}</Badge>
            <Badge color="gray" variant="soft">{facts[3][1]}</Badge>
          </Flex>
        </Flex>

        {!editing && (
          <Grid columns={{ initial:'1', sm:'2', md:'3' }} gap="4">
            {facts.map(([k, v]) => (
              <Box key={k}>
                <Text size="1" color="gray" style={{ textTransform:'uppercase', letterSpacing: '.06em' }}>{k}</Text>
                <div style={{ marginTop: 4 }}><Text weight="bold">{String(v)}</Text></div>
              </Box>
            ))}
          </Grid>
        )}

        {editing && (
          <>
            <Separator my="4" />
            <Grid columns={{ initial:'1', sm:'2' }} gap="4">
              <Box>
                <Text size="1" color="gray" style={{ textTransform:'uppercase' }}>Date of birth</Text>
                <input
                  type="date"
                  value={dob ?? ''}
                  onChange={(e) => setDob(e.target.value)}
                  className="rt-TextFieldRoot rt-r-size-2"
                  style={{ width:'100%', marginTop: 6 }}
                />
              </Box>

              <Box>
                <Text size="1" color="gray" style={{ textTransform:'uppercase' }}>Sex</Text>
                <Select.Root value={sex} onValueChange={setSex}>
                  <Select.Trigger style={{ marginTop: 6 }} />
                  <Select.Content>
                    <Select.Item value="female">female</Select.Item>
                    <Select.Item value="male">male</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Box>

              <Box>
                <Text size="1" color="gray" style={{ textTransform:'uppercase' }}>Height (cm)</Text>
                <TextField.Root
                  inputMode="decimal"
                  value={String(height ?? '')}
                  onChange={(e) => setHeight(e.target.value)}
                  style={{ marginTop: 6 }}
                />
              </Box>

              <Box>
                <Text size="1" color="gray" style={{ textTransform:'uppercase' }}>Weight (kg)</Text>
                <TextField.Root
                  inputMode="decimal"
                  value={String(weight ?? '')}
                  onChange={(e) => setWeight(e.target.value)}
                  style={{ marginTop: 6 }}
                />
              </Box>

              <Box>
                <Text size="1" color="gray" style={{ textTransform:'uppercase' }}>Activity level</Text>
                <Select.Root value={String(actLevel)} onValueChange={(v) => setActLevel(Number(v))}>
                  <Select.Trigger style={{ marginTop: 6 }} />
                  <Select.Content>
                    {ACTIVITY.map(a => <Select.Item key={a.key} value={String(a.key)}>{a.label}</Select.Item>)}
                  </Select.Content>
                </Select.Root>
                <Text size="1" color="gray">Used for TDEE, water, and macro splits.</Text>
              </Box>

              <Box>
                <Text size="1" color="gray" style={{ textTransform:'uppercase' }}>Goal</Text>
                <Select.Root value={String(goalLevel)} onValueChange={(v) => setGoalLevel(Number(v))}>
                  <Select.Trigger style={{ marginTop: 6 }} />
                  <Select.Content>
                    {GOALS.map(g => <Select.Item key={g.key} value={String(g.key)}>{g.label}</Select.Item>)}
                  </Select.Content>
                </Select.Root>
              </Box>
            </Grid>
          </>
        )}
      </Card>

      {/* Targets */}
      <Heading size="4" mb="3">Recommended daily targets</Heading>
      {!row && <Text color="gray">No targets yet. Enter details and save.</Text>}
      {row && (
        <Card size="3">
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Age</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>BMR</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Activity</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Water (ml)</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>TDEE</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Target kcal</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Protein</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Carbs</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Fat</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              <Table.Row>
                <Table.Cell>{row.age_years}</Table.Cell>
                <Table.Cell>{Math.round(row.bmr_kcal)}</Table.Cell>
                <Table.Cell>{labelForLevel(row.activity_level)}</Table.Cell>
                <Table.Cell>{row.water_ml}</Table.Cell>
                <Table.Cell>{row.tdee_kcal}</Table.Cell>
                <Table.Cell>{row.target_kcal}</Table.Cell>
                <Table.Cell>{row.protein_g} g</Table.Cell>
                <Table.Cell>{row.carbs_g} g</Table.Cell>
                <Table.Cell>{row.fat_g} g</Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table.Root>
        </Card>
      )}
    </Container>
  );
}
