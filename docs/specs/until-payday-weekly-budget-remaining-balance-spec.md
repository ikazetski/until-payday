# Until Payday — Weekly Budget Must Not Exceed Remaining Period Balance

## Context

A critical calculation bug was found on the Home weekly card.

Example from production-like state:

- Period remaining: `517.26 BYN`
- Current week: `1 Jun – 7 Jun`
- Days until salary: current week + 2 extra days
- Weekly remaining displayed: `687.42 BYN`

This is impossible from a budgeting perspective: the current week cannot have more remaining budget than the whole remaining salary period.

## Problem

The weekly budget / weekly remaining calculation can still be based on the original period budget allocation instead of the current remaining period balance.

This causes the weekly card to show an inflated weekly limit after the user has already spent a large part of the period budget.

## Expected behaviour

The current week budget must be derived from the remaining period balance and the number of days left in the current week versus the number of days left in the salary period.

The following invariant must always hold:

```text
weeklyRemaining <= remainingPeriodBalance
```

Where:

- `weeklyRemaining` = how much money is still available for the current week;
- `remainingPeriodBalance` = how much money is still available until salary.

If there are no expenses in the current week:

```text
weeklyBudget === weeklyRemaining
```

If there are expenses in the current week:

```text
weeklyBudget = weeklySpent + weeklyRemaining
```

## Recommended calculation

Let:

```text
periodRemaining = max(0, monthlyBudget - totalSpentCore)
periodDaysLeft = number of calendar days from today through the day before next salary
weekDaysLeft = number of calendar days from today through the current week end, clipped by next salary date
```

Then:

```text
weeklyRemaining = min(
  periodRemaining,
  roundMoney(periodRemaining * weekDaysLeft / periodDaysLeft)
)

weeklyBudget = roundMoney(weeklySpent + weeklyRemaining)
```

This means:

- if the current week is the last full/partial segment before salary, it receives only its proportional share of the remaining balance;
- the last remaining days after the week keep their own part of the period balance;
- weekly remaining can never exceed period remaining.

## Example

Salary period ends on `10 Jun`, so spendable days are `1 Jun – 9 Jun`.

```text
periodRemaining = 517.26
periodDaysLeft = 9
currentWeek = 1 Jun – 7 Jun
weekDaysLeft = 7
```

Expected:

```text
weeklyRemaining = 517.26 * 7 / 9 = 402.31
weeklyBudget = 402.31 if weeklySpent = 0
```

The weekly card must not show `687.42`.

## Non-goals

This fix must not change:

- salary cycle boundaries;
- history period grouping;
- persisted storage schema;
- category analytics;
- expense storage.

## Regression tests

Add finance engine tests for:

1. Weekly remaining is capped by period remaining.
2. Weekly budget is distributed from current remaining balance across remaining days.
3. Current week + final partial week split the period remaining balance correctly.
4. If the current week is the final partial week before salary, weekly remaining equals period remaining.
5. Weekly budget includes weekly spent plus remaining weekly allocation.

## Manual QA checklist

1. Create a salary period ending in 9 days.
2. Spend most of the period budget before the new week starts.
3. Open the weekly card at the start of the new week.
4. Verify `Остаток недели` is lower than or equal to `Остаток периода`.
5. Verify weekly progress denominator is not inflated by the original monthly budget.
6. Add an expense in the current week.
7. Verify weekly remaining and period remaining both decrease consistently.
8. Verify the final partial week still keeps its own share of the remaining period balance.

## Suggested commit message

```text
fix: derive weekly budget from remaining period balance
```
