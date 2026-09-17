import { useState, type SubmitEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../lib/api'
import { saveIdentity } from '../lib/session'
import { validateEmail } from '../lib/validateEmail'

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateEmail(email)
    if (!result.ok) {
      setError(result.error ?? 'Invalid email.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const identity = await login(result.value)
      saveIdentity(identity)
      navigate('/boards')
    } catch {
      setError('Login failed. Is the API running?')
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-void font-matrix text-xenon">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full max-w-sm flex-col gap-6 border-2 border-xenon p-8 shadow-[0_0_20px_rgba(240,240,0,0.25)]"
      >
        <h1 className="text-2xl font-bold tracking-widest">&gt; LOG IN</h1>

        <label className="flex flex-col gap-2">
          <span className="text-sm tracking-widest">EMAIL</span>
          <input
            type="text"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="border border-xenon bg-transparent px-3 py-2 caret-xenon outline-none placeholder:text-xenon/40 focus:ring-2 focus:ring-xenon"
          />
        </label>

        {error !== null && (
          <p role="alert" className="text-sm tracking-widest">
            ERR: {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bg-xenon px-4 py-2 font-bold tracking-widest text-void hover:bg-xenon/80 disabled:opacity-50"
        >
          {submitting ? 'ENTERING...' : '> ENTER'}
        </button>
      </form>
    </main>
  )
}

export default LoginPage