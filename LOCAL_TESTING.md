# Local Testing Guide - Beyond Bullet Points

## Quick Start

### 1. Start PartyKit Server (Terminal 1)

```bash
npm run partykit:dev
```

**Expected output:**
```
🎈 PartyKit v0.0.115
Build succeeded, starting server...
[pk:inf] Ready on http://0.0.0.0:1999
[pk:inf] - http://127.0.0.1:1999
[pk:inf] - http://192.168.1.146:1999
```

**Keep this terminal running!**

### 2. Start Express Backend (Terminal 2)

```bash
npm run dev
```

**Expected output:**
```
Server running on http://localhost:3000
```

**Keep this terminal running too!**

### 3. Verify Both Servers Are Running

Open a third terminal and run:

```bash
# Check Express
curl http://localhost:3000/api/sessions

# Check PartyKit
curl http://localhost:1999/health
```

Both should return JSON responses (Express may return empty array `[]` if no sessions exist).

---

## Testing Multiplayer Functionality

### Test 1: Basic Connectivity

**Setup:**
1. Open Chrome: `http://localhost:3000`
2. Login with admin password: `shazam!`
3. Create a new session
4. Copy the session URL (e.g., `http://localhost:3000/bdo-k4d3`)

**In Browser 1 (Chrome - Admin):**
- Navigate to the session URL
- Complete onboarding (or skip if already done)
- You should see the canvas

**In Browser 2 (Firefox/Safari - Guest):**
- Open incognito/private window
- Navigate to same session URL
- **First-time users:** You should see profile prompt asking for name and color
- Enter name and select color
- Click "Join Session"

**Expected Results:**
- Both browsers show "🟢 Connected" in top-right
- Active users indicator shows "2 active"
- You see two avatars in the top-right corner

---

### Test 2: Real-Time Card Creation

**In Browser 1 (Admin):**
1. Click "+" button to add a new card in any column
2. Type: "Test card from admin"
3. Press Enter or click outside to save

**In Browser 2 (Guest):**
- Watch the same column
- Card should appear within 1-2 seconds
- Toast notification: "place: New card added by collaborator"

**Verify:**
- [ ] Card appears in Browser 2 automatically
- [ ] Card number is consistent in both browsers
- [ ] Content matches exactly

---

### Test 3: Real-Time Card Editing

**In Browser 2 (Guest):**
1. Double-click the card you just created
2. Edit the text: "Test card from admin - edited by guest"
3. Press Enter or click Save

**In Browser 1 (Admin):**
- Watch the card
- Content should update immediately

**Verify:**
- [ ] Card content updates in real-time
- [ ] No page refresh needed
- [ ] Edit mode works in both browsers

---

### Test 4: Card Deletion

**In Browser 1 (Admin):**
1. Click on a card to select it
2. Look for delete option (usually in card menu or RightPanel)
3. Delete the card

**In Browser 2 (Guest):**
- Card should disappear immediately

**Verify:**
- [ ] Card removed from both browsers
- [ ] Card numbers update correctly

---

### Test 5: Card Reordering

**In Browser 1 (Admin):**
1. Create 3 cards in the same column
2. Drag and drop to reorder them

**In Browser 2 (Guest):**
- Cards should reorder in real-time

**Verify:**
- [ ] Order changes reflected immediately
- [ ] Card numbers update (1, 2, 3)

---

### Test 6: Connection Lines

**In Browser 1 (Admin):**
1. Create two cards in different columns
2. Click connection mode (usually a button in toolbar)
3. Drag from one card to another to create a connection line

**In Browser 2 (Guest):**
- Connection line should appear automatically

**Verify:**
- [ ] Purple connection line visible in both browsers
- [ ] Line updates if cards move

**Test Deletion:**
1. In Browser 2, delete a card that has connections
2. In Browser 1, connections should be removed

---

### Test 7: User Presence & Cursors

**In Browser 1 (Admin):**
1. Look at top-right corner
2. You should see:
   - Your avatar with your color
   - Guest's avatar with their color
   - "2 active" indicator
   - "🟢 Connected" status

**In Browser 2 (Guest):**
1. Move your mouse around the canvas
2. In Browser 1, you should see a cursor with the guest's name following your mouse

**Note:** Cursor tracking requires the guest to be moving their mouse on the canvas area.

---

### Test 8: Disconnection Handling

**In Browser 2 (Guest):**
1. Close the browser tab

**In Browser 1 (Admin):**
- Watch the active users indicator
- Should change from "2 active" to "1 active" within 30 seconds
- Guest's avatar should disappear

**Reconnection:**
1. Reopen Browser 2 with same URL
2. Enter same name
3. Should reconnect automatically
4. Browser 1 should show "2 active" again

---

### Test 9: Multiple Users (3+ Browsers)

**Setup:**
1. Open Browser 1: Chrome (Admin)
2. Open Browser 2: Firefox (Guest 1)
3. Open Browser 3: Safari (Guest 2)
4. All navigate to same session

**Test:**
- Create cards in different browsers
- Edit cards simultaneously
- Verify all browsers stay in sync

**Expected:**
- All 3 browsers show "3 active"
- All changes sync to all browsers
- No conflicts or data loss

---

## Browser Developer Tools Testing

### When Multiplayer Looks Dead But The App Says Connected

Use this checklist whenever you see `Only you`, stale avatars, or admin session control says `WebSocket connection error`:

1. Check which port PartyKit is actually using.
   - Run `lsof -i :1999`
   - You want to see `workerd` or PartyKit listening on `1999`
   - If PartyKit starts on a random port like `63429`, the browser and backend are talking to the wrong server

2. Clear out any old `workerd` or `partykit dev` process before restarting.
   - `pkill -f "partykit dev"`
   - If needed, `kill -9 <pid>` on the stale `workerd`
   - Then restart with `npm run partykit:dev`

3. Confirm both sides are pointed at the same realtime host.
   - Browser client should use `VITE_PARTYKIT_HOST=localhost:1999`
   - Express should use `PARTYKIT_HOST=localhost:1999`

4. Make sure admin and guest are not sharing the same saved profile.
   - Admin and guest should be different identities
   - If you test in one browser profile, clear `bbp_user_profile` and `bbp_user_id`
   - Best practice: use a separate browser profile or private/incognito window for the guest

5. Look at the PartyKit terminal, not just the browser console.
   - You should see the room start on `1999`
   - When clients join, the room should emit live snapshot/presence logs
   - If the browser says `Connected` but PartyKit shows nothing, the browser is not reaching the active PartyKit server

### Check WebSocket Connection

**Chrome/Firefox:**
1. Press F12 to open DevTools
2. Go to "Network" tab
3. Filter by "WS" (WebSocket)
4. Look for connection to `localhost:1999`
5. Click on it to see messages

**What to look for:**
- Connection status: 🟢 101 Switching Protocols
- Messages sent/received
- No red errors

### Check Console for Errors

1. Open DevTools (F12)
2. Go to "Console" tab
3. Look for:
   - 🔴 Red errors (bad)
   - 🟡 Yellow warnings (investigate)
   - 🟢 Info logs (normal)

**Common expected logs:**
```
[PartyKit] Connected
[PartyKit] User connected to room session-bdo-k4d3: conn-xxx
[PartyKit] Disconnected
```

---

## Debugging Common Issues

### Issue 1: "Disconnected" Status

**Symptoms:**
- Top-right shows "🔴 Disconnected"
- No real-time updates

**Check:**
```bash
# Is PartyKit running?
curl http://localhost:1999/health

# Should return:
{"status":"ok","room":"test","connections":0,"users":0,...}
```

**Fix:**
1. Check Terminal 1 - PartyKit should be running
2. Restart PartyKit: `npm run partykit:dev`
3. Refresh browser

### Issue 2: Changes Not Syncing

**Symptoms:**
- Both show "Connected"
- But changes don't appear in other browser

**Check:**
1. Are both browsers on the SAME session?
   - Check URL: both should have `/bdo-xxxx` (same ID)
2. Check browser console for WebSocket errors
3. Look at Network tab - are messages being sent?

**Fix:**
1. Verify session IDs match
2. Refresh both browsers
3. Check PartyKit logs in Terminal 1

### Issue 3: Profile Prompt Not Appearing

**Symptoms:**
- Join as guest but no name/color prompt

**Check:**
```javascript
// In browser console:
localStorage.getItem('bbp_user_profile')
```

If it returns a value, profile already exists.

**Fix:**
```javascript
// Clear profile to test again:
localStorage.removeItem('bbp_user_profile')
localStorage.removeItem('bbp_user_id')
// Then refresh page
```

### Issue 4: "Cannot connect to server"

**Symptoms:**
- Express backend not responding
- Can't create sessions

**Check:**
```bash
# Is Express running?
curl http://localhost:3000/api/sessions

# Should return JSON, not error
```

**Fix:**
1. Check Terminal 2 - Express should be running
2. Restart Express: `npm run dev`

---

## Performance Testing

### Test 1: Rapid Card Creation

**In one browser:**
1. Quickly create 10 cards (one after another)
2. Watch other browser

**Expected:**
- All 10 cards appear in other browser
- No performance slowdown
- Order is preserved

### Test 2: Simultaneous Editing

**In both browsers:**
1. Both users edit different cards at the same time
2. Press save simultaneously

**Expected:**
- Both changes are saved
- Last-write-wins (whichever saved last)
- No crashes or errors

### Test 3: Large Session

**Create:**
- 50+ cards across all columns
- 10+ connection lines

**Expected:**
- Page loads quickly
- Real-time sync still works
- No lag when dragging/moving

---

## Testing Checklist

Before deploying, verify all these work:

**Core Functionality:**
- [ ] Admin can create session
- [ ] Guest can join session
- [ ] Profile prompt appears for new users
- [ ] User colors are assigned correctly

**Real-Time Sync:**
- [ ] Card creation syncs
- [ ] Card editing syncs
- [ ] Card deletion syncs
- [ ] Card reordering syncs
- [ ] Connection creation syncs
- [ ] Connection deletion syncs

**Presence:**
- [ ] Active users count is accurate
- [ ] User avatars display correctly
- [ ] Connection status shows correctly
- [ ] Cursors track (if implemented)

**Resilience:**
- [ ] Disconnect/reconnect works
- [ ] Page refresh preserves data
- [ ] Multiple tabs work correctly
- [ ] No data loss on sync

**Cross-Browser:**
- [ ] Chrome works
- [ ] Firefox works
- [ ] Safari works
- [ ] Edge works (optional)

---

## Next Steps After Testing

Once all tests pass:

1. **Stop local servers:**
   ```bash
   # Press Ctrl+C in both Terminal 1 and Terminal 2
   ```

2. **Prepare for deployment:**
   - Review DEPLOYMENT.md
   - Set up production environment variables
   - Create Cloudflare account

3. **Deploy PartyKit:**
   ```bash
   npm run partykit:deploy
   ```

4. **Deploy backend:**
   - Follow platform-specific instructions in DEPLOYMENT.md

5. **Test production deployment:**
   - Use production URLs
   - Repeat all tests above
   - Verify no localhost references

---

## Quick Commands Reference

**Start development:**
```bash
# Terminal 1 - PartyKit
npm run partykit:dev

# Terminal 2 - Express
npm run dev

# Browser
http://localhost:3000
```

**Check status:**
```bash
# Express
curl http://localhost:3000/api/sessions

# PartyKit
curl http://localhost:1999/health
```

**Clear local data:**
```bash
# Remove all sessions and cards
rm -rf data/sessions/*
rm data/sessions.db

# Or reset just user profile in browser console:
localStorage.clear()
```

**Test WebSocket manually:**
```bash
# Install wscat
npm i -g wscat

# Connect to PartyKit room
wscat -c "ws://localhost:1999/party/session-bdo-xxxx"

# Send test message
> {"type":"test","data":"hello"}
```

---

## Success Criteria ✅

You can proceed to deployment when:

1. ✅ PartyKit runs without errors
2. ✅ Express runs without errors
3. ✅ Both browsers show "Connected"
4. ✅ All card operations sync in real-time
5. ✅ Presence indicators work correctly
6. ✅ No console errors in browsers
7. ✅ Works across Chrome, Firefox, and Safari
8. ✅ Disconnection/reconnection works
9. ✅ No data loss during testing
10. ✅ All checklist items above are checked

---

**Good luck with testing!** If you encounter any issues, check the Troubleshooting section above or refer to the DEPLOYMENT.md guide.
