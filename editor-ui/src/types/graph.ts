/**
 * Canonical Graph Model Types
 *
 * These types represent the "clean" graph data that we save, deploy, and hash.
 * They exclude React Flow's internal runtime state (measured, selected, dragging, etc.)
 * which changes after rendering and should not affect sync/deployment.
 */

import type { Node, Edge, XYPosition } from '@xyflow/react'

/**
 * Canonical node data - only includes fields that affect the actual graph logic.
 * Excludes React Flow runtime state like `measured`, `selected`, `dragging`.
 */
export interface CanonicalNode {
  id: string
  type: string
  position: XYPosition
  data: Record<string, unknown>
}

/**
 * Canonical edge data - only includes fields that define connections.
 * Excludes React Flow runtime state.
 */
export interface CanonicalEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

/**
 * The canonical graph model - what we save, deploy, and use for hash comparison.
 */
export interface CanonicalGraph {
  nodes: CanonicalNode[]
  edges: CanonicalEdge[]
}

/**
 * Extract canonical node data from a React Flow node.
 * Strips runtime fields like `measured`, `selected`, `dragging`, etc.
 */
export function toCanonicalNode(node: Node): CanonicalNode {
  return {
    id: node.id,
    type: node.type || 'default',
    position: node.position,
    data: node.data as Record<string, unknown>,
  }
}

/**
 * Extract canonical edge data from a React Flow edge.
 * Strips runtime fields.
 */
export function toCanonicalEdge(edge: Edge): CanonicalEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
  }
}

/**
 * Extract a canonical graph from React Flow nodes and edges.
 * Use this for saving, deploying, and hash comparison.
 */
export function toCanonicalGraph(nodes: Node[], edges: Edge[]): CanonicalGraph {
  return {
    nodes: nodes.map(toCanonicalNode),
    edges: edges.map(toCanonicalEdge),
  }
}
