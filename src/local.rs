use crate::{Args, RunOutput};
use anyhow::{Context, Result};
use llm::{
    InferenceError, InferenceFeedback, InferenceParameters, InferenceRequest, InferenceResponse,
    Model, ModelArchitecture, ModelParameters,
};
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::sync::mpsc::Sender;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelConfig {
    path: PathBuf,
    architecture: String,
    template_path: PathBuf,
    #[serde(default)]
    skip: bool,
}

pub fn run(
    prompt: &str,
    system: &str,
    variants: &[Vec<(&str, &str)>],
    model_configs: &[ModelConfig],
    sender: Sender<RunOutput>,
    args: &Args,
) -> Result<()> {
    for ModelConfig { architecture, .. } in model_configs {
        ModelArchitecture::from_str(architecture)
            .with_context(|| format!("invalid model architecture: {}", architecture))?;
    }

    let total = variants.len() * model_configs.len();

    for (
        model_idx,
        ModelConfig {
            path,
            architecture,
            template_path,
            ..
        },
    ) in model_configs
        .iter()
        .filter(|config| !config.skip)
        .enumerate()
    {
        let template = std::fs::read_to_string(template_path).context("reading template")?;

        tracing::info!("loading model from {}", path.display());

        let model = load_model(&architecture, &path, args.use_gpu).context("loading model")?;

        for (idx, variant_list) in variants.iter().enumerate() {
            let system_message = variant_list
                .iter()
                .fold(system.to_string(), |acc, (from, to)| acc.replace(from, to));

            let user_message = variant_list
                .iter()
                .fold(prompt.to_string(), |acc, (from, to)| acc.replace(from, to));

            let prompt_in_template = template
                .replace("{{SYSTEM}}", &system_message)
                .replace("{{PROMPT}}", &user_message);

            tracing::info!(
                "[{}/{}] running prompt {} with {}",
                model_idx * variants.len() + (idx + 1),
                total,
                idx + 1,
                path.display()
            );

            let mut session = model.start_session(Default::default());

            if args.show_output {
                println!("");
            }

            let mut output = String::new();
            let mut stdout_lock = std::io::stdout().lock();

            let stats = session.infer::<InferenceError>(
                model.as_ref(),
                &mut rand::thread_rng(),
                &InferenceRequest {
                    prompt: (&prompt_in_template).into(),
                    parameters: &InferenceParameters::default(),
                    play_back_previous_tokens: false,
                    maximum_token_count: None,
                },
                &mut Default::default(),
                |response| match response {
                    InferenceResponse::InferredToken(t) => {
                        output.push_str(&t);

                        if args.show_output {
                            print!("{t}");
                            stdout_lock.flush().ok();
                        }

                        Ok(InferenceFeedback::Continue)
                    }
                    _ => Ok(InferenceFeedback::Continue),
                },
            )?;

            if args.show_output {
                println!("\n");
                stdout_lock.flush().ok();
            }

            sender
                .send(RunOutput {
                    name: path.display().to_string(),
                    system: system_message,
                    user: user_message,
                    response: output,
                })
                .ok();

            tracing::info!(
                "generated {} tokens in {:.2?} ({:.2} tokens/sec)",
                stats.predict_tokens,
                stats.predict_duration,
                stats.predict_tokens as f64 / stats.predict_duration.as_secs_f64()
            );
        }
    }
    Ok(())
}

fn load_model(architecture: &str, path: &Path, use_gpu: bool) -> Result<Box<dyn Model>> {
    llm::load_dynamic(
        ModelArchitecture::from_str(architecture).ok(),
        &path,
        llm::TokenizerSource::Embedded,
        ModelParameters {
            use_gpu,
            ..ModelParameters::default()
        },
        |progress| match progress {
            llm::LoadProgress::Loaded {
                file_size,
                tensor_count,
            } => tracing::info!(
                "loaded {} tensors ({})",
                tensor_count,
                bytesize::ByteSize::b(file_size).to_string()
            ),
            _ => {}
        },
    )
    .map_err(Into::into)
}
