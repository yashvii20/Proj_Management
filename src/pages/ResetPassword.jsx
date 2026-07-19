import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { theme } from '../theme'

function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    // Fallback: if a session already exists (e.g. fast token parse before
    // this listener attached), don't leave the form stuck waiting.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (ready) return
    const timeout = setTimeout(() => {
      if (!ready) setExpired(true)
    }, 4000)
    return () => clearTimeout(timeout)
  }, [ready])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
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
        <div style={s.logo}>A</div>
        <h1 style={s.title}>New password</h1>
        <p style={s.sub}>Enter your new password below.</p>

        {expired && !ready ? (
          <div style={s.error}>
            This reset link has expired or was already used. Request a new one from the login page.
          </div>
        ) : (
          <>
            {error && <div style={s.error}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={s.field}>
                <label style={s.label}>New password</label>
                <input
                  style={s.input}
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus
                  minLength={6}
                  disabled={!ready}
                />
              </div>
              <button style={{ ...s.btn, ...(!ready ? s.btnDisabled : {}) }} type="submit" disabled={loading || !ready}>
                {!ready ? 'Verifying link…' : loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </>
        )}
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
  error: { background: theme.color.dangerBg, border: `1px solid ${theme.color.dangerBorder}`, color: theme.color.danger, padding: '10px 14px', borderRadius: theme.radius.sm, fontSize: '13px', marginBottom: '16px', lineHeight: 1.5 },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 500, color: theme.color.ink, marginBottom: '7px' },
  input: { width: '100%', padding: '10px 14px', background: theme.color.surface, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, color: theme.color.ink, fontSize: '14px', outline: 'none' },
  btn: { width: '100%', padding: '12px', background: theme.color.primary, color: theme.color.primaryText, border: 'none', borderRadius: theme.radius.sm, fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' },
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
}

export default ResetPassword