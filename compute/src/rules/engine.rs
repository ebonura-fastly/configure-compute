use super::types::*;
use cidr::Ipv4Cidr;
use fastly::device_detection;
use fastly::erl::{Penaltybox, RateCounter};
use fastly::Request;
use std::time::Duration;
use regex::Regex;
use std::collections::HashMap;
use std::str::FromStr;

/// Represents the evaluation result of a single security rule, including all condition matches
/// and the overall match status.
///
/// This struct is used for detailed logging and debugging of rule evaluations, providing
/// visibility into why a rule matched or didn't match.
#[derive(Debug)]
pub struct RuleEvaluation {
    pub name: String,
    pub rule: Rule,
    pub conditions: Vec<ConditionEvaluation>,
    pub matched: bool,
}

/// Represents the evaluation result of a single condition within a rule.
///
/// Tracks both the original condition rule and whether it matched the request,
/// enabling detailed analysis of which specific conditions triggered within a rule.
#[derive(Debug)]
pub struct ConditionEvaluation {
    pub rule: ConditionRule,
    pub matched: bool,
}

/// The core security rules evaluation engine.
///
/// RuleEngine maintains a collection of security rules and provides methods to:
/// - Load and parse rules from JSON configuration
/// - Evaluate requests against the rule set
/// - Generate detailed evaluation reports
///
/// Rules are evaluated in order until a match is found, at which point the
/// corresponding action (block, challenge, etc.) is returned.
pub struct RuleEngine {
    /// Map of rule names to their definitions
    rules: HashMap<String, Rule>,
    /// Map of rate counter instances by name
    rate_counters: HashMap<String, RateCounter>,
    /// Map of penalty box instances by name
    penalty_boxes: HashMap<String, Penaltybox>,
}

impl RuleEngine {
    /// Creates a new, empty rule engine instance.
    ///
    /// # Returns
    /// A RuleEngine with no rules loaded. Use `add_rule()` to populate with rules.
    pub fn new() -> Self {
        Self {
            rules: HashMap::new(),
            rate_counters: HashMap::new(),
            penalty_boxes: HashMap::new(),
        }
    }

    /// Returns the number of rules loaded in the engine.
    pub fn rule_count(&self) -> usize {
        self.rules.len()
    }

    /// Adds a new rule to the engine from a JSON string.
    ///
    /// # Arguments
    /// * `name` - Unique identifier for the rule
    /// * `rule_str` - JSON string containing the rule definition
    ///
    /// # Returns
    /// * `Ok(())` if the rule was successfully parsed and added
    /// * `Err(serde_json::Error)` if the JSON parsing failed
    pub fn add_rule(&mut self, name: String, rule_str: &str) -> Result<(), serde_json::Error> {
        let rule: Rule = serde_json::from_str(rule_str)?;
        self.rules.insert(name, rule);
        Ok(())
    }

    /// Evaluates a request against all rules, providing detailed evaluation results.
    ///
    /// This method evaluates rules in order until a match is found. For each rule,
    /// it tracks which conditions matched and why, enabling detailed logging and
    /// debugging of the security decision process.
    ///
    /// # Arguments
    /// * `req` - The incoming HTTP request to evaluate
    ///
    /// # Returns
    /// A tuple containing:
    /// * Option<(String, Action)> - The matched rule name and action, if any
    /// * Vec<RuleEvaluation> - Detailed evaluation results for all processed rules
    pub fn evaluate_with_details(
        &mut self,
        req: &Request,
    ) -> (Option<(String, Action)>, Vec<RuleEvaluation>) {
        // Collect enabled rules first to avoid borrowing issues
        let rules_to_evaluate: Vec<_> = self.rules
            .iter()
            .filter(|(_, rule)| rule.enabled)
            .map(|(name, rule)| (name.clone(), rule.clone()))
            .collect();

        let mut evaluations = Vec::new();

        for (name, rule) in rules_to_evaluate {
            let (matched, conditions) = self.evaluate_condition_with_details(&rule.conditions, req);

            let eval = RuleEvaluation {
                name: name.clone(),
                rule: rule.clone(),
                conditions,
                matched,
            };

            evaluations.push(eval);

            if matched {
                return (Some((name, rule.action)), evaluations);
            }
        }

        (None, evaluations)
    }

    /// Simplified version of evaluate_with_details that only returns the first matching rule.
    ///
    /// # Arguments
    /// * `req` - The incoming HTTP request to evaluate
    ///
    /// # Returns
    /// Option<(String, Action)> - The matched rule name and action, if any
    pub fn evaluate(&mut self, req: &Request) -> Option<(String, Action)> {
        self.evaluate_with_details(req).0
    }

    /// Evaluates a set of conditions against a request, tracking detailed results.
    ///
    /// Conditions are combined using logical operators (AND, OR, NOT) and can include:
    /// - Path matching (exact, prefix, contains, regex)
    /// - IP address filtering (exact match, CIDR ranges)
    /// - Device type detection (mobile, tablet, desktop)
    /// - User-Agent analysis
    /// - Header validation
    /// - Rate limiting (placeholder)
    ///
    /// # Arguments
    /// * `condition` - The condition set to evaluate
    /// * `req` - The incoming HTTP request
    /// * `rule_name` - The name of the rule being evaluated
    ///
    /// # Returns
    /// A tuple containing:
    /// * bool - Whether the condition set matched
    /// * Vec<ConditionEvaluation> - Detailed results for each condition
    fn evaluate_condition_with_details(
        &mut self,
        condition: &Condition,
        req: &Request,
    ) -> (bool, Vec<ConditionEvaluation>) {
        let mut evaluations = Vec::new();

        for rule in &condition.rules {
            let matched = self.evaluate_rule(rule, req);
            evaluations.push(ConditionEvaluation {
                rule: rule.clone(),
                matched,
            });
        }

        let result = match condition.operator {
            Operator::AND => evaluations.iter().all(|eval| eval.matched),
            Operator::OR => evaluations.iter().any(|eval| eval.matched),
            Operator::NOT => !evaluations.iter().any(|eval| eval.matched),
        };

        (result, evaluations)
    }

    /// Evaluates a single condition rule against a request.
    ///
    /// This is the core evaluation logic that handles different types of rules:
    /// - Path rules check the request path against patterns
    /// - IP rules validate the client IP against allowed ranges
    /// - Device rules check the client device type
    /// - UserAgent rules analyze the User-Agent header
    /// - Header rules validate request headers
    /// - RateLimit rules check request frequency (placeholder)
    ///
    /// # Arguments
    /// * `rule` - The specific condition rule to evaluate
    /// * `req` - The incoming HTTP request
    /// * `rule_name` - The name of the rule being evaluated
    ///
    /// # Returns
    /// bool - Whether the rule matched the request
    fn evaluate_rule(&mut self, rule: &ConditionRule, req: &Request) -> bool {
        match rule {
            ConditionRule::Path { operator, value } => {
                let path = req.get_path();
                match operator {
                    StringOperator::Equals => path == value,
                    StringOperator::StartsWith => path.starts_with(value),
                    StringOperator::Contains => path.contains(value),
                    StringOperator::Matches => Regex::new(value)
                        .map(|re| re.is_match(path))
                        .unwrap_or(false),
                }
            }
            ConditionRule::IP { operator, value } => {
                if let Some(client_ip) = req.get_client_ip_addr() {
                    match operator {
                        IpOperator::Equals => value.contains(&client_ip.to_string()),
                        IpOperator::InRange => value.iter().any(|cidr_str| {
                            if let Ok(cidr) = Ipv4Cidr::from_str(cidr_str) {
                                if let std::net::IpAddr::V4(ipv4) = client_ip {
                                    return cidr.contains(&ipv4);
                                }
                            }
                            false
                        }),
                    }
                } else {
                    false
                }
            }
            ConditionRule::Device { operator, value } => {
                if let Some(user_agent) = req.get_header_str("user-agent") {
                    if let Some(device) = device_detection::lookup(user_agent) {
                        match (operator, value.as_str()) {
                            (DeviceOperator::Is, "mobile") => device.is_mobile().unwrap_or(false),
                            (DeviceOperator::Is, "tablet") => device.is_tablet().unwrap_or(false),
                            (DeviceOperator::Is, "desktop") => device.is_desktop().unwrap_or(false),
                            (DeviceOperator::IsNot, "mobile") => {
                                !device.is_mobile().unwrap_or(false)
                            }
                            (DeviceOperator::IsNot, "tablet") => {
                                !device.is_tablet().unwrap_or(false)
                            }
                            (DeviceOperator::IsNot, "desktop") => {
                                !device.is_desktop().unwrap_or(false)
                            }
                            _ => false,
                        }
                    } else {
                        false
                    }
                } else {
                    false
                }
            }
            ConditionRule::UserAgent { operator, value } => {
                if let Some(user_agent) = req.get_header_str("user-agent") {
                    match operator {
                        StringOperator::Equals => user_agent == value,
                        StringOperator::Contains => user_agent.contains(value),
                        StringOperator::StartsWith => user_agent.starts_with(value),
                        StringOperator::Matches => Regex::new(value)
                            .map(|re| re.is_match(user_agent))
                            .unwrap_or(false),
                    }
                } else {
                    false
                }
            }
            ConditionRule::Header { key, operator } => match operator {
                HeaderOperator::Exists => req.contains_header(key),
                HeaderOperator::NotExists => !req.contains_header(key),
                HeaderOperator::Equals => {
                    req.get_header_str(key).map(|v| v == key).unwrap_or(false)
                }
                HeaderOperator::Contains => req
                    .get_header_str(key)
                    .map(|v| v.contains(key))
                    .unwrap_or(false),
            },
            ConditionRule::RateLimit {
                window,
                max_requests,
                block_ttl,
                counter_name,
                penaltybox_name,
            } => {
                // Generate unique names for this rule's rate counter and penalty box if not provided
                let generated_counter_name = format!("rate_counter_{}_{}_{}", window, max_requests, block_ttl);
                let generated_penalty_name = format!("penalty_box_{}_{}_{}", window, max_requests, block_ttl);
                
                let counter_name = counter_name.as_deref().unwrap_or(&generated_counter_name);
                let penaltybox_name = penaltybox_name.as_deref().unwrap_or(&generated_penalty_name);

                // Get or create dedicated rate counter and penalty box instances for this rule
                let rate_counter = self.rate_counters
                    .entry(counter_name.to_string())
                    .or_insert_with(|| RateCounter::open(counter_name));

                let penalty_box = self.penalty_boxes
                    .entry(penaltybox_name.to_string())
                    .or_insert_with(|| Penaltybox::open(penaltybox_name));

                // Check if client is already in penalty box
                if let Some(client_ip) = req.get_client_ip_addr() {
                    let entry = client_ip.to_string();
                    
                    if let Ok(true) = penalty_box.has(&entry) {
                        return true; // Request should be blocked
                    }

                    // Create ERL instance and check rate
                    let window = window.clone().into();
                    let ttl = Duration::from_secs(*block_ttl as u64); // Use seconds directly

                    // Increment first to include current request in count
                    if let Ok(_) = rate_counter.increment(&entry, 1) {
                        match rate_counter.lookup_rate(&entry, window) {
                            Ok(rate) => {
                                if rate > *max_requests {
                                    // Add to penalty box if over limit
                                    if penalty_box.add(&entry, ttl).is_ok() {
                                        true
                                    } else {
                                        false // Error adding to penalty box, allow through
                                    }
                                } else {
                                    false // Under limit
                                }
                            }
                            Err(_) => false, // Error checking rate, allow through
                        }
                    } else {
                        false // Error incrementing counter, allow through
                    }
                } else {
                    false // No client IP, allow through
                }
            }
        }
    }
}
