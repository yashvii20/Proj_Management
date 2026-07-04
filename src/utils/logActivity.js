import { supabase } from '../supabase'

export const logActivity = async (projectId, action, entityType, entityName) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user.id,
    action,
    entity_type: entityType,
    entity_name: entityName,
  })
}