import { AnyDeficiencyRecord, DeficiencyRecordV2 } from '../types';

/**
 * 稽核通知／已讀 核心邏輯
 *
 * 背景限制：
 * - 稽核紀錄沒有唯一 ID、沒有寫入時間戳（只有稽核員填的「稽核日期」）
 * - v2 讀取來源「缺失記錄-2」是 QUERY 重排的檢視表，列號會變動
 * 因此：
 * - 每筆紀錄用「身分欄位」算出穩定的內容雜湊鍵 (recordKey)，作為通知與已讀的識別
 * - 「近期」用稽核日期回推 NOTIFY_WINDOW_DAYS 天判定
 * - 已讀狀態雙層：localStorage（即時、單機）＋ GAS「稽核通知已讀」分頁（跨裝置、主管可查）
 */

/** 近期視窗：稽核日期在 N 天內的紀錄才會列入通知 */
export const NOTIFY_WINDOW_DAYS = 14;

/** 「稍後再看」的暫時關閉最長有效時間（避免 iOS PWA sessionStorage 跨次啟動殘留） */
const DISMISS_TTL_MS = 12 * 60 * 60 * 1000;

const localKey = (name: string) => `audit_read_${name}`;
const dismissKey = (name: string) => `audit_notify_dismissed_${name}`;

// ---------- 紀錄鍵 ----------

/** FNV-1a 32-bit，回傳 base36；用兩個不同種子串接降低碰撞機率 */
function fnv1a(str: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36);
}

/** 日期正規化成 yyyy-mm-dd；解析失敗就用原字串（去空白） */
export function normalizeDate(raw: string): string {
  const s = String(raw || '').trim();
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const isV2 = (r: AnyDeficiencyRecord): r is DeficiencyRecordV2 => (r as DeficiencyRecordV2).version === 'v2';

/**
 * 穩定紀錄鍵：由「誰、何時、哪站、什麼類型、誰稽核、哪張工單」組成。
 * 缺失內容不納入 → 稽核員事後修正文字不會被當成新稽核；
 * 身分欄位若被改動（例如改站名）會視為新紀錄重新通知，屬預期行為。
 */
export function getRecordKey(rec: AnyDeficiencyRecord): string {
  const parts = [
    isV2(rec) ? 'v2' : 'v1',
    String(rec.name || '').trim(),
    normalizeDate(rec.date),
    String(rec.station || '').trim(),
    isV2(rec) ? String(rec.auditType || '').trim() : String(rec.status || '').trim(),
    String(rec.auditor || '').trim(),
    String(rec.ticketUrl || '').trim(),
  ];
  const s = parts.join('|');
  return `${fnv1a(s, 0x811c9dc5)}${fnv1a(s, 0x01000193)}`;
}

// ---------- 近期判定 ----------

/** 稽核日期在近期視窗內（無法解析日期的紀錄不通知，避免用壞資料打擾） */
export function isRecent(rec: AnyDeficiencyRecord, now: number = Date.now(), windowDays: number = NOTIFY_WINDOW_DAYS): boolean {
  const t = new Date(String(rec.date || '').trim());
  if (isNaN(t.getTime())) return false;
  // 以「日曆天」比較：稽核日期只有日期沒有時間，用毫秒差會在當天下午就把第 N 天的紀錄排除
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((dayStart(new Date(now)) - dayStart(t)) / 86400_000);
  // 允許少量未來日期（時區／填錯 1～2 天），其餘超過視窗就不算近期
  return diffDays <= windowDays && diffDays >= -2;
}

/** 由全部紀錄算出「近期且未讀」清單，最新的排前面 */
export function pickUnread(records: AnyDeficiencyRecord[], readKeys: Set<string>, now: number = Date.now()): AnyDeficiencyRecord[] {
  return records
    .filter(r => isRecent(r, now) && !readKeys.has(getRecordKey(r)))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ---------- 本機已讀狀態 ----------

export interface LocalReadState {
  /** 已讀鍵（含本機標記與伺服器回傳的） */
  keys: string[];
  /** 本機已標記、但尚未成功寫回 GAS 的項目，下次同步時補送 */
  pending: MarkReadItem[];
}

export interface MarkReadItem {
  key: string;
  date: string;
  station: string;
  auditType: string;
  auditor: string;
  source: string;
}

export function loadLocalRead(name: string): LocalReadState {
  try {
    const raw = localStorage.getItem(localKey(name));
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        keys: Array.isArray(parsed.keys) ? parsed.keys : [],
        pending: Array.isArray(parsed.pending) ? parsed.pending : [],
      };
    }
  } catch { /* 壞資料視為空 */ }
  return { keys: [], pending: [] };
}

export function saveLocalRead(name: string, state: LocalReadState): void {
  try {
    // 只保留最近 500 個鍵，避免無限成長
    const keys = state.keys.slice(-500);
    localStorage.setItem(localKey(name), JSON.stringify({ keys, pending: state.pending }));
  } catch { /* localStorage 滿了不影響功能 */ }
}

/** 把伺服器回傳的已讀鍵併進本機 */
export function mergeServerKeys(name: string, serverKeys: string[]): LocalReadState {
  const state = loadLocalRead(name);
  const set = new Set(state.keys);
  serverKeys.forEach(k => set.add(k));
  const next = { keys: Array.from(set), pending: state.pending };
  saveLocalRead(name, next);
  return next;
}

/** 本機標記已讀，並把項目排入 pending 等待寫回伺服器 */
export function markLocalRead(name: string, items: MarkReadItem[]): LocalReadState {
  const state = loadLocalRead(name);
  const set = new Set(state.keys);
  const pendingKeys = new Set(state.pending.map(p => p.key));
  const pending = [...state.pending];
  items.forEach(it => {
    set.add(it.key);
    if (!pendingKeys.has(it.key)) { pending.push(it); pendingKeys.add(it.key); }
  });
  const next = { keys: Array.from(set), pending };
  saveLocalRead(name, next);
  return next;
}

/** 伺服器寫入成功後，把這些鍵從 pending 移除 */
export function clearPending(name: string, keys: string[]): LocalReadState {
  const state = loadLocalRead(name);
  const done = new Set(keys);
  const next = { keys: state.keys, pending: state.pending.filter(p => !done.has(p.key)) };
  saveLocalRead(name, next);
  return next;
}

export function toMarkReadItem(rec: AnyDeficiencyRecord, source: string): MarkReadItem {
  return {
    key: getRecordKey(rec),
    date: normalizeDate(rec.date),
    station: String(rec.station || '').trim(),
    auditType: isV2(rec) ? String(rec.auditType || '').trim() : String(rec.status || '').trim(),
    auditor: String(rec.auditor || '').trim(),
    source,
  };
}

// ---------- 「稍後再看」暫時關閉 ----------

/** 用未讀鍵集合的簽章判斷：同一批未讀在本次啟動內不再彈；有新紀錄進來簽章改變就會再彈 */
export function unreadSignature(unread: AnyDeficiencyRecord[]): string {
  return unread.map(getRecordKey).sort().join(',');
}

export function isDismissed(name: string, signature: string): boolean {
  try {
    const raw = sessionStorage.getItem(dismissKey(name));
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed.sig !== signature) return false;
    return Date.now() - Number(parsed.at || 0) < DISMISS_TTL_MS;
  } catch { return false; }
}

export function setDismissed(name: string, signature: string): void {
  try { sessionStorage.setItem(dismissKey(name), JSON.stringify({ sig: signature, at: Date.now() })); } catch { /* ignore */ }
}

export function clearDismissed(name: string): void {
  try { sessionStorage.removeItem(dismissKey(name)); } catch { /* ignore */ }
}
