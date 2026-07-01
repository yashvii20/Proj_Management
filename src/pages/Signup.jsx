import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function Signup() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        role: 'member'
      })
      navigate('/dashboard')
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>AC</div>
        <h1 style={s.title}>Create account</h1>
        <p style={s.sub}>Join your team on Architect Collab</p>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSignup}>
          <div style={s.field}>
            <label style={s.label}>Full name</label>
            <input
              style={s.input}
              type="text"
              placeholder="Ravi Mehta"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input
              style={s.input}
              type="email"
              placeholder="you@example.com"
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
              placeholder="Min. 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p style={s.footer}>
          Have an account? <Link to="/login" style={s.link}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f0f0f',
  },
  card: {
    background: '#161616',
    border: '1px solid #222',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '380px',
  },
  logo: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: '#a78bfa',
    color: '#fff',
    fontWeight: '700',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '4px',
  },
  sub: {
    fontSize: '13px',
    color: '#555',
    marginBottom: '28px',
  },
  error: {
    background: '#2a1515',
    border: '1px solid #3a1f1f',
    color: '#f87171',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    color: '#888',
    marginBottom: '6px',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    background: '#1e1e1e',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  btn: {
    width: '100%',
    padding: '11px',
    background: '#a78bfa',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    marginTop: '8px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '13px',
    color: '#555',
  },
  link: {
    color: '#a78bfa',
    fontWeight: '500',
  },
}

export default Signup