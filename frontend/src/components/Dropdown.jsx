import { useEffect, useId, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faCheck } from '@fortawesome/free-solid-svg-icons'

// A custom dropdown that replaces the browser's <select>.
// Props:
//   label       - text read out by screen readers (e.g. "Category")
//   options     - [{ value, label }]
//   value       - the currently selected value
//   onChange    - called with the chosen option's value
//   placeholder - shown when nothing is selected
export default function Dropdown({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select...',
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1) // option highlighted by mouse or keyboard
  const wrapRef = useRef(null)
  const listId = useId()

  // Compare as strings so '' and numbers (category ids) both work.
  const selectedIndex = options.findIndex((o) => String(o.value) === String(value))
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null

  // Close the list when the user presses anywhere outside it.
  useEffect(() => {
    if (!open) return
    function handleOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [open])

  // Keep the keyboard-highlighted option visible inside a long, scrolling list.
  useEffect(() => {
    if (open && active >= 0) {
      document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' })
    }
  }, [open, active, listId])

  function openList() {
    setActive(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  function choose(index) {
    onChange(options[index].value)
    setOpen(false)
  }

  function handleKeyDown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) openList()
        else setActive((i) => Math.min(i + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!open) openList()
        else setActive((i) => Math.max(i - 1, 0))
        break
      case 'Home':
        if (open) {
          e.preventDefault()
          setActive(0)
        }
        break
      case 'End':
        if (open) {
          e.preventDefault()
          setActive(options.length - 1)
        }
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (!open) openList()
        else if (active >= 0) choose(active)
        break
      case 'Escape':
        if (open) {
          e.preventDefault()
          setOpen(false)
        }
        break
      case 'Tab':
        setOpen(false) // let focus move on as normal
        break
      default:
        break
    }
  }

  return (
    <div className={`dd ${open ? 'open' : ''}`} ref={wrapRef}>
      {/* The box you see when the list is closed */}
      <div
        className="dd-trigger"
        role="combobox"
        tabIndex={0}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
      >
        <span className={selected ? 'dd-value' : 'dd-value placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        {/* Points down when closed; CSS rotates it up while the list is open */}
        <FontAwesomeIcon icon={faChevronDown} className="dd-arrow" />
      </div>

      {/* The list */}
      {open && (
        <ul className="dd-list" role="listbox" id={listId} aria-label={label}>
          {options.map((o, i) => (
            <li
              key={`${o.value}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === selectedIndex}
              className={`dd-option ${i === active ? 'active' : ''} ${
                i === selectedIndex ? 'selected' : ''
              }`}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              <span>{o.label}</span>
              {i === selectedIndex && <FontAwesomeIcon icon={faCheck} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
