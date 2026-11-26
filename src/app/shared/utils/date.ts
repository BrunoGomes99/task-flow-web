const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatDateBr(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// `new Date('yyyy-MM-dd')` is UTC midnight, the previous evening in Brazil.
export function parseLocalDateString(value: string): Date {
  const match = LOCAL_DATE.exec(value);
  if (match === null) {
    throw new RangeError(`Invalid local date: ${value}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new RangeError(`Invalid local date: ${value}`);
  }

  return date;
}

export function endOfLocalDay(localDate: Date): Date {
  return new Date(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate(),
    23,
    59,
    59,
    0,
  );
}

export function isBeforeToday(localDate: Date, now: Date): boolean {
  return localDayNumber(localDate) < localDayNumber(now);
}

export function isOverdue(dueAt: Date, now: Date): boolean {
  return isBeforeToday(dueAt, now);
}

function localDayNumber(date: Date): number {
  return date.getFullYear() * 10000 + date.getMonth() * 100 + date.getDate();
}
