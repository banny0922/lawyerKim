export interface ConsultationType {
  id: string
  name: string
  created_at: string
}

export interface Case {
  id: string
  court: string | null
  division: string | null
  case_number: string | null
  party_name: string | null
  codef_sync_enabled: boolean
  last_synced_at: string | null
  accepted_at: string | null
  client_name: string | null
  case_name: string | null
  hearing_at: string | null
  next_consultation_at: string | null
  fee: number | null
  fee_paid: boolean
  unpaid_fee: number | null
  created_at: string
}

export interface CaseHearing {
  id: string
  case_id: string
  hearing_date: string
  hearing_time: string | null
  hearing_type: string | null
  description: string | null
  created_at: string
}

export interface CaseDelivery {
  id: string
  case_id: string
  delivered_at: string | null
  document_name: string | null
  sender: string | null
  recipient: string | null
  created_at: string
}

export interface CaseDocument {
  id: string
  case_id: string
  submitted_at: string | null
  document_name: string | null
  submitter: string | null
  file_url: string | null
  created_at: string
}

export interface Consultation {
  id: string
  case_id: string
  consultation_type_id: string | null
  consulted_at: string | null
  content: string | null
  client_request: string | null
  related_laws: string | null
  legal_opinion: string | null
  recommendation: string | null
  record_type: string
  progress_content: string | null
  progress_client_request: string | null
  progress_related_laws: string | null
  progress_legal_opinion: string | null
  progress_recommendation: string | null
  created_at: string
  consultation_types?: ConsultationType | null
}

export interface ConsultationFile {
  id: string
  consultation_id: string
  file_name: string
  file_url: string
  created_at: string
}

export interface Todo {
  id: string
  case_id: string
  title: string | null
  due_date: string | null
  completed: boolean
  created_at: string
}
