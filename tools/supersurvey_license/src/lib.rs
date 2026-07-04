//! Licencias SuperSurvey — un archivo `license.key` (JSON) con un payload y su
//! firma **Ed25519**. La clave PRIVADA vive solo en el keygen del dueño (crate
//! `supersurvey_keygen`, feature `issuer`); la app embebe la PÚBLICA y verifica.
//!
//! Canonicalización: los bytes firmados son `serde_json::to_vec(&payload)` con
//! la struct de este crate (orden de campos fijo). Emisor y verificador usan la
//! MISMA struct, así que los bytes coinciden sin canonicalización JSON externa.
//!
//! Honestidad técnica: la firma impide *fabricar* licencias sin la privada; no
//! impide parchear un binario local. La defensa completa es coste (F3) + contrato.

use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};

/// Datos de la licencia (orden de campos = bytes canónicos; no reordenar).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LicensePayload {
    pub product: String,
    pub client: String,
    /// Fecha de emisión, `YYYY-MM-DD`.
    pub issued: String,
    /// Expiración `YYYY-MM-DD`; `None` = perpetua.
    #[serde(default)]
    pub expires: Option<String>,
    /// Capacidades opcionales (p. ej. "lpg", "draft").
    #[serde(default)]
    pub features: Vec<String>,
}

/// Archivo de licencia: payload + firma base64 del JSON canónico del payload.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct License {
    pub payload: LicensePayload,
    /// Ed25519 sobre `serde_json::to_vec(&payload)`, en base64 estándar.
    pub signature: String,
}

/// Resultado de validar una licencia contra la clave pública y una fecha.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LicenseStatus {
    Valid,
    Expired,
    InvalidSignature,
    Malformed,
}

impl License {
    pub fn from_json(json: &str) -> Result<Self, String> {
        serde_json::from_str(json).map_err(|e| format!("licencia malformada: {e}"))
    }

    pub fn to_json(&self) -> String {
        serde_json::to_string_pretty(self).expect("license serializes")
    }

    /// Bytes canónicos que se firman/verifican.
    pub fn canonical_bytes(payload: &LicensePayload) -> Vec<u8> {
        serde_json::to_vec(payload).expect("payload serializes")
    }

    /// Verifica firma y expiración. `today` en `YYYY-MM-DD` (comparación
    /// lexicográfica válida para ISO-8601; evita depender de un crate de fechas).
    pub fn validate(&self, public_key: &[u8; 32], today: &str) -> LicenseStatus {
        let Ok(vk) = VerifyingKey::from_bytes(public_key) else {
            return LicenseStatus::Malformed;
        };
        let Ok(sig_bytes) = B64.decode(&self.signature) else {
            return LicenseStatus::Malformed;
        };
        let Ok(sig) = Signature::from_slice(&sig_bytes) else {
            return LicenseStatus::Malformed;
        };
        if vk
            .verify(&Self::canonical_bytes(&self.payload), &sig)
            .is_err()
        {
            return LicenseStatus::InvalidSignature;
        }
        if let Some(exp) = &self.payload.expires {
            if today > exp.as_str() {
                return LicenseStatus::Expired;
            }
        }
        LicenseStatus::Valid
    }
}

/// Emisión (solo keygen, feature `issuer`).
#[cfg(feature = "issuer")]
pub mod issuer {
    use super::*;
    use ed25519_dalek::{Signer, SigningKey};

    /// Genera un par nuevo; devuelve (privada 32 bytes, pública 32 bytes).
    pub fn generate_keypair() -> ([u8; 32], [u8; 32]) {
        let mut rng = rand::rngs::OsRng;
        let sk = SigningKey::generate(&mut rng);
        (sk.to_bytes(), sk.verifying_key().to_bytes())
    }

    /// Firma un payload con la clave privada (seed de 32 bytes).
    pub fn issue(private_key: &[u8; 32], payload: LicensePayload) -> License {
        let sk = SigningKey::from_bytes(private_key);
        let sig = sk.sign(&License::canonical_bytes(&payload));
        License {
            payload,
            signature: B64.encode(sig.to_bytes()),
        }
    }
}

#[cfg(all(test, feature = "issuer"))]
mod tests {
    use super::*;

    fn payload() -> LicensePayload {
        LicensePayload {
            product: "SuperSurvey".into(),
            client: "Cliente Demo S.A.".into(),
            issued: "2026-07-04".into(),
            expires: Some("2027-07-04".into()),
            features: vec!["bqs".into(), "lpg".into()],
        }
    }

    #[test]
    fn issue_then_validate_ok() {
        let (sk, pk) = issuer::generate_keypair();
        let lic = issuer::issue(&sk, payload());
        assert_eq!(lic.validate(&pk, "2026-12-31"), LicenseStatus::Valid);
    }

    #[test]
    fn expired_license_reports_expired() {
        let (sk, pk) = issuer::generate_keypair();
        let lic = issuer::issue(&sk, payload());
        assert_eq!(lic.validate(&pk, "2027-07-05"), LicenseStatus::Expired);
        // Perpetua: sin expiración nunca caduca.
        let mut p = payload();
        p.expires = None;
        let lic2 = issuer::issue(&sk, p);
        assert_eq!(lic2.validate(&pk, "2099-01-01"), LicenseStatus::Valid);
    }

    #[test]
    fn tampered_payload_is_rejected() {
        let (sk, pk) = issuer::generate_keypair();
        let mut lic = issuer::issue(&sk, payload());
        lic.payload.client = "Otro Cliente".into();
        assert_eq!(lic.validate(&pk, "2026-12-31"), LicenseStatus::InvalidSignature);
    }

    #[test]
    fn wrong_key_is_rejected() {
        let (sk, _) = issuer::generate_keypair();
        let (_, other_pk) = issuer::generate_keypair();
        let lic = issuer::issue(&sk, payload());
        assert_eq!(lic.validate(&other_pk, "2026-12-31"), LicenseStatus::InvalidSignature);
    }

    #[test]
    fn corrupted_signature_is_malformed_or_invalid() {
        let (sk, pk) = issuer::generate_keypair();
        let mut lic = issuer::issue(&sk, payload());
        lic.signature = "no-es-base64!!!".into();
        assert_eq!(lic.validate(&pk, "2026-12-31"), LicenseStatus::Malformed);
    }

    #[test]
    fn json_round_trip() {
        let (sk, pk) = issuer::generate_keypair();
        let lic = issuer::issue(&sk, payload());
        let parsed = License::from_json(&lic.to_json()).unwrap();
        assert_eq!(parsed.validate(&pk, "2026-12-31"), LicenseStatus::Valid);
    }
}
