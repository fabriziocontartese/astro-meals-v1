// src/pages/LandingPage.jsx
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Grid,
  Heading,
  Text,
} from "@radix-ui/themes";
import {
  StarIcon,
  EyeOpenIcon,
  TargetIcon,
  ReaderIcon,
  CalendarIcon,
  LightningBoltIcon,
} from "@radix-ui/react-icons";

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <Box asChild>
        <section>
          <Container size="4" px="4" py="6">
            <Flex direction="column" align="center" gap="8">
              <Heading size="9" align="center" style={{ letterSpacing: -1 }}>
                Automate Your Nutrition
              </Heading>
              <Text
                size="4"
                align="center"
                color="gray"
                style={{ maxWidth: 800 }}
              >
                ASTRO builds custom meal schedules that will save you time and
                money. <br></br>A perfect diet, on autopilot.
              </Text>
            </Flex>
          </Container>
        </section>
      </Box>

      {/* Features */}
      <Box asChild>
        <section>
          <Container size="4" px="4" py="6">
            <Grid columns={{ initial: "1", sm: "2", md: "4" }} gap="4">
              <Feature
                icon={<TargetIcon />}
                title="Personalized Nutrition"
                desc="Plans tailored to your goals, body, and dietary preferences."
              />
              <Feature
                icon={<ReaderIcon />}
                title="Recipe Library"
                desc="Use your own recipes and discover new ones."
              />
              <Feature
                icon={<CalendarIcon />}
                title="Smart Scheduling"
                desc="Drag and drop meals into your weekly calendar."
              />
              <Feature
                icon={<LightningBoltIcon />}
                title="Quick Export"
                desc="Create grocery lists in one click."
              />
            </Grid>
          </Container>
        </section>
      </Box>

      {/* Call To Action */}
      <Box asChild>
        <section>
          <Container size="4" px="4" py="7">
            <Flex direction="column" align="center" gap="3">
              <Heading size="6" align="center">
                Ready to level up your routine?
              </Heading>
              <Flex gap="3" wrap="wrap" mt="3">
                <Button size="3" variant="solid" asChild>
                  <Link to="/profile?demo=1">Get Started</Link>
                </Button>
                <Button size="3" variant="soft" asChild>
                  <Link to="/demo">
                    <EyeOpenIcon /> See Demo
                  </Link>
                </Button>
              </Flex>
            </Flex>
          </Container>
        </section>
      </Box>
    </>
  );
}

/* --- small helpers --- */
function Stat({ value, label }) {
  return (
    <Flex direction="column" align="center">
      <Heading size="6">{value}</Heading>
      <Text size="2" color="gray">
        {label}
      </Text>
    </Flex>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <Card size="3" style={{ height: "100%" }}>
      <Flex direction="column" gap="2">
        <Flex
          align="center"
          justify="center"
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            border: "1px solid var(--gray-5)",
          }}
        >
          {icon}
        </Flex>
        <Heading size="3">{title}</Heading>
        <Text size="2" color="gray">
          {desc}
        </Text>
      </Flex>
    </Card>
  );
}
