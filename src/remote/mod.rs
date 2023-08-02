use serde::Deserialize;

pub mod openai;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelConfig {
    name: String,
    #[serde(default = "default_api_base_url")]
    api_base_url: String,
    #[serde(default)]
    skip: bool,
}

fn default_api_base_url() -> String {
    async_openai::config::OPENAI_API_BASE.to_string()
}
