# Yolk Rumble 🐔
A chaotic low-poly chicken arena game. Solo vs 3 bots, 3 rounds. 100% original, built with plain HTML/CSS/JS + Three.js (CDN).

## Controls
First person! Mouse = look · WASD = move · Shift = run · Space = jump · Hold click or F = fire egg blaster (Esc frees the mouse).

## Modes & maps
- **Flock Survival**: every chicken is hostile. Survive 5 waves (boss on wave 5). You have 100 HP that slowly regenerates.
- **Fox Siege**: foxes run for the Golden Egg in the middle and ignore you. Kill them all before the egg's health hits 0.
- Maps: *Sunny Farm* and *Frosty Orchard*. Add your own in `maps.js` (`build(group, R)` returns obstacles).
- Weapon feel (fire rate, spread, recoil) is the `W = {...}` block at the top of `game.js`.
Eggs = 1 pt, golden = 5 pts. Getting splatted costs you up to 2 points (the shooter steals them).

## Run locally
Just double-click `index.html` (needs internet for the Three.js CDN). Or run `python3 -m http.server` in this folder and open http://localhost:8000.

## Publish on GitHub Pages
1. Create a repo on github.com (public).
2. Upload `index.html`, `style.css`, `farm.js`, `maps.js`, `game.js`, `README.md`.
3. Repo **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**.
4. Wait ~1 minute: your game is at `https://YOUR-NAME.github.io/REPO-NAME/`.

## Tweak it
Top of `game.js`: `WAVES`, `FOX_DPS`, `PLAYER_HP`, and the weapon block `W`.
