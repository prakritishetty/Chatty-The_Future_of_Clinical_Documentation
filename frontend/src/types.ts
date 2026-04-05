export interface Patient {
  id: string; // The patient_id foreign key that inherently links patients to visits!
  firstName: string;
  lastName: string;
  age?: number;
  email?: string;
  phone?: string;
  preferredHours?: string;
  dob?: string;
  lastVisitDate?: string;
  status?: string;
}

export interface VisitNote {
  id: string;
  patientId: string;
  date: string;
  rawTranscript: string;
  totalCost?: number;
  isSynced: boolean;
}

export interface Appointment {
  id: string;
  patientName: string;
  time: string;
  type: string;
  date: string; // YYYY-MM-DD
}

export interface Reminder {
  id: string;
  text: string;
  isCompleted: boolean;
}
