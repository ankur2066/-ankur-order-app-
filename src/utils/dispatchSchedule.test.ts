import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchBucket, formatDispatchDate } from './dispatchSchedule.ts';

test('dispatch buckets use the IST date and separate slots', () => {
  const today = '2026-11-08';
  assert.equal(dispatchBucket({ dispatchDate: today, dispatchSlot: 'morning' }, today), 'today_morning');
  assert.equal(dispatchBucket({ dispatchDate: '2026-11-09', dispatchSlot: 'evening' }, today), 'tomorrow_evening');
  assert.equal(dispatchBucket({ dispatchDate: '2026-11-06', dispatchSlot: 'morning' }, today), 'old_overdue');
  assert.equal(dispatchBucket({}, today), 'date_not_set');
});

test('dispatch labels use Aaj/Kal only for the actual IST date', () => {
  const now = new Date('2026-11-08T08:00:00+05:30');
  assert.match(formatDispatchDate('2026-11-08', 'morning', 'hi', now), /^आज/);
  assert.match(formatDispatchDate('2026-11-09', 'evening', 'hi', now), /^कल/);
  assert.match(formatDispatchDate('2026-11-06', 'evening', 'hi', now), /6/);
  assert.match(formatDispatchDate(undefined, 'morning', 'en', now), /Date not set/);
});

test('IST day boundary: just after midnight IST is already the next day even though UTC is still the previous date', () => {
  const now = new Date('2026-11-10T19:00:00Z'); // 00:30 IST on 11 Nov
  assert.match(formatDispatchDate('2026-11-11', 'morning', 'en', now), /^Today/);
  assert.match(formatDispatchDate('2026-11-12', 'evening', 'en', now), /^Tomorrow/);
  assert.doesNotMatch(formatDispatchDate('2026-11-10', 'evening', 'en', now), /^(Today|Tomorrow)/);
});
