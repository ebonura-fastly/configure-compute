//! Node type definitions for security rules.
//!
//! Simplified node system with composable nodes:
//! - **Condition**: Pick field + operator + value (all matching in one node)
//! - **Action**: Pick action type (block/challenge/tarpit/log/allow)
//! - **Logic**: AND/OR/NOT for combining conditions
//! - **RateLimit**: Check/update rate counters
//! - **Header**: Set or remove headers
//! - **Forward**: Route to backend

use crate::ports::{InputPort, OutputPort, PortType};
use serde::{Deserialize, Serialize};

/// A node in the security rule graph.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    /// Unique identifier within the graph
    pub id: NodeId,
    /// The node's behavior/type
    pub kind: NodeKind,
    /// Position in the editor (x, y)
    pub position: (f32, f32),
}

/// Unique node identifier
pub type NodeId = u32;

/// The different types of nodes available.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum NodeKind {
    // ═══════════════════════════════════════════════════════════════════════
    // INPUT
    // ═══════════════════════════════════════════════════════════════════════

    /// The request input - starting point of every graph
    Request,

    // ═══════════════════════════════════════════════════════════════════════
    // CONDITION - The main matching node
    // ═══════════════════════════════════════════════════════════════════════

    /// Single node for all condition checking
    /// Select a field, an operator, and a value to compare against
    Condition {
        field: RequestField,
        operator: Operator,
        value: ConditionValue,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LOGIC - Combine conditions
    // ═══════════════════════════════════════════════════════════════════════

    /// Combine multiple conditions with AND
    And { input_count: u8 },

    /// Combine multiple conditions with OR
    Or { input_count: u8 },

    /// Invert a condition
    Not,

    // ═══════════════════════════════════════════════════════════════════════
    // RATE LIMITING
    // ═══════════════════════════════════════════════════════════════════════

    /// All rate limiting operations in one node
    RateLimit {
        mode: RateLimitMode,
        counter_name: String,
        /// For CheckRate mode
        window: RateWindow,
        threshold: u32,
        /// For CheckRate with auto_penalize, or AddToPenaltyBox
        penalty_ttl_seconds: u32,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION - What to do when conditions match
    // ═══════════════════════════════════════════════════════════════════════

    /// Single node for all actions (block, challenge, tarpit, log, allow)
    Action {
        action: ActionType,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ROUTING
    // ═══════════════════════════════════════════════════════════════════════

    /// Forward to a backend
    Forward {
        backend: String,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TRANSFORM
    // ═══════════════════════════════════════════════════════════════════════

    /// Set or remove a header
    Header {
        operation: HeaderOp,
        name: String,
        /// Value for Set operation (ignored for Remove)
        value: Option<String>,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // UTILITY
    // ═══════════════════════════════════════════════════════════════════════

    /// Comment/documentation node
    Comment { text: String },
}

// ═══════════════════════════════════════════════════════════════════════════
// Supporting types
// ═══════════════════════════════════════════════════════════════════════════

/// All available request fields that can be checked
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum RequestField {
    // Connection
    ClientIp,
    Asn,
    Country,

    // Request
    Method,
    Path,
    Host,
    UserAgent,

    // TLS Fingerprints
    Ja3,
    Ja4,

    // Geo/Proxy detection
    ProxyType,      // anonymous, public, transparent, vpn
    ProxyDescription, // tor-exit, tor-relay, etc.
    IsHostingProvider,

    // Custom header
    Header { name: String },
}

impl RequestField {
    pub fn display_name(&self) -> &str {
        match self {
            RequestField::ClientIp => "Client IP",
            RequestField::Asn => "ASN",
            RequestField::Country => "Country",
            RequestField::Method => "Method",
            RequestField::Path => "Path",
            RequestField::Host => "Host",
            RequestField::UserAgent => "User Agent",
            RequestField::Ja3 => "JA3",
            RequestField::Ja4 => "JA4",
            RequestField::ProxyType => "Proxy Type",
            RequestField::ProxyDescription => "Proxy Description",
            RequestField::IsHostingProvider => "Is Hosting Provider",
            RequestField::Header { .. } => "Header",
        }
    }

    /// Returns all non-header fields for the UI picker
    pub fn all_standard() -> &'static [RequestField] {
        &[
            RequestField::ClientIp,
            RequestField::Asn,
            RequestField::Country,
            RequestField::Method,
            RequestField::Path,
            RequestField::Host,
            RequestField::UserAgent,
            RequestField::Ja3,
            RequestField::Ja4,
            RequestField::ProxyType,
            RequestField::ProxyDescription,
            RequestField::IsHostingProvider,
        ]
    }
}

/// Comparison operators for conditions
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Operator {
    // String operators
    Equals,
    NotEquals,
    Contains,
    NotContains,
    StartsWith,
    EndsWith,
    Matches,  // Regex

    // Numeric operators
    GreaterThan,
    LessThan,
    GreaterOrEqual,
    LessOrEqual,

    // List/set operators
    In,       // Value is in list
    NotIn,    // Value is not in list

    // IP-specific
    InCidr,   // IP is in CIDR range(s)

    // Existence
    Exists,
    NotExists,
}

impl Operator {
    pub fn display_name(&self) -> &str {
        match self {
            Operator::Equals => "equals",
            Operator::NotEquals => "not equals",
            Operator::Contains => "contains",
            Operator::NotContains => "not contains",
            Operator::StartsWith => "starts with",
            Operator::EndsWith => "ends with",
            Operator::Matches => "matches (regex)",
            Operator::GreaterThan => ">",
            Operator::LessThan => "<",
            Operator::GreaterOrEqual => ">=",
            Operator::LessOrEqual => "<=",
            Operator::In => "in list",
            Operator::NotIn => "not in list",
            Operator::InCidr => "in CIDR",
            Operator::Exists => "exists",
            Operator::NotExists => "not exists",
        }
    }

    /// Operators suitable for string fields
    pub fn string_operators() -> &'static [Operator] {
        &[
            Operator::Equals,
            Operator::NotEquals,
            Operator::Contains,
            Operator::NotContains,
            Operator::StartsWith,
            Operator::EndsWith,
            Operator::Matches,
            Operator::In,
            Operator::NotIn,
            Operator::Exists,
            Operator::NotExists,
        ]
    }

    /// Operators suitable for numeric fields
    pub fn numeric_operators() -> &'static [Operator] {
        &[
            Operator::Equals,
            Operator::NotEquals,
            Operator::GreaterThan,
            Operator::LessThan,
            Operator::GreaterOrEqual,
            Operator::LessOrEqual,
            Operator::In,
            Operator::NotIn,
        ]
    }

    /// Operators suitable for IP fields
    pub fn ip_operators() -> &'static [Operator] {
        &[
            Operator::Equals,
            Operator::NotEquals,
            Operator::In,
            Operator::NotIn,
            Operator::InCidr,
        ]
    }
}

/// Value to compare against in a condition
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ConditionValue {
    String(String),
    Number(f64),
    Bool(bool),
    List(Vec<String>),  // For In/NotIn operators
    CidrList(Vec<String>),  // For InCidr operator
}

/// Rate limiting time windows
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RateWindow {
    OneSec,
    TenSecs,
    SixtySecs,
}

impl RateWindow {
    pub fn display_name(&self) -> &str {
        match self {
            RateWindow::OneSec => "1 second",
            RateWindow::TenSecs => "10 seconds",
            RateWindow::SixtySecs => "60 seconds",
        }
    }
}

/// Rate limiting modes
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RateLimitMode {
    /// Check rate and output bool (exceeded or not)
    CheckRate,
    /// Check rate, auto-add to penalty box if exceeded
    CheckRateAndPenalize,
    /// Check if already in penalty box
    InPenaltyBox,
    /// Manually add to penalty box (triggered by input)
    AddToPenaltyBox,
}

impl RateLimitMode {
    pub fn display_name(&self) -> &str {
        match self {
            RateLimitMode::CheckRate => "Check Rate",
            RateLimitMode::CheckRateAndPenalize => "Check & Penalize",
            RateLimitMode::InPenaltyBox => "In Penalty Box?",
            RateLimitMode::AddToPenaltyBox => "Add to Penalty Box",
        }
    }
}

/// Action types for the Action node
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum ActionType {
    Block {
        status_code: u16,
        message: String,
    },
    Challenge {
        challenge_type: ChallengeType,
    },
    Tarpit {
        delay_ms: u32,
    },
    Log {
        message: String,
        severity: LogSeverity,
    },
    Allow,
}

impl ActionType {
    pub fn display_name(&self) -> &str {
        match self {
            ActionType::Block { .. } => "Block",
            ActionType::Challenge { .. } => "Challenge",
            ActionType::Tarpit { .. } => "Tarpit",
            ActionType::Log { .. } => "Log",
            ActionType::Allow => "Allow",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ChallengeType {
    NonInteractive,
    Interactive,
    Captcha,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LogSeverity {
    Debug,
    Info,
    Warning,
    Error,
}

/// Header operations
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum HeaderOp {
    Set,
    Remove,
}

// ═══════════════════════════════════════════════════════════════════════════
// Node metadata (for editor)
// ═══════════════════════════════════════════════════════════════════════════

impl NodeKind {
    /// Get the display name for this node type
    pub fn display_name(&self) -> String {
        match self {
            NodeKind::Request => "Request".to_string(),
            NodeKind::Condition { field, operator, .. } => {
                format!("{} {}", field.display_name(), operator.display_name())
            }
            NodeKind::And { .. } => "AND".to_string(),
            NodeKind::Or { .. } => "OR".to_string(),
            NodeKind::Not => "NOT".to_string(),
            NodeKind::RateLimit { mode, counter_name, threshold, window, .. } => {
                match mode {
                    RateLimitMode::CheckRate | RateLimitMode::CheckRateAndPenalize => {
                        format!("{}: {}>{}/{}", mode.display_name(), counter_name, threshold, window.display_name())
                    }
                    RateLimitMode::InPenaltyBox | RateLimitMode::AddToPenaltyBox => {
                        format!("{}: {}", mode.display_name(), counter_name)
                    }
                }
            }
            NodeKind::Action { action } => action.display_name().to_string(),
            NodeKind::Forward { backend } => format!("Forward: {}", backend),
            NodeKind::Header { operation, name, .. } => {
                match operation {
                    HeaderOp::Set => format!("Set: {}", name),
                    HeaderOp::Remove => format!("Remove: {}", name),
                }
            }
            NodeKind::Comment { .. } => "Comment".to_string(),
        }
    }

    /// Get the category for this node
    pub fn category(&self) -> NodeCategory {
        match self {
            NodeKind::Request => NodeCategory::Input,
            NodeKind::Condition { .. } => NodeCategory::Condition,
            NodeKind::And { .. } | NodeKind::Or { .. } | NodeKind::Not => NodeCategory::Logic,
            NodeKind::RateLimit { .. } => NodeCategory::RateLimit,
            NodeKind::Action { .. } => NodeCategory::Action,
            NodeKind::Forward { .. } => NodeCategory::Routing,
            NodeKind::Header { .. } => NodeCategory::Transform,
            NodeKind::Comment { .. } => NodeCategory::Utility,
        }
    }

    /// Get input port definitions for this node
    pub fn inputs(&self) -> Vec<InputPort> {
        match self {
            NodeKind::Request => vec![],
            NodeKind::Condition { .. } => vec![], // Self-contained, no inputs needed
            NodeKind::And { input_count } | NodeKind::Or { input_count } => {
                (0..*input_count)
                    .map(|i| InputPort::new(format!("in{}", i), PortType::Bool))
                    .collect()
            }
            NodeKind::Not => vec![InputPort::new("in", PortType::Bool)],
            NodeKind::RateLimit { mode, .. } => {
                match mode {
                    RateLimitMode::AddToPenaltyBox => vec![InputPort::new("trigger", PortType::Bool)],
                    _ => vec![], // Uses client IP implicitly
                }
            }
            NodeKind::Action { .. } => vec![InputPort::new("trigger", PortType::Bool)],
            NodeKind::Forward { .. } => vec![InputPort::new("trigger", PortType::Bool)],
            NodeKind::Header { .. } => vec![InputPort::new("trigger", PortType::Bool)],
            NodeKind::Comment { .. } => vec![],
        }
    }

    /// Get output port definitions for this node
    pub fn outputs(&self) -> Vec<OutputPort> {
        match self {
            NodeKind::Request => vec![OutputPort::new("request", PortType::Any)],
            NodeKind::Condition { .. } => vec![OutputPort::new("match", PortType::Bool)],
            NodeKind::And { .. } | NodeKind::Or { .. } | NodeKind::Not => {
                vec![OutputPort::new("out", PortType::Bool)]
            }
            NodeKind::RateLimit { mode, .. } => {
                match mode {
                    RateLimitMode::CheckRate | RateLimitMode::CheckRateAndPenalize => {
                        vec![OutputPort::new("exceeded", PortType::Bool)]
                    }
                    RateLimitMode::InPenaltyBox => {
                        vec![OutputPort::new("in_box", PortType::Bool)]
                    }
                    RateLimitMode::AddToPenaltyBox => vec![], // Side effect only
                }
            }
            NodeKind::Action { .. } => vec![], // Terminal
            NodeKind::Forward { .. } => vec![], // Terminal
            NodeKind::Header { .. } => vec![], // Terminal (or could chain)
            NodeKind::Comment { .. } => vec![],
        }
    }

    /// Get the header color for this node (dark/muted for white text contrast)
    /// Colors inspired by Blender's geometry nodes
    pub fn color(&self) -> (u8, u8, u8) {
        match self.category() {
            NodeCategory::Input => (138, 80, 77),       // Muted coral/red
            NodeCategory::Condition => (100, 80, 120),  // Muted purple
            NodeCategory::Logic => (70, 100, 70),       // Muted green
            NodeCategory::RateLimit => (130, 95, 55),   // Muted orange/brown
            NodeCategory::Action => (120, 60, 60),      // Muted red
            NodeCategory::Routing => (60, 95, 115),     // Muted blue
            NodeCategory::Transform => (110, 95, 55),   // Muted gold
            NodeCategory::Utility => (70, 70, 70),      // Dark gray
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NodeCategory {
    Input,
    Condition,
    Logic,
    RateLimit,
    Action,
    Routing,
    Transform,
    Utility,
}

impl NodeCategory {
    pub fn display_name(&self) -> &'static str {
        match self {
            NodeCategory::Input => "Input",
            NodeCategory::Condition => "Condition",
            NodeCategory::Logic => "Logic",
            NodeCategory::RateLimit => "Rate Limiting",
            NodeCategory::Action => "Action",
            NodeCategory::Routing => "Routing",
            NodeCategory::Transform => "Transform",
            NodeCategory::Utility => "Utility",
        }
    }

    pub fn all() -> &'static [NodeCategory] {
        &[
            NodeCategory::Input,
            NodeCategory::Condition,
            NodeCategory::Logic,
            NodeCategory::RateLimit,
            NodeCategory::Action,
            NodeCategory::Routing,
            NodeCategory::Transform,
            NodeCategory::Utility,
        ]
    }
}
