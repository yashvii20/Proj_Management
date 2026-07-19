import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Sidebar from '../components/Sidebar'
import { theme } from '../theme'

function Tasks() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [profiles, setProfiles] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterProject, setFilterProject] = useState('all')
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [scope, setScope] = useState('all')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      fetchTasks()
      fetchProjects()
      fetchProfiles()
    }
    init()
  }, [])

  const fetchTasks = async () => {
    const { data } = await supabase.from('tasks').select('*, projects(name)').order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('*')
    setProjects(data || [])
  }

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*')
    setProfiles(data || [])
  }

  const updateStatus = async (taskId, status) => {
    await supabase.from('tasks').update({ status }).eq('id', taskId)
    fetchTasks()
  }

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'
  const getProfileName = (userId) => profiles.find(p => p.id === userId)?.full_name || 'Unassigned'

  const statusLabel = { todo: 'To do', inprogress: 'In progress', done: 'Done' }
  const statusColor = { todo: theme.color.muted, inprogress: theme.color.accent, done: theme.color.primary }

  const filtered = tasks.filter(t => {
    if (scope === 'mine' && t.assigned_to !== currentUser?.id) return false
    if (filterProject !== 'all' && t.project_id !== filterProject) return false
    if (filterAssignee !== 'all' && t.assigned_to !== filterAssignee) return false
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    return true
  })

  return (
    <div style={s.app} className='app-shell'>
      <style>{styleTag}</style>
      <Sidebar />
      <div style={s.main}>
        <div style={s.topbar}>
          <div>
            <div style={s.pageTitle}>All tasks</div>
            <div style={s.pageSub}>{filtered.length} tasks across all projects</div>
          </div>
        </div>

        <div style={s.scopeBar}>
          <div style={s.scopeToggle}>
            <div className='scope-btn' style={{ ...s.scopeBtn, ...(scope === 'all' ? s.scopeActive : {}) }} onClick={() => setScope('all')}>All tasks</div>
            <div className='scope-btn' style={{ ...s.scopeBtn, ...(scope === 'mine' ? s.scopeActive : {}) }} onClick={() => setScope('mine')}>My tasks</div>
          </div>
        </div>

        <div style={s.filterBar}>
          <select style={s.filterSelect} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
            <option value='all'>All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select style={s.filterSelect} value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
            <option value='all'>All members</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
          <select style={s.filterSelect} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value='all'>All statuses</option>
            <option value='todo'>To do</option>
            <option value='inprogress'>In progress</option>
            <option value='done'>Done</option>
          </select>
        </div>

        <div style={s.content}>
          {loading && <div style={s.empty}>Loading…</div>}
          {!loading && filtered.length === 0 && (
            <div style={s.emptyState}>
              <div style={s.emptyTitle}>No tasks found</div>
              <div style={s.emptySub}>Try adjusting your filters, or add tasks inside a project.</div>
            </div>
          )}
          <div style={s.list}>
            {filtered.map(task => (
              <div key={task.id} className='task-row' style={s.row} onClick={() => navigate('/projects/' + task.project_id)}>
                <div
                  style={{ ...s.check, ...(task.status === 'done' ? s.checkDone : {}) }}
                  onClick={e => { e.stopPropagation(); updateStatus(task.id, task.status === 'done' ? 'todo' : 'done') }}
                />
                <div style={s.rowMain}>
                  <div style={{ ...s.rowTitle, ...(task.status === 'done' ? s.strikethrough : {}) }}>{task.title}</div>
                  <div style={s.rowMeta}>
                    <span style={s.projectTag}>{task.projects?.name || 'Unknown'}</span>
                    {task.due_date && <span style={s.dueTag}>{new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                  </div>
                </div>
                {task.assigned_to && <div style={s.assignee} title={getProfileName(task.assigned_to)}>{getInitials(getProfileName(task.assigned_to))}</div>}
                <div style={{ ...s.statusBadge, color: statusColor[task.status], borderColor: statusColor[task.status] }}>{statusLabel[task.status]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const styleTag = `
  .task-row { transition: border-color 0.15s ease; }
  .task-row:hover { border-color: ${theme.color.accent} !important; }
  .scope-btn { transition: background 0.15s ease, color 0.15s ease; }
`

const s = {
  app: { display: 'flex', height: '100vh', background: theme.color.bg, color: theme.color.ink, fontFamily: theme.font.body },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 28px', borderBottom: `1px solid ${theme.color.border}` },
  pageTitle: { fontFamily: theme.font.display, fontSize: '22px', fontWeight: 600, color: theme.color.ink, marginBottom: '4px' },
  pageSub: { fontSize: '13px', color: theme.color.muted },
  scopeBar: { padding: '18px 28px 0' },
  scopeToggle: { display: 'inline-flex', background: theme.color.surface, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.lg, padding: '3px' },
  scopeBtn: { padding: '8px 18px', borderRadius: theme.radius.md, fontSize: '13px', fontWeight: 500, color: theme.color.muted, cursor: 'pointer' },
  scopeActive: { background: theme.color.primary, color: theme.color.primaryText },
  filterBar: { display: 'flex', gap: '10px', padding: '14px 28px', flexWrap: 'wrap', alignItems: 'center' },
  filterSelect: { padding: '9px 13px', background: theme.color.surface, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, color: theme.color.muted, fontSize: '13px', cursor: 'pointer' },
  content: { flex: 1, overflowY: 'auto', padding: '0 28px 28px' },
  empty: { color: theme.color.muted, fontSize: '14px' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '6px' },
  emptyTitle: { fontFamily: theme.font.display, fontSize: '17px', fontWeight: 600, color: theme.color.ink },
  emptySub: { fontSize: '13px', color: theme.color.muted },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  row: { display: 'flex', alignItems: 'center', gap: '14px', background: theme.color.surface, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md, padding: '14px 18px', cursor: 'pointer' },
  check: { width: '18px', height: '18px', borderRadius: '4px', border: `1.5px solid ${theme.color.border}`, flexShrink: 0, cursor: 'pointer' },
  checkDone: { background: theme.color.accent, borderColor: theme.color.accent },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: '14.5px', color: theme.color.ink, fontWeight: 600, marginBottom: '6px' },
  strikethrough: { textDecoration: 'line-through', color: theme.color.muted },
  rowMeta: { display: 'flex', alignItems: 'center', gap: '10px' },
  projectTag: { fontSize: '11.5px', fontWeight: 600, color: theme.color.accent, background: theme.color.bg, padding: '3px 10px', borderRadius: theme.radius.sm },
  dueTag: { fontSize: '12px', color: theme.color.muted },
  assignee: { width: '26px', height: '26px', borderRadius: '50%', background: theme.color.bg, color: theme.color.accent, fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statusBadge: { fontSize: '12px', fontWeight: 600, padding: '5px 13px', borderRadius: theme.radius.lg, border: '1px solid', flexShrink: 0 },
}

export default Tasks