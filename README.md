# Hand Cricket

A 3D animated hand-cricket game that runs in the browser with no build step.

## Modes
- **Solo vs PC**: play against the local adaptive AI.
- **Private online team rooms**: create a room, set a player limit (2–12) and 2–4 teams, then share the six-character room code. No public matchmaking. Players are assigned to teams as they join; the host starts once at least two players have joined.
- In each online round, every player submits a hand value. Values unique within the round add to their team's score; duplicate values cancel for those players.

## Supabase setup
1. Create a Supabase project.
2. In Authentication settings, enable **Anonymous Sign-Ins**.
3. Run all of `supabase-setup.sql` in the Supabase SQL Editor.
4. Copy the Project URL and publishable key (or legacy anon key) from Project Settings → API into `config.js`.
5. Deploy to GitHub Pages or serve through a local HTTP server. Online play does not work from a `file://` URL.

Only the publishable/anon key belongs in `config.js`. **Never put a service-role or secret key in browser code.**

## Hand values
| Button | Hand pose |
|---|---|
| 1–4 | that many fingers |
| 5 | open palm facing up |
| 6 | thumbs up |
| 10 | open palm facing down |
| 20 | open hand after a chop |

## Files
- `index.html`: game and private-room UI
- `style.css`: layout and 3D hand styles
- `script.js`: animations, solo game, PC AI
- `online.js`: Supabase private-room client
- `config.js`: public Supabase configuration
- `supabase-setup.sql`: schema, RLS, and database RPC functions
