// Step timers: several can run at once (boil eggs while the sauce simmers), one per recipe step.
// Timer: { id, recipeId, recipeTitle, stepId, stepIndex, stepTitle, durationSeconds,
//          status: 'running'|'paused'|'done', endAt (epoch ms, while running), remainingSeconds (paused/done) }
// Remaining time is derived from the wall clock, so it stays correct after the JS thread is paused
// in background, after a browser tab is throttled, or after an app restart.

export const MAX_TIMERS = 4;
const STATUSES = ['running', 'paused', 'done'];

export const timerIdFor = (recipeId, stepId) => `${recipeId}:${stepId}`;

export const getTimerRemaining = (timer, now = Date.now()) => {
  if (!timer) return 0;
  if (timer.status === 'running') return Math.max(0, Math.ceil((timer.endAt - now) / 1000));
  return Math.max(0, timer.remainingSeconds ?? 0);
};

const markDone = timer => ({ ...timer, status: 'done', remainingSeconds: 0, endAt: undefined, notified: true });

/**
 * Restores timers saved by the app: the current list format, or the single timer object saved by
 * older versions. Timers that ran out while the app was closed come back as finished.
 */
export const restoreTimers = (stored, legacy, now = Date.now()) => {
  const list = Array.isArray(stored) ? stored : legacy && typeof legacy === 'object' ? [legacy] : [];
  const seen = new Set();
  return list
    .filter(timer => timer && typeof timer.recipeId === 'string' && STATUSES.includes(timer.status))
    .map(timer => {
      const restored = { ...timer, id: timerIdFor(timer.recipeId, timer.stepId ?? `idx${timer.stepIndex}`) };
      return restored.status === 'running' && !(restored.endAt > now) ? markDone(restored) : restored;
    })
    .filter(timer => !seen.has(timer.id) && seen.add(timer.id))
    .slice(0, MAX_TIMERS);
};

/** Running timers whose time is up at `now`, and the list with those marked as done. */
export const finishDueTimers = (timers, now = Date.now()) => {
  const finished = timers.filter(timer => timer.status === 'running' && now >= timer.endAt);
  if (!finished.length) return { finished, timers };
  const ids = new Set(finished.map(timer => timer.id));
  return { finished, timers: timers.map(timer => ids.has(timer.id) ? markDone(timer) : timer) };
};

/** Display order: running (soonest first), then paused, then finished. */
export const sortTimers = (timers, now = Date.now()) => [...timers].sort((a, b) =>
  STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || getTimerRemaining(a, now) - getTimerRemaining(b, now));
