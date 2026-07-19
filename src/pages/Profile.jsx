import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Sidebar from '../components/Sidebar'
import { theme as t } from '../theme'

const ROLES = ['Owner', 'Admin', 'Member']

function Profile() {
  const navigate = useNavigate()
  const [authUser, setAuthUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('Member')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [projectCount, setProjectCount] = useState(0)
  const [memberSince, setMemberSince] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setAuthUser(user)
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (error) { setError('Could not load profile: ' + error.message) }
      if (data) {
        setProfile(data)
        setFullName(data.full_name || '')
        setRole(data.role || 'Member')
        setAvatarUrl(data.avatar_url || '')
        if (data.created_at) {
          setMemberSince(new Date(data.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }))
        }
      }
      const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true })
      setProjectCount(count || 0)
      setLoading(false)
    }
    load()
  }, [])

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'

  const handleAvatarUpload = async (file) => {
    if (!authUser) return
    setUploading(true)
    setError('')
    const ext = file.name.split('.').pop()
    const fileName = authUser.id + '-' + Date.now() + '.' + ext
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true })
    if (uploadError) {
      setUploading(false)
      setError('Avatar upload failed: ' + uploadError.message)
      return
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
    setAvatarUrl(urlData.publicUrl)
    setUploading(false)
  }

  const handleSave = async () => {
    if (!authUser) return
    setSaving(true)
    setError('')
    setSaved(false)
    const { error: saveError } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), role, avatar_url: avatarUrl || null })
      .eq('id', authUser.id)
    setSaving(false)
    if (saveError) {
      setError('Could not save changes: ' + saveError.message)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) {
    return (
      <div style={s.app} className='app-shell'>
        <Sidebar />
        <div style={s.main}>
          <div style={s.loadingText}>Loading profile...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={s.app} className='app-shell'>
      <Sidebar />
      <div style={s.main}>
        <div style={s.topbar}>
          <div style={s.back} onClick={() => navigate('/dashboard')}>{'\u2039'} Dashboard</div>
          <div style={s.pageTitle}>Profile</div>
          <div style={s.pageSub}>Manage your name, role, and avatar to personalize your workspace</div>
        </div>

        <div style={s.content}>
          <div style={s.pageBody} className='profile-body-row'>
            <div style={s.card}>
              <div style={s.avatarRow}>
                <div className='avatar-click-wrap' style={s.avatarWrap} onClick={() => fileInputRef.current.click()}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt='avatar' style={s.avatarImg} onError={e => { e.target.style.display = 'none' }} />
                  ) : (
                    <div style={s.avatarFallback}>{getInitials(fullName)}</div>
                  )}
                  <div className='avatar-overlay'>Edit</div>
                </div>
                <div>
                  <button type='button' className='avatar-upload-btn' style={s.uploadBtn} onClick={() => fileInputRef.current.click()} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Change avatar'}
                  </button>
                  <input ref={fileInputRef} type='file' accept='image/*' style={{ display: 'none' }} onChange={e => e.target.files[0] && handleAvatarUpload(e.target.files[0])} />
                  <div style={s.avatarHint}>PNG or JPG, square images look best</div>
                </div>
              </div>

              <div style={s.fieldRow}>
                <div style={s.field}>
                  <label style={s.label}>Full name</label>
                  <input style={s.input} value={fullName} onChange={e => setFullName(e.target.value)} placeholder='Your name' />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Role</label>
                  <select style={s.input} value={role} onChange={e => setRole(e.target.value)}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div style={s.field}>
                <label style={s.label}>Email</label>
                <div style={s.readonlyValue}>{authUser?.email || '-'}</div>
              </div>

              {error && <div style={s.errorBox}>{error}</div>}

              <div style={s.footer}>
                <button style={s.btnBack} onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
                {saved && <span style={s.savedText}>✓ Saved</span>}
                <button style={s.btnSave} onClick={handleSave} disabled={saving || !fullName.trim()}>
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>

            <div style={s.sidebarCol}>
              <div style={s.statCard}>
                <div style={s.statValue}>{projectCount}</div>
                <div style={s.statLabel}>Active projects</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statValue}>{memberSince || '-'}</div>
                <div style={s.statLabel}>Member since</div>
              </div>
              <div style={s.statCard}>
                <div style={s.statValueSmall}>{role}</div>
                <div style={s.statLabel}>Current role</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{css}</style>
    </div>
  )
}

const css = [
'.avatar-click-wrap { position: relative; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; }',
'.avatar-click-wrap:hover { transform: scale(1.04); }',
'.avatar-overlay { position: absolute; inset: 0; background: rgba(30,34,51,0.55); color: #fff; font-size: 11px; font-weight: 600; letter-spacing: 0.3px; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s ease; border-radius: 50%; }',
'.avatar-click-wrap:hover .avatar-overlay { opacity: 1; }',
'.avatar-upload-btn { transition: background 0.15s ease, border-color 0.15s ease, transform 0.12s ease; }',
`.avatar-upload-btn:hover { background: ${t.color.bg}; border-color: ${t.color.accent}; transform: translateY(-1px); }`,
'.avatar-upload-btn:active { transform: translateY(0); }',
'@media (max-width: 900px) { .profile-body-row { flex-direction: column !important; } }',
].join(' ')

const s = {
  app: { display: 'flex', height: '100vh', background: t.color.bg, color: t.color.ink, fontFamily: t.font.body },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  loadingText: { padding: '28px', color: t.color.muted, fontSize: '14px' },
  topbar: { padding: '28px 40px 20px' },
  back: { fontSize: '13px', color: t.color.muted, cursor: 'pointer', marginBottom: '10px' },
  pageTitle: { fontFamily: t.font.display, fontSize: '28px', fontWeight: '700', color: t.color.ink, marginBottom: '4px' },
  pageSub: { fontSize: '14px', color: t.color.muted },
  content: { flex: 1, overflowY: 'auto', padding: '8px 40px 40px' },
  pageBody: { display: 'flex', gap: '20px', alignItems: 'flex-start', maxWidth: '960px' },
  card: { background: t.color.surface, border: `1px solid ${t.color.border}`, borderRadius: t.radius.lg, padding: '28px', flex: '1 1 580px', minWidth: 0 },
  avatarRow: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' },
  avatarWrap: { width: '88px', height: '88px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: t.color.bg, border: `2px solid ${t.color.border}` },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarFallback: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(176,141,87,0.18)', color: t.color.accent, fontSize: '26px', fontWeight: '700', fontFamily: t.font.display },
  uploadBtn: { background: t.color.bg, color: t.color.ink, border: `1px solid ${t.color.border}`, padding: '9px 16px', borderRadius: t.radius.sm, fontSize: '12px', fontWeight: '600', fontFamily: t.font.body, cursor: 'pointer' },
  avatarHint: { fontSize: '11px', color: t.color.muted, marginTop: '6px' },
  fieldRow: { display: 'flex', gap: '16px' },
  field: { marginBottom: '18px', flex: 1, minWidth: 0 },
  label: { display: 'block', fontSize: '14px', color: t.color.ink, marginBottom: '8px', fontWeight: '600' },
  input: { width: '100%', padding: '11px 14px', background: t.color.surface, border: `1px solid ${t.color.border}`, borderRadius: t.radius.sm, color: t.color.ink, fontSize: '14px', fontFamily: t.font.body, outline: 'none', boxSizing: 'border-box' },
  readonlyValue: { padding: '11px 14px', background: t.color.bg, border: `1px solid ${t.color.border}`, borderRadius: t.radius.sm, color: t.color.muted, fontSize: '14px' },
  errorBox: { fontSize: '13px', color: t.color.danger, background: t.color.dangerBg, border: `1px solid ${t.color.dangerBorder}`, borderRadius: t.radius.sm, padding: '10px 14px', marginBottom: '18px' },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' },
  btnBack: { background: 'transparent', color: t.color.muted, border: `1px solid ${t.color.border}`, padding: '10px 18px', borderRadius: t.radius.sm, fontSize: '13px', fontWeight: '600', fontFamily: t.font.body, cursor: 'pointer', marginRight: 'auto' },
  savedText: { fontSize: '13px', color: '#5B8C5A', fontWeight: '700' },
  btnSave: { background: t.color.primary, color: t.color.primaryText, border: 'none', padding: '10px 20px', borderRadius: t.radius.sm, fontSize: '13px', fontWeight: '600', fontFamily: t.font.body, cursor: 'pointer' },
  sidebarCol: { flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 },
  statCard: { background: t.color.surface, border: `1px solid ${t.color.border}`, borderRadius: t.radius.md, padding: '18px 20px' },
  statValue: { fontFamily: t.font.display, fontSize: '26px', fontWeight: '700', color: t.color.ink, marginBottom: '4px' },
  statValueSmall: { fontSize: '16px', fontWeight: '700', color: t.color.accent, marginBottom: '4px' },
  statLabel: { fontSize: '11px', color: t.color.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' },
}

export default Profile