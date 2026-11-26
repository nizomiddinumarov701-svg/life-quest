# LifeQuest — Cozy Modern RPG Life Gamifier

Turn your everyday habits and activities into an RPG adventure. Track exactly how much time you spend on every action, earn XP with streak multipliers, level up each skill independently, complete daily quests, unlock badges, and balance your 5 RPG attributes.

## Features

- **Activity & Skill Levels**: Every activity (Coding, Workout, Reading, Music, Cooking, or any custom skill) has its own **Level**, **XP progress bar**, mastery rank (*Novice → Apprentice → Adept → Expert → Master → Grandmaster → Legend*), and **Today / This Week / All-Time** counters.
- **Live Stopwatch + Quick Manual Log**: Start a live timer (persists across reloads and updates the browser tab title) with real-time XP ticking, or quick-log offline sessions (`+15m`, `+30m`, or custom hours/minutes + notes).
- **Cozy Modern RPG Gamification**:
  - **Dynamic Hero Class**: Evolves automatically from your strongest attributes (e.g., *Artificer*, *Astral Monk*, *Cozy Bard*, *Grand Polymath*).
  - **Weekly Boss Battles**: Deal damage with every minute tracked (with **Focus Crits** on 30m+/60m+ sessions), earn **Boss Trophies**, and tune difficulty (*Adaptive*, *Chill*, *Balanced*, *Hardcore*).
  - **Gold Coins & Tavern Rewards Shop**: Earn Gold from actions, quests, badges, and boss victories to redeem custom real-life treats and track long-term **Epic Goals**.
  - **Combo / Secondary Attributes**: Optionally split any activity 70% Primary / 30% Secondary across two RPG stats.
  - **Daily Quests & Streak Multipliers** (`1.0x` up to `2.0x` XP & Gold) + custom daily side-quests.
  - **14 Unlockable Achievements & Level-Up Celebrations** with confetti and Web Audio synthesized chimes (toggleable).
  - **Tiered 5-Axis RPG Attribute Radar Chart** (*Mind*, *Body*, *Craft*, *Social*, *Vitality*) that auto-expands as you level up.
- **Time & Level Analytics**: Timeframe switcher (*Today*, *Last 7 Days*, *Last 30 Days*, *All Time*), interactive SVG Donut chart, 7-day focus rhythm bar chart, Activity Level Leaderboard, and filterable Action History log.
- **Local-First & Private**: Saves automatically in your browser (`localStorage`) with **JSON Backup Export & Import**. Zero external runtime dependencies.

## Quick Start

```bash
node server.js
```

Then open [http://127.0.0.1:4173](http://127.0.0.1:4173) in your browser.

## Run Tests

```bash
node --test tests/rpgEngine.test.mjs
```
