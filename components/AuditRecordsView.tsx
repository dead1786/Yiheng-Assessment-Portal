import React, { useState, useEffect } from 'react';
import { User, AnyDeficiencyRecord } from '../types';
import { fetchMyAuditRecords } from '../services/api';
import { DeficiencyRecordList } from './DeficiencyRecordList';
import { AuditStatsDashboard } from './AuditStatsDashboard';
import { AlertTriangle, ArrowLeft, Loader2, X, ChevronRight, Cloud, BarChart3 } from 'lucide-react';

const SingleImage: React.FC<{ url: string; index: number }> = ({ url, index }) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const getSafeUrl = (u: string) => {
    try {
      if (!u.includes('drive.google.com')) return u;
      const m = u.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (m && m[1]) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1200`;
      return u;
    } catch { return u; }
  };
  const src = getSafeUrl(url);
  return (
    <div className="bg-white p-2 rounded-lg shadow-2xl w-full flex flex-col">
      <div className="relative w-full h-[70vh] bg-gray-900 rounded flex items-center justify-center overflow-hidden">
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
            <span className="text-xs font-mono text-white">載入中...</span>
          </div>
        )}
        {status === 'error' ? (
          <div className="flex flex-col items-center justify-center gap-2 text-red-400 p-4">
            <AlertTriangle size={32} />
            <p className="text-sm font-bold">圖片無法顯示</p>
            <a href={src} target="_blank" rel="noreferrer" className="text-xs text-blue-400 underline">點此開啟原圖</a>
          </div>
        ) : (
          <img
            src={src}
            alt={`Evidence ${index + 1}`}
            className={`max-w-full max-h-full object-contain transition-opacity duration-500 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('error')}
          />
        )}
      </div>
      <div className="text-center py-3 text-sm text-gray-500 font-mono border-t border-gray-100 mt-1">照片 {index + 1}</div>
    </div>
  );
};

interface AuditRecordsViewProps {
  user: User;
  apiUrl: string;
  onBack: () => void;
}

export const AuditRecordsView: React.FC<AuditRecordsViewProps> = ({ user, apiUrl, onBack }) => {
  const cacheKey = `audit_records_${user.name}`;

  const [records, setRecords] = useState<AnyDeficiencyRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem(cacheKey) || '[]'); } catch { return []; }
  });
  const [isLoading, setIsLoading] = useState(() => {
    try { return JSON.parse(localStorage.getItem(cacheKey) || '[]').length === 0; } catch { return true; }
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<{ name: string; records: AnyDeficiencyRecord[] } | null>(null);
  const [viewingPhotos, setViewingPhotos] = useState<string[] | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);

  useEffect(() => {
    const hasCache = records.length > 0;
    if (!hasCache) setIsLoading(true);
    setIsSyncing(true);

    fetchMyAuditRecords(apiUrl, user.name)
      .then(res => {
        if (res.success) {
          setRecords(res.records);
          localStorage.setItem(cacheKey, JSON.stringify(res.records));
        }
      })
      .finally(() => {
        setIsLoading(false);
        setIsSyncing(false);
      });
  }, [apiUrl, user.name]);

  // 依被稽核者分組，按最新稽核日期排序
  const grouped = React.useMemo(() => {
    const map: Record<string, AnyDeficiencyRecord[]> = {};
    records.forEach(r => {
      if (!map[r.name]) map[r.name] = [];
      map[r.name].push(r);
    });
    return Object.entries(map)
      .map(([name, recs]) => ({
        name,
        records: [...recs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        latestDate: Math.max(...recs.map(r => new Date(r.date).getTime()))
      }))
      .sort((a, b) => b.latestDate - a.latestDate);
  }, [records]);

  const formatDate = (d: string) => { try { return new Date(d).toLocaleDateString('zh-TW'); } catch { return d; } };

  const handleViewPhotos = (photoUrlString: string | undefined) => {
    if (!photoUrlString) return;
    const urls = photoUrlString.split(/[,|\n]+/).map(s => s.trim()).filter(Boolean);
    if (urls.length > 0) setViewingPhotos(urls);
  };

  const openPersonModal = (name: string) => {
    const group = grouped.find(g => g.name === name);
    if (group) setSelectedPerson({ name, records: group.records });
  };

  // 統計表模式
  if (statsOpen) {
    return (
      <AuditStatsDashboard
        records={records}
        mode="multi"
        onBack={() => setStatsOpen(false)}
      />
    );
  }

  return (
    <div className="w-full max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* 背景同步指示器 */}
      {isSyncing && (
        <div className="fixed bottom-8 right-8 z-50 bg-orange-100/90 border border-orange-200 text-orange-700 px-4 py-2 rounded-full shadow-xl flex items-center gap-2 animate-bounce pointer-events-none backdrop-blur-sm">
          <Cloud size={16} />
          <span className="text-xs font-bold">正在同步最新資料...</span>
        </div>
      )}

      <header className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="text-orange-500" size={24} />
            我的稽核紀錄
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">稽核員：{user.name}</p>
        </div>
        <button
          onClick={() => setStatsOpen(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm transition-all active:scale-95"
        >
          <BarChart3 size={14} /> 統計表
        </button>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {isLoading ? (
          <div className="text-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-gray-500">正在載入稽核紀錄...</p>
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center text-gray-400">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle size={32} className="text-gray-300" />
            </div>
            <p>目前尚無任何稽核紀錄</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <AlertTriangle size={20} className="text-orange-500" /> 被稽核人員總覽
              </h2>
              <div className="flex gap-2 mt-2">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full border border-orange-200">
                  共 {grouped.length} 人
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full border border-gray-200">
                  共 {records.length} 筆
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {grouped.map((group, idx) => (
                <button
                  key={idx}
                  onClick={() => openPersonModal(group.name)}
                  className="flex justify-between items-center p-4 rounded-xl border bg-red-50 border-red-200 hover:border-red-300 transition-all hover:shadow-md"
                >
                  <div className="text-left">
                    <h3 className="font-bold text-gray-800">{group.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">最近：{formatDate(group.records[0]?.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                      {group.records.length} 稽核
                    </span>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 詳細紀錄 Modal：點空白處關閉 */}
      {selectedPerson && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedPerson(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={20} />
                {selectedPerson.name} 的稽核歷史明細 (共 {selectedPerson.records.length} 筆)
              </h3>
              <button onClick={() => setSelectedPerson(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="overflow-auto flex-1 bg-white p-4">
              <DeficiencyRecordList
                records={selectedPerson.records}
                showAuditor={true}
                showName={false}
                onViewPhotos={handleViewPhotos}
              />
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => setSelectedPerson(null)}
                className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 shadow-sm transition-all"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 照片瀏覽 Modal：點空白處關閉 */}
      {viewingPhotos && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setViewingPhotos(null)}
        >
          <button
            onClick={() => setViewingPhotos(null)}
            className="absolute top-4 right-4 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors z-[110]"
          >
            <X size={32} />
          </button>
          <div
            className="w-full max-w-5xl max-h-[90vh] overflow-y-auto p-4 flex flex-col items-center gap-4"
            onClick={e => e.stopPropagation()}
          >
            {viewingPhotos.map((url, idx) => (
              <SingleImage key={idx} url={url} index={idx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
