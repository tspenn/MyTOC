interface FormFieldProps {
  id: string
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  required?: boolean
  placeholder?: string
}

export default function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  required = true,
  placeholder,
}: FormFieldProps) {
  return (
    <label className="form-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
      />
    </label>
  )
}
