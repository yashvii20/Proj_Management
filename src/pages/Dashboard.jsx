import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Sidebar from '../components/Sidebar'

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
        const [{ count: p }, { count: t }, { count: m }, { count: c }] = await Promise.all([
          supabase.from('projects').select('*', { count: 'exact', head: true }),
          supabase.from('tasks').select('*', { count: 'exact', head: true }),
          supabase.from('moodboard_items').select('*', { count: 'exact', head: true }),
          supabase.from('comments').select('*', { count: 'exact', head: true }),
        ])
        setCounts({ projects: p || 0, tasks: t || 0, moodboard: m || 0, comments: c || 0 })
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

  const colors = ['#a78bfa', '#4ade80', '#f59e0b', '#f87171', '#38bdf8']

  return (
    <div style={s.app} className="app-shell">
      <Sidebar />
      <div style={s.main}>
        <style>{mobileCss}</style>

        {/* Desktop topbar */}
        <div style={s.topbar} className="desktop-topbar">
          <div>
            <div style={s.greeting}>Welcome back, {profile?.full_name?.split(' ')[0] || 'there'} 👋</div>
            <div style={s.greetingSub}>Here's your team's activity today</div>
          </div>
          <button style={s.btnNew} onClick={() => navigate('/projects')}>+ New project</button>
        </div>

        {/* Mobile hero */}
        <div style={s.mobileHero} className="mobile-hero">
          <div style={s.mobileGreet}>Welcome, {profile?.full_name?.split(' ')[0] || 'there'} 👋</div>
          <div style={s.mobileSub}>Here's your team's activity today</div>
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
                  <div style={s.projCount}>{taskCounts[p.id] || 0} tasks</div>
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
              <button style={s.btnNew} onClick={() => navigate('/projects')}>+ Create project</button>
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
  app: { display: 'flex', height: '100vh', background: '#0f0f0f', color: '#fff' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar: {
    alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 28px', borderBottom: '1px solid #1a1a1a',
  },
  greeting: { fontSize: '18px', fontWeight: '600', color: '#fff', marginBottom: '3px' },
  greetingSub: { fontSize: '13px', color: '#555' },
  mobileHero: {
    flexDirection: 'column', padding: '20px 18px 18px',
    background: 'linear-gradient(135deg, #141414, #1a1430)',
    borderBottom: '1px solid #1e1e1e',
  },
  mobileGreet: { fontSize: '22px', fontWeight: '700', color: '#fff', marginBottom: '4px' },
  mobileSub: { fontSize: '12px', color: '#888', marginBottom: '16px' },
  btnNew: {
    background: '#a78bfa', color: '#fff', border: 'none',
    padding: '9px 18px', borderRadius: '8px', fontSize: '13px',
    fontWeight: '600', cursor: 'pointer', alignSelf: 'flex-start',
  },
  content: { flex: 1, overflowY: 'auto', padding: '20px 18px' },
  stats: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px', marginBottom: '24px',
  },
  statCard: {
    background: '#161616', border: '1px solid #1e1e1e',
    borderRadius: '10px', padding: '16px', cursor: 'pointer',
  },
  statLabel: {
    fontSize: '10px', color: '#555', marginBottom: '8px',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  statVal: { fontSize: '24px', fontWeight: '700', color: '#fff' },
  statSub: { fontSize: '11px', color: '#a78bfa', fontWeight: '400', marginLeft: '6px' },
  projectSection: { marginTop: '4px' },
  sectionTitle: {
    fontSize: '11px', color: '#555', textTransform: 'uppercase',
    letterSpacing: '0.5px', marginBottom: '10px', fontWeight: '600',
  },
  projectRow: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: '#161616', border: '1px solid #1e1e1e',
    borderRadius: '9px', padding: '12px 14px',
    marginBottom: '8px', cursor: 'pointer',
  },
  projDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  projName: { fontSize: '13px', color: '#ddd', fontWeight: '500', flex: 1 },
  projCount: { fontSize: '11px', color: '#555' },
  projArrow: { fontSize: '16px', color: '#444' },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '60px 20px', gap: '10px',
  },
  emptyIcon: { fontSize: '40px', marginBottom: '8px' },
  emptyTitle: { fontSize: '16px', fontWeight: '600', color: '#fff' },
  emptySub: { fontSize: '13px', color: '#555', marginBottom: '8px' },
}

export default Dashboard