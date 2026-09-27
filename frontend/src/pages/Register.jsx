import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import AuthLayout from '../components/AuthLayout'
import { Field, PasswordField, SubmitButton } from '../components/Field'
import { useAuth } from '../state/AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const roles = [
  { value: 'farmer', label: 'Farmer', note: 'I grow or raise' },
  { value: 'buyer', label: 'Buyer', note: 'I buy produce' },
  { value: 'supplier', label: 'Supplier', note: 'I sell inputs' },
]

const emptyForm = {
  fullName: '',
  email: '',
  phone: '',
  role: 'farmer',
  password: '',
  confirmPassword: '',
  agreed: false,
}

function validate(form) {
  const errors = {}

  if (form.fullName.trim().length < 2) errors.fullName = 'Tell us your name.'

  if (!form.email.trim()) errors.email = 'Email is required.'
  else if (!EMAIL_RE.test(form.email)) errors.email = "That doesn't look like a valid email."

  // phone is optional, but if they typed something it should at least look like a number
  if (form.phone && !/^\+?[\d\s-]{9,15}$/.test(form.phone)) {
    errors.phone = 'Use digits only, e.g. 071 234 5678.'
  }

  if (form.password.length < 8) errors.password = 'Use at least 8 characters.'
  else if (!/\d/.test(form.password)) errors.password = 'Add at least one number.'

  if (form.confirmPassword !== form.password) errors.confirmPassword = "Passwords don't match."

  if (!form.agreed) errors.agreed = 'You need to accept the terms to continue.'

  return errors
}

// Rough strength meter. Nothing scientific, just nudges people toward better passwords.
function passwordStrength(pw) {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/\d/.test(pw) && /[a-zA-Z]/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  return score
}

const strengthLabels = ['Too short', 'Weak', 'Okay', 'Good', 'Strong']
const strengthColors = ['bg-clay', 'bg-clay', 'bg-straw', 'bg-leaf-500', 'bg-leaf-700']

const perks = [
  'Sell your harvest straight to local buyers',
  'Keep track of planting and yields season to season',
  'Get fair prices on seed, feed and fertiliser',
]

export default function Register() {
  const navigate = useNavigate()
  const { register, login } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const strength = passwordStrength(form.password)

  function update(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setServerError('')

    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length) return

    setLoading(true)
    try {
      const { confirmPassword, agreed, ...payload } = form
      await register({ ...payload, fullName: payload.fullName.trim(), email: payload.email.trim() })
      // sign them straight in and on to setting up the farm
      await login({ email: payload.email.trim(), password: payload.password, remember: true })
      navigate('/onboarding', { replace: true })
    } catch (err) {
      if (err.status === 409) setErrors((prev) => ({ ...prev, email: err.message }))
      else setServerError(err.message || 'Something went wrong. Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes about a minute. No credit card, no catch."
      aside={
        <>
          <p className="font-serif text-4xl leading-tight font-medium">
            From the soil to the market, all in one place.
          </p>
          <ul className="mt-6 space-y-3 text-leaf-100">
            {perks.map((perk) => (
              <li key={perk} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-straw" />
                {perk}
              </li>
            ))}
          </ul>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {serverError && (
          <div className="rounded-lg border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">
            {serverError}
          </div>
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-medium">I'm joining as a…</legend>
          <div className="grid grid-cols-3 gap-2">
            {roles.map((r) => {
              const selected = form.role === r.value
              return (
                <label
                  key={r.value}
                  className={`cursor-pointer rounded-lg border px-2 py-2.5 text-center transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-leaf-500/25 ${
                    selected
                      ? 'border-leaf-700 bg-leaf-50 ring-1 ring-leaf-700'
                      : 'border-wheat bg-white hover:border-leaf-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={selected}
                    onChange={update}
                    className="sr-only"
                  />
                  <span className={`block text-sm font-semibold ${selected ? 'text-leaf-800' : ''}`}>
                    {r.label}
                  </span>
                  <span className="block text-xs text-soil-400">{r.note}</span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <Field
          label="Full name"
          name="fullName"
          autoComplete="name"
          placeholder="Thandi Nkosi"
          value={form.fullName}
          onChange={update}
          error={errors.fullName}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@farm.co.za"
            value={form.email}
            onChange={update}
            error={errors.email}
          />
          <Field
            label="Phone (optional)"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="071 234 5678"
            value={form.phone}
            onChange={update}
            error={errors.phone}
          />
        </div>

        <div>
          <PasswordField
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={update}
            error={errors.password}
          />
          {form.password && !errors.password && (
            <div className="mt-2 flex items-center gap-3">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={`h-1.5 flex-1 rounded-full ${
                      step <= strength ? strengthColors[strength] : 'bg-wheat'
                    }`}
                  />
                ))}
              </div>
              <span className="w-16 text-right text-xs text-soil-400">{strengthLabels[strength]}</span>
            </div>
          )}
        </div>

        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Type it again"
          value={form.confirmPassword}
          onChange={update}
          error={errors.confirmPassword}
        />

        <div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-soil-600">
            <input
              type="checkbox"
              name="agreed"
              checked={form.agreed}
              onChange={update}
              className="mt-0.5 h-4 w-4 accent-leaf-700"
            />
            <span>
              I agree to the{' '}
              <a href="#" className="font-medium text-leaf-700 hover:underline">Terms of Service</a>{' '}
              and{' '}
              <a href="#" className="font-medium text-leaf-700 hover:underline">Privacy Policy</a>.
            </span>
          </label>
          {errors.agreed && <p className="mt-1.5 text-sm text-clay">{errors.agreed}</p>}
        </div>

        <SubmitButton loading={loading} loadingText="Setting up your account…">
          Create account
        </SubmitButton>
      </form>

      <p className="mt-8 text-center text-sm text-soil-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-leaf-700 hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}
