import React, { useEffect, useState } from 'react';
import { User, DeficiencyRecord } from '../types';
import { fetchDeficiencyRecords } from '../services/api';
import { ArrowLeft, User as UserIcon, AlertTriangle, Loader2, Award, Cloud, RefreshCw, Palmtree, Image as ImageIcon, X } from 'lucide-react';

interface ProfileViewProps {
  user: User;
  apiUrl: string;
  onBack: () => void;
  // ✅ 新增：接收刷新函式
  onRefresh?: () => Promise<void>; 
}

// ✅ [修正] 圖片預覽元件 (終極防裁切版：強制完整顯示)
const ImagePreview: React.FC<{ url: string, index: number }> = ({ url, index }) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  const getSafeUrl = (u: string) => {
    try {
       if (!u.includes('drive.google.com')) return u;
       const idMatch = u.match(/\/d\/([a-zA-Z0-9_-]+)/);
       // 使用 Google 縮圖 API
       if (idMatch && idMatch[1]) return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1200`;
       return u;
    } catch { return u; }
  };

  const src = getSafeUrl(url);

  return (
    <div className="bg-white p-2 rounded-lg shadow-2xl w-full flex flex-col relative">
      {/* 圖片容器：設定固定高度範圍，背景改深灰色增加對比 */}
      <div className="relative w-full h-[70vh] bg-gray-900 rounded flex items-center justify-center overflow-hidden">
        
        {status === 'loading' && (
           <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2 z-10">
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
              // ✅ CSS 關鍵修正：
              // 1. h-full w-full object-contain: 強制圖片在容器內「完整顯示」，多餘空間留黑邊，絕不裁切。
              // 2. max-h-full max-w-full: 雙重保險。
              className={`max-w-full max-h-full object-contain shadow-sm transition-opacity duration-500 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setStatus('loaded')}
              onError={() => setStatus('error')}
           />
        )}
      </div>
      <div className="text-center py-3 text-sm text-gray-500 font-mono border-t border-gray-100 mt-1">
          照片 {index + 1}
      </div>
    </div>
  );
};


export const ProfileView: React.FC<ProfileViewProps> = ({ user, apiUrl, onBack, onRefresh }) => {
  const [kpiValue, setKpiValue] = useState<string | number | undefined>(() => {
    const u = user as any;
    return u.kpi || u.KPI || u.Kpi || u.score || u.Score || u.grade;
  });

  const [deficiencies, setDeficiencies] = useState<DeficiencyRecord[]>(() => {
      try { return JSON.parse(localStorage.getItem(`cache_profile_${user.name}`) || '[]'); } catch { return []; }
  });

  const [isLoading, setIsLoading] = useState(deficiencies.length === 0);
  const [isSyncing, setIsSyncing] = useState(deficiencies.length > 0);
  const [kpiLoading, setKpiLoading] = useState(false); 
  const [viewingPhotos, setViewingPhotos] = useState<string[] | null>(null);

  // 獨立的資料載入函式
  const loadData = async (forceRefresh = false) => {
    if (forceRefresh) {
        setIsSyncing(true);
        setKpiLoading(true);
    } else {
        if (deficiencies.length === 0) setIsLoading(true);
        if (!kpiValue) setKpiLoading(true);
    }

    try {
      const data = await fetchDeficiencyRecords(apiUrl, user.name);
      
      if (data.success) {
        setDeficiencies(data.records);
        localStorage.setItem(`cache_profile_${user.name}`, JSON.stringify(data.records));
        if (data.kpi !== undefined && data.kpi !== '') {
            setKpiValue(data.kpi);
        }
      }
    } catch (e) { console.error("Sync failed"); } 
    finally { 
      setIsLoading(false); 
      setIsSyncing(false);
      setKpiLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [apiUrl, user.name]);

  // ✅ 處理手動刷新
  const handleManualRefresh = async () => {
      setIsSyncing(true);
      // 1. 呼叫上層 App 更新 User 資料 (特休/職等)
      if (onRefresh) await onRefresh();
      // 2. 更新本頁面的稽核紀錄
      await loadData(true);
      setIsSyncing(false);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}/${m}/${day}`;
    } catch { return dateStr; }
  };

  const parseKpi = (val: any) => {
    if (val === undefined || val === null || val === '') return NaN;
    const numStr = String(val).replace(/%|分|\s/g, '');
    return Number(numStr);
  };

  const getKpiColor = (val: any) => {
      const num = parseKpi(val);
      if (isNaN(num)) return 'blue';
      if (num < 80) return 'red';
      if (num >= 90) return 'green';
      return 'blue';
  };

  const kpiColor = getKpiColor(kpiValue);
  
  const rawKpiStr = String(kpiValue || '');
  const isPercent = rawKpiStr.includes('%');
  
  let displayKpi = '--';
  if (kpiValue !== undefined && kpiValue !== '') {
      displayKpi = rawKpiStr.replace(/分|\s/g, '');
  }

  // 計算剩餘特休 (會隨 user props 更新而即時變動)
  const totalLeave = parseFloat(user.annualLeave || '0');
  const usedLeave = parseFloat(user.annualLeaveUsed || '0');
  const remainingLeave = (totalLeave - usedLeave).toFixed(1).replace(/\.0$/, '');

  const bgColors = { red: 'bg-red-50 border-red-100', green: 'bg-green-50 border-green-100', blue: 'bg-blue-50 border-blue-100' };
  const textColors = { red: 'text-red-900', green: 'text-green-900', blue: 'text-blue-900' };
  const iconColors = { red: 'text-red-600', green: 'text-green-600', blue: 'text-blue-600' };
  const labelColors = { red: 'text-red-700', green: 'text-green-700', blue: 'text-blue-700' };

  // ✅ 修正：使用 Google 縮圖 API，解決破圖與變數拼接錯誤
  const getDirectImageUrl = (url: string) => {
    try {
      if (!url.includes('drive.google.com')) return url;
      const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
         // sz=w1000 代表寬度設為 1000px，既清晰又比原圖載入快
         return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
      }
      return url;
    } catch { return url; }
  };

  // ✅ 新增：開啟圖片瀏覽的處理函式
  const handleViewPhotos = (photoUrlString: string | undefined) => {
      if (!photoUrlString) return;
      // ✅ 修正：使用正規表達式，同時支援「逗號」與「換行」作為分隔符號
      const urls = photoUrlString.split(/[,|\n]+/).map(s => s.trim()).filter(s => s);
      if (urls.length > 0) {
          setViewingPhotos(urls);
      }
  };

  return (
    <div className="w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {isSyncing && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 z-50 bg-orange-100/90 border border-orange-200 text-orange-700 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse pointer-events-none backdrop-blur-sm">
           <Cloud size={16} />
           <span className="text-xs font-bold">同步資料中...</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
          <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> 返回儀表板
          </button>
          
          {/* ✅ 重新整理按鈕 */}
          <button 
            onClick={handleManualRefresh} 
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 active:scale-95 transition-all shadow-sm font-medium disabled:opacity-50"
          >
            <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? "更新中..." : "刷新資料"}
          </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <UserIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">個人檔案與資訊</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 bg-gray-50 rounded-xl"><p className="text-sm text-gray-500 mb-1">姓名</p><p className="text-lg font-bold text-gray-800">{user.name}</p></div>
          <div className="p-4 bg-gray-50 rounded-xl"><p className="text-sm text-gray-500 mb-1">職稱 / 年資</p><p className="text-lg font-bold text-gray-800">{user.jobTitle ? user.jobTitle.split('||')[0].trim() : '-'} / {user.yearsOfService} 年</p></div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100"><div className="flex items-center gap-2 mb-1"><Award className="w-4 h-4 text-blue-600" /><p className="text-sm text-blue-700 font-medium">職等</p></div><p className="text-lg font-bold text-blue-900">{user.jobGrade || '-'}</p></div>
          
          <div className={`p-4 rounded-xl border flex flex-col min-h-[100px] ${bgColors[kpiColor as keyof typeof bgColors]} relative`}>
            {kpiLoading && (
               <div className="absolute top-2 right-2">
                 <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
               </div>
            )}
            <div className="flex items-center gap-2 mb-2">
                <Award className={`w-4 h-4 ${iconColors[kpiColor as keyof typeof iconColors]} flex-shrink-0`} />
                <p className={`text-sm font-medium ${labelColors[kpiColor as keyof typeof labelColors]}`}>年度KPI</p>
            </div>
            <div className="flex items-baseline gap-1">
              <p className={`text-2xl font-bold ${textColors[kpiColor as keyof typeof textColors]}`}>
                  {displayKpi}
              </p>
              {!isPercent && displayKpi !== '--' && <span className="text-xs text-gray-500">分</span>}
            </div>
          </div>
        </div>

        {/* 特休資訊儀表板 */}
        <div className="mt-6 grid grid-cols-2 gap-4">
             <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1 text-orange-600">
                    <Palmtree size={16} />
                    <span className="text-sm font-bold">特休總天數</span>
                </div>
                <div className="text-2xl font-bold text-orange-800">{totalLeave} <span className="text-xs text-orange-600/60 font-medium">天</span></div>
             </div>
             <div className="p-4 rounded-xl bg-green-50 border border-green-100 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1 text-green-600">
                    <Palmtree size={16} />
                    <span className="text-sm font-bold">剩餘特休</span>
                </div>
                <div className="text-2xl font-bold text-green-800">{remainingLeave} <span className="text-xs text-green-600/60 font-medium">天</span></div>
             </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-100 bg-red-50/50">
          <div className="flex items-center gap-3"><AlertTriangle className="w-6 h-6 text-red-500" /><h3 className="text-xl font-bold text-gray-900">稽核紀錄</h3></div>
        </div>

        {isLoading ? (
          <div className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" /><p className="text-gray-500">正在載入紀錄...</p></div>
        ) : deficiencies.length === 0 ? (
          <div className="text-center py-20 text-gray-400"><p>目前沒有任何稽核紀錄。</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50 text-gray-700 font-bold">
                <tr>
                  {/* ✅ 設定欄位寬度與禁止換行 */}
                  <th className="p-4 whitespace-nowrap w-32 border-b">稽核日期</th>
                  <th className="p-4 whitespace-nowrap w-48 border-b">交換站名稱</th>
                  <th className="p-4 whitespace-nowrap w-24 border-b">施作狀況</th>
                  <th className="p-4 whitespace-nowrap w-24 border-b">防護裝備</th>
                  <th className="p-4 whitespace-nowrap w-24 border-b">圈圍架設</th>
                  <th className="p-4 whitespace-nowrap min-w-[200px] border-b">清潔(箱內/現場)</th>
                  <th className="p-4 whitespace-nowrap w-24 border-b">作業順序</th>
                  <th className="p-4 whitespace-nowrap w-24 border-b">GNOP</th>
                  <th className="p-4 min-w-[250px] border-b">其他問題</th>
                  <th className="p-4 whitespace-nowrap w-20 border-b text-center">照片</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* ✅ 新增排序：最新的日期排在第一行 */}
                {[...deficiencies].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 whitespace-nowrap font-mono text-gray-500 align-top">{formatDate(record.date)}</td>
                    <td className="p-4 whitespace-nowrap font-medium text-gray-900 align-top">{record.station}</td>
                    <td className="p-4 whitespace-nowrap align-top">{record.status}</td>
                    <td className={`p-4 whitespace-nowrap align-top ${record.ppe && record.ppe.includes('不') ? 'text-red-600 font-bold' : 'text-green-600'}`}>{record.ppe}</td>
                    <td className={`p-4 whitespace-nowrap align-top ${record.fencing && record.fencing.includes('不') ? 'text-red-600 font-bold' : 'text-green-600'}`}>{record.fencing}</td>
                    {/* ✅ 使用 whitespace-pre-wrap 保留資料原始換行，不再隨機切斷 */}
                    <td className="p-4 whitespace-pre-wrap leading-relaxed align-top">
                      <div className="flex flex-col gap-1">
                        <span className={record.boxClean && record.boxClean.includes('不') ? 'text-red-600' : ''}>內: {record.boxClean}</span>
                        <span className={record.siteClean && record.siteClean.includes('不') ? 'text-red-600' : ''}>外: {record.siteClean}</span>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap align-top">{record.order}</td>
                    <td className="p-4 whitespace-nowrap align-top">{record.gnop}</td>
                    <td className="p-4 whitespace-pre-wrap text-gray-600 leading-relaxed align-top">{record.other}</td>
                  <td className="p-4 align-top text-center">
                        {record.photoUrl ? (
                            <button 
                                onClick={() => handleViewPhotos(record.photoUrl)}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors"
                                title="查看照片"
                            >
                                <ImageIcon size={20} />
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
     {/* ✅ 新增：照片瀏覽 Modal (已優化載入狀態) */}
      {viewingPhotos && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setViewingPhotos(null)}>
            <button 
                onClick={() => setViewingPhotos(null)}
                className="absolute top-4 right-4 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors z-[70]"
            >
                <X size={32} />
            </button>
            
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4 flex flex-col items-center gap-6" onClick={e => e.stopPropagation()}>
                {viewingPhotos.map((url, idx) => (
                    <ImagePreview key={idx} url={url} index={idx} />
                ))}
            </div>
        </div>
      )}
    </div>
  );
};
