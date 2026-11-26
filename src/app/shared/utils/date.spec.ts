import {
  endOfLocalDay,
  formatDateBr,
  isBeforeToday,
  isOverdue,
  parseLocalDateString,
  toLocalDateString,
} from './date';

function atLocal(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): Date {
  return new Date(year, month - 1, day, hour, minute, second, millisecond);
}

describe('date utilities', () => {
  it('runs in America/Sao_Paulo', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Sao_Paulo');
  });

  describe('formatDateBr', () => {
    it('formats local midnight and the last instant of that day as dd/MM/yyyy', () => {
      expect(formatDateBr(atLocal(2026, 11, 20, 0, 0, 0, 0))).toBe('20/11/2026');
      expect(formatDateBr(atLocal(2026, 11, 20, 23, 59, 59, 999))).toBe('20/11/2026');
    });

    it('uses the local calendar day of a UTC instant', () => {
      expect(formatDateBr(new Date('2026-11-21T02:59:59.000Z'))).toBe('20/11/2026');
      expect(formatDateBr(new Date('2026-11-21T03:00:00.000Z'))).toBe('21/11/2026');
    });
  });

  describe('local date strings', () => {
    it('round-trips yyyy-MM-dd through local midnight', () => {
      const parsed = parseLocalDateString('2026-11-20');

      expect(parsed.getHours()).toBe(0);
      expect(parsed.getMinutes()).toBe(0);
      expect(parsed.getSeconds()).toBe(0);
      expect(parsed.getMilliseconds()).toBe(0);
      expect(toLocalDateString(parsed)).toBe('2026-11-20');
    });

    it('parses the calendar day as local midnight, not UTC midnight', () => {
      expect(parseLocalDateString('2026-11-20').toISOString()).toBe('2026-11-20T03:00:00.000Z');
    });

    it('reads the local day of an instant that is already the next UTC day', () => {
      expect(toLocalDateString(new Date('2026-11-21T02:30:00.000Z'))).toBe('2026-11-20');
    });

    it('rejects a value the date input would not produce', () => {
      expect(() => parseLocalDateString('20/11/2026')).toThrow(RangeError);
      expect(() => parseLocalDateString('2026-02-31')).toThrow(RangeError);
    });
  });

  describe('endOfLocalDay', () => {
    it('returns 23:59:59.000 local, which is the next UTC day in São Paulo', () => {
      const end = endOfLocalDay(parseLocalDateString('2026-11-20'));

      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(0);
      expect(end.toISOString()).toBe('2026-11-21T02:59:59.000Z');
      expect(formatDateBr(end)).toBe('20/11/2026');
    });

    it('keeps the local calendar day when the input instant is UTC midnight', () => {
      const end = endOfLocalDay(new Date('2026-11-20T00:00:00.000Z'));

      expect(formatDateBr(end)).toBe('19/11/2026');
      expect(end.toISOString()).toBe('2026-11-20T02:59:59.000Z');
    });
  });

  describe('isBeforeToday', () => {
    const todayAtMidnight = atLocal(2026, 11, 20, 0, 0, 0, 0);

    it('is false for the local today, including at midnight and at the end of the day', () => {
      expect(isBeforeToday(atLocal(2026, 11, 20, 15, 0, 0), todayAtMidnight)).toBe(false);
      expect(isBeforeToday(atLocal(2026, 11, 20, 23, 59, 59, 999), todayAtMidnight)).toBe(false);
    });

    it('is true at the next local midnight and false for a later day', () => {
      expect(isBeforeToday(atLocal(2026, 11, 20, 23, 59, 59, 999), atLocal(2026, 11, 21))).toBe(
        true,
      );
      expect(isBeforeToday(atLocal(2026, 11, 21), todayAtMidnight)).toBe(false);
    });

    it('compares calendar days across the new year and ignores the time of day', () => {
      expect(isBeforeToday(atLocal(2026, 12, 31, 23, 59, 59), atLocal(2027, 1, 1))).toBe(true);
      expect(isBeforeToday(atLocal(2026, 12, 31, 23, 59, 59), atLocal(2026, 12, 31))).toBe(false);
    });
  });

  describe('isOverdue', () => {
    it('is false when the due date is today', () => {
      const dueAt = endOfLocalDay(atLocal(2026, 11, 20));
      const now = atLocal(2026, 11, 20, 23, 59, 59, 999);

      expect(isOverdue(dueAt, now)).toBe(false);
    });

    it('becomes true on the next local day, including exactly at midnight', () => {
      const dueAt = endOfLocalDay(atLocal(2026, 11, 20));

      expect(isOverdue(dueAt, atLocal(2026, 11, 21, 0, 0, 0, 0))).toBe(true);
    });

    it('is false while a UTC instant still falls on the local today', () => {
      const dueAt = new Date('2026-11-21T02:59:59.000Z');

      expect(isOverdue(dueAt, atLocal(2026, 11, 20, 12))).toBe(false);
      expect(isOverdue(dueAt, atLocal(2026, 11, 21, 0, 0, 0, 0))).toBe(true);
    });
  });
});
