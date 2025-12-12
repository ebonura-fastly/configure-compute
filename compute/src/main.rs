//! Managed Security Service (MSS) for Fastly's Compute@Edge platform.
//!
//! This service provides edge-based security filtering through:
//! - Configurable security rules
//! - Edge authentication
//! - Detailed security logging
//! - Request blocking and challenging
//!
//! The service protects an origin by evaluating incoming requests against
//! security rules defined in edge dictionaries. Rules can check various
//! aspects of requests including paths, IPs, device types, and headers.

use fastly::backend::BackendBuilder;
use fastly::http::StatusCode;
use fastly::log::Endpoint;
use fastly::ConfigStore;
use fastly::{Backend, Error, Request, Response};
use std::collections::HashMap;
use std::io::Write;
use std::time::Instant;
use std::time::{SystemTime, UNIX_EPOCH, Duration};
use hmac_sha256::HMAC;

mod rules;
use rules::{RuleEngine, WafLog, load_rules_from_store, BackendConfig};

/// Main request handler for the security service.
///
/// Process flow:
/// 1. Initialize logging and timing
/// 2. Add edge authentication headers
/// 3. Load and evaluate security rules
/// 4. Apply rule actions (block/challenge/forward)
/// 5. Log security events
#[fastly::main]
fn main(req: Request) -> Result<Response, Error> {
    const BACKEND_NAME: &str = "protected_origin";
    let start_time = Instant::now();
    let mut logger = Endpoint::from_name("security_logs");
    println!("Processing request for path: {}", req.get_path());

    // Clone request for logging and auth headers
    let mut req_with_headers = req.clone_without_body();
    
    // Initialize log entry first to capture original request state
    let mut log_entry = WafLog::new(&req_with_headers, start_time);
    
    // Add auth headers after logging initialization
    if let Err(e) = add_edge_auth(&mut req_with_headers) {
        println!("Authentication header addition failed: {}", e);
        return Err(e);
    }
    
    // Initialize rule engine and backends
    let LoadedConfig { mut engine, backends } = match load_rules() {
        Ok(config) => config,
        Err(e) => {
            println!("Failed to initialize rules: {}", e);
            log_entry.set_final_action("rule_init_error");
            log_entry.blocked = true;
            log_entry.finalize();
            writeln!(logger, "{}", serde_json::to_string(&log_entry)?)?;
            return Err(e);
        }
    };

    // Evaluate rules
    let (action_result, rule_evaluations) = engine.evaluate_with_details(&req);
    
    // Log evaluations
    for eval in rule_evaluations {
        println!("Rule: {}, Matched conditions: {}", 
                eval.name, 
                eval.conditions.iter().filter(|c| c.matched).count());
        log_entry.add_rule_evaluation(
            eval.name,
            &eval.rule,
            eval.conditions
                .into_iter()
                .map(|c| (c.rule, c.matched))
                .collect(),
        );
    }

    // Handle rule match
    if let Some((name, action)) = action_result {
        println!("Rule matched: {}, Action: {}", name, action.type_);
        log_entry.blocked = true;

        match action.type_.as_str() {
            "block" => {
                let status = action
                    .response_code
                    .and_then(|code| StatusCode::from_u16(code).ok())
                    .unwrap_or(StatusCode::FORBIDDEN);

                let response = Response::from_status(status)
                    .with_body_text_plain(&action
                        .response_message
                        .unwrap_or_else(|| format!("Blocked by rule: {}", name)));

                log_entry.add_response(&response);
                log_entry.set_final_action("blocked");
                log_entry.finalize();
                writeln!(logger, "{}", serde_json::to_string(&log_entry)?)?;
                return Ok(response);
            }
            "challenge" => {
                let response = Response::from_status(StatusCode::FORBIDDEN)
                    .with_body_text_plain(&format!("Challenge required by rule: {}", name));

                log_entry.add_response(&response);
                log_entry.set_final_action("challenged");
                log_entry.finalize();
                writeln!(logger, "{}", serde_json::to_string(&log_entry)?)?;
                return Ok(response);
            }
            "route" => {
                // Route to a dynamic backend
                if let Some(backend_name) = &action.backend {
                    if let Some(backend) = backends.get(backend_name) {
                        println!("Routing to dynamic backend: {}", backend_name);
                        log_entry.blocked = false;
                        return forward_request_to_backend(req, backend, &mut logger, log_entry, &format!("routed:{}", backend_name));
                    } else {
                        println!("Backend '{}' not found, using default", backend_name);
                        return forward_request(req, BACKEND_NAME, &mut logger, log_entry, "route_backend_missing");
                    }
                } else {
                    println!("Route action missing backend, using default");
                    return forward_request(req, BACKEND_NAME, &mut logger, log_entry, "route_no_backend");
                }
            }
            _ => {
                return forward_request(req, BACKEND_NAME, &mut logger, log_entry, "unknown_action");
            }
        }
    }

    // No rules matched - forward request
    forward_request(req, BACKEND_NAME, &mut logger, log_entry, "forwarded")
}

/// Result of loading configuration including rules and backends.
struct LoadedConfig {
    engine: RuleEngine,
    backends: HashMap<String, Backend>,
}

/// Creates a dynamic backend from configuration.
fn create_dynamic_backend(name: &str, config: &BackendConfig) -> Result<Backend, Error> {
    let target = format!("{}:{}", config.host, config.port);
    let mut builder = BackendBuilder::new(name, &target);

    if config.use_tls {
        builder = builder.enable_ssl();
    }

    if let Some(timeout) = config.connect_timeout {
        builder = builder.connect_timeout(Duration::from_millis(timeout));
    }

    if let Some(timeout) = config.first_byte_timeout {
        builder = builder.first_byte_timeout(Duration::from_millis(timeout));
    }

    if let Some(timeout) = config.between_bytes_timeout {
        builder = builder.between_bytes_timeout(Duration::from_millis(timeout));
    }

    builder.finish().map_err(|e| Error::msg(format!("Failed to create backend '{}': {:?}", name, e)))
}

/// Loads security rules and backends from the Config Store.
///
/// Supports two formats:
/// 1. Packed format: All rules compressed in 'rules_packed' key (preferred)
/// 2. Legacy format: Individual rules as separate keys with 'rule_list' index
///
/// The packed format uses gzip compression + base64 encoding to fit more rules
/// within Config Store's 8KB value limit. It also supports backend definitions.
///
/// # Returns
/// * `Ok(LoadedConfig)` - Initialized rule engine and backends if any rules loaded
/// * `Err(Error)` - If no valid rules could be loaded
fn load_rules() -> Result<LoadedConfig, Error> {
    let store = ConfigStore::open("security_rules");
    let mut engine = RuleEngine::new();

    // Use the new loader that supports both packed and legacy formats
    match load_rules_from_store(&store) {
        Ok(loaded) => {
            println!("Loaded {} rules, {} backend configs", loaded.rules.len(), loaded.backends.len());

            // Add rules to engine in order
            for rule_id in &loaded.rule_list {
                if let Some(rule) = loaded.rules.get(rule_id) {
                    let rule_json = serde_json::to_string(rule)
                        .map_err(|e| Error::msg(format!("Failed to serialize rule: {}", e)))?;

                    match engine.add_rule(rule_id.clone(), &rule_json) {
                        Ok(_) => println!("Loaded rule: {}", rule_id),
                        Err(e) => println!("Failed to add rule {}: {}", rule_id, e),
                    }
                }
            }

            if engine.rule_count() == 0 {
                return Err(Error::msg("No valid rules were loaded"));
            }

            // Create dynamic backends
            let mut backends = HashMap::new();
            for (name, config) in &loaded.backends {
                match create_dynamic_backend(name, config) {
                    Ok(backend) => {
                        println!("Created dynamic backend: {} -> {}:{}", name, config.host, config.port);
                        backends.insert(name.clone(), backend);
                    }
                    Err(e) => {
                        println!("Failed to create backend {}: {}", name, e);
                    }
                }
            }

            Ok(LoadedConfig { engine, backends })
        }
        Err(e) => {
            println!("Failed to load rules: {}", e);
            Err(Error::msg(format!("Rule loading failed: {}", e)))
        }
    }
}

/// Adds edge authentication headers to requests.
///
/// Creates an HMAC-based authentication header using:
/// - Shared secret from edge dictionary
/// - Current timestamp
/// - POP (Point of Presence) identifier
///
/// Format: timestamp,pop,signature
fn add_edge_auth(req: &mut Request) -> Result<(), Error> {
    // Get shared secret
    let store = ConfigStore::open("mss_shared_secret");
    let secret = store
        .get("compute_auth_key")
        .ok_or_else(|| Error::msg("Authentication secret not configured"))?
        .to_string();
    
    // Get POP and timestamp
    let pop = std::env::var("FASTLY_POP").unwrap_or_default();
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_secs();
    
    println!("Creating auth header - POP: {}, Time: {}", pop, now);
    
    // Generate signature
    let data = format!("{},{}", now, pop);
    let sig = HMAC::mac(data.as_bytes(), secret.as_bytes());
    let sig_hex = hex::encode(sig);
    
    // Set header
    let auth_header = format!("{},0x{}", data, sig_hex);
    req.set_header("Edge-Auth", &auth_header);
    println!("Auth header set: {}", auth_header);

    Ok(())
}

/// Forwards a request to a named backend (static configuration).
///
/// Handles:
/// - Adding edge authentication
/// - Sending the request
/// - Logging the response
/// - Finalizing timing metrics
fn forward_request(
    req: Request,
    backend: &str,
    logger: &mut Endpoint,
    mut log_entry: WafLog,
    action: &str,
) -> Result<Response, Error> {
    let mut backend_req = req.clone_without_body();
    add_edge_auth(&mut backend_req)?;

    let resp = backend_req.send(backend)?;
    println!("Forwarding to backend '{}', status: {}", backend, resp.get_status());

    log_entry.add_response(&resp);
    log_entry.set_final_action(action);
    log_entry.finalize();
    writeln!(logger, "{}", serde_json::to_string(&log_entry)?)?;

    Ok(resp)
}

/// Forwards a request to a dynamic backend instance.
///
/// Similar to forward_request but takes a Backend object directly,
/// allowing requests to be routed to dynamically configured backends.
fn forward_request_to_backend(
    req: Request,
    backend: &Backend,
    logger: &mut Endpoint,
    mut log_entry: WafLog,
    action: &str,
) -> Result<Response, Error> {
    let mut backend_req = req.clone_without_body();
    add_edge_auth(&mut backend_req)?;

    let resp = backend_req.send(backend.clone())?;
    println!("Forwarding to dynamic backend, status: {}", resp.get_status());

    log_entry.add_response(&resp);
    log_entry.set_final_action(action);
    log_entry.finalize();
    writeln!(logger, "{}", serde_json::to_string(&log_entry)?)?;

    Ok(resp)
}
