import { useForm } from "@mantine/form";
import { Input, Output, useAppStore } from "../store";
import {
  Box,
  TextInput,
  Group,
  Button,
  ActionIcon,
  Textarea,
  Divider,
  Flex,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api";
import { listen } from "@tauri-apps/api/event";
import { notifications } from "@mantine/notifications";

export default function Editor() {
  const input = useAppStore(({ input }) => input) as Input;
  const setOutput = useAppStore(({ setOutput }) => setOutput);
  const { setActiveTab } = useAppStore(({ setActiveTab }) => ({
    setActiveTab,
  }));

  type Variables = typeof input.variables;

  const initialValues = {
    ...input,
    variables: Object.entries(input.variables).map(([key, values]) => ({
      key,
      values,
    })),
  };

  const valuesRef = useRef<typeof form.values>();
  const form = useForm({ initialValues });
  valuesRef.current = form.values;

  const [running, setRunning] = useState(false);

  const run = useCallback(() => {
    const json = JSON.stringify({
      ...valuesRef.current,
      variables: valuesRef.current?.variables.reduce((a, c) => {
        a[c.key] = c.values;
        return a;
      }, {} as Variables),
    });

    invoke("run", { json });
    setRunning(true);
    setTimeout(() => setActiveTab("Logs"), 1000);
  }, [setActiveTab]);

  useEffect(() => {
    const unlisten = listen<string>("done", (event) => {
      setRunning(false);

      const output: Output[] = event.payload
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));

      notifications.show({
        title: "Run complete",
        message: `${output.length} outputs generated`,
      });

      setOutput(output);
      setTimeout(() => setActiveTab("Results"), 1000);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setActiveTab, setOutput]);

  return (
    <Box my="sm">
      <form>
        <Box>
          <Textarea
            label="System Prompt"
            placeholder="Enter a system prompt"
            autosize
            {...form.getInputProps("system")}
          />
          <Textarea
            label="Prompt"
            placeholder="Enter a prompt"
            autosize
            {...form.getInputProps("prompt")}
          />
        </Box>
        <Group grow align="top">
          <Box>
            <Flex align="center">
              <label>Variables</label>
              <Button
                my="sm"
                ml="sm"
                variant="outline"
                compact
                onClick={() =>
                  form.insertListItem("variables", { key: "", values: [""] })
                }
                rightIcon={<IconPlus size={16} />}
              >
                Add
              </Button>
            </Flex>

            {Object.keys(form.values.variables).map((key, index) => (
              <Flex key={key} my="sm" gap="md" align="start">
                <Flex direction="column">
                  <TextInput
                    placeholder="Variable name"
                    {...form.getInputProps(`variables.${index}.key`)}
                    rightSection={
                      <ActionIcon
                        color="red"
                        onClick={() => form.removeListItem("variables", index)}
                      >
                        <IconTrash size="1rem" />
                      </ActionIcon>
                    }
                  />
                  <Button
                    my="sm"
                    rightIcon={<IconPlus size={16} />}
                    onClick={() =>
                      form.insertListItem(`variables.${index}.values`, "")
                    }
                  >
                    Add value
                  </Button>
                </Flex>
                <Divider orientation="vertical" />
                <Flex direction="column" gap="sm" w="100%">
                  {form.values.variables[index].values.map((_, valueIndex) => (
                    <Group key={valueIndex}>
                      <Textarea
                        w="100%"
                        autosize
                        placeholder="Variable value"
                        {...form.getInputProps(
                          `variables.${index}.values.${valueIndex}`
                        )}
                        rightSection={
                          <ActionIcon
                            color="red"
                            onClick={() =>
                              form.removeListItem(
                                `variables.${index}.values`,
                                valueIndex
                              )
                            }
                          >
                            <IconTrash size="1rem" />
                          </ActionIcon>
                        }
                      />
                    </Group>
                  ))}
                </Flex>
              </Flex>
            ))}
          </Box>
          <Box>
            <Flex align="center">
              <label>Local Models</label>
              <Button
                my="sm"
                ml="sm"
                variant="outline"
                compact
                rightIcon={<IconPlus size={16} />}
                onClick={() =>
                  form.insertListItem("localModels", {
                    path: "",
                    templatePath: "",
                    architecture: "",
                  })
                }
              >
                Add
              </Button>
            </Flex>
            <Flex direction="column" gap="md">
              {form.values.localModels.map((_, index) => (
                <Flex key={index} direction="column">
                  <TextInput
                    label="Model path"
                    {...form.getInputProps(`localModels.${index}.path`)}
                    rightSection={
                      <ActionIcon
                        color="red"
                        onClick={() =>
                          form.removeListItem("localModels", index)
                        }
                      >
                        <IconTrash size="1rem" />
                      </ActionIcon>
                    }
                  />
                  <TextInput
                    label="Model template path"
                    {...form.getInputProps(`localModels.${index}.templatePath`)}
                  />
                  <TextInput
                    label="Model architecture"
                    placeholder="llama"
                    {...form.getInputProps(`localModels.${index}.architecture`)}
                  />
                </Flex>
              ))}
            </Flex>
            <Flex align="center">
              <label>Remote Models</label>
              <Button
                my="sm"
                ml="sm"
                variant="outline"
                compact
                rightIcon={<IconPlus size={16} />}
                onClick={() =>
                  form.insertListItem("remoteModels", {
                    name: "",
                    apiBaseUrl: "",
                  })
                }
              >
                Add
              </Button>
            </Flex>
            <Flex direction="column" gap="md">
              {form.values.remoteModels.map((_, index) => (
                <Flex key={index} direction="column">
                  <TextInput
                    label="Model name"
                    {...form.getInputProps(`remoteModels.${index}.name`)}
                    rightSection={
                      <ActionIcon
                        color="red"
                        onClick={() =>
                          form.removeListItem("remoteModels", index)
                        }
                      >
                        <IconTrash size="1rem" />
                      </ActionIcon>
                    }
                  />
                  <TextInput
                    label="API base URL"
                    {...form.getInputProps(`remoteModels.${index}.apiBaseUrl`)}
                  />
                </Flex>
              ))}
            </Flex>
          </Box>
        </Group>

        <Group position="right" mt="md">
          <Button loading={running} onClick={run}>
            Run
          </Button>
        </Group>
      </form>
    </Box>
  );
}
