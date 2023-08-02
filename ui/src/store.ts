import { create } from "zustand";

export interface LocalModel {
  path: string;
  templatePath: string;
  architecture: string;
}

export interface RemoteModel {
  name: string;
  apiBaseUrl: string;
}

export interface Input {
  prompt: string;
  system: string;
  variables: { [key: string]: string[] };
  localModels: LocalModel[];
  remoteModels: RemoteModel[];
}

export interface Output {
  name: string;
  system: string;
  user: string;
  response: string;
}

interface State {
  input: null | Input;
  output: Output[];
  setInput: (input: Input) => void;
  setOutput: (results: Output[]) => void;
}

export const useAppStore = create<State>((set) => ({
  input: null,
  output: [],
  setInput: (input) => set(() => ({ input })),
  setOutput: (output) => set(() => ({ output })),
}));
