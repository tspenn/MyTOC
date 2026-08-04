export type CardStatus = 'active' | 'awaiting_confirmation' | 'archived'
export type UserRole = 'assigner' | 'assignee'
export type CollaboratorRole = 'viewer' | 'editor' | 'assignee'

export interface Checklist {
  id: string
  user_id: string
  title: string
  description: string | null
  status: CardStatus
  /** Task Crew is working on — set when they open that task card. */
  current_item_id: string | null
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  id: string
  checklist_id: string
  task: string
  completed: boolean
  order: number
  created_at: string
  updated_at: string
}

export interface ChecklistComment {
  id: string
  item_id: string
  user_id: string
  text: string
  created_at: string
}

export interface ChecklistCollaborator {
  id: string
  checklist_id: string
  user_id: string
  role: CollaboratorRole
  invited_at: string
}

export interface ChecklistAttachment {
  id: string
  item_id: string
  file_url: string
  file_name: string
  file_size: number
  created_at: string
}

export interface DashboardChecklist extends Checklist {
  item_count: number
}

export interface CollaboratorProfile extends ChecklistCollaborator {
  email: string | null
  displayName?: string | null
}
