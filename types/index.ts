import { User, Attendance, AttendanceRequest, Role, RequestStatus } from '@prisma/client';
import { AttendanceStatus } from '@prisma/client';

export type { User, Attendance, AttendanceRequest, Role, RequestStatus };
export { AttendanceStatus };

export type UserWithAttendances = User & {
  attendances: Attendance[];
};

export type AttendanceRequestWithUser = AttendanceRequest & {
  user: User;
};

export type DayAttendance = {
  date: Date;
  users: {
    id: string;
    name: string;
    avatar: string | null;
    status: AttendanceStatus | null;
  }[];
};

export const StatusColors: Record<AttendanceStatus, string> = {
  OFFICE: '#10b981',    // зеленый
  REMOTE: '#f59e0b',    // желтый
  SICK: '#ef4444',      // красный
  VACATION: '#3b82f6',  // голубой
  DAYOFF: '#6b7280',    // серый
  WEEKEND: '#8b5cf6',   // фиолетовый
};

export const StatusLabels: Record<AttendanceStatus, string> = {
  OFFICE: 'В офисе',
  REMOTE: 'Из дома',
  SICK: 'Больничный',
  VACATION: 'Отпуск',
  DAYOFF: 'Отгул',
  WEEKEND: 'Выходной',
};

export const StatusEmojis: Record<AttendanceStatus, string> = {
  OFFICE: '🟢',
  REMOTE: '🟡',
  SICK: '🔴',
  VACATION: '🏖️',
  DAYOFF: '⚪',
  WEEKEND: '🏖️',
};
