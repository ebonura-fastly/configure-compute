//! Runtime values that flow between nodes.

use serde::{Deserialize, Serialize};
use std::net::IpAddr;

/// A value that can be passed between nodes during graph execution.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Value {
    /// No value / null
    None,
    /// Boolean signal (used for logic gates and conditions)
    Bool(bool),
    /// Numeric value (rates, counts, thresholds)
    Number(f64),
    /// String value (paths, headers, fingerprints)
    String(String),
    /// IP address
    Ip(IpAddr),
    /// List of values
    List(Vec<Value>),
}

impl Value {
    pub fn as_bool(&self) -> Option<bool> {
        match self {
            Value::Bool(b) => Some(*b),
            Value::None => Some(false),
            _ => None,
        }
    }

    pub fn as_string(&self) -> Option<&str> {
        match self {
            Value::String(s) => Some(s),
            _ => None,
        }
    }

    pub fn as_number(&self) -> Option<f64> {
        match self {
            Value::Number(n) => Some(*n),
            _ => None,
        }
    }

    pub fn as_ip(&self) -> Option<IpAddr> {
        match self {
            Value::Ip(ip) => Some(*ip),
            _ => None,
        }
    }

    pub fn is_truthy(&self) -> bool {
        match self {
            Value::None => false,
            Value::Bool(b) => *b,
            Value::Number(n) => *n != 0.0,
            Value::String(s) => !s.is_empty(),
            Value::Ip(_) => true,
            Value::List(l) => !l.is_empty(),
        }
    }
}

impl Default for Value {
    fn default() -> Self {
        Value::None
    }
}

impl From<bool> for Value {
    fn from(b: bool) -> Self {
        Value::Bool(b)
    }
}

impl From<String> for Value {
    fn from(s: String) -> Self {
        Value::String(s)
    }
}

impl From<&str> for Value {
    fn from(s: &str) -> Self {
        Value::String(s.to_string())
    }
}

impl From<f64> for Value {
    fn from(n: f64) -> Self {
        Value::Number(n)
    }
}

impl From<i64> for Value {
    fn from(n: i64) -> Self {
        Value::Number(n as f64)
    }
}

impl From<u32> for Value {
    fn from(n: u32) -> Self {
        Value::Number(n as f64)
    }
}

impl From<IpAddr> for Value {
    fn from(ip: IpAddr) -> Self {
        Value::Ip(ip)
    }
}
