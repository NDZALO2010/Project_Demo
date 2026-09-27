import { useNavigate, useParams } from 'react-router'
import FieldForm from '../components/FieldForm'
import { useFarm } from '../state/FarmContext'

// Handles both /fields/new and /fields/:id/edit
export default function FieldEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { fields, addField, updateField, removeField } = useFarm()

  const existing = id ? fields.find((f) => f.id === id) : null

  if (id && !existing) {
    return <p className="py-16 text-center text-soil-600">That field doesn't exist anymore.</p>
  }

  async function save(values) {
    if (existing) {
      updateField(existing.id, values)
      navigate(`/fields/${existing.id}`)
    } else {
      // throws if the server refuses it, so FieldForm can show why
      const newId = await addField(values)
      navigate(`/fields/${newId}`)
    }
  }

  function remove() {
    if (window.confirm(`Delete field ${existing.name}? Its monitoring history goes with it.`)) {
      removeField(existing.id)
      navigate('/fields')
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-serif text-3xl font-semibold text-leaf-900">
        {existing ? `Edit field ${existing.name}` : 'Add a field'}
      </h1>
      <p className="mt-1 text-soil-400">
        {existing
          ? 'Changes are picked up by the next monitoring run straight away.'
          : "Once it's saved we'll start pulling in weather and satellite data for it."}
      </p>

      <div className="mt-6 rounded-2xl border border-wheat bg-white p-6 sm:p-8">
        <FieldForm
          initial={existing}
          onSubmit={save}
          submitLabel={existing ? 'Save changes' : 'Add field'}
          onCancel={() => navigate(-1)}
        />
      </div>

      {existing && (
        <button onClick={remove} className="mt-6 text-sm font-medium text-clay hover:underline">
          Delete this field
        </button>
      )}
    </div>
  )
}
