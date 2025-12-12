import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react'
import { useTheme } from '../../styles/theme'

export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const { setEdges } = useReactFlow()
  const { theme } = useTheme()

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const onEdgeClick = () => {
    setEdges((edges) => edges.filter((edge) => edge.id !== id))
  }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            onClick={onEdgeClick}
            style={{
              width: 20,
              height: 20,
              background: theme.bgSecondary,
              border: `1px solid ${theme.border}`,
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.textMuted,
              fontSize: 14,
              lineHeight: 1,
              padding: 0,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ef4444'
              e.currentTarget.style.borderColor = '#ef4444'
              e.currentTarget.style.color = '#ffffff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.bgSecondary
              e.currentTarget.style.borderColor = theme.border
              e.currentTarget.style.color = theme.textMuted
            }}
            title="Delete connection"
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
