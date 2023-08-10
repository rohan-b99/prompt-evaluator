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
import ThemeSwitcher from "./components/ThemeSwitcher";

const tabs = ["Editor", "Logs", "Results"] as const;
export type AppTab = (typeof tabs)[number];

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
  const { activeTab, setActiveTab } = useAppStore(
    ({ activeTab, setActiveTab }) => ({ activeTab, setActiveTab })
  );

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
                    active={activeTab === tab}
                    onClick={() => setActiveTab(tab)}
                  />
                ))}
              </Navbar.Section>
            </Navbar>
          }
        >
          <Container fluid>
            {input ? (
              <>
                <Box display={activeTab === "Editor" ? "block" : "none"}>
                  <Editor />
                </Box>
                <Box display={activeTab === "Logs" ? "block" : "none"}>
                  <Logs />
                </Box>
                <Box display={activeTab === "Results" ? "block" : "none"}>
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
