use std::io::{BufReader, Write};
use std::process::{Command, Stdio};
use std::sync::atomic::AtomicBool;
use std::sync::mpsc::Sender;
use std::thread;

use tauri::Manager;

use crate::{Args, Input};

static USE_GPU: AtomicBool = AtomicBool::new(false);

pub fn start(args: &Args) -> anyhow::Result<()> {
    if args.use_gpu {
        USE_GPU.store(true, std::sync::atomic::Ordering::SeqCst);
    }

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load, run])
        .run(tauri::generate_context!())
        .expect("error while running application");

    Ok(())
}

#[tauri::command]
fn load(json: &str) -> Result<(), String> {
    serde_json::from_str::<Input>(json)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn run(json: &str, app: tauri::AppHandle) -> Result<(), String> {
    let json = json.to_string();
    let (tx, rx) = std::sync::mpsc::channel::<String>();
    let output_path = crate::default_output_path().to_string_lossy().to_string();

    let ui_output_path = output_path.clone();
    thread::spawn(move || {
        for msg in rx {
            app.emit_all("log", msg).ok();
        }

        let output = std::fs::read_to_string(ui_output_path).unwrap_or_default();
        app.emit_all("done", output).ok();
    });

    thread::spawn(move || run_inner(&json, output_path, tx).map_err(|e| e.to_string()));

    Ok(())
}

fn run_inner(json: &str, output_path: String, tx: Sender<String>) -> anyhow::Result<()> {
    let executable_path = std::env::current_exe()?;
    let use_gpu = USE_GPU.load(std::sync::atomic::Ordering::SeqCst);

    let mut child = Command::new(executable_path)
        .args({
            let mut args = vec!["--show-output", "--output", &output_path, "run", "-"];
            if use_gpu {
                args.insert(0, "--use-gpu");
            };
            args
        })
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    let stdout = child.stdout.take().unwrap();
    let stdout_tx = tx.clone();
    let stdout_thread = thread::spawn(move || {
        stream_output(BufReader::new(stdout), stdout_tx).ok();
    });

    let stderr = child.stderr.take().unwrap();
    let stderr_tx = tx.clone();
    let stderr_thread = thread::spawn(move || {
        stream_output(BufReader::new(stderr), stderr_tx).ok();
    });

    let mut stdin = child.stdin.take().unwrap();
    stdin.write_all(json.as_bytes())?;
    drop(stdin);

    child.wait()?;
    stdout_thread.join().ok();
    stderr_thread.join().ok();

    Ok(())
}

fn stream_output<R: std::io::Read>(
    reader: BufReader<R>,
    tx: Sender<String>,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut utf8_reader = utf8::BufReadDecoder::new(reader);

    while let Some(result) = utf8_reader.next_lossy() {
        if let Ok(str) = result {
            tx.send(str.to_string())?;
        }
    }
    Ok(())
}
