import { Card, Code, Divider, Stack } from "@mantine/core";
import { useAppStore } from "../store";

export default function Results() {
  const output = useAppStore(({ output }) => output);

  return (
    <>
      <Stack>
        {output.map(({ name, system, user, response }, i) => (
          <Card withBorder shadow="sm" key={i} p="xl">
            <Divider label="Model" />
            <Code>{name}</Code>
            <Divider label="System" />
            <Code block>{system}</Code>
            <Divider label="User" />
            <Code block>{user}</Code>
            <Divider label="Response" />
            <Code block sx={{ whiteSpace: "pre-line" }}>
              {response}
            </Code>
          </Card>
        ))}
      </Stack>
    </>
  );
}
