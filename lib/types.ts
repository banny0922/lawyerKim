export interface CaseType {
  id: string
  name: string
  created_at: string
}

export interface ConsultationType {
  id: string
  name: string
  created_at: string
}

export interface ConsultationFile {
  id: string
  consultation_id: string
  file_name: string
  file_url: string
  created_at: string
}

export interface Consultation {
  id: string
  client_name: string
  date: string
  hour: number
  case_type_id: string | null
  consultation_type_id: string | null
  content: string | null
  next_appointment: string | null
  created_at: string
  case_types: CaseType | null
  consultation_types: ConsultationType | null
}
