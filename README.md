# Click Speed Tester

A polished, feature-rich CPS (Clicks Per Second) tester built with vanilla HTML, CSS, and JavaScript.

This project started as a basic click counter and was upgraded into a full analytics-style tester with live metrics, anti-cheat filtering, export support, and responsive UX.

## Features

- Real-time **Live CPS** (last 1 second window)
- **Peak CPS**, **Average CPS**, and persistent **Best CPS**
- Session modes:
  - `5s`
  - `10s`
  - `30s`
  - `Infinite`
- Start-on-first-click timing (fair session starts)
- Mouse and keyboard (`Space`) input support
- Split input analytics:
  - Mouse CPS
  - Spacebar CPS
- Advanced stats:
  - Consistency
  - Fastest burst
  - Reaction time
  - Stamina
- Anti-cheat filtering for impossible click intervals
- Live CPS line graph (canvas-based)
- Export session results as JSON
- Mobile support:
  - Touch input
  - Vibration feedback (supported devices)
  - Fullscreen attempt on session start
- Responsive, accessibility-improved UI

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript (ES6+)
- Canvas API for chart rendering
- `localStorage` for Best CPS persistence

## Project Structure

```text
.
├── index.html

├── style.css

├── script.js

└── favicon.ico
```

## How to Run

To run it you can go through my live website on: https://vivid162veejayant.github.io/CPS-Tester/

## Controls

- `Start` to arm a session
- First click begins actual timing/counting
- Click `Click me fast!` or press `Space`
- `Stop` to end session
- `Reset` to clear current session
- `Reset Best CPS` to clear persisted best score
- `Export` to download session stats as JSON

## Data and Metrics Notes

- **Live CPS** is measured as clicks within the most recent 1-second window.
- **Best CPS** is constrained to a realistic range and saved in `localStorage`.
- **Fastest burst** is computed from the maximum clicks seen in any rolling 1-second window.

## Accessibility and UX

- Keyboard-friendly interactions
- Visible focus styles
- Reduced-motion support for users who prefer less animation
- Mobile-friendly layout and touch interaction tuning

## License

Standard MIT License applied
