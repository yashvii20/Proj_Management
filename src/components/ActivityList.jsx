import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

function ActivityList({ projectId }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      let query = supabase.from('activity_log').select('*, profiles(full_name), projects(name)').order('created_at', { ascending: false }).limit(100)
      if (projectId) query = query.eq('project_id', projectId)
      const { data } = await query
      if (!cancelled) {
        setActivities(data || [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [projectId])

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
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
  }

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'

  const getActionColor = (action) => {
    if (action.includes('completed')) return '#4ade80'
    if (action.includes('deleted')) return '#f87171'
    if (action.includes('uploaded')) return '#38bdf8'
    return '#a78bfa'
  }

  const getActionIcon = (entityType) => {
    if (entityType === 'task') return 'T'
    if (entityType === 'moodboard') return 'M'
    return 'A'
  }

  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })
    if (!groups[date]) groups[date] = []
    groups[date].push(activity)
    return groups
  }, {})

  if (loading) return <div style={s.empty}>Loading...</div>
  if (activities.length === 0) {
    return (
      <div style={s.emptyState}>
        <div style={s.emptyTitle}>No activity yet</div>
        <div style={s.emptySub}>Activities will appear here as your team works</div>
      </div>
    )
  }

  return (
    <div>
      {Object.entries(groupedActivities).map(([date, items]) => (
        <div key={date} style={s.group}>
          <div style={s.dateLabel}>{date}</div>
          <div style={s.timeline}>
            {items.map(a => (
              <div key={a.id} style={s.row}>
                <div style={s.avatarWrap}>
                  <div style={s.avatar}>{getInitials(a.profiles?.full_name)}</div>
                  <div style={s.timelineLine} />
                </div>
                <div style={s.bubble}>
                  <div style={s.bubbleHeader}>
                    <span style={s.name}>{a.profiles?.full_name || 'Unknown'}</span>
                    <span style={{ ...s.actionBadge, color: getActionColor(a.action), borderColor: getActionColor(a.action) + '44' }}>{a.action}</span>
                    <span style={s.time}>{formatTime(a.created_at)}</span>
                  </div>
                  <div style={s.entityRow}>
                    <span style={s.entityIcon}>{getActionIcon(a.entity_type)}</span>
                    <span style={s.entityName}>{a.entity_name}</span>
                    {!projectId && a.projects?.name && <span style={s.projectTag}>{a.projects.name}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const s = {
  empty: { color: '#555', fontSize: '14px' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '8px' },
  emptyTitle: { fontSize: '16px', fontWeight: '600', color: '#fff' },
  emptySub: { fontSize: '13px', color: '#555' },
  group: { marginBottom: '28px' },
  dateLabel: { fontSize: '11px', color: '#444', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px', fontWeight: '600' },
  timeline: { display: 'flex', flexDirection: 'column', gap: '0px' },
  row: { display: 'flex', gap: '12px', alignItems: 'flex-start' },
  avatarWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', background: '#2d1f4e', color: '#a78bfa', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 },
  timelineLine: { width: '1px', flex: 1, background: '#1e1e1e', minHeight: '20px' },
  bubble: { flex: 1, background: '#161616', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px' },
  bubbleHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' },
  name: { fontSize: '13px', fontWeight: '600', color: '#ddd' },
  actionBadge: { fontSize: '11px', padding: '2px 9px', borderRadius: '20px', border: '1px solid' },
  time: { fontSize: '11px', color: '#444', marginLeft: 'auto' },
  entityRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  entityIcon: { width: '20px', height: '20px', borderRadius: '5px', background: '#1e1e1e', color: '#888', fontSize: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  entityName: { fontSize: '12px', color: '#888' },
  projectTag: { fontSize: '10.5px', color: '#a78bfa', background: '#241c3a', padding: '2px 8px', borderRadius: '4px', marginLeft: '4px' },
}

export default ActivityList