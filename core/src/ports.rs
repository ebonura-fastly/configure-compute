//! Port definitions for node inputs and outputs.

use serde::{Deserialize, Serialize};

/// The type of data a port accepts or produces.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PortType {
    /// Boolean signal (conditions, logic gates)
    Bool,
    /// Numeric value
    Number,
    /// String value
    String,
    /// IP address
    Ip,
    /// Any type (for generic nodes)
    Any,
    /// Execution flow (for sequencing)
    Flow,
}

/// Definition of an input port on a node.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputPort {
    /// Port name (displayed in editor)
    pub name: String,
    /// Expected data type
    pub port_type: PortType,
    /// Whether this port must be connected
    pub required: bool,
}

/// Definition of an output port on a node.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutputPort {
    /// Port name (displayed in editor)
    pub name: String,
    /// Data type produced
    pub port_type: PortType,
}

impl InputPort {
    pub fn new(name: impl Into<String>, port_type: PortType) -> Self {
        Self {
            name: name.into(),
            port_type,
            required: true,
        }
    }

    pub fn optional(name: impl Into<String>, port_type: PortType) -> Self {
        Self {
            name: name.into(),
            port_type,
            required: false,
        }
    }
}

impl OutputPort {
    pub fn new(name: impl Into<String>, port_type: PortType) -> Self {
        Self {
            name: name.into(),
            port_type,
        }
    }
}
