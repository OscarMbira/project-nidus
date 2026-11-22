import { describe, it, expect } from 'vitest'
import {
  formatDateValue, formatDateTimeValue, parseTypedDate, parseTypedTime, parseTypedDateTime,
  calendarWeeks, weekdayLabels, inRange, isRealDate, dateHint,
} from '../regionalDateInput.js'

const GB = { date_format: 'D MMM YYYY', locale: 'en-GB', time_format: '24h', first_day_of_week: 'monday' }
const US = { date_format: 'MM/DD/YYYY', locale: 'en-US', time_format: '12h', first_day_of_week: 'sunday' }
const TODAY = new Date(2026, 10, 22, 9, 5) // 22 Nov 2026 09:05 local

describe('formatting stored values in the organisation’s format (v1351)', () => {
  it('formats a date in each format, never shifting the day', () => {
    expect(formatDateValue('2026-09-08', GB)).toBe('8 Sept 2026') // en-GB short month is "Sept"
    expect(formatDateValue('2026-09-08', { ...GB, locale: 'en-US' })).toBe('8 Sep 2026')
    expect(formatDateValue('2026-09-08', { date_format: 'MMM D, YYYY', locale: 'en-US' })).toBe('Sep 8, 2026')
    expect(formatDateValue('2026-09-08', { date_format: 'DD/MM/YYYY' })).toBe('08/09/2026')
    expect(formatDateValue('2026-09-08', US)).toBe('09/08/2026')
    expect(formatDateValue('2026-09-08', { date_format: 'YYYY-MM-DD', time_zone: 'America/New_York' })).toBe('2026-09-08')
    expect(formatDateValue('', GB)).toBe('')
    expect(formatDateValue('2026-02-30', GB)).toBe('')
  })

  it('formats a date and time with the organisation’s time format', () => {
    expect(formatDateTimeValue('2026-09-08T14:30', GB)).toBe('8 Sept 2026 14:30')
    expect(formatDateTimeValue('2026-09-08T14:30', US)).toBe('09/08/2026 2:30 PM')
    expect(formatDateTimeValue('2026-09-08T00:05', US)).toBe('09/08/2026 12:05 AM')
  })

  it('gives a typing hint in the organisation’s format', () => {
    expect(dateHint(GB)).toBe('e.g. 8 Sept 2026')
    expect(dateHint(US, true)).toBe('e.g. 09/08/2026 2:30 PM')
  })
})

describe('parsing typed dates', () => {
  it('reads the organisation’s own format and ISO', () => {
    expect(parseTypedDate('8 Sep 2026', GB)).toBe('2026-09-08')
    expect(parseTypedDate('2026-09-08', US)).toBe('2026-09-08')
    expect(parseTypedDate('09/08/2026', US)).toBe('2026-09-08')
  })

  it('reads numbers in the format’s day / month order', () => {
    expect(parseTypedDate('8/9/2026', GB)).toBe('2026-09-08')
    expect(parseTypedDate('8-9-26', GB)).toBe('2026-09-08')
    expect(parseTypedDate('9.8.2026', US)).toBe('2026-09-08')
  })

  it('reads month names in any order, in English or the display locale', () => {
    expect(parseTypedDate('Sep 8, 2026', GB)).toBe('2026-09-08')
    expect(parseTypedDate('8 September 2026', US)).toBe('2026-09-08')
    expect(parseTypedDate('8 sept 2026', GB)).toBe('2026-09-08')
    expect(parseTypedDate('8 septembre 2026', { ...GB, locale: 'fr-FR' })).toBe('2026-09-08')
  })

  it('understands today / tomorrow / yesterday', () => {
    expect(parseTypedDate('today', GB, TODAY)).toBe('2026-11-22')
    expect(parseTypedDate('Tomorrow', GB, TODAY)).toBe('2026-11-23')
    expect(parseTypedDate('yesterday', GB, TODAY)).toBe('2026-11-21')
  })

  it('returns "" for an empty box and null for anything that is not a real date', () => {
    expect(parseTypedDate('  ', GB)).toBe('')
    expect(parseTypedDate('31/2/2026', GB)).toBeNull()
    expect(parseTypedDate('next week', GB)).toBeNull()
    expect(parseTypedDate('8 Sep 202', GB)).toBeNull()
    expect(isRealDate(2028, 2, 29)).toBe(true)
    expect(isRealDate(2026, 2, 29)).toBe(false)
  })
})

describe('parsing typed times and date-times', () => {
  it('reads 24-hour and 12-hour times', () => {
    expect(parseTypedTime('14:30')).toBe('14:30')
    expect(parseTypedTime('2:30 pm')).toBe('14:30')
    expect(parseTypedTime('12am')).toBe('00:00')
    expect(parseTypedTime('1430')).toBe('14:30')
    expect(parseTypedTime('25:00')).toBeNull()
  })

  it('reads a date and time, a date alone (midnight) and "now"', () => {
    expect(parseTypedDateTime('8 Sep 2026 14:30', GB)).toBe('2026-09-08T14:30')
    expect(parseTypedDateTime('09/08/2026 2:30 PM', US)).toBe('2026-09-08T14:30')
    expect(parseTypedDateTime('2026-09-08T14:30', GB)).toBe('2026-09-08T14:30')
    expect(parseTypedDateTime('8 Sep 2026', GB)).toBe('2026-09-08T00:00')
    expect(parseTypedDateTime('now', GB, TODAY)).toBe('2026-11-22T09:05')
    expect(parseTypedDateTime('soon', GB)).toBeNull()
  })
})

describe('calendar and range', () => {
  it('starts the week on the organisation’s first day of week', () => {
    const mon = calendarWeeks(2026, 9, GB) // 1 Sep 2026 is a Tuesday
    expect(mon[0][0].iso).toBe('2026-08-31')
    expect(mon[0][1]).toMatchObject({ iso: '2026-09-01', day: 1, inMonth: true })
    const sun = calendarWeeks(2026, 9, US)
    expect(sun[0][0].iso).toBe('2026-08-30')
    expect(weekdayLabels(GB)[0].day).toBe(1)
    expect(weekdayLabels(US)[0].day).toBe(0)
    expect(calendarWeeks(2026, 9, GB).flat().filter((c) => c.inMonth)).toHaveLength(30)
  })

  it('checks min and max', () => {
    expect(inRange('2026-09-08', '2026-09-01', '2026-09-30')).toBe(true)
    expect(inRange('2026-08-31', '2026-09-01', null)).toBe(false)
    expect(inRange('2026-09-08T14:30', null, '2026-09-08T12:00')).toBe(false)
    expect(inRange('', '2026-09-01', null)).toBe(true)
  })
})
