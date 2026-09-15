import { useEffect, useSyncExternalStore } from 'react';
import { fetchAuditPdfIndex } from './api';
import type { PdfIndexFile } from './attachments';

/**
 * 稽核 PDF 資料夾清單（後端 getAuditPdfIndex）的全域快取。
 * - 模組層級單例：DeficiencyRecordList 在任何頁面都能直接用，不必逐層傳 apiUrl
 * - localStorage 快取秒開，10 分鐘內不重抓；後端沒部署這個 action 時安靜失敗，Drive 連結就一律當照片
 */
const CACHE_KEY = 'audit_pdf_index';
const REFRESH_MS = 10 * 60_000;

function readCache(): PdfIndexFile[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return Array.isArray(v) ? v : null;
  } catch { return null; }
}
function readFetchedAt(): number {
  try {
    const n = Number(localStorage.getItem(`${CACHE_KEY}_syncedAt`) || 0);
    return Number.isFinite(n) ? n : 0;
  } catch { return 0; }
}

let index: PdfIndexFile[] | null = readCache();
let fetchedAt = readFetchedAt();
let inflight: Promise<void> | null = null;
let frozen = false; // 測試頁鎖定假資料，不打後端
const listeners = new Set<() => void>();

const emit = () => listeners.forEach(cb => cb());
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const getSnapshot = () => index;

/** 取得清單（可能為 null），並在掛載時確保背景更新 */
export function usePdfIndex(): PdfIndexFile[] | null {
  useEffect(() => { ensurePdfIndex(); }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** 需要時抓清單；apiUrl 省略則用 localStorage 的 gas_api_url */
export function ensurePdfIndex(apiUrl?: string, force = false): Promise<void> {
  if (frozen) return Promise.resolve();
  let url = apiUrl || '';
  if (!url) { try { url = localStorage.getItem('gas_api_url') || ''; } catch { url = ''; } }
  if (!url) return Promise.resolve();
  if (!force && index && Date.now() - fetchedAt < REFRESH_MS) return Promise.resolve();
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetchAuditPdfIndex(url);
      if (res.success && Array.isArray(res.files)) {
        index = res.files;
        fetchedAt = Date.now();
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(index));
          localStorage.setItem(`${CACHE_KEY}_syncedAt`, String(fetchedAt));
        } catch { /* localStorage 滿了不影響畫面 */ }
        emit();
      }
    } catch {
      /* 抓不到就沿用快取 */
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** 測試頁用：塞入假清單並停止向後端抓取 */
export function setPdfIndexForTest(files: PdfIndexFile[]): void {
  frozen = true;
  index = files;
  emit();
}
