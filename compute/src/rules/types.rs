use serde::{Deserialize, Serialize};

/// Collection of security rules that can be loaded from JSON configuration.
///
/// This is the top-level structure that represents all security rules in the system.
#[derive(Debug, Deserialize, Serialize)]
pub struct SecurityRules {
    pub rules: Vec<(String, Rule)>,
}

/// A single security rule that can be evaluated against incoming requests.
///
/// Each rule consists of:
/// - enabled flag to easily toggle rules on/off
/// - conditions that determine when the rule matches
/// - action to take when conditions match
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Rule {
    pub enabled: bool,
    pub conditions: Condition,
    pub action: Action,
}

/// A set of conditions combined with a logical operator.
///
/// Conditions are evaluated according to the operator:
/// - AND: all conditions must match
/// - OR: any condition must match
/// - NOT: no conditions should match
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Condition {
    pub operator: Operator,
    pub rules: Vec<ConditionRule>,
}

/// Different types of conditions that can be evaluated against a request.
///
/// Each variant represents a different aspect of the request that can be checked:
/// - Path: URL path matching
/// - IP: Client IP address validation
/// - Device: Client device type detection
/// - UserAgent: Browser/client identification
/// - Header: HTTP header validation
/// - RateLimit: Request frequency control
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ConditionRule {
    Path {
        operator: StringOperator,
        value: String,
    },
    IP {
        operator: IpOperator,
        value: Vec<String>,
    },
    Device {
        operator: DeviceOperator,
        value: String,
    },
    UserAgent {
        operator: StringOperator,
        value: String,
    },
    Header {
        key: String,
        operator: HeaderOperator,
    },
    RateLimit {
        /// The time window for rate limiting (1s, 10s, 60s)
        window: RateLimitWindow,
        /// Maximum number of requests allowed in the window
        max_requests: u32,
        /// Time to block requests after limit is exceeded (1m to 1h)
        block_ttl: u32,
        /// Optional name for the rate counter. If not provided, a unique name is generated based on the rule parameters
        counter_name: Option<String>,
        /// Optional name for the penalty box. If not provided, a unique name is generated based on the rule parameters
        penaltybox_name: Option<String>,
    },
}

/// Logical operators for combining multiple conditions.
///
/// These operators determine how multiple conditions within a rule are combined:
/// - AND: All conditions must match for the rule to match
/// - OR: Any condition can match for the rule to match
/// - NOT: No conditions should match for the rule to match
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Operator {
    AND,
    OR,
    NOT,
}

/// String comparison operators for path and user-agent matching.
///
/// Supports various types of string matching:
/// - Equals: Exact string match
/// - StartsWith: Prefix matching
/// - Contains: Substring matching
/// - Matches: Regular expression matching
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum StringOperator {
    Equals,
    StartsWith,
    Contains,
    Matches,
}

/// IP address matching operators.
///
/// Supports two types of IP matching:
/// - Equals: Exact IP address match
/// - InRange: CIDR range matching
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum IpOperator {
    Equals,
    InRange,
}

/// Device type detection operators.
///
/// Used to match or exclude specific device types:
/// - Is: Device matches the specified type
/// - IsNot: Device does not match the specified type
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DeviceOperator {
    Is,
    IsNot,
}

/// HTTP header validation operators.
///
/// Supports various header checks:
/// - Exists: Header is present
/// - NotExists: Header is absent
/// - Equals: Header value matches exactly
/// - Contains: Header value contains substring
/// Rate limit time windows that match Fastly's ERL RateWindow options
#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RateLimitWindow {
    #[serde(rename = "1s")]
    OneSec,
    #[serde(rename = "10s")]
    TenSecs,
    #[serde(rename = "60s")]
    SixtySecs,
}

impl std::fmt::Display for RateLimitWindow {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::OneSec => write!(f, "1s"),
            Self::TenSecs => write!(f, "10s"),
            Self::SixtySecs => write!(f, "60s"),
        }
    }
}

impl From<RateLimitWindow> for fastly::erl::RateWindow {
    fn from(window: RateLimitWindow) -> Self {
        match window {
            RateLimitWindow::OneSec => fastly::erl::RateWindow::OneSec,
            RateLimitWindow::TenSecs => fastly::erl::RateWindow::TenSecs,
            RateLimitWindow::SixtySecs => fastly::erl::RateWindow::SixtySecs,
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum HeaderOperator {
    Exists,
    NotExists,
    Equals,
    Contains,
}

/// Action to take when a rule matches.
///
/// Configures the response when a security rule is triggered:
/// - type_: The action type (e.g., "block", "challenge", "route")
/// - response_code: Optional HTTP status code to return
/// - response_message: Optional message to include in response
/// - challenge_type: Optional type of challenge to present
/// - backend: Optional backend name to route to (for "route" action)
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Action {
    #[serde(rename = "type")]
    pub type_: String,
    pub response_code: Option<u16>,
    pub response_message: Option<String>,
    pub challenge_type: Option<String>,
    pub backend: Option<String>,
}

/// Configuration for a dynamic backend.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BackendConfig {
    pub host: String,
    pub port: u16,
    #[serde(rename = "useTLS", default = "default_true")]
    pub use_tls: bool,
    #[serde(rename = "connectTimeout")]
    pub connect_timeout: Option<u64>,
    #[serde(rename = "firstByteTimeout")]
    pub first_byte_timeout: Option<u64>,
    #[serde(rename = "betweenBytesTimeout")]
    pub between_bytes_timeout: Option<u64>,
}

fn default_true() -> bool {
    true
}
