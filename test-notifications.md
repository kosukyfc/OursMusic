# 🔔 Notification System Testing Guide

## Quick Start
1. **Start Backend**: `cd backend && npm run start:dev`
2. **Start Frontend**: `cd web && npm run dev`
3. **Open Browser**: http://localhost:5173

## Test Cases

### 1. ✅ New Follower Notification
**Steps:**
- Open 2 browser tabs/windows
- Tab 1: Login as User A
- Tab 2: Login as User B
- Tab 2: Search for User A and click "Follow"
- **Expected:** Tab 1 shows `👤 [User B Name] começou a seguir você` in notification bell

**Code Path:** 
- Backend: `social.service.ts` → `follow()` → `devicesGateway.notifyNewFollower()`
- Frontend: `useDevices.ts` → listens to `notif:received` → dispatches CustomEvent
- UI: `App.tsx` → listener adds to notification state → displays in bell

### 2. ✅ Plan Updated Notification  
**Steps:**
- In Admin Panel or via API, call `PATCH /subscription/change-plan`
- Body: `{ "plan": "premium" }` for User A
- **Expected:** Notification `⭐ Seu plano foi atualizado para Premium`

**Code Path:**
- Backend: `subscription.service.ts` → `changePlan()` → `devicesGateway.notifyPlanUpdated()`
- Frontend: Same flow as above

### 3. ✅ WebSocket Connection
**Check Console:**
```javascript
// Should see:
// "Device connected: [Device Name] ([userId])"
// "📱 Notification received: new_follower ..."
// "🔔 Notification event received: new_follower ..."
```

### 4. ✅ Notification Bell UI
- Badge shows count (max 10 notifications)
- Clicking bell shows list
- "Limpar" button clears all
- Notifications appear in dropdown

## Architecture

```
Backend (DevicesGateway)
  ↓
  emit('notif:received', { type, message, ... })
  ↓
Frontend (useDevices.ts)
  ↓
  window.dispatchEvent(CustomEvent 'notif:received')
  ↓
App.tsx (listener)
  ↓
  addNotification() → setNotifications[] → UI render
```

## Event Flows

### New Follower
```
POST /social/follow
  ↓
SocialService.follow()
  ↓
DevicesGateway.notifyNewFollower(followingId, followerData)
  ↓
socket.to('room:userId').emit('notif:received', ...)
```

### Plan Updated
```
PATCH /subscription/change-plan
  ↓
SubscriptionService.changePlan()
  ↓
DevicesGateway.notifyPlanUpdated(userId, newPlan)
  ↓
socket.to('room:userId').emit('notif:received', ...)
```

## Debugging

**Check Backend Logs:**
```bash
# Should see notification emissions
grep -i "notification\|notif:received" backend/logs.txt
```

**Check Frontend Console:**
- Open DevTools (F12)
- Go to Console tab
- Should see logs like:
  - `📱 Notification received: new_follower ...`
  - `🔔 Notification event received: new_follower ...`

**Check Socket.IO Debug:**
```javascript
// In browser console:
localStorage.debug = "socket.io-client:*"
// Reload page to see all WebSocket events
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Notifications not appearing | Check backend logs for `notifyUser()` calls |
| WebSocket not connecting | Verify JWT token is valid |
| Build fails | Run `npm run build` in backend folder |
| Port 3000 already in use | Kill process or change port in `.env` |

## Future Enhancements

- [ ] Plan expiring alerts (scheduled task)
- [ ] Activity feed notifications
- [ ] Song recommendation notifications
- [ ] Social interaction notifications (likes, comments)
- [ ] Persistent notification history (database)
