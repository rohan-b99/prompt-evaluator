import { Card, Code, Space, Stack } from "@mantine/core";
import { useAppStore } from "../store";

export default function Results() {
  const output = useAppStore(({ output }) => output);

  return (
    <>
      <Stack>
        {output.map(({ name, system, user, response }, i) => (
          <Card withBorder shadow="sm" key={i} p="xl">
            <Card.Section>
              <b>{name}</b>
            </Card.Section>
            <Space my="sm" />
            <Code block>{system}</Code>
            <Code block>{user}</Code>
            <Code block>{response}</Code>
          </Card>
        ))}
      </Stack>
    </>
  );
}
