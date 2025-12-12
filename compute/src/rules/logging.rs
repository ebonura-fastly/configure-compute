//! Security event logging system for the WAF (Web Application Firewall).
//!
//! This module provides structured logging capabilities for security events:
//! - Detailed request/response information
//! - Rule evaluation results
//! - Performance metrics
//! - Security actions taken

use crate::rules::types::{ConditionRule, Rule};
use chrono::Utc;
use fastly::{Request, Response};
use serde::Serialize;
use std::time::Instant;
use uuid::{timestamp::Timestamp, NoContext, Uuid}; // Fixed import path

/// Detailed information about the incoming HTTP request.
///
/// Captures all relevant request data for security analysis:
/// - HTTP method and URL
/// - Client/server IP addresses
/// - Headers and body information
/// - Protocol details
#[derive(Serialize)]
struct RequestDetails {
    method: String,
    url: String,
    path: String,
    query_string: String,
    client_ip: String,
    server_ip: String,
    content_length: usize,
    has_body: bool,
    version: String,
    content_type: String,
    headers: Vec<(String, String)>,
}

/// Information about the HTTP response sent back to the client.
///
/// Tracks the outcome of request processing:
/// - Status code
/// - Content details
/// - Response headers
#[derive(Serialize)]
struct ResponseDetails {
    status_code: u16,
    content_length: Option<usize>,
    content_type: Option<String>,
    headers: Vec<(String, String)>,
}

/// Details about a security rule evaluation.
///
/// Records how a rule was processed:
/// - Rule configuration
/// - Matched conditions
/// - Action taken
/// - Response details if blocked/challenged
#[derive(Serialize)]
struct RuleMatch {
    name: String,
    enabled: bool,
    operator: String,
    conditions: Vec<ConditionMatch>,
    action_taken: String,
    action_type: String,
    response_code: Option<u16>,
    response_message: Option<String>,
    challenge_type: Option<String>,
}

/// Result of evaluating a single condition within a rule.
///
/// Tracks the specific condition details and whether it matched:
/// - Condition type (path, IP, device, etc.)
/// - Operator used
/// - Value being checked
/// - Match result
#[derive(Serialize)]
struct ConditionMatch {
    r#type: String,
    operator: String,
    value: String,
    matched: bool,
}

/// Complete log entry for a request processed by the WAF.
///
/// This is the main logging structure that combines:
/// - Request/response details
/// - Rule evaluation results
/// - Timing information
/// - Final security decision
#[derive(Serialize)]
pub struct WafLog {
    pub request_id: String,
    pub timestamp: String,
    pub processing_time_ms: u64,
    pub request: RequestDetails,
    pub response: Option<ResponseDetails>,
    pub rules_evaluated: Vec<RuleMatch>,
    pub final_action: String,
    pub blocked: bool,
    #[serde(skip)]
    start_time: Instant,
}

impl WafLog {
    /// Creates a new WAF log entry for a request.
    ///
    /// Initializes logging with:
    /// - Unique request ID (UUIDv7)
    /// - Timestamp
    /// - Complete request details
    /// - Performance tracking
    pub fn new(req: &Request, start_time: Instant) -> Self {
        let now = Utc::now();
        let ts = Timestamp::from_unix(
            &NoContext,
            now.timestamp() as u64,
            now.timestamp_subsec_nanos(),
        );
        let uuid = Uuid::new_v7(ts);

        let headers = req
            .get_header_names()
            .filter_map(|name| {
                req.get_header(name).map(|value| {
                    (
                        name.to_string(),
                        value.to_str().unwrap_or("invalid").to_string(),
                    )
                })
            })
            .collect();

        WafLog {
            request_id: uuid.to_string(),
            timestamp: now.to_rfc3339(),
            processing_time_ms: 0,
            start_time,
            request: RequestDetails {
                method: req.get_method().to_string(),
                url: req.get_url().to_string(),
                path: req.get_path().to_string(),
                query_string: req.get_query_str().unwrap_or("none").to_string(),
                client_ip: req
                    .get_client_ip_addr()
                    .map_or("none".to_string(), |ip| ip.to_string()),
                server_ip: req
                    .get_server_ip_addr()
                    .map_or("none".to_string(), |ip| ip.to_string()),
                content_length: req.get_content_length().unwrap_or(0),
                has_body: req.has_body(),
                version: format!("{:?}", req.get_version()),
                content_type: req
                    .get_content_type()
                    .map_or("none".to_string(), |ct| ct.to_string()),
                headers,
            },
            response: None,
            rules_evaluated: Vec::new(),
            final_action: "initializing".to_string(),
            blocked: false,
        }
    }

    /// Completes the log entry by calculating final processing time.
    ///
    /// Should be called just before writing the log entry.
    pub fn finalize(&mut self) {
        self.processing_time_ms = self.start_time.elapsed().as_millis() as u64;
    }

    /// Records the evaluation of a security rule.
    ///
    /// Tracks:
    /// - Rule name and configuration
    /// - Which conditions matched
    /// - Action taken (if any)
    /// - Response details for blocks/challenges
    pub fn add_rule_evaluation(
        &mut self,
        name: String,
        rule: &Rule,
        matches: Vec<(ConditionRule, bool)>,
    ) {
        let any_matches = matches.iter().any(|(_, m)| *m);

        let conditions = matches
            .into_iter()
            .map(|(condition, matched)| ConditionMatch {
                r#type: match &condition {
                    ConditionRule::Path { .. } => "path",
                    ConditionRule::IP { .. } => "ip",
                    ConditionRule::Device { .. } => "device",
                    ConditionRule::UserAgent { .. } => "user_agent",
                    ConditionRule::Header { .. } => "header",
                    ConditionRule::RateLimit { .. } => "rate_limit",
                }
                .to_string(),
                operator: match &condition {
                    ConditionRule::Path { operator, .. } => format!("{:?}", operator),
                    ConditionRule::IP { operator, .. } => format!("{:?}", operator),
                    ConditionRule::Device { operator, .. } => format!("{:?}", operator),
                    ConditionRule::UserAgent { operator, .. } => format!("{:?}", operator),
                    ConditionRule::Header { operator, .. } => format!("{:?}", operator),
                    ConditionRule::RateLimit { .. } => "rate_limit".to_string(),
                },
                value: match &condition {
                    ConditionRule::Path { value, .. } => value.clone(),
                    ConditionRule::IP { value, .. } => value.join(", "),
                    ConditionRule::Device { value, .. } => value.clone(),
                    ConditionRule::UserAgent { value, .. } => value.clone(),
                    ConditionRule::Header { key, .. } => key.clone(),
                    ConditionRule::RateLimit {
                        window,
                        max_requests,
                        block_ttl,
                        counter_name,
                        penaltybox_name,
                    } => {
                        let generated_counter = format!("rate_counter_{}_{}_{}", window, max_requests, block_ttl);
                        let generated_penalty = format!("penalty_box_{}_{}_{}", window, max_requests, block_ttl);
                        
                        let counter_name_str = counter_name.as_deref().unwrap_or(&generated_counter);
                        let penalty_name_str = penaltybox_name.as_deref().unwrap_or(&generated_penalty);
                        
                        // Get rate counter and penalty box instances
                        let rate_counter = fastly::erl::RateCounter::open(counter_name_str);
                        let penalty_box = fastly::erl::Penaltybox::open(penalty_name_str);
                        
                        // Use stored client IP instead of getting a new request handle
                        let mut debug_info = format!(
                            "{} requests per {}, block for {}m, counter: {}, penalty box: {}", 
                            max_requests, 
                            window,
                            block_ttl,
                            counter_name_str,
                            penalty_name_str
                        );

                        // Use the client IP from the request details
                        if self.request.client_ip != "none" {
                            let entry = self.request.client_ip.clone();
                            
                            // Add rate counter status
                            if let Ok(rate) = rate_counter.lookup_rate(&entry, (*window).into()) {
                                debug_info.push_str(&format!("\nRate counter status: {} requests", rate));
                            }
                            
                            // Add penalty box status
                            if let Ok(true) = penalty_box.has(&entry) {
                                debug_info.push_str("\nIn penalty box: yes");
                            } else {
                                debug_info.push_str("\nIn penalty box: no");
                            }
                        }
                        
                        debug_info
                    },
                },
                matched,
            })
            .collect();

        self.rules_evaluated.push(RuleMatch {
            name,
            enabled: rule.enabled,
            operator: format!("{:?}", rule.conditions.operator),
            conditions,
            action_taken: if any_matches {
                "matched"
            } else {
                "not_matched"
            }
            .to_string(),
            action_type: rule.action.type_.clone(),
            response_code: rule.action.response_code,
            response_message: rule.action.response_message.clone(),
            challenge_type: rule.action.challenge_type.clone(),
        });
    }

    /// Adds response information to the log entry.
    ///
    /// Captures all response details:
    /// - Status code
    /// - Headers
    /// - Content information
    pub fn add_response(&mut self, resp: &Response) {
        let headers = resp
            .get_header_names()
            .filter_map(|name| {
                resp.get_header(name).map(|value| {
                    (
                        name.to_string(),
                        value.to_str().unwrap_or("invalid").to_string(),
                    )
                })
            })
            .collect();

        self.response = Some(ResponseDetails {
            status_code: resp.get_status().as_u16(),
            content_length: resp.get_content_length(),
            content_type: resp.get_content_type().map(|ct| ct.to_string()),
            headers,
        });
    }

    /// Sets the final security action taken.
    ///
    /// Records the ultimate decision:
    /// - forwarded: Request allowed through
    /// - blocked: Request denied
    /// - challenged: Client challenge issued
    pub fn set_final_action(&mut self, action: &str) {
        self.final_action = action.to_string();
    }
}
