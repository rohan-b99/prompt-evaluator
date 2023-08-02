use super::ModelConfig;
use crate::{Args, RunOutput};
use anyhow::Result;
use async_openai::{
    config::OpenAIConfig,
    types::{ChatCompletionRequestMessageArgs, CreateChatCompletionRequestArgs, Role},
    Client,
};
use futures::StreamExt;
use std::io::Write;
use std::sync::mpsc::Sender;

pub fn run(
    prompt: &str,
    system: &str,
    variants: &[Vec<(&str, &str)>],
    model_configs: &[ModelConfig],
    sender: Sender<RunOutput>,
    args: &Args,
) -> Result<()> {
    let total = variants.len() * model_configs.len();

    let handle = match tokio::runtime::Handle::try_current() {
        Ok(handle) => handle,
        Err(_) => tokio::runtime::Runtime::new()?.handle().clone(),
    };

    handle.block_on(async {
        for (
            model_idx,
            ModelConfig {
                name, api_base_url, ..
            },
        ) in model_configs
            .iter()
            .filter(|config| !config.skip)
            .enumerate()
        {
            let config = OpenAIConfig::default().with_api_base(api_base_url);
            let client = Client::with_config(config);

            for (idx, variant_list) in variants.iter().enumerate() {
                let system_message = variant_list
                    .iter()
                    .fold(system.to_string(), |acc, (from, to)| acc.replace(from, to));

                let user_message = variant_list
                    .iter()
                    .fold(prompt.to_string(), |acc, (from, to)| acc.replace(from, to));

                tracing::info!(
                    "[{}/{}] running prompt {} with {}",
                    model_idx * variants.len() + (idx + 1),
                    total,
                    idx + 1,
                    name
                );

                let request = CreateChatCompletionRequestArgs::default()
                    .model(name)
                    .messages([
                        ChatCompletionRequestMessageArgs::default()
                            .content(&system_message)
                            .role(Role::System)
                            .build()?,
                        ChatCompletionRequestMessageArgs::default()
                            .content(&user_message)
                            .role(Role::User)
                            .build()?,
                    ])
                    .build()?;

                let mut stream = client.chat().create_stream(request).await?;
                let mut output = String::new();
                let mut lock = std::io::stdout().lock();

                while let Some(result) = stream.next().await {
                    match result {
                        Ok(response) => response.choices.iter().for_each(|chat_choice| {
                            if let Some(ref content) = chat_choice.delta.content {
                                output.push_str(&content);
                                if args.show_output {
                                    write!(lock, "{}", content).ok();
                                }
                            }
                        }),
                        Err(err) => tracing::error!("error: {err}"),
                    }
                    std::io::stdout().flush()?;
                }

                sender
                    .send(RunOutput {
                        name: name.to_string(),
                        system: system_message,
                        user: user_message,
                        response: output,
                    })
                    .ok();
            }
        }

        Ok(())
    })
}
