#![cfg_attr(
    all(not(debug_assertions), feature = "ui"),
    windows_subsystem = "windows"
)]

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::mpsc::Receiver;
use tracing_subscriber::prelude::*;

#[cfg(feature = "local")]
mod local;

#[cfg(feature = "remote")]
mod remote;

#[cfg(feature = "ui")]
mod ui;

/// Generate and run variants of prompts against local LLMs and remote APIs
#[derive(Parser)]
#[command(author, version, about, long_about = None)]
pub struct Args {
    #[command(subcommand)]
    command: Commands,
    /// Path to output NDJSON file
    #[arg(short, long)]
    output: Option<PathBuf>,
    /// Show prompt and response output
    #[arg(long)]
    show_output: bool,
    /// Use GPU
    #[arg(long)]
    use_gpu: bool,
}

#[derive(Subcommand)]
enum Commands {
    /// Run prompt evaluation on an input file
    Run {
        /// Path to input file
        input_path: PathBuf,
    },
    /// Start the UI
    #[cfg(feature = "ui")]
    Ui {},
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Input {
    prompt: String,
    system: String,
    variables: BTreeMap<String, Vec<String>>,
    #[cfg(feature = "local")]
    local_models: Vec<local::ModelConfig>,
    #[cfg(feature = "remote")]
    remote_models: Vec<remote::ModelConfig>,
}

#[derive(Serialize)]
pub struct RunOutput {
    name: String,
    system: String,
    user: String,
    response: String,
}

fn main() -> Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(
            tracing_subscriber::EnvFilter::builder()
                .with_env_var("LOG")
                .with_default_directive(tracing_subscriber::filter::LevelFilter::INFO.into())
                .from_env()?,
        )
        .init();

    let args = Args::parse();

    match &args.command {
        Commands::Run { input_path } => run(input_path, &args),
        #[cfg(feature = "ui")]
        Commands::Ui {} => ui::start(&args),
    }
}

fn run(input_path: &Path, args: &Args) -> Result<()> {
    let json = if input_path.to_string_lossy() == "-" {
        std::io::stdin().lines().filter_map(Result::ok).join("")
    } else {
        std::fs::read_to_string(input_path).context("reading input")?
    };
    let input = serde_json::from_str(&json).context("deserializing input")?;

    let Input {
        prompt,
        variables,
        system,
        ..
    } = input;

    let variants: Vec<Vec<(&str, &str)>> = make_variants(&variables);

    tracing::info!("generated {} variants", variants.len());

    let (tx, rx) = std::sync::mpsc::channel::<RunOutput>();

    setup_output(&args, rx);

    #[cfg(feature = "local")]
    if !input.local_models.is_empty() {
        local::run(
            &prompt,
            &system,
            &variants,
            &input.local_models,
            tx.clone(),
            &args,
        )?;
    }

    #[cfg(feature = "remote")]
    if !input.remote_models.is_empty() {
        remote::openai::run(
            &prompt,
            &system,
            &variants,
            &input.remote_models,
            tx.clone(),
            &args,
        )?;
    };

    tracing::info!("ran all prompts");

    Ok(())
}

/// Create a list of replacement lists, used to construct prompt unique variants
fn make_variants(variables: &BTreeMap<String, Vec<String>>) -> Vec<Vec<(&str, &str)>> {
    variables
        .iter()
        .map(|(key, values)| values.iter().map(|value| (key.as_str(), value.as_str())))
        .multi_cartesian_product()
        .collect()
}

/// The default NDJSON output path if none provided
fn default_output_path() -> PathBuf {
    let format = time::format_description::parse("[year]-[month]-[day]_[hour]-[minute]-[second]")
        .expect("constructing date format");

    let datetime = time::OffsetDateTime::now_utc()
        .format(&format)
        .expect("formatting current datetime");

    PathBuf::from(format!("output-{}.ndjson", datetime))
}

/// Create the output file in NDJSON format, and spawn a thread
/// to append any results recieved
fn setup_output(args: &Args, rx: Receiver<RunOutput>) {
    let output_path = args.output.clone().unwrap_or_else(default_output_path);

    std::thread::spawn(move || {
        let mut output_file = std::io::BufWriter::new(
            std::fs::File::create(output_path).expect("failed to create output file"),
        );

        for run_output in rx {
            let line = serde_json::to_string(&run_output).unwrap_or_default();
            writeln!(output_file, "{}", line).ok();
        }
    });
}

#[cfg(test)]
mod tests {
    use super::make_variants;
    use std::collections::BTreeMap;

    #[test]
    fn test_make_variants() {
        let var_a = String::from("{{a}}");
        let var_b = String::from("{{b}}");

        let one_str = String::from("one");
        let one_digit = String::from("1");
        let two_str = String::from("two");
        let two_digit = String::from("2");

        let variables = BTreeMap::from([
            (var_a, vec![one_str, one_digit]),
            (var_b, vec![two_str, two_digit]),
        ]);

        assert_eq!(
            vec![
                vec![("{{a}}", "one"), ("{{b}}", "two")],
                vec![("{{a}}", "one"), ("{{b}}", "2")],
                vec![("{{a}}", "1"), ("{{b}}", "two")],
                vec![("{{a}}", "1"), ("{{b}}", "2")],
            ],
            make_variants(&variables)
        );
    }
}
