import { useState } from 'react'
import { useNavigate } from 'react-router'
import Logo from '../components/Logo'
import { Field } from '../components/Field'
import FieldForm from '../components/FieldForm'
import { useFarm } from '../state/FarmContext'

export default function Onboarding() {
  const navigate = useNavigate()
  const { farm, saveFarm, addField, loadDemo } = useFarm()

  const [step, setStep] = useState(farm ? 2 : 1)
  const [details, setDetails] = useState({ name: farm?.name ?? '', region: farm?.region ?? '' })
  const [error, setError] = useState('')
  const [demoError, setDemoError] = useState('')
  const [busy, setBusy] = useState(false)

  async function continueToFields(e) {
    e.preventDefault()
    if (!details.name.trim()) {
      setError('What should we call your farm?')
      return
    }
    setBusy(true)
    try {
      await saveFarm({ name: details.name.trim(), region: details.region.trim() })
      setStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  // FieldForm shows the error if this throws
  async function finish(field) {
    await addField(field)
    navigate('/dashboard')
  }

  async function startWithDemo() {
    setDemoError('')
    setBusy(true)
    try {
      await loadDemo()
      navigate('/dashboard')
    } catch (err) {
      setDemoError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Logo />

        <ol className="mt-8 flex items-center gap-3 text-sm">
          {['Your farm', 'First field'].map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  step > i ? 'bg-leaf-700 text-linen' : 'bg-wheat text-soil-600'
                }`}
              >
                {i + 1}
              </span>
              <span className={step === i + 1 ? 'font-medium text-soil-900' : 'text-soil-400'}>{label}</span>
              {i === 0 && <span className="mx-1 h-px w-8 bg-wheat" />}
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-2xl border border-wheat bg-white p-6 sm:p-8">
          {step === 1 ? (
            <>
              <h1 className="font-serif text-2xl font-semibold text-leaf-900">Let's set up your farm</h1>
              <p className="mt-1 text-soil-400">
                We use your fields' locations to pull in weather and satellite data automatically.
              </p>

              <form onSubmit={continueToFields} noValidate className="mt-6 space-y-5">
                <Field
                  label="Farm name"
                  placeholder="Mooiplaas Farming"
                  value={details.name}
                  onChange={(e) => {
                    setDetails((d) => ({ ...d, name: e.target.value }))
                    setError('')
                  }}
                  error={error}
                />
                <Field
                  label="Area / nearest town (optional)"
                  placeholder="Bothaville, Free State"
                  value={details.region}
                  onChange={(e) => setDetails((d) => ({ ...d, region: e.target.value }))}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-lg bg-leaf-700 px-5 py-2.5 text-sm font-medium text-linen hover:bg-leaf-800 disabled:opacity-60"
                  >
                    {busy ? 'Saving…' : 'Continue'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h1 className="font-serif text-2xl font-semibold text-leaf-900">Add your first field</h1>
              <p className="mt-1 mb-6 text-soil-400">
                Yield and price are what turn a crop problem into a rand figure, so use your own numbers if you have them.
              </p>
              <FieldForm onSubmit={finish} submitLabel="Start monitoring" onCancel={() => setStep(1)} />
            </>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center gap-1 rounded-xl bg-leaf-50 px-5 py-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-leaf-800">
            {demoError ? <span className="text-clay">{demoError}</span> : 'Just want to look around? Load a sample farm with 8 fields.'}
          </p>
          <button onClick={startWithDemo} disabled={busy} className="text-sm font-semibold text-leaf-700 hover:underline disabled:opacity-60">
            Use demo farm →
          </button>
        </div>
      </div>
    </div>
  )
}
