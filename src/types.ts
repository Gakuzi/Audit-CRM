// src/types.ts

export type ApprovalPeriodType = 'daily' | 'weekly';

export interface ApprovalPeriod {
    type: ApprovalPeriodType;
    interval?: number; // for daily
    dayOfWeek?: number; // for weekly (0=Sun, 1=Mon, ...)
}


export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  start_date: string;
  end_date?: string;
  created_at: string;
  approval_period: ApprovalPeriod;
  google_calendar_id?: string;
}

export type PlanItemType = 'task' | 'meeting' | 'interview' | 'doc_review' | 'observation' | 'process_analysis';

export interface PlanItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  type: PlanItemType;
  event_count?: number;
  sub_tasks?: PlanItem[];
  data?: {
    date?: string; // For meetings
    time?: string;
    location?: string;
    agenda?: string;
    participants?: string[];
    interviewee?: string;
    duration?: string;
    google_calendar_event_id?: string;
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
  report_content?: string;
  report_generated_at?: string;
}

export interface Event {
  id: string;
  project_id: string;
  week_id: string;
  task_id: string;
  user_id: string | null;
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
  google_calendar_id?: string;
}

export interface ContactPerson {
  id: string; // client-side UUID
  name: string;
  role: string;
  email: string;
  phone: string;
  whatsapp?: string;
  telegram?: string;
  priority_contact_method?: 'email' | 'phone' | 'whatsapp' | 'telegram';
}

export interface CompanyProfile {
  id: string;
  project_id: string;
  company_name: string;
  address: string;
  contacts: ContactPerson[]; // JSONB
  updated_at: string;
}