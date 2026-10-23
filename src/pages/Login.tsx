import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { IconoToro } from '../components/Iconos'
import Paisaje from '../components/Paisaje'
import { useAuth } from '../lib/AuthContext'

export default function Login() {
  const { session, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError('Usuario o contraseña incorrectos.')
  }

  return (
    <div className="login-wrap">
      <Paisaje variante="atardecer" />
      <div className="login-card">
        <span className="login-logo">
          <IconoToro tamano={34} />
        </span>
        <h1>Control Ganado</h1>
        <p>Inicia sesión para registrar compras y ganado.</p>
        {error && <div className="msg error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
