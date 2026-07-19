import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { theme as t } from '../theme'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.eyebrow}>Welcome back</div>
        <h1 style={s.title}>Sign in to your workspace</h1>
        <p style={s.sub}>Enter your details to continue.</p>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div style={s.field}>
            <label style={s.label}>Email address</label>
            <input
              style={s.input}
              type="email"
              placeholder="you@studio.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input
              style={s.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <div style={s.forgotRow}>
              <Link to="/forgot-password" style={s.forgotLink}>Forgot password?</Link>
            </div>
          </div>
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={s.footer}>
          Don't have an account? <Link to="/signup" style={s.link}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.color.bg, fontFamily: t.font.body, padding: '24px' },
  card: { background: t.color.surface, border: `1px solid ${t.color.border}`, borderRadius: t.radius.lg, padding: '48px 44px', width: '100%', maxWidth: '440px', boxShadow: '0 1px 2px rgba(30,34,51,0.04)' },
  eyebrow: { fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: t.color.accent, marginBottom: '10px' },
  title: { fontFamily: t.font.display, fontSize: '30px', fontWeight: '700', color: t.color.ink, marginBottom: '10px', lineHeight: '1.2' },
  sub: { fontSize: '15px', color: t.color.muted, marginBottom: '30px' },
  error: { background: t.color.dangerBg, border: `1px solid ${t.color.dangerBorder}`, color: t.color.danger, padding: '10px 14px', borderRadius: t.radius.sm, fontSize: '13px', marginBottom: '18px' },
  field: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '14px', color: t.color.ink, marginBottom: '8px', fontWeight: '600' },
  input: { width: '100%', padding: '12px 16px', background: t.color.surface, border: `1px solid ${t.color.border}`, borderRadius: t.radius.sm, color: t.color.ink, fontSize: '15px', fontFamily: t.font.body, outline: 'none', boxSizing: 'border-box' },
  forgotRow: { display: 'flex', justifyContent: 'flex-end', marginTop: '10px' },
  forgotLink: { fontSize: '13px', color: t.color.muted, textDecoration: 'none' },
  btn: { width: '100%', padding: '14px', background: t.color.primary, color: t.color.primaryText, border: 'none', borderRadius: t.radius.sm, fontSize: '15px', fontWeight: '600', fontFamily: t.font.body, marginTop: '6px', cursor: 'pointer' },
  footer: { textAlign: 'center', marginTop: '28px', fontSize: '14px', color: t.color.muted },
  link: { color: t.color.ink, fontWeight: '700', textDecoration: 'underline', textDecorationColor: t.color.accent, textDecorationThickness: '2px' },
}

export default Login