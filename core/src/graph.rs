//! Graph structure that holds nodes and edges.

use crate::nodes::{Node, NodeId};
use serde::{Deserialize, Serialize};

/// A complete security rule graph.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Graph {
    /// Name of this rule set
    pub name: String,
    /// Description
    pub description: String,
    /// All nodes in the graph
    pub nodes: Vec<Node>,
    /// Connections between nodes
    pub edges: Vec<Edge>,
    /// Next available node ID
    next_id: NodeId,
}

/// A connection between two node ports.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge {
    /// Source node ID
    pub from_node: NodeId,
    /// Source port index
    pub from_port: u8,
    /// Target node ID
    pub to_node: NodeId,
    /// Target port index
    pub to_port: u8,
}

impl Graph {
    /// Create a new empty graph
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            description: String::new(),
            nodes: Vec::new(),
            edges: Vec::new(),
            next_id: 0,
        }
    }

    /// Add a node to the graph, returning its assigned ID
    pub fn add_node(&mut self, mut node: Node) -> NodeId {
        let id = self.next_id;
        self.next_id += 1;
        node.id = id;
        self.nodes.push(node);
        id
    }

    /// Remove a node and all its connections
    pub fn remove_node(&mut self, node_id: NodeId) {
        self.nodes.retain(|n| n.id != node_id);
        self.edges
            .retain(|e| e.from_node != node_id && e.to_node != node_id);
    }

    /// Connect two nodes
    pub fn connect(
        &mut self,
        from_node: NodeId,
        from_port: u8,
        to_node: NodeId,
        to_port: u8,
    ) -> Result<(), GraphError> {
        // Validate nodes exist
        if !self.nodes.iter().any(|n| n.id == from_node) {
            return Err(GraphError::NodeNotFound(from_node));
        }
        if !self.nodes.iter().any(|n| n.id == to_node) {
            return Err(GraphError::NodeNotFound(to_node));
        }

        // Check for cycles (simple check - could be more sophisticated)
        if from_node == to_node {
            return Err(GraphError::CycleDetected);
        }

        // Remove existing connection to this input port (inputs can only have one connection)
        self.edges
            .retain(|e| !(e.to_node == to_node && e.to_port == to_port));

        self.edges.push(Edge {
            from_node,
            from_port,
            to_node,
            to_port,
        });

        Ok(())
    }

    /// Disconnect an edge
    pub fn disconnect(&mut self, to_node: NodeId, to_port: u8) {
        self.edges
            .retain(|e| !(e.to_node == to_node && e.to_port == to_port));
    }

    /// Get a node by ID
    pub fn get_node(&self, id: NodeId) -> Option<&Node> {
        self.nodes.iter().find(|n| n.id == id)
    }

    /// Get a mutable node by ID
    pub fn get_node_mut(&mut self, id: NodeId) -> Option<&mut Node> {
        self.nodes.iter_mut().find(|n| n.id == id)
    }

    /// Get all edges connected to a node's inputs
    pub fn get_incoming_edges(&self, node_id: NodeId) -> Vec<&Edge> {
        self.edges.iter().filter(|e| e.to_node == node_id).collect()
    }

    /// Get all edges connected to a node's outputs
    pub fn get_outgoing_edges(&self, node_id: NodeId) -> Vec<&Edge> {
        self.edges
            .iter()
            .filter(|e| e.from_node == node_id)
            .collect()
    }

    /// Get topologically sorted node IDs for execution order
    pub fn topological_sort(&self) -> Result<Vec<NodeId>, GraphError> {
        let mut result = Vec::new();
        let mut visited = std::collections::HashSet::new();
        let mut temp_visited = std::collections::HashSet::new();

        for node in &self.nodes {
            if !visited.contains(&node.id) {
                self.visit_node(node.id, &mut visited, &mut temp_visited, &mut result)?;
            }
        }

        Ok(result)
    }

    fn visit_node(
        &self,
        node_id: NodeId,
        visited: &mut std::collections::HashSet<NodeId>,
        temp_visited: &mut std::collections::HashSet<NodeId>,
        result: &mut Vec<NodeId>,
    ) -> Result<(), GraphError> {
        if temp_visited.contains(&node_id) {
            return Err(GraphError::CycleDetected);
        }
        if visited.contains(&node_id) {
            return Ok(());
        }

        temp_visited.insert(node_id);

        // Visit all nodes that this node depends on (incoming edges)
        for edge in self.get_incoming_edges(node_id) {
            self.visit_node(edge.from_node, visited, temp_visited, result)?;
        }

        temp_visited.remove(&node_id);
        visited.insert(node_id);
        result.push(node_id);

        Ok(())
    }

    /// Serialize to RON format
    pub fn to_ron(&self) -> Result<String, ron::Error> {
        ron::ser::to_string_pretty(self, ron::ser::PrettyConfig::default())
    }

    /// Deserialize from RON format
    pub fn from_ron(s: &str) -> Result<Self, ron::error::SpannedError> {
        ron::from_str(s)
    }
}

#[derive(Debug, Clone, thiserror::Error)]
pub enum GraphError {
    #[error("Node not found: {0}")]
    NodeNotFound(NodeId),
    #[error("Cycle detected in graph")]
    CycleDetected,
    #[error("Port not found")]
    PortNotFound,
}
