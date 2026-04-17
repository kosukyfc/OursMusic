# 🧪 Notification System - Verification Checklist

## ✅ Implementation Complete

- [x] DevicesGateway notification methods added
- [x] SocialService integrated with notifications
- [x] SubscriptionService integrated with notifications  
- [x] Cron job for plan expiring alerts
- [x] Frontend Socket.IO listener for `notif:received`
- [x] React App component listener for notifications
- [x] Backend builds without errors
- [x] Code passed security review (kluster)
- [x] Documentation complete

## 🚀 Pre-Flight Checklist

Before testing, verify:

### Backend Setup
- [ ] Node.js v18+ installed
- [ ] PostgreSQL configured (or connection ready)
- [ ] `.env` file has all secrets
- [ ] `npm install` completed in `/backend`
- [ ] Backend compiles: `npm run build` ✅

### Frontend Setup
- [ ] `npm install` completed in `/web`
- [ ] Frontend can start: `npm run dev`
- [ ] Port 5173 available

### Test Data
- [ ] At least 2 test user accounts created
- [ ] Users can login successfully
- [ ] Users can search for each other

## 🧬 Test Execution Plan

### Phase 1: Connection Verification (5 min)
```
Goal: Verify WebSocket connection working

1. Start backend: cd backend && npm run start:dev
2. Check console for port 3000 confirmation
3. Start frontend: cd web && npm run dev
4. Open http://localhost:5173
5. Login with User A
6. Check backend console:
   ├─ Should show "Device connected: [Device] (userId)"
   └─ No connection errors
```

✓ **Pass Criteria**: "Device connected" message appears in backend logs without errors

### Phase 2: New Follower Notification (10 min)
```
Goal: Verify new follower event triggers notification

Setup:
1. Browser 1: User A logged in
2. Browser 2: User B logged in
3. Open backend console in separate window

Test Steps:
1. In Browser 2, search for User A
2. Click "Follow" button
3. In Browser 1, observe:
   ├─ Notification bell badge changes to "1"
   ├─ Clicking bell shows notification
   ├─ Message: "👤 [User B] começou a seguir você"
   └─ Browser push notification appears (top-right)
4. Check browsers' console (F12):
   ├─ Should see "📱 Notification received: new_follower"
   └─ Should see "🔔 Notification event received: new_follower"
5. Check backend console:
   └─ Should have no errors
```

✓ **Pass Criteria**: 
- Notification appears in bell within 2 seconds
- Message is accurate
- No console errors
- Push notification shows (if permissions granted)

### Phase 3: Plan Updated Notification (10 min)
```
Goal: Verify plan change event triggers notification

Setup:
1. Browser 1: User A logged in
2. Get User A's access token from sessionstorage

Test via API (using curl or Postman):
POST http://localhost:3000/subscription/change-plan
Headers:
  Authorization: Bearer [USER_A_TOKEN]
  Content-Type: application/json
Body:
  { "plan": "premium" }

Expected in Browser 1:
  ├─ Notification bell shows new notification
  ├─ Message: "⭐ Seu plano foi atualizado para Premium"
  ├─ Plan indicator updates (if visible in UI)
  └─ Push notification appears

Console Checks:
  ├─ Browser F12 → Console should show notification logs
  └─ Backend console → Should show no errors (optional, not always logged)
```

✓ **Pass Criteria**:
- Notification appears immediately after API call
- Message is accurate
- Plan state updates visibly
- No console errors

### Phase 4: Plan Expiring Alerts (Setup for future)
```
Goal: Setup for plan expiration testing

The cron job runs every 12 hours automatically.
To test immediately, you have two options:

Option A - Manual Database Update (Recommended)
1. Connect to PostgreSQL directly
2. Find User A's record
3. Update premiumExpiresAt to 3 days from now:
   UPDATE users SET premium_expires_at = NOW() + INTERVAL '3 days' 
   WHERE id = 'USER_A_ID'
4. Restart backend (or wait for next cron)
5. Check notification appears

Option B - Wait 12 Hours (Natural)
1. Set any user to premium with expiry date
2. Wait for cron job to run naturally
3. Notification should appear at next cron cycle

Expected Notification:
  "⏰ Seu plano expira em 3 dias"
  (or "⏰ Seu plano expira amanhã" if 1 day left)
```

✓ **Pass Criteria**:
- Notification appears in bell
- Days remaining is calculated correctly
- Formatting is accurate

### Phase 5: Unfollow & Refollow (Bonus)
```
Goal: Verify notification only on NEW follow

Test Steps:
1. In Browser 2 (User B), click "Following" to unfollow
2. Clear notifications in Browser 1 (click "Limpar")
3. In Browser 2, follow User A again
4. In Browser 1, check for NEW notification

Expected:
  ├─ Unfollow removes follow relationship ✓
  ├─ Clear notifications empties bell ✓
  ├─ Re-following creates NEW notification ✓
  └─ No duplicate notifications ✓
```

✓ **Pass Criteria**:
- Notification only appears on new follow, not duplicate follows
- Clear button works
- Unfollow then refollow triggers notification

## 📊 Results Summary Table

| Test | Expected | Result | Status |
|------|----------|--------|--------|
| WebSocket Connection | Device connected message | _____ | [ ] PASS |
| New Follower | Notification with name | _____ | [ ] PASS |
| Plan Updated | Notification with plan name | _____ | [ ] PASS |
| Plan Expiring | Notification with days left | _____ | [ ] PASS |
| No Duplicates | Refollow creates new notif | _____ | [ ] PASS |
| Push Notifications | Browser notifications work | _____ | [ ] PASS |
| Error Handling | No console errors | _____ | [ ] PASS |

## 🐛 Debugging Checklist

If tests fail, check:

### WebSocket Connection Issues
```
1. Backend Console
   └─ grep "Device connected"
   └─ grep "error\|Error\|ERROR"

2. Frontend Console (F12)
   └─ Check for connection errors
   └─ Enable: localStorage.debug = "socket.io-client:*"
   └─ Reload and check WebSocket messages

3. Network Tab (F12)
   └─ Look for WebSocket connection to /devices namespace
   └─ Should show "101 Switching Protocols"
```

### Notification Not Appearing
```
1. Verify DevicesGateway is injected:
   └─ SocialModule imports DevicesModule ✓
   └─ SubscriptionModule imports DevicesModule ✓

2. Verify methods are called:
   └─ SocialService.follow() calls notifyNewFollower() ✓
   └─ SubscriptionService.changePlan() calls notifyPlanUpdated() ✓

3. Verify frontend listener:
   └─ App.tsx has useEffect(() => { window.addEventListener(...) })
   └─ Check console shows notification log message
```

### Build Issues
```
1. Backend build:
   cd backend && npm run build
   (should complete without errors)

2. Frontend build:
   cd web && npm run build
   (should complete without errors)

3. Run-time errors:
   Check backend console for TypeScript or runtime errors
```

## 📞 Support Contacts

- **Code Quality**: Passed kluster security review ✅
- **Architecture**: Multi-room WebSocket design ✅
- **Documentation**: [NOTIFICATIONS_IMPLEMENTATION.md](./NOTIFICATIONS_IMPLEMENTATION.md) ✅
- **Test Script**: [test-notifications.js](./test-notifications.js)

## 🎬 Quick Start Command

```bash
# Terminal 1
cd backend && npm run start:dev

# Terminal 2
cd web && npm run dev

# Terminal 3 (Monitor backend)
# Just watch backend console for "Device connected" messages

# Browser 1: http://localhost:5173 (User A)
# Browser 2: http://localhost:5173 (User B)
# Follow User A from Browser 2 → See notification in Browser 1 ✨
```

---

**Mark completion date**: ________________
**Tested by**: ________________
**Notes**: ________________
