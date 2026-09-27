export default function Logo({ light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/logo.png" alt="" className="h-10 w-auto rounded-xl" aria-hidden="true" />
      <div className="leading-tight">
        <span className={`block font-serif text-xl font-semibold ${light ? 'text-linen' : 'text-leaf-800'}`}>
          AgriNexus
        </span>
        <span
          className={`block text-[0.55rem] font-semibold tracking-wider uppercase ${
            light ? 'text-leaf-100' : 'text-soil-400'
          }`}
        >
          Agriculture · Finance · Growth
        </span>
      </div>
    </div>
  )
}
