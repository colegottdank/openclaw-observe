import { useState, useRef, useEffect, type ReactNode } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface SelectOption {
  value: string
  label: ReactNode
  icon?: ReactNode
}

interface SelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  triggerClassName?: string
  disabled?: boolean
}

export function Select({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className = '',
  triggerClassName = '',
  disabled = false
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedOption = options.find(o => o.value === value)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2 
          px-3 py-2 rounded-lg text-sm
          bg-neutral-900 border border-neutral-800
          text-neutral-300
          hover:border-neutral-700 hover:bg-neutral-800/50
          focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-150
          ${isOpen ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : ''}
          ${triggerClassName}
        `}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedOption?.icon && (
            <span className="text-neutral-500">{selectedOption.icon}</span>
          )}
          <span className="truncate">
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-neutral-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="
          absolute z-50 w-full mt-1 
          bg-neutral-900 border border-neutral-800 
          rounded-lg shadow-xl shadow-black/20
          overflow-hidden
          animate-in fade-in zoom-in-95 duration-100
        ">
          <div className="max-h-60 overflow-auto py-1">
            {options.map(option => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-sm
                  text-left transition-colors
                  hover:bg-neutral-800
                  ${option.value === value ? 'bg-indigo-500/10 text-indigo-300' : 'text-neutral-300'}
                `}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {option.icon && (
                    <span className={option.value === value ? 'text-indigo-400' : 'text-neutral-500'}>
                      {option.icon}
                    </span>
                  )}
                  <span className="truncate">{option.label}</span>
                </div>
                {option.value === value && (
                  <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Simple version for basic use cases
interface SimpleSelectProps {
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  className?: string
}

export function SimpleSelect({ value, options, onChange, className = '' }: SimpleSelectProps) {
  return (
    <Select
      value={value}
      options={options.map(o => ({ value: o.value, label: o.label }))}
      onChange={onChange}
      className={className}
    />
  )
}
