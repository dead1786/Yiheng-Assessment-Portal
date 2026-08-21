/**
 * GNOP 工單連結：依使用者裝置自適應
 *   📱 手機 → https://prod-gnop-app.gogoro.com/ticket/report/detail/GNTxxx
 *   💻 電腦 → https://prod-gnop.gogoro.com/ticket/management/search/detail/GNTxxx
 *
 * 試算表存的仍是電腦版網址，這裡只負責「顯示時」重組，不影響後端寫入。
 */

const MOBILE_BASE = 'https://prod-gnop-app.gogoro.com/ticket/report/detail/';
const DESKTOP_BASE = 'https://prod-gnop.gogoro.com/ticket/management/search/detail/';

let cachedIsMobile: boolean | null = null;

export const isMobileDevice = (): boolean => {
  if (cachedIsMobile !== null) return cachedIsMobile;
  if (typeof navigator === 'undefined') return false;

  const uaData = (navigator as any).userAgentData;
  if (uaData && typeof uaData.mobile === 'boolean') {
    cachedIsMobile = uaData.mobile;
    return cachedIsMobile;
  }

  const ua = navigator.userAgent || '';
  // iPadOS 13+ 的 UA 會偽裝成 Macintosh，用觸控點數補判
  const isIpadOS = /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;
  cachedIsMobile = isIpadOS || /Android|iPhone|iPad|iPod|IEMobile|BlackBerry|Opera Mini|Mobile/i.test(ua);
  return cachedIsMobile;
};

/** 從「純工單號碼」或「完整網址」取出工單號碼 */
export const extractTicketNo = (raw?: string | null): string => {
  if (!raw) return '';
  let s = String(raw).trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) {
    s = s.split(/[?#]/)[0].replace(/\/+$/, '');
    s = s.split('/').pop() || '';
  }
  return s.trim();
};

/** 傳入工單號碼或既有網址，回傳目前裝置適用的連結；取不到號碼時回空字串 */
export const buildTicketUrl = (ticketNoOrUrl?: string | null): string => {
  const no = extractTicketNo(ticketNoOrUrl);
  if (!no) return '';
  return (isMobileDevice() ? MOBILE_BASE : DESKTOP_BASE) + encodeURIComponent(no);
};
