import React from 'react';
import { Cloud, CloudOff } from 'lucide-react';
import { formatAge } from '../services/useCloudSync';

interface SyncStatusProps {
  isSyncing: boolean;
  syncFailed: boolean;
  lastSyncedAt: number | null;
  onRetry: () => void;
  /** 同步中顯示的文字 */
  syncingText?: string;
  /** top: 頁面上方置中（預設）；bottom-right: 右下角固定 */
  position?: 'top' | 'bottom-right';
}

/**
 * 共用同步狀態提示：
 * - 同步中：橘色提示條
 * - 同步失敗：紅色提示條，顯示目前資料的時間並可點擊重試
 */
export const SyncStatus: React.FC<SyncStatusProps> = ({
  isSyncing, syncFailed, lastSyncedAt, onRetry,
  syncingText = '正在同步最新資料...',
  position = 'top',
}) => {
  const posClass = position === 'bottom-right'
    ? 'fixed bottom-8 right-8 z-50'
    : 'absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 z-50';

  if (isSyncing) {
    return (
      <div className={`${posClass} bg-orange-100/90 border border-orange-200 text-orange-700 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse pointer-events-none backdrop-blur-sm`}>
        <Cloud size={16} />
        <span className="text-xs font-bold whitespace-nowrap">{syncingText}</span>
      </div>
    );
  }

  if (syncFailed) {
    const age = formatAge(lastSyncedAt);
    return (
      <button
        onClick={onRetry}
        className={`${posClass} bg-red-100/95 border border-red-200 text-red-700 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 backdrop-blur-sm hover:bg-red-200 transition-colors`}
      >
        <CloudOff size={16} />
        <span className="text-xs font-bold whitespace-nowrap">
          {age ? `同步失敗，顯示的是 ${age} 的資料` : '同步失敗，無法取得最新資料'}｜點此重試
        </span>
      </button>
    );
  }

  return null;
};
