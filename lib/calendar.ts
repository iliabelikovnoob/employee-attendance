import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths, startOfYear, endOfYear, eachMonthOfInterval, addDays as dateFnsAddDays } from 'date-fns';
import { ru } from 'date-fns/locale';

export { format, isSameDay, addMonths, subMonths };

export const addDays = (date: Date, days: number) => {
  return dateFnsAddDays(date, days);
};

export const formatDate = (date: Date, formatStr: string = 'dd MMMM yyyy') => {
  return format(date, formatStr, { locale: ru });
};

export const getMonthDays = (date: Date) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
};

export const getYearMonths = (date: Date) => {
  const yearStart = startOfYear(date);
  const yearEnd = endOfYear(date);
  
  return eachMonthOfInterval({ start: yearStart, end: yearEnd });
};

export const isCurrentMonth = (date: Date, currentDate: Date) => {
  return isSameMonth(date, currentDate);
};

export const isToday = (date: Date) => {
  return isSameDay(date, new Date());
};

export const getWeekDays = () => {
  return ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
};

export const dateToString = (date: Date) => {
  return format(date, 'yyyy-MM-dd');
};

export const stringToDate = (dateStr: string) => {
  return new Date(dateStr);
};

export const normalizeDate = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};
