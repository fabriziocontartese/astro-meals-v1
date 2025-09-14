// src/pages/RecipesPage.jsx
import { Container, Heading, Text } from "@radix-ui/themes";
export default function RecipesPage() {
  return (
    <Container py="5">
      <Heading>Recipes</Heading>
      <Text size="2" color="gray">
        List, add, and view recipes.
      </Text>
    </Container>
  );
}
