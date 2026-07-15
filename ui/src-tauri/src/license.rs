//! Estado de licencia de la instalación (gate SUAVE: informa, no bloquea).
//!
//! La app embebe SOLO la clave pública; las licencias las emite el keygen del
//! dueño (`tools/supersurvey_keygen`, con la privada que nunca toca este repo).
//! El archivo `license.key` vive en el directorio de configuración de la app
//! (junto a `brand.json`).

use serde::Serialize;
use supersurvey_license::{License, LicenseStatus};

/// Clave PÚBLICA de verificación (par emitido 2026-07-04; la privada la guarda
/// el dueño del producto fuera del repositorio).
pub const LICENSE_PUBLIC_KEY: [u8; 32] = [
    134, 132, 17, 73, 117, 209, 227, 215, 235, 89, 4, 71, 59, 142, 87, 93, 62, 110, 183, 2, 34, 55,
    171, 129, 194, 77, 7, 53, 143, 235, 236, 179,
];

#[derive(Debug, Serialize)]
pub struct LicenseInfo {
    /// VALID | EXPIRED | INVALID_SIGNATURE | MALFORMED | MISSING
    pub status: String,
    pub client: Option<String>,
    pub expires: Option<String>,
}

/// Fecha actual `YYYY-MM-DD` (UTC) sin crates de fechas (algoritmo civil de
/// days-from-epoch; suficiente para comparar expiraciones a nivel de día).
fn today_utc() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
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

/// Evalúa `license.key` (contenido JSON) → estado + metadatos para la UI.
pub fn evaluate(license_json: Option<&str>) -> LicenseInfo {
    let Some(json) = license_json else {
        return LicenseInfo {
            status: "MISSING".into(),
            client: None,
            expires: None,
        };
    };
    match License::from_json(json) {
        Err(_) => LicenseInfo {
            status: "MALFORMED".into(),
            client: None,
            expires: None,
        },
        Ok(lic) => {
            let status = match lic.validate(&LICENSE_PUBLIC_KEY, &today_utc()) {
                LicenseStatus::Valid => "VALID",
                LicenseStatus::Expired => "EXPIRED",
                LicenseStatus::InvalidSignature => "INVALID_SIGNATURE",
                LicenseStatus::Malformed => "MALFORMED",
            };
            LicenseInfo {
                status: status.into(),
                client: Some(lic.payload.client),
                expires: lic.payload.expires,
            }
        }
    }
}
