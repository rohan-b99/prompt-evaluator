import { Flex, Code } from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { listen } from "@tauri-apps/api/event";
import { ansiToHtml } from "anser";
import { useEffect } from "react";

export default function Logs() {
  const [logParts, logPartsHandlers] = useListState<string>([]);

  useEffect(() => {
    const unlisten = listen<string>("log", (event) =>
      logPartsHandlers.append(event.payload)
    );

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [logPartsHandlers]);

  return (
    <Flex direction="column" w="100%" align="center">
      {logParts.length === 0 ? (
        <span>No logs yet</span>
      ) : (
        <Code block>
          {logParts.map((part, idx) => (
            <span
              key={idx}
              dangerouslySetInnerHTML={{ __html: ansiToHtml(part) }}
            ></span>
          ))}
        </Code>
      )}
    </Flex>
  );
}
