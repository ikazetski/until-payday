# Until Payday — Critical Fix Specification: Salary Period Boundary and Forecast

## Status
Draft for implementation review.

## Context
The app currently has critical defects in salary-period calculation and period forecast display:

1. When the salary cycle rolls over automatically at midnight, the app can start a new period using the old monthly limit and then incorrectly jump back to a previous period when the user changes the next salary date.
2. The salary date configuration appears to be based primarily on a day-of-month value rather than a concrete next salary date. This is unsafe because real salary cycles can be shorter or longer than a calendar month.
3. The period forecast can become implausible near the end of the period because it appears to extrapolate from accumulated deviation or broad period average rather than a recent spending pace.
4. The Budget and Salary modal can show a month/day that does not match the date shown on the period card.

## Goals

1. Store and use a concrete next salary date for the active period.
2. Allow salary periods of any realistic length, including periods shorter than 30 days and longer than 31 days.
3. Prevent the app from jumping back to an older period when the user edits the next salary date.
4. Keep old user data safe through storage migration.
5. Make the period forecast more credible and less volatile near the end of the period.
6. Keep the Budget and Salary modal synchronized with the active period card.

## Non-goals

1. Do not allow users to select arbitrary salary dates many months ahead in the production UI.
2. Do not redesign the whole budget model.
3. Do not delete or rewrite historical period data.
4. Do not change category management behavior as part of this fix.

## Data model changes

### Add persisted field

Add a persisted field representing the concrete next salary date:

```ts
configuredNextSalaryDate?: string;
```

Expected format:

```text
YYYY-MM-DD
```

Example:

```text
2026-06-10
```

### Existing field compatibility

The existing `salaryDay` field may remain for backward compatibility and quick UI display, but it must not be the only source of truth for the active salary cycle.

The active cycle should be derived from:

1. `currentCycleStart`
2. `configuredNextSalaryDate`
3. fallback legacy `salaryDay` only when no concrete next salary date is available

## Storage migration

### Schema version

Increase storage schema version from `2` to `3`.

### Migration from v2 to v3

For existing users:

1. Preserve all existing transactions, categories, history, currency, limit, and settings.
2. Create `configuredNextSalaryDate` from the existing salary configuration.
3. The generated date must be the next valid salary date relative to the app date/current date.
4. Do not reset the app state.
5. Do not delete period history.
6. Do not move transactions between periods during migration unless the existing app already performs an explicit rollover.

## Period calculation rules

### Active cycle

The active period must be treated as:

```text
[currentCycleStart, configuredNextSalaryDate)
```

That means:

- the start date is included;
- the next salary date is excluded from the previous period;
- the day before salary is the last day of the old period;
- the salary day itself starts the new period.

Example:

```text
currentCycleStart = 2026-05-08
configuredNextSalaryDate = 2026-06-10
active period = 2026-05-08 through 2026-06-09
new period starts = 2026-06-10
```

### Variable period length

The app must not assume that a period is always 30 or 31 days.

Valid examples:

```text
2026-05-08 → 2026-06-10
2026-06-10 → 2026-07-06
2026-07-06 → 2026-08-08
```

These periods have different lengths and must all be supported.

### Editing next salary date

When the user edits the next salary date in settings:

1. The selected month/day must be saved as a concrete date.
2. The current active period must not be recalculated backward from `salaryDay` alone.
3. The app must not jump to a previous period.
4. The card and the modal must show the same next salary date.

## Budget and Salary modal rules

The modal must initialize its selected month/day from `configuredNextSalaryDate` when available.

Fallback order:

1. `configuredNextSalaryDate`
2. active cycle `nextSalaryDate`
3. legacy salary day calculation

The month selector should still allow only current or next month in production UI, but internally the app must store the selected value as a full date.

## Forecast calculation rules

### Problem

Near the end of a period, the forecast can show an unrealistic value, for example:

```text
Period remaining: -1195.11
Days left: 2
Forecast: -2473
```

This can look implausible if recent spending has become low.

### Expected behavior

The period forecast should estimate projected end-of-period balance using recent spending behavior, not only accumulated overspend or a naive average across the whole period.

Recommended approach:

1. Calculate actual spending so far.
2. Calculate days remaining until `configuredNextSalaryDate`.
3. Estimate future spending using a recent daily pace.
4. Use a bounded lookback window such as the last 7 days or the available period length if shorter.
5. If there are no recent expenses, forecast should not aggressively worsen without evidence.
6. The forecast may still be negative if the period is already overspent.

Example intent:

```text
projectedEndSpend = spentSoFar + recentDailySpendRate * remainingDays
periodForecast = monthlyLimit - projectedEndSpend
```

The exact formula can be refined, but it must avoid explosive deterioration near period end when recent spending is low.

## Regression test requirements

Add or update automated tests for:

1. `2026-05-08 → 2026-06-10` period range.
2. `2026-06-10 → 2026-07-06` period range.
3. `2026-07-06 → 2026-08-08` period range.
4. Period longer than 31 days.
5. Period shorter than 30 days.
6. Editing next salary date must not jump back to the previous period.
7. Budget modal initialization must use the concrete next salary date.
8. Storage schema v2 must migrate to v3 without data loss.
9. Forecast must not worsen aggressively near the end of period when recent daily spending is low.

## Manual test checklist

Before merging:

1. Existing user data loads successfully.
2. Monthly limit remains intact.
3. Currency remains intact.
4. Categories remain intact.
5. Existing transactions remain intact.
6. Period history remains intact.
7. Card shows the correct next salary date.
8. Budget and Salary modal shows the same month/day as the card.
9. Selecting `10 June` after a period that started on `8 May` does not jump back to May or April.
10. Forecast looks credible in the last two days of a period.
11. History and analytics still open successfully.
12. Quick expense still works.

## Acceptance criteria

The fix is acceptable only if:

1. `npm run lint` passes.
2. `npm run build` passes.
3. `npm run test:run` passes.
4. Manual test for `8 May → 10 June` passes.
5. Manual test for modal/card date synchronization passes.
6. Migration from old storage passes without data loss.
7. Vercel Preview smoke test passes on desktop and iPhone/Safari.
