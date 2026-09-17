# 🏎️ F1 Fantasy 2026 - Global #1 Dashboard

An advanced, data-driven analytical dashboard built for Formula 1 Fantasy managers aiming for the Global #1 spot in the 2026 season. 

This tool moves beyond basic fantasy pricing to integrate real-world telemetry (via the Jolpi Ergast API) directly into your lineup decisions. 

## 🌐 Live Application

- **Live URL:** [https://f1-fantasy-2026-nine.vercel.app/](https://f1-fantasy-2026-nine.vercel.app/)

## 🚀 Features

- **Multi-Squad Management:** Seamlessly manage and optimize 3 independent squads (`T1: MichQuis`, `T2: QuisMich`, `T3: SmichQui`) across **SAFE**, **RISKY**, and **VALUE** quantitative modes.
- **Client-Side Monte Carlo Simulation:** Runs 1,000-iteration weather, Safety Car, and chaos simulations per circuit directly in the client browser with zero server latency.
- **Instant Knapsack Optimizer:** Evaluates all 5 Drivers + 2 Constructors permutations with budget pruning under 50ms.
- **Paddock Grid & Team Builder:** View all 2026 driver and constructor prices, expected points (xP), and live ownership stats at a glance.
- **Teammate Dominance Index (TDI):** Connects to real-world F1 telemetry to calculate exact Head-to-Head Qualifying Deltas and pace gaps between teammates.
- **Mini-League Rival Spy:** Track your fiercest rivals, their DRS Boost assignments, active chips, and exact lineup differentials against your team.
- **Out of Position Recovery (ORP):** Calculate true overtake potential for drivers starting lower on the grid than their raw pace suggests.
- **Dynamic HAR Integration:** Easily load your live F1 Fantasy (`.har`) payload to sync your exact bank budget, team value, and private league data with automatic deduplication.

## 🛠️ Tech Stack

- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS + Lucide React Icons
- **Simulation Engine:** Client-side Monte Carlo & Knapsack optimization
- **Data Integrations:** Official F1 Fantasy JSON (via `.har`) + Jolpi Ergast F1 Telemetry API
- **Deployment:** Vercel (Static SPA)

## ⚙️ Local Development

1. Clone the repository: `git clone https://github.com/QuisTech/f1-fantasy-2026.git`
2. Install dependencies: `npm install`
3. Run the telemetry extraction script to build your local database: `npm run update-data`
4. Start the dev server: `npm run dev`

## 🏆 The Goal
Designed specifically to eliminate noise and provide mathematically sound signal for World #1 contenders. Every metric serves a strategic purpose in the F1 Fantasy meta.
