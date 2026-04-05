import Dexie, { type Table } from 'dexie';
import type { Patient, VisitNote, Appointment, Reminder } from './types';

export class AppDatabase extends Dexie {
  patients!: Table<Patient, string>;
  visits!: Table<VisitNote, string>;
  appointments!: Table<Appointment, string>;
  reminders!: Table<Reminder, string>;

  constructor() {
    super('DentalEdgeDB');
    this.version(2).stores({
      patients: 'id, firstName, lastName, lastVisitDate',
      visits: 'id, patientId, date, isSynced',
      appointments: 'id, date, time',
      reminders: 'id, isCompleted'
    });
  }
}

export const db = new AppDatabase();

// Temporary helper to seed some initial data for the UI
export async function seedInitialData() {
  const today = new Date().toISOString().split('T')[0];
  const count = await db.appointments.count();
  
  if (count === 0) {
    await db.appointments.bulkAdd([
      { id: '1', patientName: 'John Doe', time: '09:00 AM', type: 'Root Canal', date: today },
      { id: '2', patientName: 'Sarah Smith', time: '11:30 AM', type: 'Routine Cleaning', date: today }
    ]);
    await db.reminders.bulkAdd([
      { id: '1', text: 'Call lab regarding Invisalign trays', isCompleted: false },
      { id: '2', text: 'Restock composite materials', isCompleted: false }
    ]);
  }
}
