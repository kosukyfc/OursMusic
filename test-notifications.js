#!/usr/bin/env node

/**
 * Test script for notification system
 * Usage: node test-notifications.js <api_url> <user1_email> <user1_password> <user2_email> <user2_password>
 * Example: node test-notifications.js http://localhost:3000 user1@test.com pass123 user2@test.com pass456
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const USER1_EMAIL = process.argv[3] || 'user1@test.com';
const USER1_PASS = process.argv[4] || 'pass123';
const USER2_EMAIL = process.argv[5] || 'user2@test.com';
const USER2_PASS = process.argv[6] || 'pass456';

let user1Token = '';
let user2Token = '';
let user1Id = '';
let user2Id = '';

async function request(method, path, body = null, token = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json();
  return { status: res.status, data };
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test() {
  console.log('\n🧪 Starting Notification Tests\n');
  console.log(`📍 API: ${BASE_URL}`);

  // 1. Login User 1
  console.log('\n1️⃣ Logging in User 1...');
  let res = await request('POST', '/auth/login', {
    email: USER1_EMAIL,
    password: USER1_PASS,
  });
  if (res.status !== 200) {
    console.log('❌ User 1 login failed:', res.data);
    console.log('   Trying to register User 1...');
    res = await request('POST', '/auth/register', {
      email: USER1_EMAIL,
      password: USER1_PASS,
      name: 'Test User 1',
    });
    if (res.status !== 201) {
      console.log('❌ User 1 registration failed:', res.data);
      return;
    }
    res = await request('POST', '/auth/login', {
      email: USER1_EMAIL,
      password: USER1_PASS,
    });
  }
  user1Token = res.data.access_token;
  user1Id = res.data.user.id;
  console.log(`✅ User 1 logged in: ${user1Id}`);

  // 2. Login User 2
  console.log('\n2️⃣ Logging in User 2...');
  res = await request('POST', '/auth/login', {
    email: USER2_EMAIL,
    password: USER2_PASS,
  });
  if (res.status !== 200) {
    console.log('❌ User 2 login failed:', res.data);
    console.log('   Trying to register User 2...');
    res = await request('POST', '/auth/register', {
      email: USER2_EMAIL,
      password: USER2_PASS,
      name: 'Test User 2',
    });
    if (res.status !== 201) {
      console.log('❌ User 2 registration failed:', res.data);
      return;
    }
    res = await request('POST', '/auth/login', {
      email: USER2_EMAIL,
      password: USER2_PASS,
    });
  }
  user2Token = res.data.access_token;
  user2Id = res.data.user.id;
  console.log(`✅ User 2 logged in: ${user2Id}`);

  // 3. Test Follow Notification
  console.log('\n3️⃣ Testing New Follower Notification...');
  console.log(`   User 2 following User 1...`);
  res = await request('POST', `/social/follow/${user1Id}`, {}, user2Token);
  if (res.status === 200) {
    console.log(`✅ Follow successful`);
    console.log(`   📱 Expected notification on User 1: "👤 Test User 2 começou a seguir você"`);
    console.log(`   💡 Check User 1's notification bell in the UI`);
  } else {
    console.log('❌ Follow failed:', res.data);
  }

  // 4. Test Plan Update Notification
  console.log('\n4️⃣ Testing Plan Updated Notification...');
  res = await request('PATCH', '/subscription/change-plan', { plan: 'premium' }, user1Token);
  if (res.status === 200) {
    console.log(`✅ Plan change successful: ${res.data.plan}`);
    console.log(`   📱 Expected notification on User 1: "⭐ Seu plano foi atualizado para Premium"`);
  } else {
    console.log('❌ Plan change failed:', res.data);
  }

  // 5. Test Plan Expiration (set expiry date)
  console.log('\n5️⃣ Testing Plan Expiring Notification...');
  console.log(`   ⏰ Plan expiring alerts run every 12 hours`);
  console.log(`   💡 Next alert will trigger when plan expires in 1-7 days`);
  console.log(`   📱 Expected notification: "⏰ Seu plano expira em X dias"`);

  console.log('\n✅ All tests completed!');
  console.log('\n📋 Check the following:');
  console.log('   1. Backend console for: "Device connected" messages');
  console.log('   2. Frontend console (F12) for: "Notification received:" logs');
  console.log('   3. UI notification bell for incoming notifications');
  console.log('   4. Browser Notifications (top-right corner)');
}

test().catch(console.error);
