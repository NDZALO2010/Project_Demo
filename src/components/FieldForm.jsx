import { useState } from 'react'
import { Field } from './Field'
import { crops } from '../lib/crops'

const blank = {
  name: '',
  crop: 'maize',
  hectares: '',
  lat: '',
  lon: '',
  plantingDate: '',
  expectedYield: String(crops.maize.yieldPerHa),
  contractPrice: '',
  irrigated: false,
}

function validate(v) {
  const errors = {}
  const num = (x) => Number(x)

  if (!v.name.trim()) errors.name = 'Give the field a name, e.g. A12.'
  if (!(num(v.hectares) > 0)) errors.hectares = 'Enter the size in hectares.'

  if (v.lat === '' || Number.isNaN(num(v.lat)) || Math.abs(num(v.lat)) > 90) errors.lat = 'Latitude between -90 and 90.'
  if (v.lon === '' || Number.isNaN(num(v.lon)) || Math.abs(num(v.lon)) > 180) errors.lon = 'Longitude between -180 and 180.'

  if (!v.plantingDate) errors.plantingDate = 'When was it planted?'
  else if (new Date(v.plantingDate) > new Date()) errors.plantingDate = "Planting date can't be in the future."

  if (!(num(v.expectedYield) > 0)) errors.expectedYield = 'Enter an expected yield.'
  if (v.contractPrice !== '' && !(num(v.contractPrice) > 0)) {
    errors.contractPrice = 'Enter a price above R0, or leave it empty to use the market price.'
  }
  return errors
}

export default function FieldForm({ initial, onSubmit, submitLabel = 'Save field', onCancel }) {
  const [values, setValues] = useState(() =>
    initial
      ? Object.fromEntries(
          Object.entries({ ...blank, ...initial }).map(([k, v]) => [k, v == null ? '' : typeof v === 'number' ? String(v) : v]),
        )
      : blank,
  )
  const [errors, setErrors] = useState({})
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState('')

  // Only swap in the crop defaults if the farmer hasn't typed their own numbers yet
  const [touchedEconomics, setTouchedEconomics] = useState(Boolean(initial))

  function update(e) {
    const { name, value, type, checked } = e.target
    if (name === 'expectedYield') setTouchedEconomics(true)

    setValues((prev) => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : value }
      if (name === 'crop' && !touchedEconomics) {
        next.expectedYield = String(crops[value].yieldPerHa)
      }
      return next
    })
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  function fillFromGps() {
    if (!navigator.geolocation) {
      setLocateError("Your browser can't share location. Type the coordinates instead.")
      return
    }
    setLocating(true)
    setLocateError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValues((prev) => ({
          ...prev,
          lat: pos.coords.latitude.toFixed(5),
          lon: pos.coords.longitude.toFixed(5),
        }))
        setErrors((prev) => ({ ...prev, lat: undefined, lon: undefined }))
        setLocating(false)
      },
      () => {
        setLocateError("Couldn't get your location. Type the coordinates instead.")
        setLocating(false)
      },
      { timeout: 10_000 },
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length) return

    onSubmit({
      ...values,
      name: values.name.trim(),
      hectares: Number(values.hectares),
      lat: Number(values.lat),
      lon: Number(values.lon),
      expectedYield: Number(values.expectedYield),
      // empty means "follow the market price on the Crop prices screen"
      contractPrice: values.contractPrice === '' ? null : Number(values.contractPrice),
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Field name" name="name" placeholder="A12" value={values.name} onChange={update} error={errors.name} />
        <Field label="Crop type" error={errors.crop}>
          {({ id, className }) => (
            <select id={id} name="crop" value={values.crop} onChange={update} className={className}>
              {Object.entries(crops).map(([key, c]) => (
                <option key={key} value={key}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Field size (ha)"
          name="hectares"
          type="number"
          min="0"
          step="0.1"
          placeholder="150"
          value={values.hectares}
          onChange={update}
          error={errors.hectares}
        />
        <Field
          label="Planting date"
          name="plantingDate"
          type="date"
          value={values.plantingDate}
          onChange={update}
          error={errors.plantingDate}
        />
      </div>

      <div role="group" aria-label="GPS location">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-medium">GPS location (centre of the field)</p>
          <button
            type="button"
            onClick={fillFromGps}
            disabled={locating}
            className="text-sm font-medium text-leaf-700 hover:underline disabled:opacity-60"
          >
            {locating ? 'Locating…' : 'Use my location'}
          </button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Latitude" name="lat" inputMode="decimal" placeholder="-27.401" value={values.lat} onChange={update} error={errors.lat} />
          <Field label="Longitude" name="lon" inputMode="decimal" placeholder="26.644" value={values.lon} onChange={update} error={errors.lon} />
        </div>
        {locateError && <p className="mt-1.5 text-sm text-clay">{locateError}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Expected yield (t/ha)"
          name="expectedYield"
          type="number"
          min="0"
          step="0.1"
          value={values.expectedYield}
          onChange={update}
          error={errors.expectedYield}
          hint="Your usual yield for this field"
        />
        <Field
          label="Contract price (R/t, optional)"
          name="contractPrice"
          type="number"
          min="0"
          step="10"
          placeholder="Market price"
          value={values.contractPrice}
          onChange={update}
          error={errors.contractPrice}
          hint="Only if this crop is sold on contract. Leave empty to use the market price from Crop prices."
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-soil-600">
        <input type="checkbox" name="irrigated" checked={values.irrigated} onChange={update} className="h-4 w-4 accent-leaf-700" />
        This field is under irrigation
      </label>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-soil-600 hover:bg-linen"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="rounded-lg bg-leaf-700 px-5 py-2.5 text-sm font-medium text-linen transition hover:bg-leaf-800 focus:outline-none focus:ring-4 focus:ring-leaf-500/25"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
