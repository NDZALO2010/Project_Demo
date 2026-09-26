const styles = {
  High: { pill: 'bg-clay/10 text-clay', dot: 'bg-clay' },
  Medium: { pill: 'bg-straw/20 text-soil-600', dot: 'bg-straw' },
  Low: { pill: 'bg-leaf-50 text-leaf-800', dot: 'bg-leaf-500' },
  Healthy: { pill: 'bg-leaf-50 text-leaf-800', dot: 'bg-leaf-700' },
}

export default function PriorityBadge({ priority, suffix = ' priority' }) {
  const s = styles[priority] ?? styles.Low
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${s.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {priority}
      {priority !== 'Healthy' && suffix}
    </span>
  )
}

export function StatusTag({ action }) {
  if (!action) return null
  const done = action.status === 'done'
  return (
    <span className={`text-xs font-medium ${done ? 'text-leaf-700' : 'text-soil-600'}`}>
      {done ? '✓ Action taken' : '● Inspection scheduled'}
    </span>
  )
}
