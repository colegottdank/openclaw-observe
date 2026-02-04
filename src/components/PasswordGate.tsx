import { useState, type ReactNode } from 'react'

const PASS_HASH = 'mc-spud-2026' // Simple passphrase — not Fort Knox, just a door lock

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(() => {
    return sessionStorage.getItem('mc-auth') === 'true'
  })
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input === PASS_HASH) {
      sessionStorage.setItem('mc-auth', 'true')
      setAuthed(true)
    } else {
      setError(true)
      setTimeout(() => setError(false), 2000)
    }
  }

  if (authed) return <>{children}</>

  return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-primary)' }}>
      <form onSubmit={handleSubmit} className="text-center">
        <div className="text-6xl mb-6">🥔</div>
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Mission Control
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Enter the passphrase
        </p>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Passphrase"
          autoFocus
          className="w-64 px-4 py-2 rounded-lg text-sm outline-none transition-all duration-200"
          style={{
            background: 'var(--bg-secondary)',
            border: `1px solid ${error ? 'var(--accent-red)' : 'var(--border)'}`,
            color: 'var(--text-primary)',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--accent-blue)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
        <button
          type="submit"
          className="block w-64 mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
          style={{
            background: 'var(--accent-blue)',
            color: '#fff',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Enter
        </button>
        {error && (
          <p className="mt-3 text-sm" style={{ color: 'var(--accent-red)' }}>
            Wrong passphrase
          </p>
        )}
      </form>
    </div>
  )
}
