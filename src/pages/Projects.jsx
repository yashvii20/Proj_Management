import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Sidebar from '../components/Sidebar'

function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const colors = ['#a78bfa', '#4ade80', '#f59e0b', '#f87171', '#38bdf8']

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
            {projects.map((p, i) => (
              <div
                key={p.id}
                style={s.card}
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                <div style={{ ...s.cardTop, background: colors[i % colors.length] + '22', borderBottom: `1px solid ${colors[i % colors.length]}33` }}>
                  <div style={{ ...s.cardDot, background: colors[i % colors.length] }} />
                </div>
                <div style={s.cardBody}>
                  <div style={s.cardTitle}>{p.name}</div>
                  <div style={s.cardDesc}>{p.description || 'No description'}</div>
                  <div style={s.cardMeta}>
                    {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
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
  app: { display: 'flex', height: '100vh', background: '#0f0f0f', color: '#fff' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 28px', borderBottom: '1px solid #1a1a1a',
  },
  pageTitle: { fontSize: '18px', fontWeight: '600', color: '#fff', marginBottom: '3px' },
  pageSub: { fontSize: '13px', color: '#555' },
  btnNew: {
    background: '#a78bfa', color: '#fff', border: 'none',
    padding: '8px 16px', borderRadius: '8px', fontSize: '13px',
    fontWeight: '600', cursor: 'pointer',
  },
  content: { flex: 1, overflowY: 'auto', padding: '24px 28px' },
  empty: { color: '#555', fontSize: '14px' },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '80px 20px', gap: '10px',
  },
  emptyIcon: { fontSize: '40px', marginBottom: '8px' },
  emptyTitle: { fontSize: '16px', fontWeight: '600', color: '#fff' },
  emptySub: { fontSize: '13px', color: '#555', marginBottom: '8px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px',
  },
  card: {
    background: '#161616', border: '1px solid #1e1e1e',
    borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
  },
  cardTop: { height: '80px', display: 'flex', alignItems: 'center', padding: '16px' },
  cardDot: { width: '10px', height: '10px', borderRadius: '50%' },
  cardBody: { padding: '16px' },
  cardTitle: { fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '6px' },
  cardDesc: { fontSize: '12px', color: '#555', marginBottom: '12px', lineHeight: '1.5' },
  cardMeta: { fontSize: '11px', color: '#444' },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  modal: {
    background: '#161616', border: '1px solid #2a2a2a',
    borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '420px',
  },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' },
  modalTitle: { fontSize: '16px', fontWeight: '600', color: '#fff' },
  closeBtn: { color: '#555', cursor: 'pointer', fontSize: '14px' },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: '500' },
  input: {
    width: '100%', padding: '10px 14px', background: '#1e1e1e',
    border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff',
    fontSize: '14px', outline: 'none',
  },
  modalFooter: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' },
  btnCancel: {
    background: 'transparent', color: '#666', border: '1px solid #2a2a2a',
    padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
  },
}

export default Projects