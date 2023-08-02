import {
  AppShell,
  Box,
  ColorScheme,
  ColorSchemeProvider,
  Container,
  Divider,
  Group,
  MantineProvider,
  NavLink,
  Navbar,
} from "@mantine/core";
import { useColorScheme, useHotkeys, useLocalStorage } from "@mantine/hooks";
import OpenFile from "./components/OpenFile";
import { Notifications } from "@mantine/notifications";
import { useAppStore } from "./store";
import Logs from "./components/Logs";
import Editor from "./components/Editor";
import Results from "./components/Results";
import { useState } from "react";
import ThemeSwitcher from "./components/ThemeSwitcher";

const tabs = ["Editor", "Logs", "Results"] as const;
type AppTab = (typeof tabs)[number];

export default function App() {
  const preferredColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useLocalStorage<ColorScheme>({
    key: "mantine-color-scheme",
    defaultValue: preferredColorScheme,
    getInitialValueInEffect: true,
  });

  const toggleColorScheme = (value?: ColorScheme) =>
    setColorScheme(value || (colorScheme === "dark" ? "light" : "dark"));

  useHotkeys([["mod+J", () => toggleColorScheme()]]);

  const input = useAppStore(({ input }) => input);
  const [active, setActive] = useState<AppTab>("Editor");

  return (
    <ColorSchemeProvider
      colorScheme={colorScheme}
      toggleColorScheme={toggleColorScheme}
    >
      <MantineProvider
        theme={{ colorScheme }}
        withGlobalStyles
        withNormalizeCSS
      >
        <Notifications position="top-right" />

        <AppShell
          navbar={
            <Navbar p="xs" width={{ base: 200 }}>
              <Navbar.Section mt="xs">
                <Group>
                  <p>Prompt Evaluator</p>
                  <ThemeSwitcher />
                </Group>
                <Divider />
                {tabs.map((tab) => (
                  <NavLink
                    key={tab}
                    label={tab}
                    active={active === tab}
                    onClick={() => setActive(tab)}
                  />
                ))}
              </Navbar.Section>
            </Navbar>
          }
        >
          <Container fluid>
            {input ? (
              <>
                <Box display={active === "Editor" ? "block" : "none"}>
                  <Editor />
                </Box>
                <Box display={active === "Logs" ? "block" : "none"}>
                  <Logs />
                </Box>
                <Box display={active === "Results" ? "block" : "none"}>
                  <Results />
                </Box>
              </>
            ) : (
              <OpenFile />
            )}
          </Container>
        </AppShell>
      </MantineProvider>
    </ColorSchemeProvider>
  );
}
