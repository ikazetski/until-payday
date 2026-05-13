# Until Payday — Salary Cycle, Weekly Forecast, and Historical Budget Snapshot Update

## Context

This update covers three related fixes discovered during regression testing of the salary-cycle fix:

1. Weekly card terminology is misleading.
2. Historical period cards use the current monthly budget instead of the budget that was active during that historical period.
3. Period card forecast and analytics “overspend from plan” use different calculation semantics and must be clearly distinguished in UI/documentation.

## 1. Weekly Card Middle Metric

### Current issue

The weekly card can show labels such as:

- `Перерасход`
- `Сэкономлено`
- `По плану`

However, the displayed middle value is now treated as a weekly forecast / plan-based projection, not as the final factual result of the week.

### Required behaviour

The weekly card middle metric must use the same terminology pattern as the period card.

Use:

- Title: `Прогноз`
- Caption: `по неделе`

Expected visual structure:

```text
Прогноз
-3,03
по неделе
```

### Info tooltip update

The weekly card info tooltip must clarify that this value is a forecast/plan-based projection, not the factual remaining weekly balance.

Recommended text:

```text
Прогноз по неделе показывает ожидаемый результат недели при текущем темпе расходов.

Если значение отрицательное — при текущем темпе к концу недели ожидается перерасход.
Если значение положительное — при текущем темпе к концу недели ожидается остаток.

Фактический остаток недели отображается в верхней части карточки.
```

## 2. Historical Monthly / Period Budget Snapshot

### Current issue

The History screen uses the current `monthlyBudget` for all monthly/period history groups.

Example:

- Previous period: `10 Apr – 9 May`
- Actual budget during that period: `2700`
- Current period budget: `3200`

The previous period card incorrectly shows `3200`, which also makes historical overspend/remaining values incorrect.

### Required behaviour

Historical period cards must use the monthly budget that was active for that period.

The application must persist a budget snapshot per salary cycle / period.

Recommended persisted structure:

```ts
type PeriodBudgetSnapshot = {
  cycleStartDate: string;
  nextSalaryDate: string;
  monthlyBudget: number;
  currency: CurrencyCode;
  createdAt: string;
};
```

Recommended persisted field:

```ts
periodBudgetSnapshots: PeriodBudgetSnapshot[];
```

### Snapshot rules

A snapshot must be created/updated when:

1. A salary cycle is closed / new cycle starts.
2. The user changes the monthly budget or salary date while there is an existing current cycle.
3. A current cycle becomes historical.

Snapshot key:

```text
cycleStartDate + nextSalaryDate
```

This avoids duplicate snapshots for the same period.

### History screen rule

When building monthly/period groups:

1. Find snapshot matching the group range:
   - `cycleStartDate === group.rangeStart.toISOString()`
   - `nextSalaryDate === group.rangeEndExclusive.toISOString()`
2. If found, use `snapshot.monthlyBudget`.
3. If not found, fallback to current `monthlyBudget`.

Fallback is required for old users before the snapshot feature existed.

## 3. Difference Between Period Card Forecast and Analytics Overspend

### Period card

The period card `Прогноз` is a forward-looking estimate. It answers:

```text
What is the expected result by the end of the salary period if the current/recent spending pace continues?
```

This can produce a much larger negative value because it extrapolates future spending.

Example:

```text
Period card forecast: -2118,54
```

Meaning: by the end of the period, the app currently expects this result if spending pace continues.

### Analytics card

The analytics value `Перерасход от плана` is a current plan deviation. It answers:

```text
How far are actual expenses from the plan as of the selected point/range?
```

It is not the same as the period forecast.

Example:

```text
Analytics overspend from plan: -343,87
```

Meaning: current actual spending is 343,87 worse than the plan baseline used by analytics.

### Documentation note

These two values must not be expected to match unless they use the same formula and time horizon.

Recommended UI clarification:

- Period card: `Прогноз по периоду`
- Analytics: `Отклонение от плана` or `Перерасход от плана`

## 4. Regression Tests Required

### Weekly card terminology

Add a UI/label test if the project has component tests. If not, document as manual QA:

Expected:

```text
Weekly card middle metric title = Прогноз
Weekly card middle metric caption = по неделе
```

### Historical budget snapshots

Add domain tests for `buildMonthlyGroups`:

1. Current period uses current budget.
2. Previous period uses stored snapshot budget.
3. If no snapshot exists, previous period falls back to current budget.
4. Historical overspend/remaining is calculated using snapshot budget, not current budget.

### Storage migration

Add migration tests:

1. v3 storage without `periodBudgetSnapshots` migrates safely.
2. Invalid `periodBudgetSnapshots` normalizes to an empty array.
3. Existing valid snapshots are preserved.

## 5. Manual QA Checklist

Before production merge:

1. Set previous period budget to `2700`.
2. Start new period and set current budget to `3200`.
3. Open History → Months.
4. Verify:
   - Current period shows `3200`.
   - Previous period shows `2700`.
   - Previous overspend/remaining is calculated from `2700`.
5. Open weekly card.
6. Verify middle metric label is `Прогноз` / `по неделе`.
7. Open weekly info tooltip.
8. Verify tooltip explains forecast semantics.
9. Open period analytics.
10. Verify analytics value and period card forecast are understood as different indicators.
