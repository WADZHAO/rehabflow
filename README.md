# PersonalTrainingFlow

A bilingual (English / 中文) personal training companion for knee (meniscus) and ankle recovery, built around evidence-based protocols from Mayo Clinic, AAOS, HSS, Mass General, Kaiser Permanente, NIH/PMC, BMJ, and ACSM.

## Intent

PersonalTrainingFlow turns clinical personal training guidance into a daily, trackable practice. It is designed for someone recovering from a knee or ankle injury who wants a single place to:

- **Follow a phased plan.** Exercises are tagged by phase (1 → 3), intensity, target muscle group, and whether they require gym equipment, so the session can adapt to where the user is in recovery.
- **Understand the "why."** Each exercise carries cited guidance (e.g. AAOS, HSS, Kaiser PT program), bilingual step-by-step instructions, form tips, warning signs, and an embedded YouTube reference.
- **See the body.** An interactive front/back muscle map explains which muscles each exercise targets and why they matter for knee/ankle stability.
- **Track what matters.** Daily logging of mood, pain, and swelling, plus exercise completion, so trends are visible over weeks rather than lost to memory.
- **Stay safe.** Every exercise has explicit `safeFor` tags (knee / ankle / upper body) and warn conditions, making it easy to train the upper body while a lower-body injury heals.

The goal is not to replace a physical therapist — it is to make the prescribed work easier to execute consistently between clinic visits.

## Tech Stack

- **React 19** — UI, hooks-based state management
- **Vite 8** — dev server, HMR, production build
- **ESLint 9** — with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`
- **Vanilla JavaScript** (JSX, no TypeScript)
- **Browser localStorage** — persistence for logs and progress (no backend)
- **Inline SVG** — custom muscle map rendering
- **YouTube embeds** — exercise video references with timestamped starts

No backend, no database, no auth — the app runs entirely client-side and is deployable as static files.

## Development

```bash
npm install
npm run dev      # start Vite dev server with HMR
npm run build    # production build → dist/
npm run preview  # serve the production build locally
npm run lint     # run ESLint
```

## Project Structure

```
personaltrainingflow/
├── src/
│   ├── App.jsx        # Main app: exercise library, muscle map, tracker, logic
│   ├── main.jsx       # React entry point
│   └── assets/
├── public/
├── index.html
├── vite.config.js
└── eslint.config.js
```
