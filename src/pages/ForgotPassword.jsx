import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { theme } from '../theme'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>A</div>
        <h1 style={s.title}>Reset password</h1>
        <p style={s.sub}>Enter your email and we'll send a reset link.</p>
        {error && <div style={s.error}>{error}</div>}
        {sent ? (
          <div style={s.success}>
            Check your email — we sent a password reset link to {email}.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={s.field}>
              <label style={s.label}>Email</label>
              <input
                style={s.input}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button style={s.btn} type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
        <p style={s.footer}>
          <Link to="/login" style={s.link}>Back to login</Link>
        </p>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.color.bg, fontFamily: theme.font.body },
  card: { background: theme.color.surface, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.lg, padding: '40px', width: '100%', maxWidth: '380px' },
  logo: { width: '40px', height: '40px', borderRadius: theme.radius.sm, border: `1px solid ${theme.color.accent}`, color: theme.color.accent, fontFamily: theme.font.display, fontWeight: 600, fontSize: '17px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' },
  title: { fontFamily: theme.font.display, fontSize: '21px', fontWeight: 600, color: theme.color.ink, marginBottom: '4px' },
  sub: { fontSize: '13px', color: theme.color.muted, marginBottom: '28px' },
  error: { background: theme.color.dangerBg, border: `1px solid ${theme.color.dangerBorder}`, color: theme.color.danger, padding: '10px 14px', borderRadius: theme.radius.sm, fontSize: '13px', marginBottom: '16px' },
  success: { background: theme.color.bg, border: `1px solid ${theme.color.border}`, color: theme.color.ink, padding: '14px', borderRadius: theme.radius.sm, fontSize: '13px', lineHeight: '1.6' },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 500, color: theme.color.ink, marginBottom: '7px' },
  input: { width: '100%', padding: '10px 14px', background: theme.color.surface, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, color: theme.color.ink, fontSize: '14px', outline: 'none' },
  btn: { width: '100%', padding: '12px', background: theme.color.primary, color: theme.color.primaryText, border: 'none', borderRadius: theme.radius.sm, fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' },
  footer: { textAlign: 'center', marginTop: '20px', fontSize: '13px', color: theme.color.muted },
  link: { color: theme.color.accent, fontWeight: 600 },
}

export default ForgotPassword