import { useCallback, useState } from "react";
import { Group, Text, useMantineTheme, rem, Flex } from "@mantine/core";
import { IconUpload, IconX, IconFile } from "@tabler/icons-react";
import { TablerIconsProps } from "@tabler/icons-react";
import { Dropzone, DropzoneProps } from "@mantine/dropzone";
import { FileRejection, FileWithPath } from "@mantine/dropzone";
import { notifications } from "@mantine/notifications";
import { invoke } from "@tauri-apps/api/tauri";
import { useAppStore } from "../store";

export default function OpenFile(props: Partial<DropzoneProps>) {
  const theme = useMantineTheme();
  const [loading, setLoading] = useState(false);

  const setRootState = useAppStore((state) => state.setInput);

  const openFile = useCallback(
    async (file: FileWithPath) => {
      setLoading(true);
      const json = await file.text();

      try {
        await invoke("load", { json });
        notifications.show({ message: "Loaded input", color: "green" });
        setRootState(JSON.parse(json));
      } catch (e) {
        notifications.show({
          title: "Error loading JSON file",
          message: e as string,
          color: "red",
          autoClose: false,
        });
      }

      setLoading(false);
    },
    [setRootState]
  );

  const showError = useCallback(
    (files: FileRejection[]) =>
      notifications.show({
        title: "Not a JSON file",
        message: files.map(
          ({ file, errors }) =>
            `${file.name}: ${errors.map((error) => error.message).join(", ")}`
        ),
        color: "red",
        autoClose: false,
      }),
    []
  );

  const iconProps: TablerIconsProps = { size: "3.2rem", stroke: 1.5 };
  const iconVariant = theme.colorScheme === "dark" ? 4 : 6;

  return (
    <Flex h="80vh" align="center" justify="center">
      <Dropzone
        loading={loading}
        onDrop={(files) => {
          openFile(files[0]);
        }}
        onReject={showError}
        accept={["application/json"]}
        {...props}
      >
        <Group
          position="center"
          spacing="xl"
          style={{ minHeight: rem(220), pointerEvents: "none" }}
        >
          <Dropzone.Accept>
            <IconUpload
              {...iconProps}
              color={theme.colors[theme.primaryColor][iconVariant]}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX {...iconProps} color={theme.colors.red[iconVariant]} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconFile {...iconProps} />
          </Dropzone.Idle>
          <Text size="xl" inline>
            Drag JSON file here or click to select file
          </Text>
        </Group>
      </Dropzone>
    </Flex>
  );
}
