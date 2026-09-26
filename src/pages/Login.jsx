import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import AuthLayout from '../components/AuthLayout'
import { Field, PasswordField, SubmitButton } from '../components/Field'

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
      // TODO: replace with the real auth call once the API is ready
      await new Promise((resolve) => setTimeout(resolve, 900))
      console.log('logging in', { email: form.email, remember: form.remember })
      navigate('/dashboard')
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
          <p className="font-serif text-4xl leading-tight font-medium">
            The best time to plant a tree was twenty years ago.
          </p>
          <p className="mt-4 text-leaf-100">The second best time is now.</p>
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
