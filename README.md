# Math Balloon Pop

Math Balloon Pop is a browser webcam game built with React, TypeScript, Vite, Tailwind CSS, and MediaPipe Pose Landmarker.

The player controls a horizontal catcher using body movement and pops the balloon with the correct math answer. Wrong pops or missed balloons reduce lives.

## Features

- Webcam permission and camera state handling
- Real-time pose tracking with shoulder midpoint primary signal
- Fallback signals: nose and hip midpoint
- Signal smoothing to reduce jitter
- Calibration countdown before gameplay
- Mirrored webcam preview and corrected control mapping
- Age-based difficulty bands from 5-6 up to 15-16
- Operator selection: addition, subtraction, multiplication, division, or all
- RequestAnimationFrame game loop with answer balloon spawns
- Collision detection, score, streak, lives, timer, and active equation prompt
- Pause, resume, restart, and game-over states
- Local high score persistence per selected difficulty/operator set
- Sound toggle and simple catch particle effects
- Tracking debug mode with overlay lines and telemetry

## Run Locally

1. Install dependencies:

```bash
npm install
```

1. Start development server:

```bash
npm run dev
```

1. Build production bundle:

```bash
npm run build
```

## Notes

- The app needs webcam permissions in the browser.
- Pose model assets are loaded from MediaPipe CDN at runtime.
