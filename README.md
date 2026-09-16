# 🏎️ F1 Fantasy 2026 - Global #1 Dashboard

An advanced, data-driven analytical dashboard built for Formula 1 Fantasy managers aiming for the Global #1 spot in the 2026 season. 

This tool moves beyond basic fantasy pricing to integrate real-world telemetry (via the Jolpi Ergast API) directly into your lineup decisions. 

## 🚀 Features

- **Paddock Grid & Team Builder:** View all 2026 driver and constructor prices, expected points (xP), and live ownership stats at a glance.
- **Teammate Dominance Index (TDI):** Stop guessing. This app connects to real-world F1 telemetry to calculate exact Head-to-Head Qualifying Deltas and pace gaps between teammates. Know precisely who is inherently faster and underpriced.
- **Mini-League Rival Spy:** Track your fiercest rivals, their DRS Boost assignments, active chips, and exact lineup differentials against your team.
- **Out of Position Recovery (ORP):** Calculate true overtake potential for drivers starting lower on the grid than their raw pace suggests.
- **Dynamic HAR Integration:** Easily load your live F1 Fantasy (`.har`) payload to sync your exact bank budget, team value, and private league data.

## 🛠️ Tech Stack

- **Framework:** React + TypeScript + Vite
- **Styling:** Tailwind CSS + Lucide React Icons
- **Data Integrations:** Official F1 Fantasy JSON (via `.har`) + Jolpi Ergast F1 Telemetry API
- **Deployment:** Vercel

## ⚙️ Local Development

1. Clone the repository: `git clone https://github.com/QuisTech/f1-fantasy-2026.git`
2. Install dependencies: `npm install`
3. Run the telemetry extraction script to build your local database: `npm run update-data`
4. Start the dev server: `npm run dev`

## 🏆 The Goal
Designed specifically to eliminate noise and provide mathematically sound signal for World #1 contenders. Every metric serves a strategic purpose in the F1 Fantasy meta.
