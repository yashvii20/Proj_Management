import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../supabase'

function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })
  }, [])

  if (session === undefined) {
    return <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>Loading...</div>
  }

  if (!session) {
    return <Navigate to="/login" />
  }

  return children
}

export default ProtectedRoute