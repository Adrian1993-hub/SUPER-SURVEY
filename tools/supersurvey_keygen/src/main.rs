//! Keygen de SuperSurvey — herramienta APARTE para el dueño del producto.
//! Genera el par Ed25519, emite licencias firmadas y las verifica.
//!
//!   supersurvey_keygen generate-keypair --out-dir keys/
//!   supersurvey_keygen issue --key keys/private.key --client "Cliente S.A." \
//!       [--expires 2027-12-31] [--features bqs,lpg] --out license.key
//!   supersurvey_keygen verify --pub keys/public.key license.key
//!
//! La PRIVADA jamás se comparte ni se committea (keys/ está en .gitignore).

use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::exit;
use supersurvey_license::{issuer, License, LicensePayload, LicenseStatus};

fn today() -> String {
    // Fecha local del sistema en YYYY-MM-DD sin dependencias de fechas:
    // days-since-epoch → civil (algoritmo de Howard Hinnant, dominio válido aquí).
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("reloj del sistema")
        .as_secs() as i64;
    let z = secs.div_euclid(86_400) + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    format!("{y:04}-{m:02}-{d:02}")
}

fn parse_flags(args: &[String]) -> (HashMap<String, String>, Vec<String>) {
    let mut flags = HashMap::new();
    let mut positional = Vec::new();
    let mut i = 0;
    while i < args.len() {
        if let Some(name) = args[i].strip_prefix("--") {
            if i + 1 < args.len() {
                flags.insert(name.to_string(), args[i + 1].clone());
                i += 2;
            } else {
                die(&format!("falta el valor de --{name}"));
            }
        } else {
            positional.push(args[i].clone());
            i += 1;
        }
    }
    (flags, positional)
}

fn die(msg: &str) -> ! {
    eprintln!("error: {msg}");
    exit(1)
}

fn read_key(path: &str) -> [u8; 32] {
    let b64 = fs::read_to_string(path)
        .unwrap_or_else(|e| die(&format!("no pude leer {path}: {e}")));
    let bytes = B64
        .decode(b64.trim())
        .unwrap_or_else(|e| die(&format!("clave inválida en {path}: {e}")));
    bytes
        .try_into()
        .unwrap_or_else(|_| die(&format!("{path}: se esperaban 32 bytes")))
}

fn cmd_generate(flags: &HashMap<String, String>) {
    let dir = PathBuf::from(flags.get("out-dir").map(String::as_str).unwrap_or("keys"));
    fs::create_dir_all(&dir).unwrap_or_else(|e| die(&format!("mkdir {dir:?}: {e}")));
    let priv_path = dir.join("private.key");
    if priv_path.exists() {
        die(&format!(
            "{priv_path:?} ya existe — no lo sobreescribo (borra el archivo si de verdad quieres rotar la clave)"
        ));
    }
    let (sk, pk) = issuer::generate_keypair();
    fs::write(&priv_path, B64.encode(sk)).unwrap_or_else(|e| die(&format!("escribir privada: {e}")));
    fs::write(dir.join("public.key"), B64.encode(pk))
        .unwrap_or_else(|e| die(&format!("escribir pública: {e}")));
    println!("Par generado en {dir:?}:");
    println!("  private.key  ← GUÁRDALA FUERA DEL REPO (emite licencias)");
    println!("  public.key   ← se embebe en la app");
    println!();
    println!("Constante para ui/src-tauri/src/license.rs:");
    print!("pub const LICENSE_PUBLIC_KEY: [u8; 32] = [");
    for (i, b) in pk.iter().enumerate() {
        if i % 12 == 0 {
            print!("\n    ");
        }
        print!("{b}, ");
    }
    println!("\n];");
}

fn cmd_issue(flags: &HashMap<String, String>) {
    let key = flags
        .get("key")
        .unwrap_or_else(|| die("--key keys/private.key es obligatorio"));
    let client = flags
        .get("client")
        .unwrap_or_else(|| die("--client \"Nombre\" es obligatorio"));
    let out = flags.get("out").map(String::as_str).unwrap_or("license.key");
    let payload = LicensePayload {
        product: flags
            .get("product")
            .cloned()
            .unwrap_or_else(|| "SuperSurvey".to_string()),
        client: client.clone(),
        issued: today(),
        expires: flags.get("expires").cloned(),
        features: flags
            .get("features")
            .map(|s| s.split(',').map(|f| f.trim().to_string()).collect())
            .unwrap_or_default(),
    };
    let lic = issuer::issue(&read_key(key), payload);
    fs::write(out, lic.to_json()).unwrap_or_else(|e| die(&format!("escribir {out}: {e}")));
    println!("Licencia emitida → {out}");
    println!("  cliente: {}", lic.payload.client);
    println!("  expira : {}", lic.payload.expires.as_deref().unwrap_or("(perpetua)"));
    println!("Instalación: copiar como `license.key` al directorio de configuración de la app del cliente.");
}

fn cmd_verify(flags: &HashMap<String, String>, positional: &[String]) {
    let pubk = flags
        .get("pub")
        .unwrap_or_else(|| die("--pub keys/public.key es obligatorio"));
    let file = positional
        .first()
        .unwrap_or_else(|| die("uso: verify --pub keys/public.key license.key"));
    let json = fs::read_to_string(Path::new(file))
        .unwrap_or_else(|e| die(&format!("no pude leer {file}: {e}")));
    let lic = License::from_json(&json).unwrap_or_else(|e| die(&e));
    let status = lic.validate(&read_key(pubk), &today());
    println!("estado : {status:?}");
    println!("cliente: {}", lic.payload.client);
    println!("emitida: {}  expira: {}", lic.payload.issued, lic.payload.expires.as_deref().unwrap_or("(perpetua)"));
    if status != LicenseStatus::Valid {
        exit(2);
    }
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let Some(cmd) = args.first().map(String::as_str) else {
        eprintln!("uso: supersurvey_keygen <generate-keypair | issue | verify> [flags]");
        exit(1)
    };
    let (flags, positional) = parse_flags(&args[1..]);
    match cmd {
        "generate-keypair" => cmd_generate(&flags),
        "issue" => cmd_issue(&flags),
        "verify" => cmd_verify(&flags, &positional),
        other => die(&format!("subcomando desconocido: {other}")),
    }
}
