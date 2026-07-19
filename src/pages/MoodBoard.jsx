import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'
import Sidebar from '../components/Sidebar'
import Comments from '../components/Comments'
import { theme } from '../theme'

function MoodBoard() {
  const [items, setItems] = useState([])
  const [projects, setProjects] = useState([])
  const [categories, setCategories] = useState([])
  const [profiles, setProfiles] = useState([])
  const [selectedProject, setSelectedProject] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedMember, setSelectedMember] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [newFileUrl, setNewFileUrl] = useState('')
  const [newFileType, setNewFileType] = useState('image')
  const [newDescription, setNewDescription] = useState('')
  const [newTags, setNewTags] = useState('')
  const [newStatus, setNewStatus] = useState('draft')
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [currentUser, setCurrentUser] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      fetchProjects()
      fetchItems()
      fetchProfiles()
    }
    init()
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*')
    setProfiles(data || [])
  }

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    setProjects(data || [])
    if (data && data.length > 0) setProjectId('')
  }

  const fetchCategories = async () => {
    const { data } = await supabase.from('moodboard_categories').select('*').order('created_at', { ascending: true })
    setCategories(data || [])
  }

  const fetchItems = async () => {
    const { data } = await supabase.from('moodboard_items').select('*, projects(name), moodboard_categories(name), moodboard_attachments(*, profiles(full_name, id))').order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  const fetchAttachments = async (itemId) => {
    const { data } = await supabase.from('moodboard_attachments').select('*, profiles(full_name, id)').eq('moodboard_item_id', itemId).order('created_at', { ascending: true })
    setAttachments(data || [])
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('moodboard_categories').insert({ project_id: projectId, name: newCategoryName.trim(), created_by: user.id }).select().single()
    if (data) {
      setCategories(prev => [...prev, data])
      setCategoryId(data.id)
    }
    setNewCategoryName('')
    setShowNewCategory(false)
  }

const compressImage = (file, maxWidth = 1920, quality = 0.82) => {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/')) return resolve(file)
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        } else {
          width = Math.round((width * maxWidth) / height)
          height = maxWidth
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.webp'
            const compressedFile = new File([blob], cleanName, {
              type: 'image/webp',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          } else {
            resolve(file)
          }
        },
        'image/webp',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}

  const uploadFile = async (rawFile, onDone) => {
    setUploading(true)
    const file = await compressImage(rawFile)
    const ext = file.name.split('.').pop()
    const fileName = Date.now() + '.' + ext
    const { error } = await supabase.storage.from('moodboard').upload(fileName, file, { upsert: true })
    if (error) { setUploading(false); alert('Upload failed: ' + error.message); return }
    const { data: urlData } = supabase.storage.from('moodboard').getPublicUrl(fileName)
    let type = 'file'
    if (file.type.startsWith('image/')) type = 'image'
    else if (file.type === 'application/pdf') type = 'pdf'
    else if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) type = 'word'
    else if (file.type.includes('excel') || file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) type = 'excel'
    else if (file.type.includes('presentation') || file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) type = 'ppt'
    setUploading(false)
    onDone(urlData.publicUrl, type)
  }

  const handleFileUpload = (file) => {
    uploadFile(file, (url, type) => {
      setNewFileUrl(url)
      setNewFileType(type)
    })
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const profile = profiles.find(p => p.id === user.id)
    const { data } = await supabase.from('moodboard_items').insert({ title, project_id: projectId, category_id: categoryId || null, added_by: user.id }).select().single()
    if (data && newFileUrl) {
      const isLink = newFileType === 'link'
      const tagArray = newTags.split(',').map(t => t.trim()).filter(Boolean)
      await supabase.from('moodboard_attachments').insert({
        moodboard_item_id: data.id,
        image_url: isLink ? null : newFileUrl,
        source_url: isLink ? newFileUrl : null,
        file_type: newFileType,
        description: newDescription || null,
        tags: tagArray.length ? tagArray : null,
        status: newStatus,
        added_by: user.id,
        added_by_name: profile ? profile.full_name : 'Unknown',
      })
    }
    setTitle('')
    setNewFileUrl('')
    setNewFileType('image')
    setNewDescription('')
    setNewTags('')
    setNewStatus('draft')
    setShowModal(false)
    setSaving(false)
    fetchItems()
    const { logActivity } = await import('../utils/logActivity')
    await logActivity(projectId, 'uploaded a file', 'moodboard', title)
  }

  const handleOpenDetail = async (item) => {
    setSelectedItem(item)
    setCarouselIndex(0)
    await fetchAttachments(item.id)
    setShowDetail(true)
  }

const PencilIcon = ({ size = 12, color = theme.color.muted }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' style={{ flexShrink: 0, pointerEvents: 'none' }}>
    <path d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' stroke={color} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)

  const [editingItemTitle, setEditingItemTitle] = useState(false)
  const [editItemTitle, setEditItemTitle] = useState('')

  const handleUpdateItemTitle = async () => {
    if (!editItemTitle.trim()) return
    await supabase.from('moodboard_items').update({ title: editItemTitle.trim() }).eq('id', selectedItem.id)
    setSelectedItem({ ...selectedItem, title: editItemTitle.trim() })
    setEditingItemTitle(false)
    fetchItems()
  }

  const deleteStorageFile = async (url) => {
    if (!url || typeof url !== 'string' || !url.includes('/storage/v1/object/public/moodboard/')) return
    const fileName = url.split('/storage/v1/object/public/moodboard/').pop()
    if (fileName) {
      await supabase.storage.from('moodboard').remove([fileName])
    }
  }

  const handleDeleteAttachment = async (attachId) => {
    if (!window.confirm('Are you sure you want to delete this attachment reference?')) return
    const target = attachments.find(a => a.id === attachId)
    if (target && target.image_url) {
      await deleteStorageFile(target.image_url)
    }
    await supabase.from('moodboard_attachments').delete().eq('id', attachId)
    const updated = attachments.filter(a => a.id !== attachId)
    setAttachments(updated)
    if (carouselIndex >= updated.length) setCarouselIndex(Math.max(0, updated.length - 1))
    fetchItems()
  }

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this moodboard item? All attached files and comments will be permanently removed.')) return
    const { data: itemAttachs } = await supabase.from('moodboard_attachments').select('image_url').eq('moodboard_item_id', itemId)
    if (itemAttachs && itemAttachs.length > 0) {
      for (const att of itemAttachs) {
        if (att.image_url) await deleteStorageFile(att.image_url)
      }
    }
    await supabase.from('moodboard_items').delete().eq('id', itemId)
    setShowDetail(false)
    fetchItems()
  }

  const getInitials = (name) => name ? name.split(' ').map(function(n) { return n[0] }).join('').toUpperCase() : '?'

  const filtered = items.filter(item => {
    const projectMatch = selectedProject === 'all' || item.project_id === selectedProject
    const categoryMatch = selectedCategory === 'all' || item.category_id === selectedCategory
    const memberMatch = selectedMember === 'all' || (item.moodboard_attachments || []).some(a => a.added_by === selectedMember)
    return projectMatch && categoryMatch && memberMatch
  })

  const allCategories = categories
  const statusLabel = { draft: 'Draft', final: 'Final', review: 'Needs review' }
  const statusColor = { draft: theme.color.muted, final: theme.color.primary, review: theme.color.accent }

  const currentAttachment = attachments[carouselIndex]

  const getFileIconStyle = (type) => {
    if (type === 'pdf') return s.fileIconPdf
    if (type === 'word') return s.fileIconWord
    if (type === 'excel') return s.fileIconExcel
    if (type === 'ppt') return s.fileIconPpt
    return s.fileIconLink
  }

  const getFileIconLabel = (type) => {
    if (type === 'pdf') return 'PDF'
    if (type === 'word') return 'DOC'
    if (type === 'excel') return 'XLS'
    if (type === 'ppt') return 'PPT'
    return 'URL'
  }

  return (
    <div style={s.app} className='app-shell'>
      <Sidebar />
      <div style={s.main}>
        <div style={s.topbar}>
          <div>
            <div style={s.pageTitle}>Mood board</div>
            <div style={s.pageSub}>{filtered.length} items</div>
          </div>
          <button style={s.btnNew} onClick={() => setShowModal(true)}>+ Add item</button>
        </div>

        <div style={s.filterBar}>
          <div style={s.filterGroup}>
            <span style={s.filterLabel}>Project</span>
            <select style={s.filterSelect} value={selectedProject} onChange={e => { setSelectedProject(e.target.value); setSelectedCategory('all') }}>
              <option value='all'>All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={s.filterGroup}>
            <span style={s.filterLabel}>Member</span>
            <select style={s.filterSelect} value={selectedMember} onChange={e => setSelectedMember(e.target.value)}>
              <option value='all'>All members</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
        </div>

        <div style={s.catRow}>
          <div style={{ ...s.catChip, ...(selectedCategory === 'all' ? s.catChipActive : {}) }} onClick={() => setSelectedCategory('all')}>All</div>
          {allCategories.map(c => (
            <div key={c.id} style={{ ...s.catChip, ...(selectedCategory === c.id ? s.catChipActive : {}), display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setSelectedCategory(c.id)}>
              <span>{c.name}</span>
              <span style={{ ...s.catDelete, color: selectedCategory === c.id ? theme.color.accent : theme.color.muted }} onClick={async (e) => { e.stopPropagation(); if (window.confirm('Delete category "' + c.name + '"? Items in this category will become uncategorized.')) { await supabase.from('moodboard_categories').delete().eq('id', c.id); fetchCategories(); fetchItems() } }}>x</span>
            </div>
          ))}
        </div>

        <div style={s.content}>
          {loading && <div style={s.empty}>Loading…</div>}
          {!loading && filtered.length === 0 && (
            <div style={s.emptyState}>
              <div style={s.emptyTitle}>No items yet</div>
              <div style={s.emptySub}>Add images, PDFs, or links to get started.</div>
              <button style={s.btnNew} onClick={() => setShowModal(true)}>+ Add item</button>
            </div>
          )}
          <div style={s.grid}>
            {filtered.map(item => {
              const firstAttach = (item.moodboard_attachments || [])[0]
              const contributors = [...new Set((item.moodboard_attachments || []).map(a => a.added_by_name).filter(Boolean))]
              const isPdfOrLink = firstAttach && firstAttach.file_type !== 'image'
              return (
                <div key={item.id} style={isPdfOrLink ? s.fileRow : s.card} onClick={() => handleOpenDetail(item)}>
                  {isPdfOrLink ? (
                    <>
                      <div style={{ ...s.fileIcon, ...getFileIconStyle(firstAttach.file_type) }}>
                        {getFileIconLabel(firstAttach.file_type)}
                      </div>
                      <div style={s.fileInfo}>
                        <div style={s.fileName}>{item.title}</div>
                        <div style={s.fileMeta}>{item.moodboard_categories ? item.moodboard_categories.name : 'Uncategorized'}</div>
                      </div>
                      {contributors[0] && <div style={s.fileAvatar}>{getInitials(contributors[0])}</div>}
                    </>
                  ) : (
                    <>
                      <div style={{ ...s.cardImg, background: theme.color.bg, position: 'relative' }}>
                        {firstAttach && (firstAttach.image_url || firstAttach.source_url) ? (
                          <>
                            <img
                              src={firstAttach.image_url || firstAttach.source_url}
                              alt={item.title}
                              style={s.img}
                              onError={e => {
                                e.target.style.display = 'none'
                                const fb = e.target.parentElement.querySelector('.img-fallback')
                                if (fb) fb.style.display = 'flex'
                              }}
                            />
                            <div className='img-fallback' style={{ ...s.imgFallback, display: 'none' }}>
                              <span>🔗 Reference Link</span>
                            </div>
                          </>
                        ) : (
                          <div style={s.imgFallback}>
                            <span>📁 Document / Reference</span>
                          </div>
                        )}
                        {(item.moodboard_attachments || []).length > 1 && <div style={s.imgCount}>+{(item.moodboard_attachments || []).length - 1}</div>}
                      </div>
                      <div style={s.cardBody}>
                        <div style={s.cardTitle}>{item.title}</div>
                        <div style={s.cardMeta}>
                          <span style={s.catTag}>{item.moodboard_categories ? item.moodboard_categories.name : 'Uncategorized'}</span>
                        </div>
                        {contributors.length > 0 && (
                          <div style={s.contributors}>
                            {contributors.map((name, idx) => <div key={idx} style={s.contributorBadge}>{getInitials(name)}</div>)}
                          </div>
                        )}
                      </div>
                    </>
                  )}
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
              <div style={s.modalTitle}>New mood board item</div>
              <div style={s.closeBtn} onClick={() => setShowModal(false)}>x</div>
            </div>
            <form onSubmit={handleAddItem}>
              <div style={s.field}><label style={s.label}>Title</label><input style={s.input} placeholder='Site elevation reference' value={title} onChange={e => setTitle(e.target.value)} required autoFocus /></div>
              <div style={s.field}><label style={s.label}>Project</label><select style={s.input} value={projectId} onChange={e => setProjectId(e.target.value)} required><option value=''>Select a project</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div style={s.field}>
                <label style={s.label}>Category</label>
                {showNewCategory ? (
                  <div style={s.uploadRow}>
                    <input style={{ ...s.input, flex: 1 }} placeholder='New category name' value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} autoFocus />
                    <button type='button' style={s.uploadBtn} onClick={handleCreateCategory}>Add</button>
                  </div>
                ) : (
                  <div style={s.uploadRow}>
                    <select style={{ ...s.input, flex: 1 }} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                      <option value=''>Uncategorized</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button type='button' style={s.uploadBtn} onClick={() => setShowNewCategory(true)}>New</button>
                  </div>
                )}
              </div>
              <div style={s.field}>
                <label style={s.label}>File</label>
                <div style={s.uploadRow}>
                  <input style={{ ...s.input, flex: 1 }} placeholder='Paste image, PDF, or link URL' value={newFileUrl} onChange={e => { setNewFileUrl(e.target.value); setNewFileType('link') }} />
                  <button type='button' style={s.uploadBtn} onClick={() => fileInputRef.current.click()}>{uploading ? 'Uploading…' : 'Upload'}</button>
                  <input ref={fileInputRef} type='file' accept='*/*' style={{ display: 'none' }} onChange={e => e.target.files[0] && handleFileUpload(e.target.files[0])} />
                </div>
                {newFileUrl && newFileType === 'image' && <img src={newFileUrl} alt='preview' style={s.preview} onError={e => { e.target.style.display = 'none' }} />}
                {newFileUrl && newFileType === 'pdf' && <div style={s.pdfPreview}>PDF file attached</div>}
              </div>
              <div style={s.field}><label style={s.label}>Description (optional)</label><textarea style={{ ...s.input, height: '60px', resize: 'vertical' }} placeholder='Add context or notes…' value={newDescription} onChange={e => setNewDescription(e.target.value)} /></div>
              <div style={s.field}><label style={s.label}>Tags (optional, comma separated)</label><input style={s.input} placeholder='exterior, v2, urgent' value={newTags} onChange={e => setNewTags(e.target.value)} /></div>
              <div style={s.field}>
                <label style={s.label}>Status</label>
                <select style={s.input} value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  <option value='draft'>Draft</option>
                  <option value='final'>Final</option>
                  <option value='review'>Needs review</option>
                </select>
              </div>
              <div style={s.modalFooter}>
                <button type='button' style={s.btnCancel} onClick={() => setShowModal(false)}>Cancel</button>
                <button type='submit' style={s.btnNew} disabled={saving}>{saving ? 'Adding…' : 'Add item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetail && selectedItem && (
        <div style={s.overlay}>
          <div style={s.detailModal} className='detail-modal-inner'>
            <div style={s.detailLeft} className='detail-modal-left'>
              {currentAttachment ? (
                currentAttachment.file_type === 'image' ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <img
                      src={currentAttachment.image_url || currentAttachment.source_url}
                      alt=''
                      style={s.detailImg}
                      onError={e => {
                        e.target.style.display = 'none'
                        const fb = e.target.parentElement.querySelector('.detail-fallback')
                        if (fb) fb.style.display = 'flex'
                      }}
                    />
                    <div className='detail-fallback' style={{ ...s.linkPlaceholder, display: 'none' }}>
                      <div style={s.linkPlaceholderText}>Image link unavailable or CORS restricted</div>
                      {(currentAttachment.image_url || currentAttachment.source_url) && (
                        <a href={currentAttachment.image_url || currentAttachment.source_url} target='_blank' rel='noopener noreferrer' style={s.linkOpenBtn}>Open external link</a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={s.linkPlaceholder}>
                    <div style={s.linkPlaceholderText}>{currentAttachment.file_type === 'pdf' ? 'PDF document' : currentAttachment.file_type === 'word' ? 'Word document' : currentAttachment.file_type === 'excel' ? 'Excel spreadsheet' : currentAttachment.file_type === 'ppt' ? 'PowerPoint file' : 'Link reference'}</div>
                    {(currentAttachment.image_url || currentAttachment.source_url) && (
                      <a href={currentAttachment.image_url || currentAttachment.source_url} target='_blank' rel='noopener noreferrer' style={s.linkOpenBtn}>Open</a>
                    )}
                  </div>
                )
              ) : (
                <div style={s.linkPlaceholder}><div style={s.linkPlaceholderText}>No references yet</div></div>
              )}
              {attachments.length > 1 && (
                <div style={s.navRow}>
                  <button style={s.navBtn} onClick={() => setCarouselIndex(i => Math.max(0, i - 1))} disabled={carouselIndex === 0}>Prev</button>
                  <span style={s.navCount}>{carouselIndex + 1} / {attachments.length}</span>
                  <button style={s.navBtn} onClick={() => setCarouselIndex(i => Math.min(attachments.length - 1, i + 1))} disabled={carouselIndex === attachments.length - 1}>Next</button>
                </div>
              )}
            </div>
            <div style={s.detailRight} className='detail-modal-right'>
              <div style={s.detailRightTop}>
                <button style={s.closeBtnFixed} onClick={() => setShowDetail(false)}>x</button>
                {editingItemTitle ? (
                  <div style={s.editTitleRow}>
                    <input
                      style={s.inputTitleEdit}
                      value={editItemTitle}
                      onChange={e => setEditItemTitle(e.target.value)}
                      autoFocus
                    />
                    <button style={s.btnSaveSm} onClick={handleUpdateItemTitle}>Save</button>
                    <button style={s.btnCancelSm} onClick={() => setEditingItemTitle(false)}>✕</button>
                  </div>
                ) : (
                  <div style={s.detailTitleWrapper} onClick={() => { setEditItemTitle(selectedItem.title); setEditingItemTitle(true) }} title="Click to edit title">
                    <div style={s.detailTitle}>{selectedItem.title}</div>
                    <PencilIcon size={13} color={theme.color.accent} />
                  </div>
                )}
                <div style={s.detailMeta}>
                  <div style={s.editableSelectPill} title="Click to change project">
                    <select style={s.projSelect} value={selectedItem.project_id || ''} onChange={async (e) => { const newProjId = e.target.value || null; await supabase.from('moodboard_items').update({ project_id: newProjId }).eq('id', selectedItem.id); setSelectedItem({ ...selectedItem, project_id: newProjId, projects: projects.find(p => p.id === newProjId) || null }); fetchItems() }}>
                      <option value=''>No project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <PencilIcon size={10} color={theme.color.muted} />
                  </div>
                  <div style={s.editableSelectPill} title="Click to change category">
                    <select style={s.catSelect} value={selectedItem.category_id || ''} onChange={async (e) => { const newCatId = e.target.value || null; await supabase.from('moodboard_items').update({ category_id: newCatId }).eq('id', selectedItem.id); setSelectedItem({ ...selectedItem, category_id: newCatId, moodboard_categories: categories.find(c => c.id === newCatId) || null }); fetchItems() }}>
                      <option value=''>Uncategorized</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <PencilIcon size={10} color={theme.color.muted} />
                  </div>
                  <span style={s.attachCount}>{attachments.length} references</span>
                </div>
                {currentAttachment && (
                  <div style={s.detailExtra}>
                    {currentAttachment.description && <div style={s.descText}>{currentAttachment.description}</div>}
                    <div style={s.metaRow}>
                      <div style={{ ...s.editableBadgeWrap, borderColor: statusColor[currentAttachment.status || 'draft'] }} title="Click to change status">
                        <select
                          style={{
                            background: 'transparent',
                            color: statusColor[currentAttachment.status || 'draft'],
                            border: 'none',
                            padding: '3px 4px 3px 10px',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            outline: 'none',
                            fontFamily: theme.font.body,
                          }}
                          value={currentAttachment.status || 'draft'}
                          onChange={async (e) => {
                            const newStatus = e.target.value
                            await supabase.from('moodboard_attachments').update({ status: newStatus }).eq('id', currentAttachment.id)
                            setAttachments(prev => prev.map(a => a.id === currentAttachment.id ? { ...a, status: newStatus } : a))
                            fetchItems()
                          }}
                        >
                          <option value='draft'>Draft</option>
                          <option value='review'>Needs review</option>
                          <option value='final'>Final</option>
                        </select>
                        <span style={{ paddingRight: '8px', display: 'flex', alignItems: 'center' }}>
                          <PencilIcon size={10} color={statusColor[currentAttachment.status || 'draft']} />
                        </span>
                      </div>
                      {currentAttachment.tags && currentAttachment.tags.map((tag, i) => <span key={i} style={s.tagPill}>{tag}</span>)}
                    </div>
                  </div>
                )}
              </div>
              <div style={s.refList}>
                <div style={s.refListLabel}>References</div>
                {attachments.map((a, idx) => (
                  <div key={a.id} style={{ ...s.refRow, ...(idx === carouselIndex ? s.refRowActive : {}) }} onClick={() => setCarouselIndex(idx)}>
                    <div style={s.refThumb}>
                      {a.file_type === 'image' && a.image_url ? <img src={a.image_url} alt='' style={s.refThumbImg} onError={e => { e.target.style.display = 'none' }} /> : <div style={s.refThumbLink}>{a.file_type === 'pdf' ? 'PDF' : 'Link'}</div>}
                    </div>
                    <div style={s.refInfo}>
                      <div style={s.refName}>{a.profiles && a.profiles.full_name ? a.profiles.full_name : (a.added_by_name || 'Unknown')}</div>
                    </div>
                    <div style={s.refDel} onClick={e => { e.stopPropagation(); handleDeleteAttachment(a.id) }}>x</div>
                  </div>
                ))}
              </div>
              {currentAttachment && (
                <div style={s.commentsWrap}>
                  <Comments attachmentId={currentAttachment.id} />
                </div>
              )}
              <div style={s.addRef}>
                <button style={s.btnDelete} onClick={() => handleDeleteItem(selectedItem.id)}>Delete item</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  app: { display: 'flex', height: '100vh', background: theme.color.bg, color: theme.color.ink, fontFamily: theme.font.body },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 28px', borderBottom: `1px solid ${theme.color.border}` },
  pageTitle: { fontFamily: theme.font.display, fontSize: '22px', fontWeight: 600, color: theme.color.ink, marginBottom: '4px' },
  pageSub: { fontSize: '13px', color: theme.color.muted },
  btnNew: { background: theme.color.primary, color: theme.color.primaryText, border: 'none', padding: '9px 18px', borderRadius: theme.radius.sm, fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
  filterBar: { display: 'flex', gap: '18px', padding: '14px 28px', borderBottom: `1px solid ${theme.color.border}`, flexWrap: 'wrap' },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '8px' },
  filterLabel: { fontSize: '11.5px', color: theme.color.muted },
  filterSelect: { padding: '7px 11px', background: theme.color.surface, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, color: theme.color.muted, fontSize: '12.5px', cursor: 'pointer' },
  catRow: { display: 'flex', gap: '8px', padding: '14px 28px', borderBottom: `1px solid ${theme.color.border}`, flexWrap: 'wrap' },
  catChip: { padding: '6px 14px', borderRadius: theme.radius.lg, fontSize: '12.5px', color: theme.color.muted, cursor: 'pointer', border: `1px solid ${theme.color.border}`, background: theme.color.surface },
  catChipActive: { border: `1px solid ${theme.color.accent}`, color: theme.color.accent, background: theme.color.bg, fontWeight: 600 },
  catDelete: { fontSize: '10px', cursor: 'pointer', lineHeight: 1, padding: '0 2px' },
  content: { flex: 1, overflowY: 'auto', padding: '22px 28px' },
  empty: { color: theme.color.muted, fontSize: '14px' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '10px' },
  emptyTitle: { fontFamily: theme.font.display, fontSize: '17px', fontWeight: 600, color: theme.color.ink },
  emptySub: { fontSize: '13px', color: theme.color.muted, marginBottom: '8px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' },
  card: { background: theme.color.surface, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md, overflow: 'hidden', cursor: 'pointer' },
  cardImg: { height: '140px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  img: { width: '100%', height: '100%', objectFit: 'cover' },
  imgFallback: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.color.bg, color: theme.color.muted, fontSize: '11.5px', fontWeight: '500' },
  imgCount: { position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(30,34,51,0.72)', color: theme.color.primaryText, fontSize: '11px', padding: '2px 8px', borderRadius: theme.radius.lg },
  cardBody: { padding: '11px 13px' },
  cardTitle: { fontSize: '13px', fontWeight: 500, color: theme.color.ink, marginBottom: '7px' },
  cardMeta: { display: 'flex', gap: '6px', marginBottom: '7px' },
  catTag: { fontSize: '10.5px', color: theme.color.accent, background: theme.color.bg, padding: '2px 8px', borderRadius: theme.radius.sm },
  catSelect: { background: theme.color.bg, color: theme.color.accent, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, fontSize: '11px', padding: '3px 8px', cursor: 'pointer', outline: 'none' },
  projSelect: { background: theme.color.bg, color: theme.color.ink, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, fontSize: '11px', padding: '3px 8px', cursor: 'pointer', outline: 'none' },
  contributors: { display: 'flex', gap: '4px' },
  contributorBadge: { width: '18px', height: '18px', borderRadius: '50%', background: theme.color.bg, color: theme.color.accent, fontSize: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  fileRow: { display: 'flex', alignItems: 'center', gap: '12px', background: theme.color.surface, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md, padding: '13px 15px', cursor: 'pointer', gridColumn: '1 / -1' },
  fileIcon: { width: '36px', height: '36px', borderRadius: theme.radius.sm, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '10px', fontWeight: 700 },
  fileIconPdf: { background: theme.color.dangerBg, color: theme.color.danger },
  fileIconWord: { background: theme.color.bg, color: theme.color.primary },
  fileIconExcel: { background: theme.color.bg, color: theme.color.accent },
  fileIconPpt: { background: theme.color.bg, color: theme.color.accent },
  fileIconLink: { background: theme.color.bg, color: theme.color.muted },
  fileInfo: { flex: 1, minWidth: 0 },
  fileName: { fontSize: '13px', color: theme.color.ink, marginBottom: '3px' },
  fileMeta: { fontSize: '11.5px', color: theme.color.muted },
  fileAvatar: { width: '24px', height: '24px', borderRadius: '50%', background: theme.color.bg, color: theme.color.accent, fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(30,34,51,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px', boxSizing: 'border-box' },
  modal: { background: theme.color.surface, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.lg, padding: '26px', width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto' },
  detailModal: { background: theme.color.surface, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.lg, width: '100%', maxWidth: '860px', maxHeight: '88vh', display: 'flex', overflow: 'hidden' },
  detailLeft: { flex: 1, background: theme.color.sidebarBg, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' },
  detailImg: { width: '100%', height: '100%', objectFit: 'contain' },
  linkPlaceholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  linkPlaceholderText: { fontSize: '13px', color: theme.color.sidebarMuted },
  linkOpenBtn: { background: theme.color.accent, color: theme.color.primaryText, padding: '8px 16px', borderRadius: theme.radius.sm, fontSize: '13px', textDecoration: 'none' },
  navRow: { position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(232,229,221,0.12)', padding: '5px 12px', borderRadius: theme.radius.lg },
  navBtn: { background: 'transparent', border: 'none', color: theme.color.sidebarText, fontSize: '12px', cursor: 'pointer' },
  navCount: { fontSize: '12px', color: theme.color.sidebarMuted },
  detailRight: { width: '300px', display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${theme.color.border}`, overflowY: 'auto' },
  detailRightTop: { padding: '16px', borderBottom: `1px solid ${theme.color.border}`, position: 'relative' },
  detailTitle: { fontFamily: theme.font.display, fontSize: '15px', fontWeight: 600, color: theme.color.ink },
  detailTitleWrapper: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '9px', paddingRight: '30px' },
  editTitleRow: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '9px', paddingRight: '30px' },
  inputTitleEdit: { flex: 1, padding: '4px 8px', background: theme.color.bg, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, color: theme.color.ink, fontSize: '14px', fontFamily: theme.font.display, fontWeight: '600', outline: 'none' },
  btnSaveSm: { background: theme.color.primary, color: theme.color.primaryText, border: 'none', padding: '4px 10px', borderRadius: theme.radius.sm, fontSize: '11px', fontWeight: '600', cursor: 'pointer' },
  btnCancelSm: { background: 'transparent', color: theme.color.muted, border: `1px solid ${theme.color.border}`, padding: '4px 8px', borderRadius: theme.radius.sm, fontSize: '11px', cursor: 'pointer' },
  editableSelectPill: { display: 'inline-flex', alignItems: 'center', gap: '3px', background: theme.color.bg, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, paddingRight: '6px' },
  editableBadgeWrap: { display: 'inline-flex', alignItems: 'center', background: theme.color.surface, border: '1.5px solid', borderRadius: '999px' },
  detailMeta: { display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' },
  attachCount: { fontSize: '11px', color: theme.color.muted },
  detailExtra: { marginTop: '6px' },
  descText: { fontSize: '12px', color: theme.color.muted, lineHeight: '1.5', marginBottom: '8px' },
  metaRow: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  statusTag: { fontSize: '10.5px', padding: '2px 9px', borderRadius: theme.radius.lg, border: '1px solid', fontWeight: 500 },
  tagPill: { fontSize: '10.5px', color: theme.color.muted, background: theme.color.bg, padding: '2px 9px', borderRadius: theme.radius.lg },
  closeBtnFixed: { position: 'absolute', top: '12px', right: '12px', background: theme.color.surface, color: theme.color.muted, border: `1px solid ${theme.color.border}`, width: '24px', height: '24px', borderRadius: '50%', fontSize: '12px', cursor: 'pointer' },
  refList: { padding: '10px', borderBottom: `1px solid ${theme.color.border}` },
  refListLabel: { fontSize: '10px', color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', padding: '0 4px' },
  refRow: { display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 8px', borderRadius: theme.radius.sm, cursor: 'pointer', border: '1px solid transparent' },
  refRowActive: { background: theme.color.bg, border: `1px solid ${theme.color.border}` },
  refThumb: { width: '34px', height: '34px', borderRadius: theme.radius.sm, overflow: 'hidden', background: theme.color.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  refThumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  refThumbLink: { fontSize: '9px', color: theme.color.muted },
  refInfo: { flex: 1, minWidth: 0 },
  refName: { fontSize: '12px', color: theme.color.ink },
  refDel: { color: theme.color.muted, fontSize: '12px', cursor: 'pointer', padding: '0 4px' },
  commentsWrap: { padding: '12px', borderBottom: `1px solid ${theme.color.border}` },
  addRef: { padding: '12px' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' },
  modalTitle: { fontFamily: theme.font.display, fontSize: '17px', fontWeight: 600, color: theme.color.ink },
  closeBtn: { color: theme.color.muted, cursor: 'pointer', fontSize: '14px' },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 500, color: theme.color.ink, marginBottom: '7px' },
  input: { width: '100%', padding: '10px 14px', background: theme.color.surface, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, color: theme.color.ink, fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  uploadRow: { display: 'flex', gap: '6px', alignItems: 'center' },
  uploadBtn: { background: theme.color.surface, color: theme.color.ink, border: `1px solid ${theme.color.border}`, padding: '9px 13px', borderRadius: theme.radius.sm, fontSize: '12.5px', cursor: 'pointer', whiteSpace: 'nowrap' },
  preview: { width: '100%', height: '110px', objectFit: 'cover', borderRadius: theme.radius.sm, marginTop: '8px' },
  pdfPreview: { fontSize: '12px', color: theme.color.muted, background: theme.color.bg, padding: '10px', borderRadius: theme.radius.sm, marginTop: '8px' },
  modalFooter: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' },
  btnCancel: { background: 'transparent', color: theme.color.muted, border: `1px solid ${theme.color.border}`, padding: '9px 16px', borderRadius: theme.radius.sm, fontSize: '13px', cursor: 'pointer' },
  btnDelete: { background: theme.color.dangerBg, color: theme.color.danger, border: `1px solid ${theme.color.dangerBorder}`, padding: '9px 14px', borderRadius: theme.radius.sm, fontSize: '12.5px', fontWeight: 500, cursor: 'pointer', width: '100%' },
}

export default MoodBoard