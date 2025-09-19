import { Box, Container, Text } from '@radix-ui/themes';

export default function Footer() {
  return (
    <Box asChild className="footer">
      <footer>
        <Container>
          <Text align="center" py="4" size="2" color="gray">
            © 2023 ASTRO Meals. All rights reserved.
          </Text>
        </Container>
      </footer>
    </Box>
  );
}
