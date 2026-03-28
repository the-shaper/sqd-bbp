<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a661423f-e552-4183-8e32-b52b74a2668d

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

### Multiplayer Development (Both Servers Required)

For real-time multiplayer collaboration, you need to run **two servers** simultaneously:

**Terminal 1 - PartyKit (WebSocket Server):**
```bash
npm run partykit:dev
```

**Terminal 2 - Express (API + Frontend):**
```bash
npm run dev
```

**Access the app:**
- Open `http://localhost:3000` in your browser
- For multiplayer testing, open multiple browser windows/tabs

### Restarting Servers

**To restart both servers:**

1. **Stop both terminals** (press Ctrl+C in each)
2. **Clear browser localStorage** (optional, for fresh testing):
   ```javascript
   // In browser console (F12):
   localStorage.clear()
   location.reload()
   ```
3. **Restart Terminal 1:** `npm run partykit:dev`
4. **Restart Terminal 2:** `npm run dev`

**Quick Restart Script (optional):**
Create a `restart.sh` file:
```bash
#!/bin/bash
pkill -f "partykit dev"
pkill -f "tsx server.ts"
sleep 1
npm run partykit:dev &
npm run dev
```

### Testing Multiplayer Locally

1. **Start both servers** (see above)
2. **Browser 1 (Chrome):** Login as admin → Create session
3. **Browser 2 (Firefox/Safari):** Join same session URL
4. **Test real-time sync:**
   - Create cards in one browser → appears in other
   - Move cursors → visible to all users
   - Edit cards → updates in real-time
