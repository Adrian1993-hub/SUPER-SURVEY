//! Asistente IA opcional (F8.1 PoC) — TODO local, TODO opt-in.
//!
//! Diseño (docs/research/llm-offline.md):
//! - El modelo NUNCA viaja en el instalador: el runtime es un sidecar **Ollama**
//!   (proceso del usuario) y el modelo se descarga post-instalación, solo si el
//!   usuario acepta tras ver la advertencia de memoria y el análisis del equipo.
//! - El asistente es CONSULTIVO: el guardarraíl del system prompt le prohíbe
//!   producir o ajustar cifras oficiales de custodia — esas salen únicamente del
//!   kernel decimal trazable.
//! - Este módulo solo habla http://127.0.0.1:11434 (Ollama local). Sin TLS, sin
//!   telemetría, sin salida a internet (la descarga del modelo la hace Ollama).

use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;

const OLLAMA: &str = "http://127.0.0.1:11434";

/// Guardarraíl doctrinal del asistente (se antepone SIEMPRE a la conversación).
const SYSTEM_PROMPT: &str = "You are the consultative assistant embedded in a white-label, offline-first \
marine cargo & bunker survey application. Audience: petroleum/marine surveyors. \
STRICT RULES: (1) You must NEVER produce, estimate, correct or adjust official \
custody figures (volumes, VCF/WCF, masses, MT, energy, densities used for the \
final report). If asked for such a number, refuse briefly and direct the user to \
the app's calculation engine and its step-by-step trace — those are the only \
official figures. (2) You MAY explain procedures and standards (ASTM D1250, API \
MPMS, ISO, GIIGNL, draft survey, VEF, sampling), explain what a calculation \
trace means, help draft NOAD/LOP/letter text from figures the user already has, \
and guide new surveyors through the app's workflow (Cover → Profiles → Key \
Meeting → Measurement → Calculation → Comparison → Report; specific operations: \
multigrade, draft survey, ship↔shore, LPG, LNG discharge, blend, ROB). \
(3) If you are not sure, say so plainly — never invent standards, table numbers \
or constants. (4) Answer in the user's language (Spanish or English), concisely.";

fn client(timeout_s: u64) -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(timeout_s))
        .build()
        .map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Analizador de sistema: ¿puede este equipo correr la app + IA local?
// La app decide el veredicto en la UI con estos datos crudos (medidos, no
// estimados): RAM total/disponible, núcleos y disco libre máximo.
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct SystemCheck {
    total_mem_mb: u64,
    available_mem_mb: u64,
    cpu_cores: usize,
    disk_free_mb: u64,
}

#[tauri::command]
pub fn system_ai_check() -> Result<String, String> {
    let mut sys = sysinfo::System::new();
    sys.refresh_memory();
    let disks = sysinfo::Disks::new_with_refreshed_list();
    let disk_free = disks.iter().map(|d| d.available_space()).max().unwrap_or(0);
    let check = SystemCheck {
        total_mem_mb: sys.total_memory() / 1_048_576,
        available_mem_mb: sys.available_memory() / 1_048_576,
        cpu_cores: std::thread::available_parallelism().map(|n| n.get()).unwrap_or(1),
        disk_free_mb: disk_free / 1_048_576,
    };
    serde_json::to_string(&check).map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Estado del sidecar Ollama + modelos instalados.
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn ai_status() -> Result<String, String> {
    let c = client(3)?;
    match c.get(format!("{OLLAMA}/api/tags")).send().await {
        Ok(resp) if resp.status().is_success() => {
            let v: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            let models: Vec<String> = v["models"]
                .as_array()
                .map(|a| {
                    a.iter()
                        .filter_map(|m| m["name"].as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default();
            Ok(json!({ "running": true, "models": models }).to_string())
        }
        _ => Ok(json!({ "running": false, "models": [] }).to_string()),
    }
}

// ---------------------------------------------------------------------------
// Chat (no streaming — PoC): mensajes [{role, content}] → respuesta del modelo,
// siempre con el guardarraíl antepuesto.
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
struct ChatMsg {
    role: String,
    content: String,
}

#[tauri::command]
pub async fn ai_chat(model: String, messages_json: String) -> Result<String, String> {
    let user_msgs: Vec<ChatMsg> =
        serde_json::from_str(&messages_json).map_err(|e| format!("mensajes inválidos: {e}"))?;
    let mut messages = vec![json!({ "role": "system", "content": SYSTEM_PROMPT })];
    for m in user_msgs {
        messages.push(json!({ "role": m.role, "content": m.content }));
    }
    let c = client(300)?;
    let resp = c
        .post(format!("{OLLAMA}/api/chat"))
        .json(&json!({
            "model": model,
            "messages": messages,
            "stream": false,
            "options": { "temperature": 0.3 }
        }))
        .send()
        .await
        .map_err(|e| format!("Ollama no respondió: {e}"))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Ollama HTTP {status}: {body}"));
    }
    let v: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let content = v["message"]["content"].as_str().unwrap_or("").to_string();
    Ok(json!({ "content": content }).to_string())
}

// ---------------------------------------------------------------------------
// Descarga de modelo vía Ollama (puede tardar varios minutos; GBs).
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn ai_pull_model(model: String) -> Result<String, String> {
    let c = client(3600)?;
    let resp = c
        .post(format!("{OLLAMA}/api/pull"))
        .json(&json!({ "model": model, "stream": false }))
        .send()
        .await
        .map_err(|e| format!("Ollama no respondió: {e}"))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Ollama HTTP {status}: {body}"));
    }
    Ok(json!({ "ok": true }).to_string())
}
