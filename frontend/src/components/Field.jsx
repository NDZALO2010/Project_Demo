import { useId, useState } from 'react'
import { useT } from '../state/LanguageContext'

const baseInput =
  'w-full rounded-lg border bg-white px-3.5 py-2.5 text-soil-900 placeholder:text-soil-400/70 ' +
  'outline-none transition focus:ring-4'

function inputClasses(error) {
  return error
    ? `${baseInput} border-clay focus:ring-clay/15`
    : `${baseInput} border-wheat focus:border-leaf-500 focus:ring-leaf-500/15`
}

export function Field({ label, error, hint, className = '', children, ...props }) {
  const id = useId()

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-soil-900">
        {label}
      </label>

      {children ? (
        children({ id, className: inputClasses(error) })
      ) : (
        <input id={id} className={inputClasses(error)} aria-invalid={!!error} {...props} />
      )}

      {error ? (
        <p className="mt-1.5 text-sm text-clay">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-sm text-soil-400">{hint}</p>
      )}
    </div>
  )
}

export function PasswordField({ label, error, hint, ...props }) {
  const t = useT()
  const [visible, setVisible] = useState(false)

  return (
    <Field label={label ?? t('Password')} error={error} hint={hint}>
      {({ id, className }) => (
        <div className="relative">
          <input
            id={id}
            type={visible ? 'text' : 'password'}
            className={`${className} pr-16`}
            aria-invalid={!!error}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 px-3.5 text-sm font-medium text-leaf-700 hover:text-leaf-900"
          >
            {visible ? t('Hide') : t('Show')}
          </button>
        </div>
      )}
    </Field>
  )
}

export function SubmitButton({ loading, children, loadingText }) {
  const t = useT()
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-lg bg-leaf-700 px-4 py-3 font-medium text-linen transition hover:bg-leaf-800 focus:outline-none focus:ring-4 focus:ring-leaf-500/25 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? (loadingText ?? t('Please wait…')) : children}
    </button>
  )
}
