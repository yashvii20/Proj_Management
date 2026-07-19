import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Sidebar from '../components/Sidebar'
import { theme } from '../theme'

function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchNotifications() }, [])

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*, moodboard_items(id, title, project_id), comments(content)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setNotifications(data || [])
    setLoading(false)
  }

  const handleClick = async (n) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
      fetchNotifications()
    }
    navigate('/moodboard')
  }

  const handleMarkAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    fetchNotifications()
  }

  const formatTime = (ts) => {
    const d = new Date(ts)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return diffMins + 'm ago'
    if (diffHours < 24) return diffHours + 'h ago'
    if (diffDays < 7) return diffDays + 'd ago'
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div style={s.app} className='app-shell'>
      <style>{styleTag}</style>
      <Sidebar />
      <div style={s.main}>
        <div style={s.topbar}>
          <div>
            <div style={s.pageTitle}>Notifications</div>
            <div style={s.pageSub}>{unreadCount} unread</div>
          </div>
          {unreadCount > 0 && (
            <button style={s.btnMark} onClick={handleMarkAllRead}>Mark all as read</button>
          )}
        </div>
        <div style={s.content}>
          {loading && <div style={s.empty}>Loading…</div>}
          {!loading && notifications.length === 0 && (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.color.accent} strokeWidth="1.6">
                  <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.7 21a2 2 0 01-3.4 0" />
                </svg>
              </div>
              <div style={s.emptyTitle}>No notifications yet</div>
              <div style={s.emptySub}>You'll see updates here when teammates comment on your work.</div>
            </div>
          )}
          <div style={s.list}>
            {notifications.map(n => (
              <div key={n.id} className='notif-row' style={{ ...s.row, ...(!n.is_read ? s.rowUnread : {}) }} onClick={() => handleClick(n)}>
                {!n.is_read && <div style={s.dot} />}
                <div style={s.avatar}>{(n.message || '?')[0]}</div>
                <div style={s.rowContent}>
                  <div style={s.rowMessage}>{n.message}</div>
                  {n.comments && n.comments.content && (
                    <div style={s.rowComment}>{'"' + n.comments.content + '"'}</div>
                  )}
                  {n.moodboard_items && n.moodboard_items.title && (
                    <div style={s.rowMeta}>on {n.moodboard_items.title}</div>
                  )}
                </div>
                <div style={s.rowTime}>{formatTime(n.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const styleTag = `
  .notif-row { transition: border-color 0.15s ease; }
  .notif-row:hover { border-color: ${theme.color.accent} !important; }
  .btn-mark:hover { filter: brightness(0.96); }
`

const s = {
  app: { display: 'flex', height: '100vh', background: theme.color.bg, color: theme.color.ink, fontFamily: theme.font.body },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 28px', borderBottom: `1px solid ${theme.color.border}` },
  pageTitle: { fontFamily: theme.font.display, fontSize: '22px', fontWeight: 600, color: theme.color.ink, marginBottom: '4px' },
  pageSub: { fontSize: '13px', color: theme.color.muted },
  btnMark: { background: theme.color.surface, color: theme.color.ink, border: `1px solid ${theme.color.border}`, padding: '8px 15px', borderRadius: theme.radius.sm, fontSize: '12.5px', fontWeight: 500, cursor: 'pointer' },
  content: { flex: 1, overflowY: 'auto', padding: '24px 28px' },
  empty: { color: theme.color.muted, fontSize: '14px' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '90px 20px', gap: '6px' },
  emptyIcon: { width: '52px', height: '52px', borderRadius: '50%', background: theme.color.surface, border: `1px solid ${theme.color.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' },
  emptyTitle: { fontFamily: theme.font.display, fontSize: '17px', fontWeight: 600, color: theme.color.ink },
  emptySub: { fontSize: '13px', color: theme.color.muted, textAlign: 'center', maxWidth: '320px', lineHeight: 1.6 },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  row: { display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', borderRadius: theme.radius.md, cursor: 'pointer', background: theme.color.surface, border: `1px solid ${theme.color.border}` },
  rowUnread: { borderColor: theme.color.accent },
  dot: { width: '7px', height: '7px', borderRadius: '50%', background: theme.color.accent, flexShrink: 0, marginTop: '7px' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', background: theme.color.bg, color: theme.color.accent, fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowContent: { flex: 1 },
  rowMessage: { fontSize: '13.5px', color: theme.color.ink, marginBottom: '5px' },
  rowComment: { fontSize: '12.5px', color: theme.color.muted, fontStyle: 'italic', background: theme.color.bg, padding: '8px 11px', borderRadius: theme.radius.sm, marginBottom: '5px', lineHeight: 1.5 },
  rowMeta: { fontSize: '11.5px', color: theme.color.muted },
  rowTime: { fontSize: '11.5px', color: theme.color.muted, flexShrink: 0, marginTop: '2px' },
}

export default Notifications