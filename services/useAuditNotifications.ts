import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnyDeficiencyRecord } from '../types';
import { fetchDeficiencyRecords, markAuditRead } from './api';
import { useCloudSync } from './useCloudSync';
import {
  loadLocalRead, mergeServerKeys, markLocalRead, clearPending,
  pickUnread, toMarkReadItem, getRecordKey,
} from './auditNotify';

export interface AuditNotifications {
  /** 該員工全部被稽核紀錄（與個人檔案頁共用同一份快取） */
  records: AnyDeficiencyRecord[];
  /** 近期且未讀，最新在前 */
  unread: AnyDeficiencyRecord[];
  /** 未讀紀錄鍵集合（給列表標「NEW」用） */
  unreadKeys: Set<string>;
  isLoading: boolean;
  /**
   * 標記已讀。傳入任意紀錄陣列，內部只會處理「近期且尚未已讀」的那些。
   * 目前只有通知彈窗的「我知道了」會呼叫（source = 彈窗確認）；打開個人檔案不算已讀。
   */
  markRead: (recs: AnyDeficiencyRecord[], source: string) => void;
  refresh: () => Promise<boolean>;
}

/**
 * 稽核通知 hook（掛在 App 層，整個 App 只有一份）
 *
 * 通知邏輯：
 * 1. 開啟 App／登入／切回前景（60 秒節流）時抓該員工的被稽核紀錄
 * 2. 稽核日期在 NOTIFY_WINDOW_DAYS 內、且紀錄鍵不在已讀集合 → 未讀
 * 3. 未讀 > 0 就由 App 決定是否彈窗（只在儀表板、且未被「稍後再看」）
 *
 * 已讀邏輯：
 * - 本機 localStorage 立即生效（同裝置不會再彈）
 * - 背景寫回 GAS「稽核通知已讀」分頁（換裝置也不會再彈；主管可查誰看過）
 * - 寫回失敗放 pending，下次同步成功時補送；GAS 尚未部署新版時自動退回只用本機
 */
export function useAuditNotifications(name: string | null, apiUrl: string): AuditNotifications {
  const active = !!name && !!apiUrl;
  // 與 ProfileView 共用同一個快取鍵，App 層先抓到的資料能讓個人檔案頁秒開
  const cacheKey = name ? `cache_profile_${name}` : 'cache_profile__none';

  const [readKeys, setReadKeys] = useState<Set<string>>(() => new Set(name ? loadLocalRead(name).keys : []));
  const readKeysRef = useRef(readKeys);
  readKeysRef.current = readKeys;

  // 這次 App 生命週期內，後端是否支援 markAuditRead（回 Unknown Action 就關掉，不再重試）
  const serverSupportedRef = useRef(true);

  useEffect(() => {
    setReadKeys(new Set(name ? loadLocalRead(name).keys : []));
  }, [name]);

  const flushPending = useCallback(async (nm: string) => {
    if (!apiUrl || !serverSupportedRef.current) return;
    const { pending } = loadLocalRead(nm);
    if (pending.length === 0) return;
    const res = await markAuditRead(apiUrl, nm, pending);
    if (res.success) clearPending(nm, pending.map(p => p.key));
    else if (res.unsupported) serverSupportedRef.current = false;
  }, [apiUrl]);

  const { data: records, isLoading, refresh } = useCloudSync<AnyDeficiencyRecord[]>(
    cacheKey,
    async () => {
      if (!active || !name) return null;
      const res = await fetchDeficiencyRecords(apiUrl, name);
      if (!res.success || res.v2Ok === false) return null;   // v2 沒讀到時保留快取，不要把新版紀錄當 0 筆
      if (Array.isArray(res.readKeys)) {
        const merged = mergeServerKeys(name, res.readKeys);
        setReadKeys(new Set(merged.keys));
      }
      flushPending(name);
      return res.records;
    },
    []
  );

  const unread = useMemo(() => (active ? pickUnread(records, readKeys) : []), [active, records, readKeys]);
  const unreadKeys = useMemo(() => new Set(unread.map(getRecordKey)), [unread]);

  const markRead = useCallback((recs: AnyDeficiencyRecord[], source: string) => {
    if (!name || recs.length === 0) return;
    const targets = pickUnread(recs, readKeysRef.current);
    if (targets.length === 0) return;
    const state = markLocalRead(name, targets.map(r => toMarkReadItem(r, source)));
    setReadKeys(new Set(state.keys));
    flushPending(name);
  }, [name, flushPending]);

  return { records, unread, unreadKeys, isLoading, markRead, refresh };
}
