import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Sidebar from '../components/Sidebar'

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
          {loading && <div style={s.empty}>Loading...</div>}
          {!loading && notifications.length === 0 && (
            <div style={s.emptyState}>
              <div style={s.emptyTitle}>No notifications yet</div>
              <div style={s.emptySub}>You will see updates here when teammates comment on your work</div>
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

const styleTag = '.notif-row { transition: all 0.15s ease; } .notif-row:hover { background: #1a1a1a !important; border-color: #2a2a2a !important; transform: translateX(2px); }'

const s = {
  app: { display: 'flex', height: '100vh', background: '#0f0f0f', color: '#fff' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid #1a1a1a' },
  pageTitle: { fontSize: '18px', fontWeight: '600', color: '#fff', marginBottom: '3px' },
  pageSub: { fontSize: '13px', color: '#555' },
  btnMark: { background: 'transparent', color: '#a78bfa', border: '1px solid #2a2a2a', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' },
  content: { flex: 1, overflowY: 'auto', padding: '20px 28px' },
  empty: { color: '#555', fontSize: '14px' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '8px' },
  emptyTitle: { fontSize: '16px', fontWeight: '600', color: '#fff' },
  emptySub: { fontSize: '13px', color: '#555', textAlign: 'center', maxWidth: '320px' },
  list: { display: 'flex', flexDirection: 'column', gap: '6px' },
  row: { display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px', borderRadius: '10px', cursor: 'pointer', border: '1px solid transparent' },
  rowUnread: { background: '#161616', border: '1px solid #1e1e1e' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', background: '#a78bfa', flexShrink: 0, marginTop: '6px' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', background: '#2d1f4e', color: '#a78bfa', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowContent: { flex: 1 },
  rowMessage: { fontSize: '13px', color: '#ddd', marginBottom: '5px' },
  rowComment: { fontSize: '12px', color: '#999', fontStyle: 'italic', background: '#1a1a1a', padding: '7px 10px', borderRadius: '7px', marginBottom: '5px', lineHeight: '1.5' },
  rowMeta: { fontSize: '11px', color: '#555' },
  rowTime: { fontSize: '11px', color: '#444', flexShrink: 0, marginTop: '2px' },
}

export default Notifications