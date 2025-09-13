// src/components/Footer.jsx
import { Container } from "@radix-ui/themes";

export default function Footer() {
  return (
    <footer>
      <Container size="3" py="3" style={{ textAlign: "center" }}>
        <p>© {new Date().getFullYear()} ASTRO Meals</p>
      </Container>
    </footer>
  );
}
