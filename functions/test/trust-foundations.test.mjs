import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import {
  blockReference,
  listBlocks,
  readBlockRelationship,
  removeBlock,
  setBlockRequestParticipant,
  setBlock,
} from '../lib/trust/blocking.js';

if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-openstay') {
  throw new Error('Trust foundation tests require the demo-openstay Firestore emulator.');
}

const app = initializeApp({ projectId: 'demo-openstay' });
const db = getFirestore(app);
after(async () => deleteApp(app));

const call = (uid, data, emailVerified = true) => ({
  auth: uid ? { uid, token: { email_verified: emailVerified } } : undefined,
  data,
});

async function seedUser(uid, displayName = uid) {
  await db.doc(`users/${uid}`).set({
    uid,
    displayName,
    accountStatus: 'active',
    verificationStatus: 'unverified',
  });
}

test('block and unblock derive identity from verified auth and are idempotent', async () => {
  const ownerUid = 'trust-block-owner';
  const targetUid = 'trust-block-target';
  await Promise.all([seedUser(ownerUid), seedUser(targetUid)]);

  await assert.rejects(setBlock(call(null, { targetUid }), db), { code: 'unauthenticated' });
  await assert.rejects(setBlock(call(ownerUid, { targetUid }, false), db), { code: 'failed-precondition' });
  await assert.rejects(setBlock(call(ownerUid, { targetUid, ownerUid: 'forged' }), db), {
    code: 'invalid-argument',
  });
  await assert.rejects(setBlock(call(ownerUid, { targetUid: ownerUid }), db), {
    code: 'failed-precondition',
  });
  await assert.rejects(setBlock(call(ownerUid, { targetUid: 'missing-user' }), db), {
    code: 'not-found',
  });

  test('participant-context blocking derives the target from an existing hosting request', async () => {
    const ownerUid = 'trust-request-block-owner';
    const targetUid = 'trust-request-block-target';
    const requestId = 'a'.repeat(64);
    await Promise.all([seedUser(ownerUid), seedUser(targetUid)]);
    await db.doc(`hostingRequests/${requestId}`).set({
      requestId,
      hostUid: targetUid,
      travellerUid: ownerUid,
    });

    await assert.rejects(setBlockRequestParticipant(call('trust-request-outsider', {
      requestId,
    }), db), { code: 'not-found' });
    await assert.rejects(setBlockRequestParticipant(call(ownerUid, {
      requestId,
      targetUid: 'trust-request-forged',
    }), db), { code: 'invalid-argument' });
    assert.deepEqual(await setBlockRequestParticipant(call(ownerUid, { requestId }), db), {
      blocked: true,
    });
    assert.equal((await blockReference(db, ownerUid, targetUid).get()).exists, true);
  });

  assert.deepEqual(await setBlock(call(ownerUid, { targetUid }), db), { blocked: true });
  assert.deepEqual(await setBlock(call(ownerUid, { targetUid }), db), { blocked: true });
  const saved = (await blockReference(db, ownerUid, targetUid).get()).data();
  assert.equal(saved.ownerUid, ownerUid);
  assert.equal(saved.blockedUid, targetUid);
  assert.ok(saved.createdAt instanceof Timestamp);
  assert.deepEqual(Object.keys(saved).sort(), ['blockedUid', 'createdAt', 'ownerUid']);

  assert.deepEqual(await removeBlock(call(ownerUid, { targetUid }), db), { blocked: false });
  assert.deepEqual(await removeBlock(call(ownerUid, { targetUid }), db), { blocked: false });
  assert.equal((await blockReference(db, ownerUid, targetUid).get()).exists, false);
});

test('either direction blocks the relationship and unblocking does not recreate it', async () => {
  const firstUid = 'trust-block-first';
  const secondUid = 'trust-block-second';
  await Promise.all([seedUser(firstUid), seedUser(secondUid)]);
  await setBlock(call(firstUid, { targetUid: secondUid }), db);

  const forward = await db.runTransaction((transaction) =>
    readBlockRelationship(transaction, db, firstUid, secondUid));
  const reverse = await db.runTransaction((transaction) =>
    readBlockRelationship(transaction, db, secondUid, firstUid));
  assert.deepEqual(forward, { blocked: true, firstBlockedSecond: true });
  assert.deepEqual(reverse, { blocked: true, firstBlockedSecond: false });

  await setBlock(call(secondUid, { targetUid: firstUid }), db);
  await removeBlock(call(firstUid, { targetUid: secondUid }), db);
  assert.equal((await db.runTransaction((transaction) =>
    readBlockRelationship(transaction, db, firstUid, secondUid))).blocked, true);
  await removeBlock(call(secondUid, { targetUid: firstUid }), db);
  assert.equal((await db.runTransaction((transaction) =>
    readBlockRelationship(transaction, db, firstUid, secondUid))).blocked, false);
});

test('blocked-user listing is owner-scoped, bounded, and returns screened names', async () => {
  const ownerUid = 'trust-block-list-owner';
  const targets = ['trust-list-target-1', 'trust-list-target-2'];
  await Promise.all([seedUser(ownerUid), ...targets.map((uid) => seedUser(uid, 'Traveller'))]);
  await Promise.all(targets.map((targetUid) => setBlock(call(ownerUid, { targetUid }), db)));

  const first = await listBlocks(call(ownerUid, { cursor: null }), db);
  assert.deepEqual(first.items, [
    { uid: targets[0], displayName: 'Traveller' },
    { uid: targets[1], displayName: 'Traveller' },
  ]);
  assert.equal(first.nextCursor, null);
  await assert.rejects(listBlocks(call('trust-block-list-outsider', { cursor: null }), db), {
    code: 'failed-precondition',
  });
  await assert.rejects(listBlocks(call(ownerUid, { cursor: 'bad/cursor' }), db), {
    code: 'invalid-argument',
  });
});
