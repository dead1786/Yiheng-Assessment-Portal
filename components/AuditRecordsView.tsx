import React, { useState, useEffect } from 'react';
import { User, DeficiencyRecord } from '../types';
import { fetchMyAuditRecords } from '../services/api';
import { AlertTriangle, ArrowLeft, Loader2, Image as ImageIcon, X, Users } from 'lucide-react';

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
  const [records, setRecords] = useState<DeficiencyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingPhotos, setViewingPhotos] = useState<string[] | null>(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const res = await fetchMyAuditRecords(apiUrl, user.name);
      if (res.success) {
        const sorted = [...res.records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecords(sorted);
      }
      setIsLoading(false);
    })();
  }, [apiUrl, user.name]);

  const formatDate = (d: string) => { try { return new Date(d).toLocaleDateString('zh-TW'); } catch { return d; } };

  const handleViewPhotos = (photoUrlString: string | undefined) => {
    if (!photoUrlString) return;
    const urls = photoUrlString.split(/[,|\n]+/).map(s => s.trim()).filter(Boolean);
    if (urls.length > 0) setViewingPhotos(urls);
  };

  return (
    <div className="w-full max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="text-orange-500" size={24} />
            我的稽核紀錄
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">稽核員：{user.name}，共 {records.length} 筆</p>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-gray-500">正在載入稽核紀錄...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center text-gray-400">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users size={32} className="text-gray-300" />
            </div>
            <p>目前尚無任何稽核紀錄</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50 text-gray-700 font-bold sticky top-0 z-10">
                <tr>
                  <th className="p-4 whitespace-nowrap w-24 border-b">稽核日期</th>
                  <th className="p-4 whitespace-nowrap border-b">被稽核者</th>
                  <th className="p-4 whitespace-nowrap w-48 border-b">交換站名稱</th>
                  <th className="p-4 whitespace-nowrap w-24 border-b">狀態</th>
                  <th className="p-4 whitespace-nowrap w-32 border-b">裝備/圈圍</th>
                  <th className="p-4 whitespace-nowrap min-w-[200px] border-b">清潔細節</th>
                  <th className="p-4 whitespace-nowrap w-24 border-b">作業/GNOP</th>
                  <th className="p-4 min-w-[250px] border-b">其他描述</th>
                  <th className="p-4 whitespace-nowrap w-20 border-b text-center">照片</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((rec, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 whitespace-nowrap font-mono text-gray-500 align-top">{formatDate(rec.date)}</td>
                    <td className="p-4 whitespace-nowrap font-medium text-gray-900 align-top">{rec.name}</td>
                    <td className="p-4 whitespace-nowrap font-medium text-gray-700 align-top">{rec.station}</td>
                    <td className="p-4 whitespace-nowrap align-top">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rec.status === '待改善' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="p-4 whitespace-pre-wrap align-top text-xs leading-relaxed">
                      <div className={rec.ppe && rec.ppe.includes('不') ? 'text-red-600 font-bold' : ''}>裝備: {rec.ppe}</div>
                      <div className={rec.fencing && rec.fencing.includes('不') ? 'text-red-600 font-bold' : ''}>圈圍: {rec.fencing}</div>
                    </td>
                    <td className="p-4 whitespace-pre-wrap align-top text-xs leading-relaxed">
                      <div className={rec.boxClean && rec.boxClean.includes('不') ? 'text-red-600' : ''}>箱體: {rec.boxClean}</div>
                      <div className={rec.siteClean && rec.siteClean.includes('不') ? 'text-red-600' : ''}>環境: {rec.siteClean}</div>
                    </td>
                    <td className="p-4 whitespace-pre-wrap align-top text-xs leading-relaxed">
                      <div>順序: {rec.order}</div>
                      <div>GNOP: {rec.gnop}</div>
                    </td>
                    <td className="p-4 whitespace-pre-wrap text-gray-600 align-top leading-relaxed text-xs">{rec.other}</td>
                    <td className="p-4 align-top text-center">
                      {rec.photoUrl ? (
                        <button
                          onClick={() => handleViewPhotos(rec.photoUrl)}
                          className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors"
                          title="查看照片"
                        >
                          <ImageIcon size={16} />
                        </button>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
