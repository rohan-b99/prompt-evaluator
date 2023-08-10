# prompt-evaluator

CLI + UI tool for generating and running variants of prompts against both local LLMs (via https://github.com/rustformers/llm) and remote APIs (currently only OpenAI or OpenAI-compatible servers)

## Installation

### Without GPU acceleration (CPU-only):

`cargo install --locked https://github.com/rohan-b99/prompt-evaluator`

### With GPU acceleration:

Follow the setup here for the appropriate backend: [LLM Acceleration Support](https://github.com/rustformers/llm/blob/main/doc/acceleration-support.md)

Then install with one of the matching features:

`cargo install --locked --features cublas https://github.com/rohan-b99/prompt-evaluator`

`cargo install --locked --features clblast https://github.com/rohan-b99/prompt-evaluator`

`cargo install --locked --features metal https://github.com/rohan-b99/prompt-evaluator`

## How to use

Prepare a JSON file following the format shown in `samples/top-cities.json`.

Local models must be in GGML format.

If using models on the OpenAI API, make sure the environment variable `OPENAI_API_KEY` is set.

### CLI mode:

The command below will append each output to `output.ndjson`, use GPU acceleration if available, and stream response output to the terminal.

`prompt-evaluator [input.json] -o output.ndjson --use-gpu --show-output`

### UI Mode (WIP):

<details>

<summary>Screenshots</summary>

<img src="https://github.com/rohan-b99/prompt-evaluator/assets/43239788/dfae3051-1f5f-439a-b130-69d6c24e3db9" width="1000"/>

<img src="https://github.com/rohan-b99/prompt-evaluator/assets/43239788/62dcad8f-3c22-4fd9-a56e-452ca475dae6" width="1000"/>

<img src="https://github.com/rohan-b99/prompt-evaluator/assets/43239788/80bc085e-6b48-4d8a-abf5-87b23110525a" width="1000"/>

</details>

`npm run --prefix ui dev`

`cargo run --release --features cublas -- --use-gpu ui`

## Developing

### UI

Run `cargo tauri dev --no-watch -- -- ui`

## License

This project is released under the MIT License.

## Contributing

If you find any issues or have suggestions for improvements, please feel free to open an issue or submit a pull request on the GitHub repository.
