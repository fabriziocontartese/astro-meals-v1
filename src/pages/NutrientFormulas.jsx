// filepath: /Users/yaguarete/Desktop/astro-meals-v1/src/pages/NutrientFormulas.jsx

import React from "react";
import { Container, Heading, Text, Card, Separator, Grid, Code, Callout } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";

/**
 * NutrientFormulas
 * Plain-language reference of every calculation used in ASTRO Meals.
 * Mirrors logic in utils/profileTransforms.js (computeRecommendedCalories, computeMacroDetails, computeMicrosFromRules).
 */

function Rule({ title, children }) {
  return (
    <Card size="3">
      <Heading size="4" style={{ marginTop: 0 }}>{title}</Heading>
      <Separator my="3" />
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </Card>
  );
}

function Bullet({ children }) {
  return <Text as="p" size="2">• {children}</Text>;
}

export default function NutrientFormulas() {
  return (
    <Container size="3" px="4" py="6" style={{ maxWidth: "min(1120px, 92vw)" }}>
      <Heading>Formula Reference</Heading>
      <Text size="2" color="gray">Units shown per day unless stated. Values are targets, not medical advice.</Text>

      <Grid columns={{ initial: "1", md: "2" }} gap="4" mt="4">
        {/* ENERGY */}
        <Rule title="Energy">
          <Bullet><b>BMR</b>: Mifflin-St Jeor. <Code>10·weight(kg) + 6.25·height(cm) − 5·age + sexAdj</Code>,
          where <Code>sexAdj = +5</Code> for male, <Code>−161</Code> for female.</Bullet>
          <Bullet><b>TDEE</b>: <Code>BMR × activityFactor</Code>.
            Activity factors by weekly active minutes:
            1:1.2 (&le;60), 2:1.375 (&le;180), 3:1.55 (&le;360), 4:1.725 (&le;600), 5:1.9 (&gt;600).</Bullet>
          <Bullet><b>Recommended Calories</b>: <Code>round(TDEE + goalAdj)</Code>.
            Goal adj by level 1..5 → {`{1:-500, 2:-250, 3:0, 4:+250, 5:+500}`} kcal.</Bullet>
          <Bullet><b>Water</b>: <Code>weight(kg) × 40 ml</Code> then multiply by activity multiplier
            {` {1:0.9, 2:1, 3:1.125, 4:1.25, 5:1.4}`}.
          </Bullet>
        </Rule>

        {/* MACROS */}
        <Rule title="Macronutrients">
          <Bullet><b>Protein (%)</b> comes from weight goal level:
            {` {1:40%, 2:35%, 3:30%, 4:30%, 5:35%}`}.
            <b>Protein (g)</b> = <Code>(kcal × protein%) / 4</Code>.</Bullet>
          <Bullet><b>Fat (%)</b> comes from activity level:
            {` {1:20%, 2:25%, 3:30%, 4:30%, 5:30%}`}.
            <b>Fat (g)</b> = <Code>(kcal × fat%) / 9</Code>.</Bullet>
          <Bullet><b>Carbs (g)</b> fill remaining energy:
            <Code>(kcal − (Protein_g×4 + Fat_g×9)) / 4</Code>.</Bullet>
        </Rule>

        {/* CARB SUBTYPES */}
        <Rule title="Carbohydrate Subtypes">
          <Bullet><b>Sugar (g)</b>: <Code>(kcal / 1000) × 10</Code>.</Bullet>
          <Bullet><b>Fiber (g)</b>: <Code>(kcal / 1000) × 14</Code>.</Bullet>
          <Bullet><b>Starch (g)</b>: <Code>Carbs_total − Sugar − Fiber</Code> (min 0).</Bullet>
        </Rule>

        {/* FAT SUBTYPES */}
        <Rule title="Fatty Acid Subtypes">
          <Bullet><b>Polyunsaturated (g)</b>: <Code>Fat_total × 0.30</Code>.</Bullet>
          <Bullet><b>Saturated (g)</b>: <Code>Fat_total × 0.16</Code>.</Bullet>
          <Bullet><b>Trans (g)</b>: <Code>0</Code>.</Bullet>
          <Bullet><b>Monounsaturated (g)</b>: remainder
            <Code> = Fat_total − Saturated − Poly − Trans</Code> (min 0).</Bullet>
        </Rule>

        {/* MICROS A */}
        <Rule title="Vitamins">
          <Bullet><b>Vitamin A (μg)</b>: male 900, female 700.</Bullet>
          <Bullet><b>Vitamin B1 Thiamin (mg)</b>: ≤50 → 1.3, &gt;50 → 1.5. (User rule.)</Bullet>
          <Bullet><b>Vitamin B6 (mg)</b>: ≤50 → 1.3, &gt;50 → 1.5. (User rule.)</Bullet>
          <Bullet><b>Vitamin B12 (μg)</b>: 2.44.</Bullet>
          <Bullet><b>Vitamin C (mg)</b>: male 90, female 75.</Bullet>
          <Bullet><b>Vitamin D (μg)</b>: ≤70 → 15, &gt;70 → 20.</Bullet>
          <Bullet><b>Vitamin E (mg)</b>: 15.</Bullet>
          <Bullet><b>Vitamin K (μg)</b>: male 120, female 90.</Bullet>
          <Separator my="2" />
          <Bullet><b>Synonyms shown in app</b> (sex-based where noted):
            Thiamin (mg) male 1.2 / female 1.1; Riboflavin (mg) male 1.3 / female 1.1; Niacin (mg) male 16 / female 14;
            Folate (μg) 400; Pantothenic Acid (mg) 5; Biotin (μg) 30.</Bullet>
        </Rule>

        {/* MICROS B */}
        <Rule title="Minerals and Others">
          <Bullet><b>Choline (mg)</b>: male 550, female 425.</Bullet>
          <Bullet><b>Calcium (mg)</b>:
            ≤50 → 1000; 51–70 → male 1000 / female 1200; &gt;70 → 1200.</Bullet>
          <Bullet><b>Chloride (mg)</b>: ≤50 → 2300; 51–70 → 2000; &gt;70 → 1800.</Bullet>
          <Bullet><b>Chromium (μg)</b>: ≤50 → male 35 / female 25; &gt;50 → male 30 / female 20.</Bullet>
          <Bullet><b>Copper (mg)</b>: 0.9.</Bullet>
          <Bullet><b>Fluoride (mg)</b>: male 4, female 3.</Bullet>
          <Bullet><b>Iodine (μg)</b>: 150.</Bullet>
          <Bullet><b>Iron (mg)</b>: ≤50 → male 8 / female 18; &gt;50 → 8.</Bullet>
          <Bullet><b>Magnesium (mg)</b>: ≤50 → male 400 / female 310; &gt;50 → male 420 / female 320.</Bullet>
          <Bullet><b>Manganese (mg)</b>: male 2.3, female 1.8.</Bullet>
          <Bullet><b>Molybdenum (μg)</b>: 45.</Bullet>
          <Bullet><b>Phosphorus (mg)</b>: 700.</Bullet>
          <Bullet><b>Potassium (mg)</b>: male 3400, female 2600. <i>(Per your spec.)</i></Bullet>
          <Bullet><b>Selenium (μg)</b>: 55.</Bullet>
          <Bullet><b>Sodium (mg)</b>: 1500. <i>(Per your spec.)</i></Bullet>
          <Bullet><b>Zinc (mg)</b>: male 11, female 8.</Bullet>
        </Rule>
      </Grid>

      <Callout.Root color="gray" mt="4">
        <Callout.Icon><InfoCircledIcon /></Callout.Icon>
        <Callout.Text>
          Open questions to confirm: 1) Sugar = (kcal/1000)*10 is intentional? 2) Potassium 3400/2600 and Sodium 1500 remain final?
          3) B2/B3/B5/B9 were “coming soon”. Keep nulls until specified? 4) Copper shown as 0.9 mg, not 900 mg.
        </Callout.Text>
      </Callout.Root>
    </Container>
  );
}
