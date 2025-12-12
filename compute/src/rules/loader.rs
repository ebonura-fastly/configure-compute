//! Rule loader with compression support.
//!
//! Handles loading rules from Config Store, supporting both:
//! - Legacy format: individual rules as separate keys
//! - Packed format: all rules compressed in a single 'rules_packed' key
//!
//! Packed format uses gzip compression + base64 encoding to fit more rules
//! within Config Store's 8KB value limit.

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use flate2::read::GzDecoder;
use serde::Deserialize;
use std::collections::HashMap;
use std::io::Read;

use super::types::{Rule, BackendConfig};

/// Packed rules payload format (matches editor output).
#[derive(Debug, Deserialize)]
struct PackedRules {
    /// Version string
    v: String,
    /// Rule list (order matters for evaluation)
    r: Vec<String>,
    /// Rule definitions by name
    d: HashMap<String, Rule>,
    /// Backend definitions (optional)
    #[serde(default)]
    backends: HashMap<String, BackendConfig>,
}

/// Result of loading rules from config store.
pub struct LoadedRules {
    pub rule_list: Vec<String>,
    pub rules: HashMap<String, Rule>,
    pub backends: HashMap<String, BackendConfig>,
}

/// Errors that can occur during rule loading.
#[derive(Debug, thiserror::Error)]
pub enum LoadError {
    #[error("Config store key not found: {0}")]
    KeyNotFound(String),

    #[error("Base64 decode error: {0}")]
    Base64Error(#[from] base64::DecodeError),

    #[error("Gzip decompression error: {0}")]
    DecompressError(#[from] std::io::Error),

    #[error("JSON parse error: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("Invalid packed rules format")]
    InvalidFormat,
}

/// Decompresses and parses packed rules from Config Store.
///
/// Expected format: base64(gzip(JSON))
/// Or for uncompressed fallback: "raw:" + base64(JSON)
pub fn decompress_rules(packed: &str) -> Result<LoadedRules, LoadError> {
    let json = if packed.starts_with("raw:") {
        // Uncompressed fallback format
        let b64 = &packed[4..];
        let bytes = BASE64.decode(b64)?;
        String::from_utf8(bytes).map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?
    } else {
        // Compressed format: base64(gzip(json))
        let compressed = BASE64.decode(packed)?;
        let mut decoder = GzDecoder::new(&compressed[..]);
        let mut json = String::new();
        decoder.read_to_string(&mut json)?;
        json
    };

    let parsed: PackedRules = serde_json::from_str(&json)?;

    // Validate version
    if !parsed.v.starts_with("1.") {
        println!("Warning: Unknown packed rules version: {}", parsed.v);
    }

    Ok(LoadedRules {
        rule_list: parsed.r,
        rules: parsed.d,
        backends: parsed.backends,
    })
}

/// Loads rules from Config Store, supporting both packed and legacy formats.
///
/// Tries packed format first (single compressed key), falls back to legacy
/// format (individual rule keys) if packed key doesn't exist.
pub fn load_rules_from_store(
    store: &fastly::ConfigStore,
) -> Result<LoadedRules, LoadError> {
    // Try packed format first
    if let Some(packed) = store.get("rules_packed") {
        println!("Loading rules from packed format...");
        let loaded = decompress_rules(&packed)?;
        println!("Loaded {} rules, {} backends from packed format", loaded.rules.len(), loaded.backends.len());
        return Ok(loaded);
    }

    // Fall back to legacy format
    println!("Falling back to legacy rule format...");
    load_legacy_rules(store)
}

/// Loads rules in the legacy format (individual keys per rule).
fn load_legacy_rules(
    store: &fastly::ConfigStore,
) -> Result<LoadedRules, LoadError> {
    let rule_list_str = store
        .get("rule_list")
        .ok_or_else(|| LoadError::KeyNotFound("rule_list".to_string()))?;

    let rule_list: Vec<String> = rule_list_str
        .split(',')
        .map(|s| s.trim().to_string())
        .collect();

    let mut rules = HashMap::new();

    for rule_id in &rule_list {
        if let Some(rule_str) = store.get(rule_id) {
            match serde_json::from_str::<Rule>(&rule_str) {
                Ok(rule) => {
                    rules.insert(rule_id.clone(), rule);
                }
                Err(e) => {
                    println!("Failed to parse rule {}: {}", rule_id, e);
                }
            }
        } else {
            println!("Rule {} not found in config store", rule_id);
        }
    }

    Ok(LoadedRules {
        rule_list,
        rules,
        backends: HashMap::new(), // Legacy format doesn't support backends
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decompress_raw_fallback() {
        // Test the raw fallback format
        let json = r#"{"v":"1.0","r":["rule1"],"d":{"rule1":{"enabled":true,"conditions":{"operator":"and","rules":[]},"action":{"type":"block","response_code":403}}}}"#;
        let encoded = format!("raw:{}", BASE64.encode(json));

        let (rule_list, rules) = decompress_rules(&encoded).unwrap();
        assert_eq!(rule_list, vec!["rule1"]);
        assert!(rules.contains_key("rule1"));
    }

    #[test]
    fn test_decompress_gzip_from_browser() {
        // This payload was generated by Node.js using the same gzip compression
        // that browsers use via CompressionStream API.
        // Generated with: node generate-test-payload.mjs
        //
        // Original JSON:
        // {
        //   "v": "1.0",
        //   "r": ["rule_admin_block", "rule_bot_challenge"],
        //   "d": {
        //     "rule_admin_block": { enabled: true, conditions: {...}, action: {type: "block", ...} },
        //     "rule_bot_challenge": { enabled: true, conditions: {...}, action: {type: "challenge", ...} }
        //   }
        // }
        const TEST_PAYLOAD: &str = "H4sIAAAAAAACE5VQQWrDMBD8SpmzSBzaQ9Gt7zDBrKXFUetIRiu7FKO/FxnjONSXoouYndmdmRkTNC6nCgoRukYce27I3p1v2j6Yr4IXqA2pMTfqe/Yd46pgoee/bD2DPbU9W+gUR1YwwVuXXPBShmHgSClEaJC363KBrmekn4GhMVC6Qe2Jkigm+XYLPlE/Ftp5uYqsNqEbnmXORypeN02NS3Va3vkd13zNCmSKs2JsXbJlZhmCF25MsAz9Vr3usDuLUFfoH8awyItl79gi58Oy/tFJiEeVjMKROvbpOaAJPpHzsmulDQnHwR521OPfrMNPmkhMdENCzjn/ApZN1hcVAgAA";

        let (rule_list, rules) = decompress_rules(TEST_PAYLOAD).unwrap();

        // Verify rule list
        assert_eq!(rule_list.len(), 2);
        assert_eq!(rule_list[0], "rule_admin_block");
        assert_eq!(rule_list[1], "rule_bot_challenge");

        // Verify rules were parsed
        assert_eq!(rules.len(), 2);
        assert!(rules.contains_key("rule_admin_block"));
        assert!(rules.contains_key("rule_bot_challenge"));

        // Verify rule content
        let admin_rule = rules.get("rule_admin_block").unwrap();
        assert!(admin_rule.enabled);
        assert_eq!(admin_rule.action.type_, "block");
        assert_eq!(admin_rule.action.response_code, Some(403));

        let bot_rule = rules.get("rule_bot_challenge").unwrap();
        assert!(bot_rule.enabled);
        assert_eq!(bot_rule.action.type_, "challenge");
    }
}
