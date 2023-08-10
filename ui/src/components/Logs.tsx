import { Flex, Code } from "@mantine/core";
import { listen } from "@tauri-apps/api/event";
import { ansiToHtml } from "anser";
import { useEffect, useRef } from "react";

export default function Logs() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const codeRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const unlisten = listen<string>("log", (event) => {
      if (codeRef.current) {
        codeRef.current.innerHTML += ansiToHtml(event.payload);
        rootRef.current?.scrollIntoView(false);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <Flex ref={rootRef} direction="column" w="100%" align="center">
      <Code
        ref={codeRef}
        block
        w="100%"
        h="100%"
        sx={{ overflow: "auto", maxHeight: "95%", whiteSpace: "pre" }}
      >
        <></>
      </Code>
    </Flex>
  );
}
