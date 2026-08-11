import { useCallback, useEffect, useRef, useState } from 'react';

// 回到前景時，距上次成功同步超過此毫秒數才重新抓取（避免頻繁切換 App 狂打 GAS）
const REVALIDATE_THROTTLE_MS = 60_000;

export interface CloudSyncState<T> {
  data: T;
  /** 首次載入且完全沒有本地快取 */
  isLoading: boolean;
  /** 背景同步進行中（畫面上已有快取資料） */
  isSyncing: boolean;
  /** 最近一次同步失敗（畫面顯示的可能是舊資料） */
  syncFailed: boolean;
  /** 最近一次成功同步的時間 (ms epoch)，null 表示從未成功過 */
  lastSyncedAt: number | null;
  /** 手動強制重新同步 */
  refresh: () => Promise<boolean>;
}

function readCache<T>(cacheKey: string, emptyValue: T): T {
  try {
    const raw = localStorage.getItem(cacheKey);
    return raw ? JSON.parse(raw) : emptyValue;
  } catch {
    return emptyValue;
  }
}

function readSyncedAt(cacheKey: string): number | null {
  const raw = localStorage.getItem(`${cacheKey}_syncedAt`);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function hasContent(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return true;
}

/**
 * 雲端資料同步 hook：stale-while-revalidate
 * - 先顯示 localStorage 快取（秒開），一律無條件背景抓雲端最新資料，成功後覆蓋
 * - App 切回前景 (visibilitychange) 時自動重新驗證（60 秒節流）
 * - 同步失敗會標記 syncFailed，讓 UI 能提示「顯示的是舊資料」
 *
 * @param cacheKey  localStorage 鍵名（沿用既有格式：值為資料本身的 JSON）
 * @param fetcher   抓取雲端資料；回傳 null 代表失敗（保留舊資料）
 * @param emptyValue 無快取時的初始值
 */
export function useCloudSync<T>(
  cacheKey: string,
  fetcher: () => Promise<T | null>,
  emptyValue: T
): CloudSyncState<T> {
  const [data, setData] = useState<T>(() => readCache(cacheKey, emptyValue));
  const [isLoading, setIsLoading] = useState(() => !hasContent(readCache(cacheKey, emptyValue)));
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(() => readSyncedAt(cacheKey));

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const syncingRef = useRef(false);
  const lastSyncedRef = useRef<number | null>(lastSyncedAt);

  const sync = useCallback(async (): Promise<boolean> => {
    if (syncingRef.current) return false;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const fresh = await fetcherRef.current();
      if (fresh !== null && fresh !== undefined) {
        const now = Date.now();
        setData(fresh);
        setSyncFailed(false);
        setLastSyncedAt(now);
        lastSyncedRef.current = now;
        try {
          localStorage.setItem(cacheKey, JSON.stringify(fresh));
          localStorage.setItem(`${cacheKey}_syncedAt`, String(now));
        } catch { /* localStorage 滿了也不影響畫面 */ }
        return true;
      }
      setSyncFailed(true);
      return false;
    } catch {
      setSyncFailed(true);
      return false;
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, [cacheKey]);

  // 進入頁面（或切換使用者）：重讀快取 + 無條件背景同步
  useEffect(() => {
    const cached = readCache(cacheKey, emptyValue);
    setData(cached);
    setIsLoading(!hasContent(cached));
    setSyncFailed(false);
    const ts = readSyncedAt(cacheKey);
    setLastSyncedAt(ts);
    lastSyncedRef.current = ts;
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  // App 切回前景時重新驗證（手機放背景隔天切回來也能拿到最新資料）
  useEffect(() => {
    const revalidate = () => {
      if (document.visibilityState !== 'visible') return;
      const last = lastSyncedRef.current;
      if (last && Date.now() - last < REVALIDATE_THROTTLE_MS) return;
      sync();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) revalidate(); // 從 bfcache 恢復
    };
    document.addEventListener('visibilitychange', revalidate);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', revalidate);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [sync]);

  return { data, isLoading, isSyncing, syncFailed, lastSyncedAt, refresh: sync };
}

/** 把時間戳轉成「N 分鐘前」的顯示文字 */
export function formatAge(ts: number | null): string {
  if (!ts) return '';
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return '剛剛';
  if (diffMin < 60) return `${diffMin} 分鐘前`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} 小時前`;
  return `${Math.floor(diffHr / 24)} 天前`;
}
