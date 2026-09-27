import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import AuthLayout from '../components/AuthLayout'
import LanguageSelect from '../components/LanguageSelect'
import { Field, PasswordField, SubmitButton } from '../components/Field'
import { useAuth } from '../state/AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate({ email, password }) {
  const errors = {}
  if (!email.trim()) errors.email = 'We need your email to find your account.'
  else if (!EMAIL_RE.test(email)) errors.email = "That doesn't look like a valid email."
  if (!password) errors.password = 'Please enter your password.'
  return errors
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '', remember: true })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  function update(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    // clear the message for a field as soon as the user starts fixing it
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
      await login({ email: form.email.trim(), password: form.password, remember: form.remember })
      // back to the page that sent them here, if any
      navigate(location.state?.from ?? '/dashboard', { replace: true })
    } catch (err) {
      setServerError(err.message || 'Something went wrong. Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to check on your fields, orders and market prices."
      aside={
        <>
          <p className="font-serif text-2xl leading-tight font-medium">
            Turning Agricultural Data into Actionable Insights and Smarter Farming Decisions for Farmers and Agribusinesses 
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-leaf-900 transition hover:bg-leaf-500 hover:text-white"
            >
              Learn more
              <span aria-hidden="true">→</span>
            </Link>
            <LanguageSelect />
          </div>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {serverError && (
          <div className="rounded-lg border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">
            {serverError}
          </div>
        )}

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

        <PasswordField
          name="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={form.password}
          onChange={update}
          error={errors.password}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-soil-600">
            <input
              type="checkbox"
              name="remember"
              checked={form.remember}
              onChange={update}
              className="h-4 w-4 accent-leaf-700"
            />
            Keep me signed in
          </label>
          <a href="#" className="font-medium text-leaf-700 hover:underline">
            Forgot password?
          </a>
        </div>

        <SubmitButton loading={loading} loadingText="Signing you in…">
          Log in
        </SubmitButton>
      </form>

      <p className="mt-8 text-center text-sm text-soil-600">
        New to AgriNexus?{' '}
        <Link to="/register" className="font-medium text-leaf-700 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}
