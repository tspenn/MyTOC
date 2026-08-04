export type CardStatus = 'active' | 'awaiting_confirmation' | 'archived'
export type UserRole = 'assigner' | 'assignee'
export type CollaboratorRole = 'viewer' | 'editor' | 'assignee'

export interface Checklist {
  id: string
  user_id: string
  team_id: string | null
  title: string
  description: string | null
  status: CardStatus
  /** Task a team member is working on — set when they open that task card. */
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
  workerNumber?: string | null
}

export interface TeamSlot {
  id: string
  worker_number: string
  display_name: string
  user_id: string | null
  status: 'pending' | 'active'
  created_at: string
}

export interface LeadNote {
  id: string
  checklist_id: string
  user_id: string
  text: string
  created_at: string
}

export interface TeamLeadMember {
  user_id: string
  display_name: string
  is_primary: boolean
  joined_at: string
}

export interface CoLeadInvite {
  id: string
  email: string
  token: string
  created_at: string
}
