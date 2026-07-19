import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Sidebar from '../components/Sidebar'
import { theme as t } from '../theme'

function Dashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [counts, setCounts] = useState({ projects: 0, tasks: 0, moodboard: 0, comments: 0 })
  const [projects, setProjects] = useState([])
  const [taskCounts, setTaskCounts] = useState({})

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(prof)
        const [{ count: p }, { count: t2 }, { count: m }, { count: c }] = await Promise.all([
          supabase.from('projects').select('*', { count: 'exact', head: true }),
          supabase.from('tasks').select('*', { count: 'exact', head: true }),
          supabase.from('moodboard_items').select('*', { count: 'exact', head: true }),
          supabase.from('comments').select('*', { count: 'exact', head: true }),
        ])
        setCounts({ projects: p || 0, tasks: t2 || 0, moodboard: m || 0, comments: c || 0 })
        const { data: proj } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
        setProjects(proj || [])
        if (proj && proj.length > 0) {
          const tc = {}
          await Promise.all(proj.map(async (pr) => {
            const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('project_id', pr.id)
            tc[pr.id] = count || 0
          }))
          setTaskCounts(tc)
        }
      }
    }
    load()
  }, [])

  const colors = [t.color.accent, '#7A8B6F', '#8E7BA0', '#B0745A', '#5E8B8B']

  return (
    <div style={s.app} className="app-shell">
      <Sidebar />
      <div style={s.main}>
        <style>{mobileCss}</style>

        {/* Desktop topbar */}
        <div style={s.topbar} className="desktop-topbar">
          <div>
            <div style={s.greeting}>Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}</div>
            <div style={s.greetingSub}>Here's your team's activity today.</div>
          </div>
          <button style={s.btnNew} onClick={() => navigate('/projects')}>+ New project</button>
        </div>

        {/* Mobile hero */}
        <div style={s.mobileHero} className="mobile-hero">
          <div style={s.mobileGreet}>Welcome, {profile?.full_name?.split(' ')[0] || 'there'}</div>
          <div style={s.mobileSub}>Here's your team's activity today.</div>
          <button style={s.btnNew} onClick={() => navigate('/projects')}>+ New project</button>
        </div>

        <div style={s.content}>
          <div style={s.stats} className="stats-grid">
            {[
              { label: 'Projects', value: counts.projects, sub: 'active', path: '/projects' },
              { label: 'Tasks', value: counts.tasks, sub: 'open', path: '/tasks' },
              { label: 'Mood board', value: counts.moodboard, sub: 'pins', path: '/moodboard' },
              { label: 'Comments', value: counts.comments, sub: 'total', path: '/projects' },
            ].map(stat => (
              <div key={stat.label} style={s.statCard} onClick={() => navigate(stat.path)}>
                <div style={s.statLabel}>{stat.label}</div>
                <div style={s.statVal}>
                  {stat.value}
                  <span style={s.statSub}>{stat.sub}</span>
                </div>
              </div>
            ))}
          </div>

          {projects.length > 0 && (
            <div style={s.projectSection}>
              <div style={s.sectionTitle}>Your projects</div>
              {projects.map((p, i) => (
                <div key={p.id} style={s.projectRow} onClick={() => navigate('/projects/' + p.id)}>
                  <div style={{ ...s.projDot, background: colors[i % colors.length] }} />
                  <div style={s.projName}>{p.name}</div>
                  <div style={s.projCount}>{taskCounts[p.id] || 0} task{taskCounts[p.id] === 1 ? '' : 's'}</div>
                  <div style={s.projArrow}>›</div>
                </div>
              ))}
            </div>
          )}

          {projects.length === 0 && (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>🏗</div>
              <div style={s.emptyTitle}>No projects yet</div>
              <div style={s.emptySub}>Create your first project to get started</div>
              <button style={{ ...s.btnNew, alignSelf: 'center' }} onClick={() => navigate('/projects')}>+ Create project</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const mobileCss = `
  @media (max-width: 768px) {
    .desktop-topbar { display: none !important; }
    .mobile-hero { display: flex !important; }
    .stats-grid { grid-template-columns: 1fr 1fr !important; }
  }
  @media (min-width: 769px) {
    .mobile-hero { display: none !important; }
    .desktop-topbar { display: flex !important; }
  }
`

const s = {
  app: { display: 'flex', height: '100vh', background: t.color.bg, color: t.color.ink, fontFamily: t.font.body },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar: {
    alignItems: 'center', justifyContent: 'space-between',
    padding: '32px 40px 20px',
  },
  greeting: { fontFamily: t.font.display, fontSize: '30px', fontWeight: '700', color: t.color.ink, marginBottom: '6px' },
  greetingSub: { fontSize: '14px', color: t.color.muted },
  mobileHero: {
    flexDirection: 'column', padding: '20px 18px 18px',
    borderBottom: `1px solid ${t.color.border}`,
  },
  mobileGreet: { fontFamily: t.font.display, fontSize: '22px', fontWeight: '700', color: t.color.ink, marginBottom: '4px' },
  mobileSub: { fontSize: '12px', color: t.color.muted, marginBottom: '16px' },
  btnNew: {
    background: t.color.primary, color: t.color.primaryText, border: 'none',
    padding: '11px 20px', borderRadius: t.radius.sm, fontSize: '13px',
    fontWeight: '600', fontFamily: t.font.body, cursor: 'pointer', alignSelf: 'flex-start',
  },
  content: { flex: 1, overflowY: 'auto', padding: '8px 40px 40px' },
  stats: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px', marginBottom: '32px',
  },
  statCard: {
    background: t.color.surface, border: `1px solid ${t.color.border}`,
    borderRadius: t.radius.md, padding: '20px', cursor: 'pointer',
  },
  statLabel: {
    fontSize: '11px', color: t.color.muted, marginBottom: '14px',
    textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600',
  },
  statVal: { fontFamily: t.font.display, fontSize: '32px', fontWeight: '700', color: t.color.ink },
  statSub: { fontSize: '13px', color: t.color.accent, fontWeight: '600', fontFamily: t.font.body, marginLeft: '8px' },
  projectSection: { marginTop: '4px' },
  sectionTitle: {
    fontSize: '11px', color: t.color.muted, textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: '12px', fontWeight: '700',
  },
  projectRow: {
    display: 'flex', alignItems: 'center', gap: '12px',
    background: t.color.surface, border: `1px solid ${t.color.border}`,
    borderRadius: t.radius.md, padding: '18px 20px',
    marginBottom: '10px', cursor: 'pointer',
  },
  projDot: { width: '9px', height: '9px', borderRadius: '50%', flexShrink: 0 },
  projName: { fontSize: '15px', color: t.color.ink, fontWeight: '700', flex: 1 },
  projCount: { fontSize: '13px', color: t.color.muted },
  projArrow: { fontSize: '18px', color: t.color.muted },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '60px 20px', gap: '10px',
  },
  emptyIcon: { fontSize: '40px', marginBottom: '8px' },
  emptyTitle: { fontFamily: t.font.display, fontSize: '18px', fontWeight: '700', color: t.color.ink },
  emptySub: { fontSize: '13px', color: t.color.muted, marginBottom: '8px' },
}

export default Dashboard