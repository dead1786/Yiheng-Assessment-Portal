import React, { useEffect, useState } from 'react';
import { User, AssessmentRecord } from '../types';
import { fetchHistory } from '../services/api';
import { ArrowLeft, Clock, Award, MessageSquare, Loader2, Cloud } from 'lucide-react';

interface HistoryViewProps {
  user: User;
  apiUrl: string;
  onBack: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ user, apiUrl, onBack }) => {
  const [history, setHistory] = useState<AssessmentRecord[]>(() => {
      try { return JSON.parse(localStorage.getItem(`cache_history_${user.name}`) || '[]'); } catch { return []; }
  });

  const [isLoading, setIsLoading] = useState(history.length === 0);
  const [isSyncing, setIsSyncing] = useState(history.length > 0);

  useEffect(() => {
    const loadData = async () => {
      if (history.length === 0) setIsLoading(true);
      try {
        const data = await fetchHistory(apiUrl, user.name);
        if (data.success) {
          setHistory(data.records);
          localStorage.setItem(`cache_history_${user.name}`, JSON.stringify(data.records));
        }
      } catch (e) { console.error("Sync failed"); } 
      finally { setIsLoading(false); setIsSyncing(false); }
    };
    loadData();
  }, [apiUrl, user.name]);

  // ✅ 統一日期格式: 2025/12/15 14:30:00 (含時間)
  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const s = String(d.getSeconds()).padStart(2, '0');
      return `${y}/${m}/${day} ${h}:${min}:${s}`;
    } catch { return dateStr; }
  };

  return (
    <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {isSyncing && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 z-50 bg-orange-100/90 border border-orange-200 text-orange-700 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse pointer-events-none backdrop-blur-sm">
           <Cloud size={16} />
           <span className="text-xs font-bold">正在同步最新紀錄...</span>
        </div>
      )}

      <button onClick={onBack} className="mb-6 flex items-center text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回儀表板
      </button>

      <div className="flex items-center gap-3 mb-8">
        <Clock className="w-8 h-8 text-green-600" />
        <h2 className="text-2xl font-bold text-gray-900">歷史考核紀錄</h2>
      </div>

      {isLoading ? (
        <div className="text-center py-20 bg-white rounded-2xl">
          <Loader2 className="w-10 h-10 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-500">正在載入歷史紀錄...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-500">目前尚無任何考核紀錄。</p>
        </div>
      ) : (
        <div className="space-y-6">
          {history.map((record, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{formatDateTime(record.timestamp)}</p>
                  <h3 className="font-bold text-lg text-gray-800">{record.jobTitle} <span className="text-sm font-normal text-gray-500">({record.yearsOfService}年)</span></h3>
                </div>
                <div className="flex gap-4">
                  <div className="text-center px-4 py-2 bg-blue-50 rounded-lg border border-blue-100"><p className="text-xs text-blue-600 font-bold uppercase mb-1">AI 評分</p><p className="text-2xl font-bold text-blue-700">{record.aiScore}</p></div>
                  <div className="text-center px-4 py-2 bg-green-50 rounded-lg border border-green-100"><p className="text-xs text-green-600 font-bold uppercase mb-1">最終分數</p><p className="text-2xl font-bold text-green-700">{record.finalScore || '-'}</p></div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3"><Award className="w-5 h-5 text-purple-600" /><h4 className="font-bold text-gray-800">AI 綜合評語</h4></div>
                  <div className="bg-purple-50 p-4 rounded-xl text-gray-700 text-sm leading-relaxed border border-purple-100">{record.aiComment}</div>
                </div>
                {record.adminComment && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3"><MessageSquare className="w-5 h-5 text-orange-600" /><h4 className="font-bold text-gray-800">主管評語</h4></div>
                    <div className="bg-orange-50 p-4 rounded-xl text-gray-700 text-sm leading-relaxed border border-orange-100">{record.adminComment}</div>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-4 mt-4">
                  <details className="group">
                    <summary className="flex items-center cursor-pointer text-gray-500 hover:text-gray-800 font-medium select-none"><span className="group-open:rotate-90 transition-transform mr-2">▶</span>查看詳細問答內容</summary>
                    <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-100 ml-1">{record.answers.map((qa, i) => (<div key={i} className="text-sm"><div className="whitespace-pre-wrap text-gray-600">{qa}</div></div>))}</div>
                  </details>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};