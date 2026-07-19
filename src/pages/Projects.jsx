import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Sidebar from '../components/Sidebar'
import { theme as t } from '../theme'

function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [taskStats, setTaskStats] = useState({})

  const colors = [t.color.accent, '#7A8B6F', '#8E7BA0', '#B0745A', '#5E8B8B']

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    setProjects(data || [])
    setLoading(false)
    if (data && data.length > 0) fetchTaskStats(data)
  }

  const fetchTaskStats = async (projects) => {
    const stats = {}
    await Promise.all(projects.map(async (p) => {
      const { data } = await supabase
        .from('tasks')
        .select('status')
        .eq('project_id', p.id)
      const total = data?.length || 0
      const done = data?.filter(t => t.status === 'done').length || 0
      stats[p.id] = { total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 }
    }))
    setTaskStats(stats)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('projects').insert({
      name,
      description,
      created_by: user.id,
    })
    if (!error) {
      setName('')
      setDescription('')
      setShowModal(false)
      fetchProjects()
    }
    setSaving(false)
  }

  return (
    <div style={s.app} className="app-shell">
      <Sidebar />
      <div style={s.main}>
        <div style={s.topbar}>
          <div>
            <div style={s.pageTitle}>Projects</div>
            <div style={s.pageSub}>{projects.length} project{projects.length !== 1 ? 's' : ''}</div>
          </div>
          <button style={s.btnNew} onClick={() => setShowModal(true)}>
            + New project
          </button>
        </div>

        <div style={s.content}>
          {loading && <div style={s.empty}>Loading...</div>}

          {!loading && projects.length === 0 && (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>🏗</div>
              <div style={s.emptyTitle}>No projects yet</div>
              <div style={s.emptySub}>Create your first project to get started</div>
              <button style={s.btnNew} onClick={() => setShowModal(true)}>
                + Create project
              </button>
            </div>
          )}

          <div style={s.grid}>
            {projects.map((p, i) => {
              const stats = taskStats[p.id]
              return (
                <div
                  key={p.id}
                  style={s.card}
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <div style={s.cardDeleteBtn} onClick={async (e) => {
                    e.stopPropagation()
                    if (window.confirm('Delete project "' + p.name + '"? This will delete all tasks, mood board items and comments in it.')) {
                      await supabase.from('projects').delete().eq('id', p.id)
                      fetchProjects()
                    }
                  }}>✕</div>
                  <div style={s.cardBody}>
                    <div style={s.cardTitle}>{p.name}</div>
                    <div style={s.cardDesc}>{p.description || 'No description'}</div>
                    {stats && (
                      <div style={s.progressWrap}>
                        <div style={s.progressBar}>
                          <div style={{
                            ...s.progressFill,
                            width: stats.percent + '%',
                            background: colors[i % colors.length]
                          }} />
                        </div>
                        <div style={s.progressLabel}>
                          {stats.done}/{stats.total} tasks completed
                        </div>
                      </div>
                    )}
                    {stats && stats.total === 0 && (
                      <div style={s.progressLabel}>No tasks yet</div>
                    )}
                    <div style={s.cardMeta}>
                      {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {showModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <div style={s.modalTitle}>New project</div>
              <div style={s.closeBtn} onClick={() => setShowModal(false)}>✕</div>
            </div>
            <form onSubmit={handleCreate}>
              <div style={s.field}>
                <label style={s.label}>Project name</label>
                <input
                  style={s.input}
                  placeholder="Villa Residency"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Description (optional)</label>
                <textarea
                  style={{ ...s.input, height: '80px', resize: 'vertical' }}
                  placeholder="Brief description of the project..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
              <div style={s.modalFooter}>
                <button type="button" style={s.btnCancel} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" style={s.btnNew} disabled={saving}>
                  {saving ? 'Creating...' : 'Create project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  app: { display: 'flex', height: '100vh', background: t.color.bg, color: t.color.ink, fontFamily: t.font.body },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '28px 40px 20px',
  },
  pageTitle: { fontFamily: t.font.display, fontSize: '28px', fontWeight: '700', color: t.color.ink, marginBottom: '4px' },
  pageSub: { fontSize: '14px', color: t.color.muted },
  btnNew: {
    background: t.color.primary, color: t.color.primaryText, border: 'none',
    padding: '11px 20px', borderRadius: t.radius.sm, fontSize: '13px',
    fontWeight: '600', fontFamily: t.font.body, cursor: 'pointer',
  },
  content: { flex: 1, overflowY: 'auto', padding: '8px 40px 40px' },
  empty: { color: t.color.muted, fontSize: '14px' },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '80px 20px', gap: '10px',
  },
  emptyIcon: { fontSize: '40px', marginBottom: '8px' },
  emptyTitle: { fontFamily: t.font.display, fontSize: '18px', fontWeight: '700', color: t.color.ink },
  emptySub: { fontSize: '13px', color: t.color.muted, marginBottom: '8px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '16px',
  },
  card: {
    background: t.color.surface, border: `1px solid ${t.color.border}`,
    borderRadius: t.radius.md, overflow: 'hidden', cursor: 'pointer',
    position: 'relative',
  },
  cardBody: { padding: '20px' },
  cardTitle: { fontFamily: t.font.display, fontSize: '18px', fontWeight: '700', color: t.color.ink, marginBottom: '6px' },
  cardDesc: { fontSize: '13px', color: t.color.muted, marginBottom: '14px', lineHeight: '1.5' },
  cardMeta: { fontSize: '12px', color: t.color.muted, marginTop: '10px' },
  progressWrap: { marginBottom: '10px' },
  progressBar: {
    height: '5px', background: t.color.border, borderRadius: '4px',
    overflow: 'hidden', marginBottom: '6px',
  },
  progressFill: {
    height: '100%', borderRadius: '4px',
    transition: 'width 0.4s ease',
  },
  progressLabel: { fontSize: '12px', color: t.color.muted },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(30,34,51,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    padding: '20px', boxSizing: 'border-box',
  },
  modal: {
    background: t.color.surface, border: `1px solid ${t.color.border}`,
    borderRadius: t.radius.lg, padding: '28px', width: '100%', maxWidth: '460px',
    maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 12px 40px rgba(30,34,51,0.18)', boxSizing: 'border-box',
  },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' },
  modalTitle: { fontFamily: t.font.display, fontSize: '22px', fontWeight: '700', color: t.color.ink },
  closeBtn: { color: t.color.muted, cursor: 'pointer', fontSize: '16px' },
  field: { marginBottom: '18px' },
  label: { display: 'block', fontSize: '14px', color: t.color.ink, marginBottom: '8px', fontWeight: '600' },
  input: {
    width: '100%', padding: '11px 14px', background: t.color.surface,
    border: `1px solid ${t.color.border}`, borderRadius: t.radius.sm, color: t.color.ink,
    fontSize: '14px', fontFamily: t.font.body, outline: 'none', boxSizing: 'border-box',
  },
  modalFooter: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '22px' },
  btnCancel: {
    background: t.color.surface, color: t.color.ink, border: `1px solid ${t.color.border}`,
    padding: '11px 18px', borderRadius: t.radius.sm, fontSize: '13px', fontWeight: '600',
    fontFamily: t.font.body, cursor: 'pointer',
  },
  cardDeleteBtn: {
    position: 'absolute', top: '10px', right: '10px', width: '26px', height: '26px',
    borderRadius: '50%', background: t.color.bg, border: `1px solid ${t.color.border}`,
    color: t.color.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '11px', cursor: 'pointer', zIndex: 1,
  },
}

export default Projects