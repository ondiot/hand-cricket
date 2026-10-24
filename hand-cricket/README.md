# Hand Cricket

A 3D, animated hand cricket game that runs in the browser. No build step, no dependencies.

## Play
Open `index.html` in any modern browser, or host it on GitHub Pages.

## Modes
- **Play vs PC**: you bat first, then the PC chases your target. If your number matches the PC's number, the batter is out.
- **2 Players (free play)**: both hands, no scoring.

## Runs
| Button | Hand pose |
|---|---|
| 1-4 | that many fingers |
| 5 | open palm facing up |
| 6 | thumbs up |
| 10 | open palm facing down |
| 20 | open hand after a chop |

Every number starts with a closed-fist chop, and the fingers open mid-chop.

## PC opponent
The PC learns your habits (online opponent modeling, no training step):
- Bowling: picks the number maximizing `P(you play u) * (u + V)`.
- Batting: picks the number maximizing `(1 - P(you bowl v)) * (v + V)`.
- First 5 balls use a balanced mix, and 15% of picks stay random.
- Tune `V`, `DECAY` and `EPS` near the top of the AI section in `script.js`.
- Learned data is saved in `localStorage` (key `hcAI`). Clear site data to reset it.

## Deploy on GitHub Pages
1. Push these files to a repo.
2. Settings -> Pages -> Deploy from branch -> `main` / root.
3. Open the URL GitHub gives you.

## Files
- `index.html`: page structure and overlays
- `style.css`: styles and 3D hand CSS
- `script.js`: 3D cube hand, animations, game logic, PC AI
