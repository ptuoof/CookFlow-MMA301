// Single source of truth for recipe number limits.
// The create form, recipe normalization, QR import and the detail screen all read these,
// so a value accepted in one place is never rejected or clamped differently in another.
export const SERVINGS_MIN = 1;
export const SERVINGS_MAX = 50;
export const MINUTES_MAX = 1440; // prep / cook time per recipe, in minutes
export const TIMER_MINUTES_MAX = 600; // one step timer, in minutes
export const TIMER_SECONDS_MAX = TIMER_MINUTES_MAX * 60;
