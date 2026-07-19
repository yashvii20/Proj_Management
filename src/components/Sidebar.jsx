import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import { theme as t } from '../theme'

function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [profile, setProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(prof)
        const { data: proj } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
        setProjects(proj || [])
        fetchUnread(user.id)
      }
    }
    load()
    setMobileOpen(false)
  }, [location.pathname])

  const fetchUnread = async (userId) => {
    const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false)
    setUnreadCount(count || 0)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const initials = profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'
  const colors = [t.color.accent, '#7A8B6F', '#8E7BA0', '#B0745A', '#5E8B8B']

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '⊞' },
    { label: 'Projects', path: '/projects', icon: '▦' },
    { label: 'Tasks', path: '/tasks', icon: '✓' },
    { label: 'Mood board', path: '/moodboard', icon: '🖼' },
    { label: 'Activity', path: '/activity', icon: '◎' },
  ]

  const sidebarContent = (
    <>
      <div style={s.logo}>
        <div style={s.logoIcon}>A</div>
        <span style={s.logoText}>Atelier</span>
        <div style={s.mobileClose} onClick={() => setMobileOpen(false)}>×</div>
      </div>

      <div style={s.navRow} onClick={() => navigate('/notifications')}>
        <div className={'nav-item' + (location.pathname === '/notifications' ? ' nav-active' : '')}>
          <span style={s.icon}>🔔</span>
          <span>Notifications</span>
          {unreadCount > 0 && <span style={s.badge}>{unreadCount}</span>}
        </div>
      </div>

      <div style={s.sectionLabel}>Menu</div>
      <nav style={s.nav}>
        {navItems.map(item => (
          <div key={item.label} style={s.navRow} onClick={() => navigate(item.path)}>
            <div className={'nav-item' + (location.pathname === item.path ? ' nav-active' : '')}>
              <span style={s.icon}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          </div>
        ))}
      </nav>

      <div style={s.sectionLabel}>Projects</div>
      {projects.slice(0, 5).map((p, i) => (
        <div key={p.id} style={s.navRow} onClick={() => navigate('/projects/' + p.id)}>
          <div className="proj-item">
            <div style={{ ...s.dot, background: colors[i % colors.length] }} />
            <span style={s.projectName}>{p.name}</span>
          </div>
        </div>
      ))}
      {projects.length === 0 && <div style={s.noProjects}>No projects yet</div>}

      <div style={s.userRow}>
        <div style={s.userInfoClickable} className="user-info-clickable" onClick={() => navigate('/profile')}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="avatar" style={s.avatarImg} onError={e => { e.target.style.display = 'none' }} />
            : <div style={s.avatar}>{initials}</div>
          }
          <div style={s.userTextWrap}>
            <div style={s.userName}>{profile ? profile.full_name : '...'}</div>
            <div style={s.userRole}>{profile ? profile.role : 'member'}</div>
          </div>
        </div>
        <div style={s.logoutBtn} onClick={e => { e.stopPropagation(); handleLogout() }}>Exit</div>
      </div>
    </>
  )

  return (
    <>
      <div style={s.mobileTopbar} className="mobile-topbar">
        <div style={s.mobileMenuBtn} onClick={() => setMobileOpen(true)}>
          <div style={s.hamburgerLine} />
          <div style={s.hamburgerLine} />
          <div style={s.hamburgerLine} />
        </div>
        <div style={s.mobileLogoText}>Atelier</div>
        <div style={s.bellWrap} onClick={() => navigate('/notifications')}>
          <div style={s.bellIcon}>🔔</div>
          {unreadCount > 0 && <div style={s.bellBadge}>{unreadCount}</div>}
        </div>
      </div>

      <div style={s.sidebar} className="sidebar-desktop">{sidebarContent}</div>

      {mobileOpen && (
        <div style={s.mobileOverlay} className="mobile-overlay-active" onClick={() => setMobileOpen(false)}>
          <div style={s.mobileSidebar} className="mobile-drawer" onClick={e => e.stopPropagation()}>{sidebarContent}</div>
        </div>
      )}

      <style>{globalCss}</style>
    </>
  )
}

const globalCss = `
  @media (max-width: 768px) {
    .sidebar-desktop { display: none !important; }
    .mobile-topbar { display: flex !important; }
    .mobile-overlay-active { display: flex !important; }
  }
  .nav-item {
    display: flex; align-items: center; gap: 10px; padding: 9px 16px;
    font-size: 13px; color: ${t.color.sidebarMuted}; cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease;
    border-radius: 6px; margin: 0 10px; border-left: 2px solid transparent;
  }
  .nav-item:hover { background: rgba(255,255,255,0.05); color: ${t.color.sidebarText}; }
  .nav-active {
    background: ${t.color.sidebarActiveBg} !important;
    color: ${t.color.sidebarText} !important;
    font-weight: 600;
    border-left: 2px solid ${t.color.accent};
  }
  .proj-item {
    display: flex; align-items: center; gap: 8px; padding: 6px 16px;
    cursor: pointer; border-radius: 6px; margin: 0 10px;
    transition: background 0.12s ease;
  }
  .proj-item:hover { background: rgba(255,255,255,0.05); }
  .user-info-clickable { transition: background 0.12s ease; border-radius: 8px; }
  .user-info-clickable:hover { background: rgba(255,255,255,0.05); }
  .mobile-drawer { animation: slideIn 0.25s cubic-bezier(0.32, 0.72, 0, 1); }
  @keyframes slideIn { from { transform: translateX(-100%); opacity: 0.5; } to { transform: translateX(0); opacity: 1; } }
`

const s = {
  mobileTopbar: { display: 'none', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: t.color.sidebarBg, borderBottom: `1px solid ${t.color.sidebarBorder}`, position: 'sticky', top: 0, zIndex: 50 },
  mobileMenuBtn: { display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer', padding: '4px' },
  hamburgerLine: { width: '20px', height: '2px', background: t.color.sidebarText, borderRadius: '2px' },
  mobileLogoText: { fontFamily: t.font.display, fontSize: '15px', fontWeight: '700', color: t.color.sidebarText },
  bellWrap: { position: 'relative', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  bellIcon: { fontSize: '16px' },
  bellBadge: { position: 'absolute', top: '0px', right: '0px', width: '14px', height: '14px', borderRadius: '50%', background: t.color.accent, color: '#fff', fontSize: '8px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  mobileOverlay: { display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 },
  mobileSidebar: { width: '260px', height: '100vh', background: t.color.sidebarBg, display: 'flex', flexDirection: 'column', overflowY: 'auto' },
  mobileClose: { marginLeft: 'auto', color: t.color.sidebarMuted, fontSize: '18px', cursor: 'pointer', padding: '4px 8px' },
  sidebar: { width: '260px', background: t.color.sidebarBg, display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh', position: 'sticky', top: 0, fontFamily: t.font.body },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', padding: '24px 20px', borderBottom: `1px solid ${t.color.sidebarBorder}`, marginBottom: '8px' },
  logoIcon: { width: '32px', height: '32px', border: `1px solid ${t.color.accent}`, color: t.color.sidebarText, fontFamily: t.font.display, fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: t.font.display, fontSize: '17px', fontWeight: '700', color: t.color.sidebarText },
  navRow: { position: 'relative' },
  icon: { fontSize: '14px', width: '18px', textAlign: 'center' },
  badge: { background: t.color.accent, color: '#fff', fontSize: '10px', fontWeight: '700', padding: '1px 7px', borderRadius: '10px', minWidth: '16px', textAlign: 'center', marginLeft: 'auto' },
  nav: { padding: '0 0 8px' },
  sectionLabel: { padding: '14px 20px 6px', fontSize: '10px', color: t.color.sidebarMuted, letterSpacing: '1px', textTransform: 'uppercase', fontWeight: '600' },
  projectName: { fontSize: '13px', color: t.color.sidebarText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  dot: { width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0 },
  noProjects: { fontSize: '12px', color: t.color.sidebarMuted, padding: '6px 20px' },
  userRow: { display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 14px 14px 20px', marginTop: 'auto', borderTop: `1px solid ${t.color.sidebarBorder}` },
  userInfoClickable: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1, minWidth: 0, padding: '4px 6px' },
  userTextWrap: { minWidth: 0 },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(176,141,87,0.2)', color: t.color.accent, fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarImg: { width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  userName: { fontSize: '13px', color: t.color.sidebarText, fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userRole: { fontSize: '11px', color: t.color.sidebarMuted, textTransform: 'capitalize' },
  logoutBtn: { fontSize: '12px', color: t.color.sidebarMuted, cursor: 'pointer', flexShrink: 0, padding: '4px 6px' },
}

export default Sidebar