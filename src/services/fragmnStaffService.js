import { randomUUID } from 'node:crypto';
import { getFromDb, setInDb } from '../utils/database/wrapper.js';

function staffRecordsKey(guildId, userId) {
  return 'fragmn:staff:records:' + guildId + ':' + userId;
}

export async function addStaffRecord({ guildId, userId, moderatorId, type, reason }) {
  if (!guildId || !userId || !moderatorId || !type || !reason) {
    throw new Error('Staff record мэдээлэл дутуу байна.');
  }

  const key = staffRecordsKey(guildId, userId);
  const records = await getFromDb(key, []);
  const normalized = Array.isArray(records) ? records : [];
  const record = {
    id: randomUUID().slice(0, 12),
    guildId,
    userId,
    moderatorId,
    type: String(type).slice(0, 24),
    reason: String(reason).trim().slice(0, 500),
    createdAt: new Date().toISOString(),
  };

  normalized.unshift(record);
  if (normalized.length > 100) normalized.length = 100;

  const saved = await setInDb(key, normalized);
  if (!saved) throw new Error('Staff record хадгалж чадсангүй.');
  return record;
}

export async function getStaffRecords({ guildId, userId, limit = 15 }) {
  const records = await getFromDb(staffRecordsKey(guildId, userId), []);
  return (Array.isArray(records) ? records : []).slice(0, Math.max(1, Math.min(Number(limit) || 15, 50)));
}
