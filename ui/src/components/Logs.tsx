import { Flex, Code } from "@mantine/core";
import { listen } from "@tauri-apps/api/event";
import { ansiToHtml } from "anser";
import { useEffect, useRef } from "react";

export default function Logs() {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const unlisten = listen<string>("log", (event) => {
      if (ref.current) {
        ref.current.innerHTML += ansiToHtml(event.payload);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <Flex direction="column" w="100%" align="center">
      <Code ref={ref} block w="100%" sx={{ whiteSpace: "pre-line" }}>
        <></>
      </Code>
    </Flex>
  );
}
