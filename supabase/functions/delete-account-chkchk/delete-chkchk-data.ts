import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export const CHKCHK_TABLES = {
  checklists: 'chkchk_checklists',
  items: 'chkchk_items',
  comments: 'chkchk_comments',
  attachments: 'chkchk_attachments',
  collaborators: 'chkchk_collaborators',
} as const

export const CHKCHK_STORAGE_BUCKET = 'chkchk-attachments'

type DeleteStepResult = {
  table: string
  deleted: boolean
  warning?: string
}

async function deleteRows(
  admin: SupabaseClient,
  table: string,
  filter: (query: ReturnType<SupabaseClient['from']>) => ReturnType<SupabaseClient['from']>,
): Promise<DeleteStepResult> {
  const { error } = await filter(admin.from(table).delete())

  if (!error) {
    return { table, deleted: true }
  }

  if (error.code === 'PGRST205' || error.message.toLowerCase().includes('does not exist')) {
    return { table, deleted: false, warning: `${table} not found, skipped` }
  }

  throw new Error(`Failed to delete from ${table}: ${error.message}`)
}

async function selectIds(
  admin: SupabaseClient,
  table: string,
  column: string,
  value: string,
): Promise<string[]> {
  const { data, error } = await admin.from(table).select('id').eq(column, value)

  if (error) {
    if (error.code === 'PGRST205' || error.message.toLowerCase().includes('does not exist')) {
      return []
    }
    throw new Error(`Failed to read ${table}: ${error.message}`)
  }

  return (data ?? []).map((row) => row.id as string)
}

async function deleteAttachmentFiles(
  admin: SupabaseClient,
  itemIds: string[],
): Promise<DeleteStepResult> {
  const table = CHKCHK_TABLES.attachments

  if (itemIds.length === 0) {
    return { table, deleted: false, warning: 'No items to clean up attachments for' }
  }

  const { data: attachments, error: selectError } = await admin
    .from(table)
    .select('file_url')
    .in('item_id', itemIds)

  if (selectError) {
    if (selectError.code === 'PGRST205' || selectError.message.toLowerCase().includes('does not exist')) {
      return { table, deleted: false, warning: `${table} not found, skipped` }
    }
    throw new Error(`Failed to read ${table}: ${selectError.message}`)
  }

  const paths = (attachments ?? [])
    .map((row) => {
      const fileUrl = row.file_url as string
      const marker = `/storage/v1/object/public/${CHKCHK_STORAGE_BUCKET}/`
      const index = fileUrl.indexOf(marker)
      return index >= 0 ? fileUrl.slice(index + marker.length) : null
    })
    .filter((path): path is string => Boolean(path))

  if (paths.length > 0) {
    const { error: storageError } = await admin.storage.from(CHKCHK_STORAGE_BUCKET).remove(paths)
    if (storageError && !storageError.message.toLowerCase().includes('not found')) {
      throw new Error(`Failed to delete attachment files: ${storageError.message}`)
    }
  }

  return deleteRows(admin, table, (query) => query.in('item_id', itemIds))
}

export async function deleteChkchkUserData(
  admin: SupabaseClient,
  userId: string,
): Promise<{ steps: DeleteStepResult[]; warnings: string[] }> {
  const steps: DeleteStepResult[] = []
  const warnings: string[] = []

  const ownedChecklistIds = await selectIds(
    admin,
    CHKCHK_TABLES.checklists,
    'user_id',
    userId,
  )

  let ownedItemIds: string[] = []
  if (ownedChecklistIds.length > 0) {
    const { data: items, error: itemsError } = await admin
      .from(CHKCHK_TABLES.items)
      .select('id')
      .in('checklist_id', ownedChecklistIds)

    if (itemsError && itemsError.code !== 'PGRST205') {
      throw new Error(`Failed to read ${CHKCHK_TABLES.items}: ${itemsError.message}`)
    }

    ownedItemIds = (items ?? []).map((row) => row.id as string)
  }

  const attachmentStep = await deleteAttachmentFiles(admin, ownedItemIds)
  steps.push(attachmentStep)
  if (attachmentStep.warning) warnings.push(attachmentStep.warning)

  const commentsStep = await deleteRows(admin, CHKCHK_TABLES.comments, (query) =>
    query.eq('user_id', userId))
  steps.push(commentsStep)
  if (commentsStep.warning) warnings.push(commentsStep.warning)

  if (ownedChecklistIds.length > 0) {
    const itemsStep = await deleteRows(admin, CHKCHK_TABLES.items, (query) =>
      query.in('checklist_id', ownedChecklistIds))
    steps.push(itemsStep)
    if (itemsStep.warning) warnings.push(itemsStep.warning)
  }

  const collaboratorsStep = await deleteRows(admin, CHKCHK_TABLES.collaborators, (query) =>
    query.eq('user_id', userId))
  steps.push(collaboratorsStep)
  if (collaboratorsStep.warning) warnings.push(collaboratorsStep.warning)

  const checklistsStep = await deleteRows(admin, CHKCHK_TABLES.checklists, (query) =>
    query.eq('user_id', userId))
  steps.push(checklistsStep)
  if (checklistsStep.warning) warnings.push(checklistsStep.warning)

  return { steps, warnings }
}
