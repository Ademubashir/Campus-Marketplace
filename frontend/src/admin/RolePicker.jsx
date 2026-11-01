import { ROLE_OPTIONS } from './roles'

// Radio buttons for choosing an admin role, each with a one-line explanation.
export default function RolePicker({ value, onChange, name = 'role' }) {
  return (
    <fieldset className="adm-role-picker">
      <legend>Role</legend>
      {ROLE_OPTIONS.map((option) => (
        <label
          key={option.value}
          className={`adm-role-option ${value === option.value ? 'selected' : ''}`}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span>
            <strong>{option.label}</strong>
            <small>{option.description}</small>
          </span>
        </label>
      ))}
    </fieldset>
  )
}
