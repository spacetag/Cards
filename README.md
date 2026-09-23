# Glass Cards

A note-per-day app made of frosted-glass cards. Swipe left and right between days,
or drag the Photos-style scrubber at the bottom to fly through weeks and months.
Sundays are tinted red. Each card has a title and a body, and a large toolbar sits
above the keyboard while you edit.

Built with **Expo SDK 57 / React Native 0.86** (iOS, Android and web).

## Features

- **One card per day**: two years back and two years ahead of today. Swipe to page.
- **Scrubber**: a strip of mini cards, one per day, like the Photos scrubber. The
  card under the centre grows, Sundays are red, the 1st of each month shows the
  month's name, and days with a note look written on. It snaps from card to card
  and moves the big cards as you drag, with a haptic tick for each day.
- **Glass**: native Liquid Glass (`expo-glass-effect`) on iOS 26+, with an `expo-blur`
  fallback on older iOS, Android and web.
- **Keyboard toolbar** (follows the keyboard):
  - **To-do** turns lines into `☐` items (or back into plain lines).
  - **Check** ticks and unticks items (`☑`).
  - **List** turns lines into `•` bullets.
  - **Outdent / Indent** moves the current line(s) by one level.
  - **Undo / Redo** works per day. Typing is grouped into bursts, and each toolbar
    action is its own step.
  - **Done** hides the keyboard.
- **Smart Return**: pressing Return on a list line continues the list. On an empty
  item, it moves the item out one level, then ends the list.
- **Keep typing while swiping**: swipe to another day with the keyboard open and
  the same field on the new day takes focus.
- Notes are saved automatically on the device (AsyncStorage).

## Running it

```bash
npm install
npx expo start          # then press i (iOS), a (Android) or w (web)
```

Every dependency is an SDK 57 version, so the app should run in Expo Go. If Expo
Go reports a missing native module, use a development build instead. For the real
Liquid Glass look, run on an iOS 26 device or simulator. For a standalone build use
`npx expo run:ios` / `npx expo run:android`, or EAS (`npx eas-cli@latest build`).

## Checks

```bash
npm test                # unit tests for the text editing logic and undo history
npm run typecheck
```

## Code layout

| Path | What it holds |
| --- | --- |
| `src/App.tsx` | Screen: pager, scrubber/toolbar switching, editing state, undo wiring |
| `src/components/DayCard.tsx` | One glass card (date header, title, body) |
| `src/components/Scrubber.tsx` | Photos-style day strip |
| `src/components/EditorToolbar.tsx` | Keyboard toolbar |
| `src/components/Glass.tsx` | Liquid Glass surface with the blur fallback |
| `src/lib/textOps.ts` | Pure to-do / list / indent / smart-Return operations |
| `src/lib/history.ts` | Per-day undo/redo stack |
| `src/lib/notes.ts` | Note storage hook |
| `src/lib/dates.ts` | Day index ↔ date helpers |
