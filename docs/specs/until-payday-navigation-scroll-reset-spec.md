# Until Payday — Navigation Scroll Reset Fix

## Context

A UI navigation bug was identified in the PWA:

When the user scrolls down on one screen and then switches to another app screen, the next screen opens at approximately the same vertical scroll position instead of starting from the top.

Example:

1. User opens Home.
2. User scrolls down.
3. User switches to History or Analytics.
4. The target screen is displayed from the middle of the page instead of the top.

## Expected behaviour

Every top-level screen transition must reset the page scroll to the top.

Affected app-level screens:

- Home
- Analytics
- History

When `activeTab` changes, the app must scroll to:

```text
top = 0
left = 0
```

The reset must be instant, not animated, because it is part of navigation.

## Implementation rule

The scroll reset should be handled at the app shell level where the top-level tab state is managed.

Current suitable location:

```text
src/Index.tsx
```

The implementation should:

1. Run when `activeTab` changes.
2. Run after React has rendered the target screen.
3. Reset `window`, `document.documentElement`, and `document.body` scroll positions for better iOS/Safari/PWA compatibility.
4. Avoid changing business logic, storage, calculations, or screen-specific state.

## Recommended implementation

Add a helper:

```ts
function scrollPageToTop() {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "auto",
  });

  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}
```

Add effect in `Index.tsx`:

```ts
useEffect(() => {
  if (!isHydrated) return;

  const animationFrameId = window.requestAnimationFrame(scrollPageToTop);

  return () => {
    window.cancelAnimationFrame(animationFrameId);
  };
}, [activeTab, isHydrated]);
```

## Non-goals

This fix must not:

- reset scroll on every render;
- reset scroll when the user simply adds an expense;
- reset scroll when derived finance values refresh every minute;
- change expense calculations;
- change salary cycle calculation;
- change history aggregation;
- change persisted storage schema.

## Manual QA checklist

1. Open Home.
2. Scroll down.
3. Tap History.
4. Verify History opens from the top.
5. Scroll down in History.
6. Tap Analytics.
7. Verify Analytics opens from the top.
8. Scroll down in Analytics.
9. Tap Home.
10. Verify Home opens from the top.
11. Repeat in installed PWA mode on iPhone/Safari if possible.
12. Verify adding an expense does not unexpectedly scroll the current screen to top.
13. Verify automatic refresh/derived recalculation does not unexpectedly scroll the screen to top.

## Regression risk

Low.

This is a UI shell behaviour change only. It does not affect:

- storage;
- migrations;
- finance engine;
- history engine;
- analytics engine;
- expense data.

## Suggested commit message

```text
fix: reset scroll on top-level navigation
```
