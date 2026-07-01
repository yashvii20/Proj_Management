import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Sidebar from '../components/Sidebar'
import Comments from '../components/Comments'

const PeopleIcon = () => (
  <svg width='15' height='15' viewBox='0 0 24 24' fill='none'>
    <circle cx='9' cy='8' r='3' stroke='#777' strokeWidth='1.5' />
    <circle cx='16.5' cy='9.5' r='2.3' stroke='#777' strokeWidth='1.5' />
    <path d='M4 19c0-3 2.3-5.2 5-5.2s5 2.2 5 5.2' stroke='#777' strokeWidth='1.5' strokeLinecap='round' />
    <path d='M14.5 19c0-2.1 1.1-3.7 2.8-4.5' stroke='#777' strokeWidth='1.5' strokeLinecap='round' />
  </svg>
)

const StatusIcon = ({ status }) => {
  if (status === 'todo') return (
    <svg width='26' height='26' viewBox='0 0 24 24' fill='none'>
      <circle cx='12' cy='12' r='8.5' stroke='#333' strokeWidth='1.5' strokeDasharray='2.5 3.2' />
    </svg>
  )
  if (status === 'inprogress') return (
    <svg width='26' height='26' viewBox='0 0 24 24' fill='none'>
      <path d='M12 2 L13.8 10.2 L22 12 L13.8 13.8 L12 22 L10.2 13.8 L2 12 L10.2 10.2 Z' fill='#333' />
    </svg>
  )
  return (
    <svg width='26' height='26' viewBox='0 0 24 24' fill='none'>
      <path d='M4 12.5 L9.5 18 L20 6' stroke='#333' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  )
}

const emptyLabel = { todo: 'Nothing to do yet', inprogress: 'Nothing in motion', done: 'Nothing finished yet' }

function ProjectDetail() {
  const [currentUser, setCurrentUser] = useState(null)
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [profiles, setProfiles] = useState([])
  const [view, setView] = useState('kanban')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const [editingTitle, setEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editingDesc, setEditingDesc] = useState(false)
  const [editDesc, setEditDesc] = useState('')
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    load()
    fetchProject()
    fetchTasks()
    fetchProfiles()
  }, [id])

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*')
    setProfiles(data || [])
  }

  const fetchProject = async () => {
    const { data } = await supabase.from('projects').select('*').eq('id', id).single()
    setProject(data)
  }

  const fetchTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').eq('project_id', id).order('created_at', { ascending: false })
    setTasks(data || [])
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('tasks').insert({
      project_id: id,
      title,
      description,
      due_date: dueDate || null,
      assigned_to: assignedTo || null,
      created_by: user.id,
      status: 'todo',
    })
    setTitle('')
    setDescription('')
    setDueDate('')
    setAssignedTo('')
    setShowModal(false)
    setSaving(false)
    fetchTasks()
  }

  const updateStatus = async (taskId, status) => {
    await supabase.from('tasks').update({ status }).eq('id', taskId)
    fetchTasks()
    if (selectedTask && selectedTask.id === taskId) setSelectedTask({ ...selectedTask, status })
  }

  const handleOpenDetail = (task) => {
    setSelectedTask(task)
    setShowDetail(true)
  }

  const handleUpdateTitle = async () => {
    await supabase.from('tasks').update({ title: editTitle }).eq('id', selectedTask.id)
    setEditingTitle(false)
    setSelectedTask({ ...selectedTask, title: editTitle })
    fetchTasks()
  }

  const handleUpdateDesc = async () => {
    await supabase.from('tasks').update({ description: editDesc }).eq('id', selectedTask.id)
    setEditingDesc(false)
    setSelectedTask({ ...selectedTask, description: editDesc })
    fetchTasks()
  }

  const handleAssign = async (userId) => {
    await supabase.from('tasks').update({ assigned_to: userId || null }).eq('id', selectedTask.id)
    setSelectedTask({ ...selectedTask, assigned_to: userId || null })
    fetchTasks()
  }

  const handleDeleteTask = async (taskId) => {
    await supabase.from('tasks').delete().eq('id', taskId)
    setShowDetail(false)
    fetchTasks()
  }

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'
  const getProfileName = (userId) => profiles.find(p => p.id === userId)?.full_name || 'Unassigned'

  const statuses = ['todo', 'inprogress', 'done']
  const statusLabel = { todo: 'To do', inprogress: 'In progress', done: 'Done' }
  const statusColor = { todo: '#444', inprogress: '#a78bfa', done: '#4ade80' }
  const myTasks = filter === 'all' ? tasks : tasks.filter(t => t.assigned_to === currentUser?.id)

  return (
    <div style={s.app} className='app-shell'>
      <Sidebar />
      <div style={s.main}>
        {isMobile ? (
          <div style={m.topbar}>
            <div style={m.backRow} onClick={() => navigate('/projects')}>
              <span style={m.backChevron}>&#8249;</span> Projects
            </div>
            <div style={m.titleRow}>
              <div style={m.pageTitle}>{project?.name || '...'}</div>
              <div style={m.memberBadge}>
                <PeopleIcon />
                <span>{profiles.length}</span>
              </div>
            </div>
            <div style={m.controlsRow}>
              <div style={m.viewToggle}>
                <div style={{ ...m.toggleBtn, ...(view === 'kanban' ? m.toggleActive : {}) }} onClick={() => setView('kanban')}>Kanban</div>
                <div style={{ ...m.toggleBtn, ...(view === 'list' ? m.toggleActive : {}) }} onClick={() => setView('list')}>List</div>
              </div>
              <button style={m.btnNew} onClick={() => setShowModal(true)}>+ Add task</button>
            </div>
          </div>
        ) : (
          <div style={s.topbar}>
            <div>
              <div style={s.back} onClick={() => navigate('/projects')}>Back to Projects</div>
              <div style={s.pageTitle}>{project?.name || '...'}</div>
              <div style={s.pageSub}>{project?.description || ''}</div>
            </div>
            <div style={s.topRight}>
              <div style={s.viewToggle}>
                <div style={{ ...s.toggleBtn, ...(view === 'kanban' ? s.toggleActive : {}) }} onClick={() => setView('kanban')}>Kanban</div>
                <div style={{ ...s.toggleBtn, ...(view === 'list' ? s.toggleActive : {}) }} onClick={() => setView('list')}>List</div>
              </div>
              <button style={s.btnNew} onClick={() => setShowModal(true)}>+ Add task</button>
            </div>
          </div>
        )}

        {isMobile ? (
          <div style={m.filterBar}>
            <div style={{ ...m.filterTab, ...(filter === 'all' ? m.filterTabActive : {}) }} onClick={() => setFilter('all')}>All tasks</div>
            <div style={{ ...m.filterTab, ...(filter === 'mine' ? m.filterTabActive : {}) }} onClick={() => setFilter('mine')}>My tasks</div>
          </div>
        ) : (
          <div style={s.filterBar}>
            <div style={{ ...s.filterBtn, ...(filter === 'all' ? s.filterActive : {}) }} onClick={() => setFilter('all')}>All tasks</div>
            <div style={{ ...s.filterBtn, ...(filter === 'mine' ? s.filterActive : {}) }} onClick={() => setFilter('mine')}>My tasks</div>
          </div>
        )}

        <div style={isMobile ? m.content : s.content}>
          {view === 'kanban' ? (
            <div style={isMobile ? m.kanban : s.kanban}>
              {statuses.map(status => (
                <div key={status} style={isMobile ? m.column : s.column}>
                  <div style={s.colHeader}>
                    <div style={{ ...s.colDot, background: statusColor[status] }} />
                    <span style={s.colTitle}>{statusLabel[status]}</span>
                    <span style={s.colCount}>{myTasks.filter(t => t.status === status).length}</span>
                  </div>
                  <div style={s.colCards}>
                    {myTasks.filter(t => t.status === status).map(task => (
                      <div key={task.id} style={s.taskCard} onClick={() => handleOpenDetail(task)}>
                        <div style={s.taskTitle}>{task.title}</div>
                        {task.description && <div style={s.taskDesc}>{task.description}</div>}
                        <div style={s.taskFooter}>
                          {task.due_date && <div style={s.taskDue}>{new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>}
                          {task.assigned_to && <div style={s.taskAssignee}>{getInitials(getProfileName(task.assigned_to))}</div>}
                        </div>
                      </div>
                    ))}
                    {myTasks.filter(t => t.status === status).length === 0 && (
                      isMobile ? (
                        <div style={m.colEmpty}>
                          <StatusIcon status={status} />
                          <div style={m.colEmptyText}>{emptyLabel[status]}</div>
                        </div>
                      ) : (
                        <div style={s.colEmpty}>No tasks</div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={s.list}>
              {myTasks.length === 0 && <div style={s.emptyList}>No tasks yet - add one above</div>}
              {myTasks.map(task => (
                <div key={task.id} style={s.listRow} onClick={() => handleOpenDetail(task)}>
                  <div style={{ ...s.listCheck, ...(task.status === 'done' ? s.listCheckDone : {}) }} onClick={e => { e.stopPropagation(); updateStatus(task.id, task.status === 'done' ? 'todo' : 'done') }} />
                  <div style={s.listText}>
                    <div style={{ ...s.listTitle, ...(task.status === 'done' ? s.strikethrough : {}) }}>{task.title}</div>
                    {task.description && <div style={s.listDesc}>{task.description}</div>}
                  </div>
                  {task.assigned_to && <div style={s.taskAssignee}>{getInitials(getProfileName(task.assigned_to))}</div>}
                  <div style={{ ...s.listBadge, color: statusColor[task.status], borderColor: statusColor[task.status] + '44' }}>{statusLabel[task.status]}</div>
                  {task.due_date && <div style={s.listDue}>{new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <div style={s.modalTitle}>Add task</div>
              <div style={s.closeBtn} onClick={() => setShowModal(false)}>x</div>
            </div>
            <form onSubmit={handleCreate}>
              <div style={s.field}><label style={s.label}>Task title</label><input style={s.input} placeholder='Finalise floor plan' value={title} onChange={e => setTitle(e.target.value)} required autoFocus /></div>
              <div style={s.field}><label style={s.label}>Description (optional)</label><textarea style={{ ...s.input, height: '70px', resize: 'vertical' }} placeholder='Add details...' value={description} onChange={e => setDescription(e.target.value)} /></div>
              <div style={s.field}><label style={s.label}>Assign to (optional)</label><select style={s.input} value={assignedTo} onChange={e => setAssignedTo(e.target.value)}><option value=''>Unassigned</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div>
              <div style={s.field}><label style={s.label}>Due date (optional)</label><input style={s.input} type='date' value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
              <div style={s.modalFooter}>
                <button type='button' style={s.btnCancel} onClick={() => setShowModal(false)}>Cancel</button>
                <button type='submit' style={s.btnNew} disabled={saving}>{saving ? 'Adding...' : 'Add task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetail && selectedTask && (
        <div style={s.overlay}>
          <div style={s.detailModal}>
            <div style={s.detailHeader}>
              <button style={s.closeBtnFixed} onClick={() => { setShowDetail(false); setEditingTitle(false); setEditingDesc(false) }}>x</button>
              {editingTitle ? (
                <div style={s.editRow}>
                  <input style={{ ...s.input, flex: 1 }} value={editTitle} onChange={e => setEditTitle(e.target.value)} autoFocus />
                  <button style={s.btnSm} onClick={handleUpdateTitle}>Save</button>
                  <button style={s.btnSmCancel} onClick={() => setEditingTitle(false)}>Cancel</button>
                </div>
              ) : (
                <div style={s.detailTitleRow}>
                  <div style={s.detailTitle}>{selectedTask.title}</div>
                  <button style={s.btnSm} onClick={() => { setEditTitle(selectedTask.title); setEditingTitle(true) }}>Edit</button>
                </div>
              )}
            </div>
            <div style={s.detailBody}>
              <div style={s.detailRow}>
                <div style={s.detailLabel}>Status</div>
                <select style={s.statusSelectBig} value={selectedTask.status} onChange={e => updateStatus(selectedTask.id, e.target.value)}>
                  <option value='todo'>To do</option>
                  <option value='inprogress'>In progress</option>
                  <option value='done'>Done</option>
                </select>
              </div>
              <div style={s.detailRow}>
                <div style={s.detailLabel}>Assigned to</div>
                <select style={s.statusSelectBig} value={selectedTask.assigned_to || ''} onChange={e => handleAssign(e.target.value)}>
                  <option value=''>Unassigned</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div style={s.detailRow}>
                <div style={s.detailLabel}>Due date</div>
                <div style={s.detailValue}>{selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No due date'}</div>
              </div>
              <div style={s.detailRow}>
                <div style={s.detailLabelRow}>
                  <div style={s.detailLabel}>Description</div>
                  {!editingDesc && <button style={s.btnSmTiny} onClick={() => { setEditDesc(selectedTask.description || ''); setEditingDesc(true) }}>Edit</button>}
                </div>
                {editingDesc ? (
                  <div>
                    <textarea style={{ ...s.input, height: '80px', resize: 'vertical' }} value={editDesc} onChange={e => setEditDesc(e.target.value)} autoFocus />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button style={s.btnSm} onClick={handleUpdateDesc}>Save</button>
                      <button style={s.btnSmCancel} onClick={() => setEditingDesc(false)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={s.detailValue}>{selectedTask.description || 'No description'}</div>
                )}
              </div>
              <Comments taskId={selectedTask.id} />
              <div style={s.detailFooter}>
                <button style={s.btnDelete} onClick={() => handleDeleteTask(selectedTask.id)}>Delete task</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  app: { display: 'flex', height: '100vh', background: '#0f0f0f', color: '#fff' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid #1a1a1a' },
  back: { fontSize: '12px', color: '#555', cursor: 'pointer', marginBottom: '6px' },
  pageTitle: { fontSize: '18px', fontWeight: '600', color: '#fff', marginBottom: '3px' },
  pageSub: { fontSize: '13px', color: '#555' },
  topRight: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' },
  viewToggle: { display: 'flex', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #2a2a2a', overflow: 'hidden' },
  toggleBtn: { padding: '6px 14px', fontSize: '12px', color: '#555', cursor: 'pointer' },
  toggleActive: { background: '#2a2a2a', color: '#fff' },
  btnNew: { background: '#a78bfa', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  filterBar: { display: 'flex', gap: '8px', padding: '12px 28px', borderBottom: '1px solid #1a1a1a' },
  filterBtn: { padding: '5px 14px', borderRadius: '20px', fontSize: '12px', color: '#555', cursor: 'pointer', border: '1px solid transparent' },
  filterActive: { border: '1px solid #2a2a2a', color: '#fff', background: '#1e1e1e' },
  content: { flex: 1, overflowY: 'auto', padding: '20px 28px' },
  kanban: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', alignItems: 'start' },
  column: { background: '#161616', borderRadius: '10px', border: '1px solid #1e1e1e', padding: '14px' },
  colHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' },
  colDot: { width: '8px', height: '8px', borderRadius: '50%' },
  colTitle: { fontSize: '13px', fontWeight: '600', color: '#ccc', flex: 1 },
  colCount: { fontSize: '11px', color: '#444', background: '#1e1e1e', padding: '2px 7px', borderRadius: '10px' },
  colCards: { display: 'flex', flexDirection: 'column', gap: '8px' },
  colEmpty: { fontSize: '12px', color: '#333', padding: '12px 0', textAlign: 'center' },
  taskCard: { background: '#1a1a1a', border: '1px solid #222', borderRadius: '8px', padding: '12px', cursor: 'pointer' },
  taskTitle: { fontSize: '13px', fontWeight: '500', color: '#ddd', marginBottom: '4px' },
  taskDesc: { fontSize: '12px', color: '#555', marginBottom: '8px', lineHeight: '1.5' },
  taskFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  taskDue: { fontSize: '11px', color: '#555' },
  taskAssignee: { width: '22px', height: '22px', borderRadius: '50%', background: '#2d1f4e', color: '#a78bfa', fontSize: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  emptyList: { fontSize: '13px', color: '#444', padding: '40px 0', textAlign: 'center' },
  listRow: { display: 'flex', alignItems: 'center', gap: '12px', background: '#161616', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '12px 16px', cursor: 'pointer' },
  listCheck: { width: '18px', height: '18px', borderRadius: '5px', border: '1.5px solid #333', flexShrink: 0, cursor: 'pointer' },
  listCheckDone: { background: '#a78bfa', borderColor: '#a78bfa' },
  listText: { flex: 1 },
  listTitle: { fontSize: '13px', color: '#ddd', fontWeight: '500' },
  listDesc: { fontSize: '12px', color: '#555', marginTop: '2px' },
  strikethrough: { textDecoration: 'line-through', color: '#444' },
  listBadge: { fontSize: '11px', padding: '3px 10px', borderRadius: '20px', border: '1px solid', flexShrink: 0 },
  listDue: { fontSize: '11px', color: '#555', flexShrink: 0 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#161616', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '420px' },
  detailModal: { background: '#161616', border: '1px solid #2a2a2a', borderRadius: '14px', width: '100%', maxWidth: '520px', maxHeight: '88vh', overflowY: 'auto' },
  detailHeader: { padding: '20px 24px', borderBottom: '1px solid #1e1e1e', position: 'relative' },
  closeBtnFixed: { position: 'absolute', top: '16px', right: '16px', background: '#2a2a2a', color: '#888', border: '1px solid #333', width: '26px', height: '26px', borderRadius: '50%', fontSize: '13px', cursor: 'pointer' },
  detailTitleRow: { display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '30px' },
  detailTitle: { fontSize: '17px', fontWeight: '600', color: '#fff', flex: 1 },
  editRow: { display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '30px' },
  detailBody: { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' },
  detailRow: {},
  detailLabel: { fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', fontWeight: '600' },
  detailLabelRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' },
  detailValue: { fontSize: '13px', color: '#ccc', lineHeight: '1.6' },
  statusSelectBig: { width: '100%', padding: '9px 12px', background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer' },
  detailFooter: { paddingTop: '12px', borderTop: '1px solid #1e1e1e' },
  btnDelete: { background: 'transparent', color: '#f87171', border: '1px solid #3a1f1f', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' },
  modalTitle: { fontSize: '16px', fontWeight: '600', color: '#fff' },
  closeBtn: { color: '#555', cursor: 'pointer', fontSize: '14px' },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: '500' },
  input: { width: '100%', padding: '10px 14px', background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' },
  modalFooter: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' },
  btnCancel: { background: 'transparent', color: '#666', border: '1px solid #2a2a2a', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' },
  btnSm: { background: '#a78bfa', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
  btnSmTiny: { background: 'transparent', color: '#a78bfa', border: '1px solid #2a2a2a', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' },
  btnSmCancel: { background: 'transparent', color: '#666', border: '1px solid #2a2a2a', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
}

const m = {
  topbar: { padding: '16px 16px 14px', borderBottom: '1px solid #1a1a1a' },
  backRow: { display: 'flex', alignItems: 'center', gap: '2px', fontSize: '13px', color: '#666', cursor: 'pointer', marginBottom: '10px' },
  backChevron: { fontSize: '17px', lineHeight: 1, marginRight: '2px' },
  titleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  pageTitle: { fontSize: '24px', fontWeight: '700', color: '#fff' },
  memberBadge: { display: 'flex', alignItems: 'center', gap: '5px', color: '#777', fontSize: '13px' },
  controlsRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  viewToggle: { display: 'flex', background: '#1c1c1c', borderRadius: '10px', padding: '3px', flex: 1 },
  toggleBtn: { flex: 1, textAlign: 'center', padding: '9px 0', fontSize: '13px', fontWeight: '600', color: '#777', cursor: 'pointer', borderRadius: '8px' },
  toggleActive: { background: '#fff', color: '#111' },
  btnNew: { background: '#a78bfa', color: '#fff', border: 'none', padding: '0 18px', height: '42px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' },
  filterBar: { display: 'flex', gap: '20px', padding: '14px 16px', borderBottom: '1px solid #1a1a1a' },
  filterTab: { fontSize: '14px', color: '#666', cursor: 'pointer', paddingBottom: '4px', fontWeight: '500' },
  filterTabActive: { color: '#fff', fontWeight: '700' },
  content: { flex: 1, overflowY: 'auto', padding: '16px' },
  kanban: { display: 'flex', flexDirection: 'column', gap: '16px' },
  column: { background: '#161616', borderRadius: '12px', border: '1px solid #1e1e1e', padding: '16px' },
  colEmpty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '30px 0' },
  colEmptyText: { fontSize: '13px', color: '#4a4a4a' },
}

export default ProjectDetail