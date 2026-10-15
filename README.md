# 2048

Classic 2048 built with HTML5, CSS3, and vanilla JavaScript. The board and animations use Canvas. No frameworks, dependencies, or build step.

## Play

Open `index.html` in a modern browser, or run:

```sh
python3 -m http.server 2048 --bind 127.0.0.1
```

Visit http://127.0.0.1:2048.

- Move with arrow keys, WASD, swipes, or the on-screen direction buttons.
- Merge matching tiles to reach 2048. Each merge adds its value to your score.
- Choose **Keep Playing** after reaching 2048, or **New Game** to restart.

Progress and the best score save locally when browser storage is available. Saves are separate for each browser and origin.

The layout fits the available viewport, including shorter windows and phone landscape orientation. Canvas rendering supports high pixel density and reduced motion preferences.

## Files

- `index.html`: interface and controls.
- `style.css`: classic styling and viewport layout.
- `engine.js`: movement, merging, spawning, and game-over detection.
- `game.js`: rendering, animations, input, and persistence.
- `tests/engine.test.cjs`: rule tests.
- `tests/browser-check.cjs`: browser gameplay checks.
- `tests/layout-check.cjs`: viewport and visibility checks.

## Verify

```sh
node --test tests/engine.test.cjs
```

With Playwright CLI and the local server running:

```sh
playwright-cli -s=2048 open http://127.0.0.1:2048
playwright-cli -s=2048 run-code --filename=tests/browser-check.cjs
playwright-cli -s=2048 run-code --filename=tests/layout-check.cjs
```

Browser checks overwrite saves in their test browser. Screenshots are saved in `tests/`.

Classic colors are preserved; some light score and tile colors do not meet WCAG AA contrast requirements. Keyboard controls and screen reader board announcements are provided.

Inspired by Gabriele Cirulli's 2048.
