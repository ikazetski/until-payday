# До зарплаты / until-payday — Product & Technical Specification

Status: baseline specification for `feat/pwa-foundation`  
Source snapshot: uploaded `until-payday-feat-pwa-foundation.zip`  
Purpose: this document is the canonical project specification for future Spec-Driven Development work.

---

## 1. Product Context

`До зарплаты` is a mobile-first PWA for managing spending between salary dates. The product helps the user answer four core questions:

1. How much money is left until salary?
2. How much can be spent today without breaking the plan?
3. How is the current week going?
4. What caused past overspending or saving?

The application is currently backendless. All user data is stored locally on the user’s device. Existing user data must be treated as production data and must not be lost during refactors, feature work, migrations, or UI changes.

---

## 2. Technology Stack

Current stack:

- React + TypeScript
- Vite
- Zustand
- Tailwind CSS
- Recharts
- Vitest
- IndexedDB with localStorage fallback
- PWA installed/used on iPhone/Safari

Important scripts:

```bash
npm run dev
npm run lint
npm run build
npm run test:run
```

Every functional change must pass:

```bash
npm run lint
npm run build
npm run test:run
```

---

## 3. Branching & Delivery Rules

Production branch is treated as:

```text
feat/pwa-foundation
```

Large changes must not be committed directly to production. Use feature branches:

```bash
git checkout feat/pwa-foundation
git pull origin feat/pwa-foundation
npm run lint
npm run build
npm run test:run
git checkout -b <feature-branch-name>
```

Before merging back:

```bash
npm run lint
npm run build
npm run test:run
git checkout feat/pwa-foundation
git pull origin feat/pwa-foundation
git merge <feature-branch-name>
npm run lint
npm run build
npm run test:run
git push origin feat/pwa-foundation
```

---

## 4. Data Safety Requirements

The strongest non-functional requirement is:

> Never lose or corrupt existing user data.

This applies to:

- monthly budget
- salary day
- currency
- tracking start date
- recent expenses
- category names
- hidden category state
- category order
- historical `categoryNameSnapshot` on expenses
- IndexedDB data
- localStorage fallback data

Rules:

1. Do not change persisted schema without a migration.
2. Do not remove or rename persisted fields without a migration and tests.
3. Do not rewrite storage casually.
4. Any schema change must update `CURRENT_FINANCE_SCHEMA_VERSION`.
5. Any schema change must update migration tests.
6. Old expenses must continue to be readable.
7. Old category snapshots must continue to display correctly in history/analytics.
8. Any change touching storage must include regression tests.

---

## 5. Current Domain Model

### 5.1 Currency

```ts
export type CurrencyCode = "BYN" | "EUR" | "USD" | "RUB" | "UAH";
```

### 5.2 Expense

```ts
export type Expense = {
  id: string;
  amount: number;
  category: string;
  categoryNameSnapshot?: string;
  note?: string;
  createdAt: string;
};
```

Rules:

- `id` is generated client-side.
- `amount` is rounded through money helpers when added.
- `category` stores the category id.
- `categoryNameSnapshot` preserves the category name at expense creation time.
- `createdAt` is an ISO datetime string.
- Existing expenses without `categoryNameSnapshot` are migrated to include one.

### 5.3 Category

```ts
export type ExpenseCategoryItem = {
  id: string;
  name: string;
  system?: boolean;
  hidden?: boolean;
  order?: number;
};
```

Rules:

- Category ids are stable identifiers.
- Category names can change, but old expenses must keep historical names through `categoryNameSnapshot`.
- `hidden` controls visibility in the Add Expense modal.
- `order` controls display order.
- `system` marks default categories.
- `other` is always active and cannot be hidden.

Default categories:

```text
food / Еда
sport / Спорт
fuel / Топливо
entertainment / Развлечения
other / Другое
```

Category limits:

```text
MAX_ACTIVE_EXPENSE_CATEGORIES = 15
MAX_TOTAL_EXPENSE_CATEGORIES = 25
ALWAYS_ACTIVE_CATEGORY_ID = "other"
```

---

## 6. Storage Specification

### 6.1 Storage keys

```ts
FINANCE_STORAGE_KEY = "until-payday-finance"
FINANCE_STORAGE_BACKUP_KEY = "until-payday-finance-backup-before-v1"
```

### 6.2 Current schema

Current schema version in baseline:

```ts
CURRENT_FINANCE_SCHEMA_VERSION = 2
```

Current persisted data shape is represented by `PersistedFinanceState` and includes:

```text
monthlyBudget
salaryDay
currency
fixedExpenses
recentExpenses
trackingStartedAt
expenseCategories
```

### 6.3 Storage repositories

The app uses storage bootstrap logic with:

- IndexedDB repository
- localStorage repository fallback
- storage health checks
- storage migrations
- fallback state factory

The UI must not depend on whether data came from IndexedDB or localStorage.

### 6.4 Migration contract

Current migration path:

```text
legacy/no schema → v1 → v2
```

v2 adds/normalizes:

- category `hidden`
- category `order`
- normalized default categories
- expense `categoryNameSnapshot`

Migration must be idempotent: reading already-migrated data should normalize it safely without changing business meaning.

---

## 7. Finance Calculation Contract

The finance engine is the source of truth for budget calculations.

Primary function:

```ts
calculateFinance(input: FinanceInput): DerivedFinance
```

### 7.1 Input

```ts
export type FinanceInput = {
  monthlyBudget: number;
  salaryDay: number;
  currency: CurrencyCode;
  fixedExpenses: FixedExpense[];
  recentExpenses: Expense[];
  trackingStartedAt: string;
  now?: Date;
};
```

`now` is optional and used for deterministic tests. Runtime uses current date.

### 7.2 Salary cycle

The active cycle is calculated from:

- today
- salary day
- tracking start date

Cycle range:

```text
currentCycleStart = max(previousSalaryDate, trackingStartedAt start-of-day)
nextSalaryDate = next salary date after today
range = [currentCycleStart, nextSalaryDate)
```

All range checks use start-inclusive / end-exclusive semantics.

### 7.3 Current week range

Current week is calendar Monday–Sunday, intersected with the salary cycle.

This means:

- the first week of a cycle can be partial;
- the last week of a cycle can be partial;
- weekly calculations must respect salary-period boundaries.

### 7.4 Day snapshot model

The engine creates one `DaySnapshot` per day in the current cycle:

```ts
export type DaySnapshot = {
  date: Date;
  spent: number;
  budgetAtStartOfDay: number;
  plannedForDay: number;
  availableForDay: number;
  deviation: number;
  isToday: boolean;
  isPast: boolean;
};
```

For each day:

```text
spent = sum of expenses on that day
plannedForDay = budgetAtStartOfDay / daysRemainingInCycle
availableForDay = max(0, plannedForDay - spent)
deviation = plannedForDay - spent
budgetAtStartOfDay for next day = previous budgetAtStartOfDay - spent
```

All monetary values are rounded via `roundMoney`.

### 7.5 Period metrics

Period metrics are factual for the full salary cycle.

```text
totalSpent = sum(spent across cycle days)
budget = monthlyBudget
remaining = budget - totalSpent
savings = accumulated deviation
status = resolveStatus(remaining, savings)
```

Status rules:

```ts
if remaining < -0.01 => "red"
else if savings < -0.01 => "yellow"
else => "green"
```

### 7.6 Week metrics

Week metrics are calculated from the current week range intersected with the salary cycle.

```text
weeklySpent = sum(spent across current week days)
weeklyBudget = sum(plannedForDay across current week days)
weeklyRemaining = weeklyBudget - weeklySpent
weeklySavings = accumulated week deviation
weeklyTodayAvailable = min(today.availableForDay, max(0, weeklyRemaining))
weeklyStatus = resolveStatus(weeklyRemaining, weeklySavings)
```

### 7.7 DerivedFinance output

```ts
export type DerivedFinance = {
  remaining: number;
  daysLeft: number;
  dailyBudget: number;
  spentToday: number;
  todayAvailable: number;
  weeklyTodayAvailable: number;
  savings: number;
  fixedTotal: number;
  totalSpentCore: number;
  previousSalaryDate: Date;
  currentCycleStart: Date;
  nextSalaryDate: Date;
  status: Status;
  weeklyBudget: number;
  weeklyRemaining: number;
  weeklySavings: number;
  weeklySpent: number;
  weeklyStatus: Status;
  currentWeekStart: Date;
  currentWeekEnd: Date;
};
```

### 7.8 Finance invariants

These invariants must be preserved unless the spec is intentionally updated:

```text
remaining = monthlyBudget - totalSpentCore
weeklyRemaining = weeklyBudget - weeklySpent
totalSpentCore includes only expenses inside current salary cycle
weeklySpent includes only expenses inside current week range
spentToday includes only expenses on today
fixedTotal is separate and does not reduce period remaining
currentWeekStart/currentWeekEnd must be inside current salary cycle
```

---

## 8. Main Screen Specification

The main screen contains:

1. header
2. horizontal card carousel:
   - weekly card
   - period card
3. quick expense actions
4. recent transactions for selected card period
5. bottom navigation

### 8.1 Weekly card

Current fields:

```text
Остаток недели = weeklyRemaining
На сегодня = min(max(0, weeklyTodayAvailable), max(0, weeklyRemaining))
Center status = weeklySavings interpreted as Перерасход / Сэкономлено / По плану
Потрачено сегодня = spentToday
Прогресс недели = weeklySpent / weeklyBudget
```

Weekly card visual tone comes from `weeklyStatus`.

### 8.2 Period card

Current fields:

```text
Остаток периода = remaining
На сегодня = todayAvailable
Прогноз / По плану = savings
Потрачено = totalSpentCore
Прогресс периода = totalSpentCore / monthlyBudget
```

Period card visual tone comes from `status`.

Important wording rule:

- The period center metric is a forecast/plan deviation indicator.
- It must not be described as immediate factual debt if it is based on current spending rhythm.
- Current UI label uses `Прогноз` when non-zero and `По плану` when zero.
- Subtitle remains `по периоду`.

---

## 9. History Specification

History has two modes:

```text
Недели
Месяцы / periods
```

### 9.1 HistoryGroup

```ts
export type HistoryGroup = {
  id: string;
  title: string;
  subtitle?: string;
  total: number;
  limit: number;
  delta: number;
  expenses: Expense[];
  isCurrent: boolean;
  rangeStart: Date;
  rangeEndExclusive: Date;
};
```

### 9.2 Weekly history

Weekly history groups:

- cover up to 12 salary cycles;
- use calendar weeks intersected with salary periods;
- include partial weeks at salary-period boundaries;
- sort newest first;
- include `rangeStart` and `rangeEndExclusive` for historical analytics.

Weekly group fields:

```text
total = sum of expenses in visible week range
limit = derived.weeklyBudget calculated for visibleStart
delta = limit - total
rangeStart = visibleRange.start
rangeEndExclusive = visibleRange.endExclusive
```

### 9.3 Monthly/period history

Period groups:

```text
total = sum of expenses in salary cycle
limit = monthlyBudget
delta = monthlyBudget - total
rangeStart = cycleRange.start
rangeEndExclusive = cycleRange.endExclusive
```

### 9.4 Historical analytics

History card action opens Analytics for that group’s exact range.

Selected analytics range shape:

```ts
export type SelectedAnalyticsRange = {
  mode: "week" | "period";
  title: string;
  rangeStart: string;
  rangeEndExclusive: string;
};
```

When Analytics is opened from History:

- Analytics filters expenses by `[rangeStart, rangeEndExclusive)`.
- Analytics hides normal week/period tabs.
- Analytics disables local swipe between week/period.
- Analytics shows back action `← К истории`.
- Advice is hidden to avoid current-time advice for past periods.

When Analytics is opened through bottom navigation:

- `selectedAnalyticsRange` must be cleared.
- Normal current week/current period analytics must work as before.

---

## 10. Analytics Specification

Analytics has two runtime modes:

1. current analytics mode
2. historical analytics mode

### 10.1 Current mode

Current mode supports tabs:

```text
Неделя
Период
```

Current week expenses are filtered by current week range. Current period expenses are filtered by current salary cycle range.

### 10.2 Historical mode

Historical mode is driven by `SelectedAnalyticsRange` and filters expenses directly by selected range.

### 10.3 Category summary

Analytics groups expenses by:

```text
category id + categoryNameSnapshot or current category name
```

This is required so renamed categories do not rewrite historical category names.

Analytics summary includes:

```text
totalAmount
top3Share
topCategoryName
categories
chartCategories
```

If more than six categories are present, categories after top 5 are aggregated into `Остальное` for the chart.

### 10.4 Spending rhythm

Week mode:

```text
ПН ВТ СР ЧТ ПТ СБ ВС
```

Period mode:

- uses history-like week buckets;
- first bucket may be partial;
- last bucket may be partial;
- x-axis labels are compact: `Н1`, `Н2`, `Н3`, ...;
- tooltip shows exact date range, e.g. `10–12`, `27.4–3.5`.

---

## 11. Category Management Specification

Categories are managed in:

```text
Настройки → Категории расходов
```

Supported actions:

- add custom category
- hide category
- restore hidden category
- rename category
- move active category up/down

Rules:

1. Active categories appear in Add Expense modal.
2. Hidden categories do not appear in Add Expense modal.
3. Hidden categories remain valid for history and analytics.
4. `other` is always active.
5. `other` cannot be hidden.
6. `other` cannot be renamed.
7. Active category limit is 15.
8. Total category limit is 25, including hidden categories.
9. Category names are max 12 characters.
10. Duplicate category names are not allowed after trim/lowercase normalization.
11. A category with current-period expenses cannot be hidden.
12. Attempting to hide a category with current-period expenses should show toast, not repeated warning blocks under every category.

---

## 12. Add Expense Specification

Add Expense modal receives active categories only.

When expense is added:

- store creates new expense id;
- amount is rounded with money rounding;
- category id is stored;
- current category name is stored in `categoryNameSnapshot`;
- `createdAt` is current ISO datetime;
- expense is prepended to `recentExpenses`;
- persisted storage is updated;
- derived finance is recalculated;
- undo toast is shown.

Undo removes the last added expense by id.

---

## 13. Known Constraints & Design Decisions

### 13.1 Local-only data

The app currently has no backend. IndexedDB/localStorage is the source of truth.

### 13.2 No global swipe

Do not add global swipe between Home / Analytics / History because local swipe is already used for:

- main card carousel;
- Analytics week/period tabs;
- History week/month tabs.

### 13.3 Bundle warning

Vite currently warns that the main chunk is larger than 500 kB. This is a warning, not a failed build. Recharts is a likely contributor. Do not mix bundle optimization with finance logic changes.

### 13.4 Fixed expenses

`fixedExpenses` still exists in domain/storage and `fixedTotal` is calculated, but fixed-expense UI has been removed. Fixed expenses do not reduce `totalSpentCore` or `remaining` in the current engine.

---

## 14. Planned Categories — Future Feature Specification

This section defines the intended future behavior and prevents repeating the broken implementation attempt.

### 14.1 Product goal

Allow the user to mark one or more categories as planned categories. Examples:

```text
Аренда
Кредит
Подписки
Техника
Подарки
Здоровье
```

Planned expenses should not irritate the user by making the weekly card red simply because an expected large payment happened early in the week.

### 14.2 Required behavior

A planned expense must:

1. be included in factual period spending;
2. reduce period remaining;
3. be visible in History;
4. be visible in Analytics;
5. reduce the operational budget available for regular spending;
6. not be counted as regular weekly overspending;
7. not disappear from totals.

### 14.3 Required model change

Future schema should add:

```ts
export type WeeklyImpactMode = "normal" | "planned";

ExpenseCategoryItem.weeklyImpactMode?: WeeklyImpactMode;
Expense.categoryWeeklyImpactModeSnapshot?: WeeklyImpactMode;
```

Reason for expense snapshot:

- category name already uses historical snapshot semantics;
- weekly impact mode should do the same;
- changing a category later must not rewrite old expenses’ historical behavior.

### 14.4 Required finance contract for planned categories

Do not overwrite old field semantics without explicit view-model adaptation.

New derived fields should be explicit:

```ts
plannedPeriodSpent: number;
regularPeriodSpent: number;
weeklyTotalSpent: number;
weeklyRegularSpent: number;
weeklyPlannedSpent: number;
operationalPeriodBudget: number;
weeklyRegularBudget: number;
weeklyRegularRemaining: number;
weeklyRegularDeviation: number;
weeklyRegularStatus: Status;
```

Legacy aliases may exist for compatibility, but UI must not present regular-only deviation as factual saving.

Required invariant:

```text
Facts are always all expenses.
Weekly status may be based on regular expenses after planned expenses reduce operational budget.
UI must explicitly distinguish total, planned, and regular spending.
```

### 14.5 Required UI behavior for planned categories

Category Management:

- toggle: `Плановая`;
- toggle is not shown for `Другое`;
- explanatory text belongs in settings/info, not in Add Expense modal.

Weekly card:

- show regular weekly plan separately from planned expenses;
- if planned expenses exist, do not show misleading `Сэкономлено +X` after a large planned payment;
- preferred display:

```text
Обычные: 0 / 222,88
Плановые: 368,00
```

Period card:

- keep factual totals:

```text
Остаток периода = monthlyBudget - all period expenses
Потрачено = all period expenses
Прогресс периода = all period expenses / monthlyBudget
```

Analytics:

- donut/category totals include planned expenses;
- week KPI must not show regular-only `weeklySavings` as plain `Сэкономлено` when planned expenses exist.

History:

- current `delta = limit - total` becomes misleading if total includes planned and limit refers to regular budget;
- HistoryGroup should be extended before planned categories are enabled:

```ts
regularTotal: number;
plannedTotal: number;
hasPlannedExpenses: boolean;
```

### 14.6 Required tests for planned categories

Before merging planned categories, tests must cover:

1. old storage migrates safely to new schema;
2. old categories default to `weeklyImpactMode: "normal"`;
3. old expenses default to `categoryWeeklyImpactModeSnapshot: "normal"`;
4. new expenses snapshot current category weekly impact mode;
5. planned expense reduces period remaining;
6. planned expense is included in period total;
7. planned expense appears in history;
8. planned expense appears in analytics;
9. planned expense does not make weekly regular status red by itself;
10. regular expense still affects weekly status;
11. changing category mode after adding expense does not rewrite old expense behavior;
12. UI labels do not show misleading saving for planned-only weeks.

---

## 15. Architecture Assessment

Current architecture is acceptable for an MVP:

```text
src/domain     business/domain calculations
src/data       persistence, repositories, migrations
src/hooks      Zustand store
src/components UI components/screens
src/lib        date/money/helpers
```

The biggest architectural weakness is that UI components directly interpret low-level derived fields such as:

```text
weeklySavings
savings
weeklyBudget
weeklySpent
```

This is risky because when field semantics evolve, the UI can remain syntactically correct but become product-wrong.

### 15.1 Recommended future refactor

Add a view-model layer before adding more complex finance features:

```text
src/domain/viewModels/weeklyCardViewModel.ts
src/domain/viewModels/periodCardViewModel.ts
src/domain/viewModels/analyticsKpiViewModel.ts
src/domain/viewModels/historyGroupViewModel.ts
```

UI should receive already-labeled display models, for example:

```ts
type WeeklyCardViewModel = {
  title: string;
  amount: number;
  centerLabel: string;
  centerValue: number;
  centerSubtitle: string;
  spentLabel: string;
  spentValue: number;
  progressLabel: string;
  progressSpent: number;
  progressBudget: number;
  plannedLine?: {
    label: string;
    value: number;
  };
  tone: Status;
};
```

This would prevent UI from independently deciding that `weeklySavings > 0` always means `Сэкономлено`.

### 15.2 Refactor policy

Do not perform a large file restructure during active finance logic changes. Refactor in a separate branch and preserve behavior with tests.

Recommended sequence:

1. freeze current finance contract in tests;
2. add view-model tests;
3. move UI label logic into view-models;
4. update components to consume view-models;
5. then implement planned categories.

---

## 16. SDD Rules for This Project

For every meaningful future feature, create or update a spec before coding.

Recommended directory:

```text
docs/specs/
```

Recommended files:

```text
docs/specs/00-product-and-technical-spec.md
docs/specs/finance-calculation-contract.md
docs/specs/storage-and-migrations.md
docs/specs/feature-planned-categories.md
docs/specs/feature-historical-analytics.md
```

For this first step, it is acceptable to add this file as:

```text
docs/specs/00-product-and-technical-spec.md
```

### 16.1 Feature spec template

Each future feature spec should include:

```md
# Feature: <name>

## Goal

## Current behavior

## New behavior

## User stories / UX states

## Domain model changes

## Storage changes

## Calculation changes

## UI changes

## Edge cases

## Tests required

## Out of scope

## Rollout / migration plan
```

### 16.2 Required SDD workflow

Before implementation:

1. update the relevant spec;
2. define invariants;
3. define tests;
4. identify storage/migration impact;
5. only then change code.

During implementation:

1. keep commits small;
2. run tests after domain/storage changes;
3. do not mix UI polish, migration, calculation refactor, and bundle optimization in one commit.

After implementation:

1. update spec if actual behavior differs;
2. add regression tests for any bug found manually;
3. add release notes;
4. merge only after lint/build/tests and manual smoke test.

---

## 17. How To Keep This Spec Current

Whenever the project changes, update this spec in the same branch and commit as the code change.

Examples:

- If `schemaVersion` changes, update Section 6.
- If finance fields change, update Section 7.
- If History card semantics change, update Section 9.
- If Analytics KPI semantics change, update Section 10.
- If category rules change, update Section 11.
- If planned categories are implemented, move Section 14 from future spec to active behavior and update all affected contracts.

A code change that alters product behavior but does not update the spec should be treated as incomplete.

---

## 18. Assistant Usage Rule

For future ChatGPT work on this project, start prompts with:

```text
Use docs/specs/00-product-and-technical-spec.md as the source of truth.
Before suggesting code, check whether the change affects storage, finance calculations, history, analytics, or category rules.
If it affects the spec, update the spec first or tell me exactly what spec change is required.
Do not change finance semantics without adding tests.
Do not change storage schema without migration tests.
```

When asking for a new feature, include:

```text
Feature goal:
Files touched:
Expected UX:
Expected calculation behavior:
Storage impact:
Tests to add:
```

---

## 19. Baseline Manual Regression Checklist

Before merging major changes:

1. existing data loads;
2. budget/currency/salary day preserved;
3. categories preserved;
4. hidden categories preserved;
5. old expense category names preserved;
6. add expense works;
7. undo expense works;
8. weekly card values are mathematically consistent;
9. period card values are mathematically consistent;
10. current Analytics works;
11. historical Analytics from History works;
12. History weekly groups include partial weeks;
13. History period groups include range boundaries;
14. PWA reload preserves data;
15. lint/build/tests pass.
