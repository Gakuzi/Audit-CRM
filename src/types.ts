// Fix: Removed self-import of 'ApprovalPeriod' that conflicted with the type definition below.
export type ApprovalPeriod = 'weekly' | 'monthly';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  start_date: string;
  end_date?: string;
  created_at: string;
  approval_period: ApprovalPeriod;
}

export type PlanItemType = 'task' | 'meeting' | 'interview' | 'doc_review' | 'observation';

export interface PlanItem {
  id: string;
  content: string;
  completed: boolean;
  type: PlanItemType;
  event_count?: number;
  data?: {
    time?: string;
    location?: string;
    agenda?: string;
    participants?: string[];
    interviewee?: string;
  };
}

export interface Plan {
  [date: string]: {
    tasks: PlanItem[];
  };
}

export type WeekStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'completed';

export interface Week {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description?: string;
  plan: Plan;
  status: WeekStatus;
  start_date: string;
  end_date: string;
  created_at: string;
  rejection_comment?: string;
}

export interface Event {
  id: string;
  project_id: string;
  week_id: string;
  task_id: string;
  user_id: string;
  author_email: string | null;
  type: 'comment' | 'meeting' | 'documentation_review' | 'interview';
  content: string;
  data?: {
    file_urls?: { name: string, url: string, type?: string }[];
    meeting_time?: string;
    participants?: string[];
  } | null;
  parent_event_id?: string | null;
  parent?: {
    content: string;
    author_email: string;
  };
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  whatsapp: string;
  telegram: string;
  telegram_bot_token: string;
  telegram_chat_id: string;
  updated_at: string;
}

export interface ContactPerson {
  id: string; // client-side UUID
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface CompanyProfile {
  id: string;
  project_id: string;
  company_name: string;
  address: string;
  contacts: ContactPerson[]; // JSONB
  updated_at: string;
}