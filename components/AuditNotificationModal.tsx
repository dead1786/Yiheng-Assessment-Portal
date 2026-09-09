import React, { useState } from 'react';
import { AnyDeficiencyRecord, DeficiencyRecordV2 } from '../types';
import { DeficiencyRecordList } from './DeficiencyRecordList';
import { NOTIFY_WINDOW_DAYS } from '../services/auditNotify';
import { BellRing, X, UserCircle, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';

interface AuditNotificationModalProps {
  isOpen: boolean;
  /** 近期且未讀的紀錄（最新在前） */
  records: AnyDeficiencyRecord[];
  /** 「我知道了」：標記已讀並關閉 */
  onAcknowledge: () => void;
  /** 關閉視窗／點背景：本次啟動不再彈，下次開 App 再提醒 */
  onLater: () => void;
  /** 前往個人檔案看完整清單 */
  onViewProfile: () => void;
}

const toThumb = (u: string) => {
  try {
    if (!u.includes('drive.google.com')) return u;
    const m = u.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return m && m[1] ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1200` : u;
  } catch { return u; }
};

const Photo: React.FC<{ url: string; index: number }> = ({ url, index }) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const src = toThumb(url);
  return (
    <div className="bg-white p-2 rounded-lg shadow-2xl w-full flex flex-col">
      <div className="relative w-full h-[70vh] bg-gray-900 rounded flex items-center justify-center overflow-hidden">
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 text-white">
            <Loader2 className="w-8 h-8 animate-spin" /><span className="text-xs font-mono">載入中...</span>
          </div>
        )}
        {status === 'error' ? (
          <div className="flex flex-col items-center justify-center gap-2 text-red-400 p-4">
            <AlertTriangle size={32} />
            <p className="text-sm font-bold">圖片無法顯示</p>
            <a href={src} target="_blank" rel="noreferrer" className="text-xs text-blue-400 underline">點此開啟原圖</a>
          </div>
        ) : (
          <img src={src} alt={`Evidence ${index + 1}`}
            className={`max-w-full max-h-full object-contain transition-opacity duration-500 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setStatus('loaded')} onError={() => setStatus('error')} />
        )}
      </div>
      <div className="text-center py-3 text-sm text-gray-500 font-mono border-t border-gray-100 mt-1">照片 {index + 1}</div>
    </div>
  );
};

const hasDeficiency = (r: AnyDeficiencyRecord): boolean => {
  if ((r as DeficiencyRecordV2).version === 'v2') return (r as DeficiencyRecordV2).items.length > 0;
  const v1 = r as any;
  return [v1.ppe, v1.fencing, v1.boxClean, v1.siteClean, v1.order, v1.gnop, v1.other].some(Boolean);
};

/**
 * 開啟 App 時的稽核通知彈窗：列出近期未讀的被稽核紀錄，最新一筆自動展開。
 * z-index 150：蓋在修改密碼 modal (100) 之上、系統 alert (200) 之下。
 */
export const AuditNotificationModal: React.FC<AuditNotificationModalProps> = ({ isOpen, records, onAcknowledge, onLater, onViewProfile }) => {
  const [photos, setPhotos] = useState<string[] | null>(null);
  if (!isOpen || records.length === 0) return null;

  const deficiencyCount = records.filter(hasDeficiency).length;

  const handleViewPhotos = (photoUrlString: string) => {
    const urls = photoUrlString.split(/[,|\n]+/).map(s => s.trim()).filter(Boolean);
    if (urls.length > 0) setPhotos(urls);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onLater}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-red-50 to-orange-50 flex items-start gap-3">
            <div className="p-2.5 rounded-full bg-red-100 text-red-600 flex-shrink-0">
              <BellRing size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-gray-900">稽核通知</h3>
              <p className="text-sm text-gray-600 mt-0.5">
                近 {NOTIFY_WINDOW_DAYS} 天內您有 <b className="text-red-600">{records.length}</b> 筆新的稽核紀錄
                {deficiencyCount > 0 ? `，其中 ${deficiencyCount} 筆有缺失。` : '，皆無缺失。'}
              </p>
            </div>
            <button onClick={onLater} title="稍後再看" className="p-2 hover:bg-white/70 rounded-full transition-colors flex-shrink-0">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="overflow-auto flex-1 p-4 bg-gray-50/50">
            <DeficiencyRecordList
              records={records}
              showAuditor={false}
              showName={false}
              onViewPhotos={handleViewPhotos}
              defaultExpandedIndex={0}
            />
          </div>

          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="flex gap-3">
              <button
                onClick={onViewProfile}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <UserCircle size={18} /> 查看個人檔案
              </button>
              <button
                onClick={onAcknowledge}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={18} /> 我知道了
              </button>
            </div>
            <p className="text-[11px] text-gray-400 text-center mt-3 leading-relaxed">
              按「我知道了」即標記已讀，不再提醒這批紀錄；直接關閉視窗，下次開啟 App 會再提醒。
            </p>
          </div>
        </div>
      </div>

      {photos && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPhotos(null)}
        >
          <button onClick={() => setPhotos(null)} className="absolute top-4 right-4 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors z-[170]">
            <X size={32} />
          </button>
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto p-4 flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            {photos.map((url, idx) => <Photo key={idx} url={url} index={idx} />)}
          </div>
        </div>
      )}
    </>
  );
};
