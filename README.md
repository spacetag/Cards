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

## Explore mode (National Geographic)

Tap **Explore** in the header to switch to a separate mode that deals out National
Geographic stories one card at a time (**Notes** switches back).

- Each story loads its live nationalgeographic.com page, which **scrolls itself**.
  Touching the page pauses it for a moment; the bottom bar pauses/resumes it and
  cycles the speed (1×, 2×, 3×). A banner shows when you reach the end.
- **Swipe left** to skip to the next story.
- **Swipe right** to save it for later with a thumbs up.
- The **thumbs up** button likes a story without moving on; the skip and save
  buttons do the same as the swipes.
- The **bookmark** pill opens your saved stories: tap one to open it, or remove it.
- When you've been through every story, you can deal the skipped ones again.
- On web, browsers won't let the site be embedded, so cards show the story's
  summary with a link out instead of the auto-scrolling page.

The stories are listed in `src/lib/natgeo.ts`.

## Running it

```bash
npm install
npx expo start          # then press i (iOS), a (Android) or w (web)
```

Every dependency (including `react-native-webview`) is an SDK 57 version, so the app should run in Expo Go. If Expo
Go reports a missing native module, use a development build instead. For the real
Liquid Glass look, run on an iOS 26 device or simulator. For a standalone build use
`npx expo run:ios` / `npx expo run:android`, or EAS (`npx eas-cli@latest build`).

## Checks

```bash
npm test                # unit tests for text editing, undo history and the reading list
npm run typecheck
```

## Code layout

| Path | What it holds |
| --- | --- |
| `src/App.tsx` | Notes / Explore mode switch; notes screen: pager, scrubber/toolbar switching, editing state, undo wiring |
| `src/components/ExploreScreen.tsx` | Explore mode: swipeable story card, controls, saved list |
| `src/components/ArticleView.tsx` | Auto-scrolling WebView that reports swipes (`.web.tsx`: summary card) |
| `src/lib/natgeo.ts` | The National Geographic stories |
| `src/lib/reading.ts` | Pure skip / save / like operations; `useReading.ts` persists them |
| `src/components/DayCard.tsx` | One glass card (date header, title, body) |
| `src/components/Scrubber.tsx` | Photos-style day strip |
| `src/components/EditorToolbar.tsx` | Keyboard toolbar |
| `src/components/Glass.tsx` | Liquid Glass surface with the blur fallback |
| `src/lib/textOps.ts` | Pure to-do / list / indent / smart-Return operations |
| `src/lib/history.ts` | Per-day undo/redo stack |
| `src/lib/notes.ts` | Note storage hook |
| `src/lib/dates.ts` | Day index ↔ date helpers |
