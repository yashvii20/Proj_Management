import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import { supabase } from '../supabase'
import Sidebar from '../components/Sidebar'
import Comments from '../components/Comments'
import ActivityFeed from '../pages/ActivityFeed'
import { logActivity } from '../utils/logActivity'
import { theme as t } from '../theme'


const PeopleIcon = () => (
  <svg width='15' height='15' viewBox='0 0 24 24' fill='none'>
    <circle cx='9' cy='8' r='3' stroke={t.color.muted} strokeWidth='1.5' />
    <circle cx='16.5' cy='9.5' r='2.3' stroke={t.color.muted} strokeWidth='1.5' />
    <path d='M4 19c0-3 2.3-5.2 5-5.2s5 2.2 5 5.2' stroke={t.color.muted} strokeWidth='1.5' strokeLinecap='round' />
    <path d='M14.5 19c0-2.1 1.1-3.7 2.8-4.5' stroke={t.color.muted} strokeWidth='1.5' strokeLinecap='round' />
  </svg>
)

const DownloadIcon = () => (
  <svg width='15' height='15' viewBox='0 0 24 24' fill='none'>
    <path d='M12 3v12' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' />
    <path d='M7 10l5 5 5-5' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' />
    <path d='M4 19h16' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' />
  </svg>
)

const StatusIcon = ({ status }) => {
  if (status === 'todo') return (
    <svg width='26' height='26' viewBox='0 0 24 24' fill='none'>
      <circle cx='12' cy='12' r='8.5' stroke={t.color.border} strokeWidth='1.5' strokeDasharray='2.5 3.2' />
    </svg>
  )
  if (status === 'inprogress') return (
    <svg width='26' height='26' viewBox='0 0 24 24' fill='none'>
      <path d='M12 2 L13.8 10.2 L22 12 L13.8 13.8 L12 22 L10.2 13.8 L2 12 L10.2 10.2 Z' fill={t.color.border} />
    </svg>
  )
  return (
    <svg width='26' height='26' viewBox='0 0 24 24' fill='none'>
      <path d='M4 12.5 L9.5 18 L20 6' stroke={t.color.border} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
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
  const [exporting, setExporting] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [draggedTaskId, setDraggedTaskId] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)

  const flashSaved = () => {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

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

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'
  const getProfileName = (userId) => profiles.find(p => p.id === userId)?.full_name || 'Unassigned'

  const statuses = ['todo', 'inprogress', 'done']
  const statusLabel = { todo: 'To do', inprogress: 'In progress', done: 'Done' }
  const statusColor = { todo: t.color.muted, inprogress: '#8E7BA0', done: '#5B8C5A' }

  const handleExportPDF = () => {
    setExporting(true)
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const marginX = 14
      let y = 20

      doc.setFontSize(18)
      doc.setTextColor(20)
      doc.text(project?.name || 'Project summary', marginX, y)
      y += 8

      if (project?.description) {
        doc.setFontSize(10)
        doc.setTextColor(110)
        const descLines = doc.splitTextToSize(project.description, pageWidth - marginX * 2)
        doc.text(descLines, marginX, y)
        y += descLines.length * 5 + 4
      }

      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text('Exported ' + new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), marginX, y)
      y += 10
      doc.setDrawColor(230)
      doc.line(marginX, y, pageWidth - marginX, y)
      y += 10

      doc.setFontSize(13)
      doc.setTextColor(20)
      doc.text('Summary', marginX, y)
      y += 8

      doc.setFontSize(10)
      doc.setTextColor(60)
      statuses.forEach(status => {
        const count = tasks.filter(t2 => t2.status === status).length
        doc.text(statusLabel[status] + ':  ' + count, marginX, y)
        y += 6
      })
      doc.text('Total tasks:  ' + tasks.length, marginX, y)
      y += 6
      doc.text('Team members:  ' + profiles.length, marginX, y)
      y += 12

      doc.setFontSize(13)
      doc.setTextColor(20)
      doc.text('Tasks', marginX, y)
      y += 8

      if (tasks.length === 0) {
        doc.setFontSize(10)
        doc.setTextColor(140)
        doc.text('No tasks yet.', marginX, y)
        y += 6
      }

      tasks.forEach(task => {
        if (y > 275) { doc.addPage(); y = 20 }
        doc.setFontSize(10.5)
        doc.setTextColor(20)
        const titleLines = doc.splitTextToSize(task.title, pageWidth - marginX * 2 - 10)
        doc.text(titleLines, marginX, y)
        y += titleLines.length * 5.5

        doc.setFontSize(9)
        doc.setTextColor(120)
        const assignee = getProfileName(task.assigned_to)
        const due = task.due_date ? new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No due date'
        const metaLine = statusLabel[task.status] + '   |   ' + assignee + '   |   ' + due
        doc.text(metaLine, marginX, y)
        y += 9
      })

      const fileSafeName = (project?.name || 'project').replace(/[^a-z0-9]+/gi, '_').toLowerCase()
      doc.save(fileSafeName + '_summary.pdf')

      logActivity({
        projectId: id,
        actorId: currentUser?.id,
        actorName: getProfileName(currentUser?.id),
        action: 'project_exported',
        entityType: 'project',
        entityId: id,
        message: 'exported a PDF summary of this project',
      })
    } finally {
      setExporting(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const taskTitle = title
    await supabase.from('tasks').insert({
      project_id: id,
      title,
      description,
      due_date: dueDate || null,
      assigned_to: assignedTo || null,
      created_by: user.id,
      status: 'todo',
    })
    logActivity({
      projectId: id,
      actorId: user.id,
      actorName: getProfileName(user.id),
      action: 'task_created',
      entityType: 'task',
      message: `created task "${taskTitle}"`,
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
    const task = tasks.find(t2 => t2.id === taskId)
    if (!task || task.status === status) return

    // Optimistic UI update
    setTasks(prevTasks => prevTasks.map(t2 => t2.id === taskId ? { ...t2, status } : t2))
    if (selectedTask && selectedTask.id === taskId) setSelectedTask({ ...selectedTask, status })
    flashSaved()

    const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId)
    if (error) {
      fetchTasks() // revert if request failed
      return
    }

    logActivity({
      projectId: id,
      actorId: currentUser?.id,
      actorName: getProfileName(currentUser?.id),
      action: 'task_status_changed',
      entityType: 'task',
      entityId: taskId,
      message: `moved "${task.title}" to ${statusLabel[status]}`,
    })
  }

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedTaskId(taskId)
  }

  const handleDragEnd = () => {
    setDraggedTaskId(null)
    setDragOverColumn(null)
  }

  const handleDragOver = (e, status) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverColumn !== status) {
      setDragOverColumn(status)
    }
  }

  const handleDragLeave = (e, status) => {
    e.preventDefault()
    if (dragOverColumn === status) {
      setDragOverColumn(null)
    }
  }

  const handleDrop = (e, targetStatus) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId
    if (taskId) {
      updateStatus(taskId, targetStatus)
    }
    setDraggedTaskId(null)
    setDragOverColumn(null)
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
    flashSaved()
  }

  const handleUpdateDesc = async () => {
    await supabase.from('tasks').update({ description: editDesc }).eq('id', selectedTask.id)
    setEditingDesc(false)
    setSelectedTask({ ...selectedTask, description: editDesc })
    fetchTasks()
    flashSaved()
  }

  const handleAssign = async (userId) => {
    await supabase.from('tasks').update({ assigned_to: userId || null }).eq('id', selectedTask.id)
    logActivity({
      projectId: id,
      actorId: currentUser?.id,
      actorName: getProfileName(currentUser?.id),
      action: 'task_assigned',
      entityType: 'task',
      entityId: selectedTask.id,
      message: userId ? `assigned "${selectedTask.title}" to ${getProfileName(userId)}` : `unassigned "${selectedTask.title}"`,
    })
    setSelectedTask({ ...selectedTask, assigned_to: userId || null })
    fetchTasks()
    flashSaved()
  }

  const handleDeleteTask = async (taskId) => {
    const task = tasks.find(t2 => t2.id === taskId)
    await supabase.from('tasks').delete().eq('id', taskId)
    if (task) {
      logActivity({
        projectId: id,
        actorId: currentUser?.id,
        actorName: getProfileName(currentUser?.id),
        action: 'task_deleted',
        entityType: 'task',
        entityId: taskId,
        message: `deleted task "${task.title}"`,
      })
    }
    setShowDetail(false)
    fetchTasks()
  }

  const myTasks = filter === 'all' ? tasks : tasks.filter(t2 => t2.assigned_to === currentUser?.id)

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
              <div style={m.headerRight}>
                <div style={m.memberBadge}>
                  <PeopleIcon />
                  <span>{profiles.length}</span>
                </div>
                <button style={m.exportIconBtn} onClick={handleExportPDF} disabled={exporting} title='Export PDF summary'>
                  <DownloadIcon />
                </button>
              </div>
            </div>
            <div style={m.controlsRow}>
              <div style={m.viewToggle}>
                <div style={{ ...m.toggleBtn, ...(view === 'kanban' ? m.toggleActive : {}) }} onClick={() => setView('kanban')}>Kanban</div>
                <div style={{ ...m.toggleBtn, ...(view === 'list' ? m.toggleActive : {}) }} onClick={() => setView('list')}>List</div>
                <div style={{ ...m.toggleBtn, ...(view === 'activity' ? m.toggleActive : {}) }} onClick={() => setView('activity')}>Activity</div>
              </div>
              <button style={m.btnNew} onClick={() => setShowModal(true)}>+ Add task</button>
            </div>
          </div>
        ) : (
          <div style={s.topbar}>
            <div>
              <div style={s.back} onClick={() => navigate('/projects')}>&larr; Back to projects</div>
              <div style={s.pageTitle}>{project?.name || '...'}</div>
              <div style={s.pageSub}>{project?.description || ''}</div>
            </div>
            <div style={s.topRight}>
              <div style={s.viewToggle}>
                <div style={{ ...s.toggleBtn, ...(view === 'kanban' ? s.toggleActive : {}) }} onClick={() => setView('kanban')}>Kanban</div>
                <div style={{ ...s.toggleBtn, ...(view === 'list' ? s.toggleActive : {}) }} onClick={() => setView('list')}>List</div>
                <div style={{ ...s.toggleBtn, ...(view === 'activity' ? s.toggleActive : {}) }} onClick={() => setView('activity')}>Activity</div>
              </div>
              <button style={s.btnExport} onClick={handleExportPDF} disabled={exporting}>
                <DownloadIcon /> {exporting ? 'Exporting...' : 'Export'}
              </button>
              <button style={s.btnNew} onClick={() => setShowModal(true)}>+ Add task</button>
            </div>
          </div>
        )}

        {view !== 'activity' && (
          isMobile ? (
            <div style={m.filterBar}>
              <div style={{ ...m.filterTab, ...(filter === 'all' ? m.filterTabActive : {}) }} onClick={() => setFilter('all')}>All tasks</div>
              <div style={{ ...m.filterTab, ...(filter === 'mine' ? m.filterTabActive : {}) }} onClick={() => setFilter('mine')}>My tasks</div>
            </div>
          ) : (
            <div style={s.filterBar}>
              <div style={s.filterPill}>
                <div style={{ ...s.filterBtn, ...(filter === 'all' ? s.filterActive : {}) }} onClick={() => setFilter('all')}>All tasks</div>
                <div style={{ ...s.filterBtn, ...(filter === 'mine' ? s.filterActive : {}) }} onClick={() => setFilter('mine')}>My tasks</div>
              </div>
            </div>
          )
        )}

        <div style={isMobile ? m.content : s.content}>
          {view === 'activity' ? (
            <ActivityFeed projectId={id} embedded />
          ) : view === 'kanban' ? (
            <div style={isMobile ? m.kanban : s.kanban}>
              {statuses.map(status => {
                const isTargeted = dragOverColumn === status
                const colBaseStyle = isMobile ? m.column : s.column
                const colDynamicStyle = {
                  ...colBaseStyle,
                  transition: 'all 0.2s ease',
                  ...(isTargeted ? {
                    borderColor: t.color.accent,
                    background: 'rgba(176, 141, 87, 0.07)',
                    boxShadow: '0 0 0 2px rgba(176, 141, 87, 0.25)',
                  } : {}),
                }

                return (
                  <div
                    key={status}
                    style={colDynamicStyle}
                    onDragOver={e => handleDragOver(e, status)}
                    onDragLeave={e => handleDragLeave(e, status)}
                    onDrop={e => handleDrop(e, status)}
                  >
                    <div style={s.colHeader}>
                      <div style={{ ...s.colDot, background: statusColor[status] }} />
                      <span style={s.colTitle}>{statusLabel[status]}</span>
                      <span style={s.colCount}>{myTasks.filter(t2 => t2.status === status).length}</span>
                    </div>
                    <div style={{ ...s.colCards, minHeight: '80px' }}>
                      {myTasks.filter(t2 => t2.status === status).map(task => {
                        const isDragging = draggedTaskId === task.id
                        const cardDynamicStyle = {
                          ...s.taskCard,
                          cursor: 'grab',
                          userSelect: 'none',
                          transition: 'transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease',
                          ...(isDragging ? {
                            opacity: 0.35,
                            transform: 'scale(0.97)',
                            boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                          } : {}),
                        }

                        return (
                          <div
                            key={task.id}
                            style={cardDynamicStyle}
                            draggable
                            onDragStart={e => handleDragStart(e, task.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => handleOpenDetail(task)}
                          >
                            <div style={s.taskTitle}>{task.title}</div>
                            {task.description && <div style={s.taskDesc}>{task.description}</div>}
                            <div style={s.taskFooter}>
                              {task.due_date && <div style={s.taskDue}>{new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>}
                              {task.assigned_to && <div style={s.taskAssignee}>{getInitials(getProfileName(task.assigned_to))}</div>}
                            </div>
                          </div>
                        )
                      })}
                      {myTasks.filter(t2 => t2.status === status).length === 0 && (
                        isMobile ? (
                          <div style={m.colEmpty}>
                            <StatusIcon status={status} />
                            <div style={m.colEmptyText}>{emptyLabel[status]}</div>
                          </div>
                        ) : (
                          <div style={s.colEmpty}>No tasks (Drop here)</div>
                        )
                      )}
                    </div>
                  </div>
                )
              })}
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
                  <div style={{ ...s.listBadge, color: statusColor[task.status], borderColor: statusColor[task.status] + '55' }}>{statusLabel[task.status]}</div>
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
              <div style={s.closeBtn} onClick={() => setShowModal(false)}>✕</div>
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
              <button style={s.closeBtnFixed} onClick={() => { setShowDetail(false); setEditingTitle(false); setEditingDesc(false) }}>✕</button>
              {savedFlash && <div style={s.savedFlash}>✓ Saved</div>}
              {editingTitle ? (
                <div style={s.editRow}>
                  <input style={{ ...s.input, flex: 1 }} value={editTitle} onChange={e => setEditTitle(e.target.value)} autoFocus />
                  <button style={s.btnSm} onClick={handleUpdateTitle}>Save</button>
                  <button style={s.btnSmCancel} onClick={() => setEditingTitle(false)}>Cancel</button>
                </div>
              ) : (
                <div style={s.detailTitleRow}>
                  <div style={s.detailTitle}>{selectedTask.title}</div>
                  <button style={s.pencilBtn} title="Edit title" onClick={() => { setEditTitle(selectedTask.title); setEditingTitle(true) }}>✎</button>
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
  app: { display: 'flex', height: '100vh', background: t.color.bg, color: t.color.ink, fontFamily: t.font.body },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '28px 40px 18px' },
  back: { fontSize: '13px', color: t.color.muted, cursor: 'pointer', marginBottom: '10px' },
  pageTitle: { fontFamily: t.font.display, fontSize: '30px', fontWeight: '700', color: t.color.ink, marginBottom: '4px', lineHeight: '1.15' },
  pageSub: { fontSize: '14px', color: t.color.muted },
  topRight: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' },
  viewToggle: { display: 'flex', background: t.color.surface, borderRadius: t.radius.sm, border: `1px solid ${t.color.border}`, overflow: 'hidden' },
  toggleBtn: { padding: '9px 16px', fontSize: '13px', fontWeight: '600', color: t.color.muted, cursor: 'pointer' },
  toggleActive: { background: t.color.primary, color: t.color.primaryText },
  btnNew: { background: t.color.primary, color: t.color.primaryText, border: 'none', padding: '10px 18px', borderRadius: t.radius.sm, fontSize: '13px', fontWeight: '600', fontFamily: t.font.body, cursor: 'pointer' },
  btnExport: { display: 'flex', alignItems: 'center', gap: '6px', background: t.color.surface, color: t.color.ink, border: `1px solid ${t.color.border}`, padding: '9px 16px', borderRadius: t.radius.sm, fontSize: '13px', fontWeight: '600', fontFamily: t.font.body, cursor: 'pointer' },
  filterBar: { display: 'flex', padding: '4px 40px 20px' },
  filterPill: { display: 'flex', background: t.color.surface, border: `1px solid ${t.color.border}`, borderRadius: '999px', padding: '4px' },
  filterBtn: { padding: '8px 18px', borderRadius: '999px', fontSize: '13px', fontWeight: '600', color: t.color.muted, cursor: 'pointer' },
  filterActive: { background: t.color.primary, color: t.color.primaryText },
  content: { flex: 1, overflowY: 'auto', padding: '0 40px 40px' },
  kanban: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', alignItems: 'start' },
  column: { background: t.color.surface, borderRadius: t.radius.md, border: `1px solid ${t.color.border}`, padding: '16px' },
  colHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' },
  colDot: { width: '8px', height: '8px', borderRadius: '50%' },
  colTitle: { fontSize: '14px', fontWeight: '700', color: t.color.ink, flex: 1 },
  colCount: { fontSize: '12px', color: t.color.muted, background: t.color.bg, padding: '2px 9px', borderRadius: '10px' },
  colCards: { display: 'flex', flexDirection: 'column', gap: '10px' },
  colEmpty: { fontSize: '13px', color: t.color.muted, padding: '16px 0', textAlign: 'center' },
  taskCard: { background: t.color.bg, border: `1px solid ${t.color.border}`, borderRadius: t.radius.sm, padding: '14px', cursor: 'pointer' },
  taskTitle: { fontSize: '14px', fontWeight: '700', color: t.color.ink, marginBottom: '4px' },
  taskDesc: { fontSize: '12px', color: t.color.muted, marginBottom: '10px', lineHeight: '1.5' },
  taskFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  taskDue: { fontSize: '11px', color: t.color.muted },
  taskAssignee: { width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(176,141,87,0.2)', color: t.color.accent, fontSize: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  emptyList: { fontSize: '13px', color: t.color.muted, padding: '40px 0', textAlign: 'center' },
  listRow: { display: 'flex', alignItems: 'center', gap: '14px', background: t.color.surface, border: `1px solid ${t.color.border}`, borderRadius: t.radius.md, padding: '14px 18px', cursor: 'pointer' },
  listCheck: { width: '19px', height: '19px', borderRadius: '5px', border: `1.5px solid ${t.color.border}`, flexShrink: 0, cursor: 'pointer' },
  listCheckDone: { background: t.color.accent, borderColor: t.color.accent },
  listText: { flex: 1 },
  listTitle: { fontSize: '14px', color: t.color.ink, fontWeight: '600' },
  listDesc: { fontSize: '12px', color: t.color.muted, marginTop: '2px' },
  strikethrough: { textDecoration: 'line-through', color: t.color.muted },
  listBadge: { fontSize: '11px', padding: '3px 10px', borderRadius: '20px', border: '1px solid', flexShrink: 0, fontWeight: '600' },
  listDue: { fontSize: '11px', color: t.color.muted, flexShrink: 0 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(30,34,51,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px', boxSizing: 'border-box' },
  modal: { background: t.color.surface, border: `1px solid ${t.color.border}`, borderRadius: t.radius.lg, padding: '28px', width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(30,34,51,0.18)', boxSizing: 'border-box' },
  detailModal: { background: t.color.surface, border: `1px solid ${t.color.border}`, borderRadius: t.radius.lg, width: '100%', maxWidth: '540px', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(30,34,51,0.18)', boxSizing: 'border-box' },
  detailHeader: { padding: '24px 28px', borderBottom: `1px solid ${t.color.border}`, position: 'relative' },
  savedFlash: {
    position: 'absolute', top: '18px', right: '54px',
    background: 'rgba(91,140,90,0.14)', color: '#5B8C5A',
    fontSize: '12px', fontWeight: '700', padding: '5px 12px',
    borderRadius: '999px', border: '1px solid rgba(91,140,90,0.3)',
  },
  pencilBtn: {
    background: 'transparent', color: t.color.muted, border: `1px solid ${t.color.border}`,
    width: '30px', height: '30px', borderRadius: '50%', fontSize: '13px',
    cursor: 'pointer', flexShrink: 0,
  },
  closeBtnFixed: { position: 'absolute', top: '18px', right: '18px', background: t.color.bg, color: t.color.muted, border: `1px solid ${t.color.border}`, width: '28px', height: '28px', borderRadius: '50%', fontSize: '13px', cursor: 'pointer' },
  detailTitleRow: { display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '30px' },
  detailTitle: { fontFamily: t.font.display, fontSize: '20px', fontWeight: '700', color: t.color.ink, flex: 1 },
  editRow: { display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '30px' },
  detailBody: { padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' },
  detailRow: {},
  detailLabel: { fontSize: '11px', color: t.color.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', fontWeight: '700' },
  detailLabelRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' },
  detailValue: { fontSize: '14px', color: t.color.ink, lineHeight: '1.6' },
  statusSelectBig: { width: '100%', padding: '10px 12px', background: t.color.bg, border: `1px solid ${t.color.border}`, borderRadius: t.radius.sm, color: t.color.ink, fontSize: '13px', fontFamily: t.font.body, cursor: 'pointer' },
  detailFooter: { paddingTop: '14px', borderTop: `1px solid ${t.color.border}` },
  btnDelete: { background: t.color.dangerBg, color: t.color.danger, border: `1px solid ${t.color.dangerBorder}`, padding: '9px 16px', borderRadius: t.radius.sm, fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' },
  modalTitle: { fontFamily: t.font.display, fontSize: '22px', fontWeight: '700', color: t.color.ink },
  closeBtn: { color: t.color.muted, cursor: 'pointer', fontSize: '16px' },
  field: { marginBottom: '18px' },
  label: { display: 'block', fontSize: '14px', color: t.color.ink, marginBottom: '8px', fontWeight: '600' },
  input: { width: '100%', padding: '11px 14px', background: t.color.surface, border: `1px solid ${t.color.border}`, borderRadius: t.radius.sm, color: t.color.ink, fontSize: '14px', fontFamily: t.font.body, outline: 'none', boxSizing: 'border-box' },
  modalFooter: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '22px' },
  btnCancel: { background: t.color.surface, color: t.color.ink, border: `1px solid ${t.color.border}`, padding: '11px 18px', borderRadius: t.radius.sm, fontSize: '13px', fontWeight: '600', fontFamily: t.font.body, cursor: 'pointer' },
  btnSm: { background: t.color.primary, color: t.color.primaryText, border: 'none', padding: '6px 14px', borderRadius: t.radius.sm, fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  btnSmTiny: { background: 'transparent', color: t.color.accent, border: `1px solid ${t.color.border}`, padding: '3px 10px', borderRadius: t.radius.sm, fontSize: '11px', fontWeight: '600', cursor: 'pointer' },
  btnSmCancel: { background: 'transparent', color: t.color.muted, border: `1px solid ${t.color.border}`, padding: '6px 14px', borderRadius: t.radius.sm, fontSize: '12px', cursor: 'pointer' },
}

const m = {
  topbar: { padding: '16px 16px 14px', borderBottom: `1px solid ${t.color.border}` },
  backRow: { display: 'flex', alignItems: 'center', gap: '2px', fontSize: '13px', color: t.color.muted, cursor: 'pointer', marginBottom: '10px' },
  backChevron: { fontSize: '17px', lineHeight: 1, marginRight: '2px' },
  titleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  pageTitle: { fontFamily: t.font.display, fontSize: '24px', fontWeight: '700', color: t.color.ink },
  headerRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  memberBadge: { display: 'flex', alignItems: 'center', gap: '5px', color: t.color.muted, fontSize: '13px' },
  exportIconBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: t.color.surface, border: `1px solid ${t.color.border}`, borderRadius: t.radius.sm, color: t.color.ink, cursor: 'pointer' },
  controlsRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  viewToggle: { display: 'flex', background: t.color.surface, border: `1px solid ${t.color.border}`, borderRadius: '10px', padding: '3px', flex: 1 },
  toggleBtn: { flex: 1, textAlign: 'center', padding: '9px 0', fontSize: '13px', fontWeight: '600', color: t.color.muted, cursor: 'pointer', borderRadius: '8px' },
  toggleActive: { background: t.color.primary, color: t.color.primaryText },
  btnNew: { background: t.color.primary, color: t.color.primaryText, border: 'none', padding: '0 18px', height: '42px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' },
  filterBar: { display: 'flex', gap: '20px', padding: '14px 16px', borderBottom: `1px solid ${t.color.border}` },
  filterTab: { fontSize: '14px', color: t.color.muted, cursor: 'pointer', paddingBottom: '4px', fontWeight: '500' },
  filterTabActive: { color: t.color.ink, fontWeight: '700' },
  content: { flex: 1, overflowY: 'auto', padding: '16px' },
  kanban: { display: 'flex', flexDirection: 'column', gap: '16px' },
  column: { background: t.color.surface, borderRadius: t.radius.md, border: `1px solid ${t.color.border}`, padding: '16px' },
  colEmpty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '30px 0' },
  colEmptyText: { fontSize: '13px', color: t.color.muted },
}

export default ProjectDetail