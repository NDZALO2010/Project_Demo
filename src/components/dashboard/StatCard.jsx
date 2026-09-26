export default function StatCard({ label, value, note, tone = 'default' }) {
  const valueColor = {
    default: 'text-soil-900',
    risk: 'text-clay',
    good: 'text-leaf-700',
  }[tone]

  return (
    <div className="rounded-xl border border-wheat bg-white p-5">
      <p className="text-sm text-soil-400">{label}</p>
      <p className={`mt-2 font-serif text-3xl font-semibold ${valueColor}`}>{value}</p>
      {note && <p className="mt-1 text-sm text-soil-600">{note}</p>}
    </div>
  )
}
