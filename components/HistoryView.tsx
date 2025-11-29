import React, { useEffect, useState } from 'react';
import { User, AssessmentRecord } from '../types';
import { fetchHistory } from '../services/api';
import { ArrowLeft, Clock, Loader2, FileText, Calculator, MessageSquare, UserCheck } from 'lucide-react';

interface HistoryViewProps {
  user: User;
  apiUrl: string;
  onBack: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ user, apiUrl, onBack }) => {
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      const data = await fetchHistory(apiUrl, user.name);
      if (data.success) {
        setRecords(data.records);
      }
      setIsLoading(false);
    };
    loadHistory();
  }, [apiUrl, user.name]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('zh-TW');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={onBack}
        className="mb-6 flex items-center text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        返回儀表板
      </button>

      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Clock className="text-blue-600" />
        歷史考核紀錄
      </h2>

      {isLoading ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">載入歷史資料中...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">目前尚無已完成的考核紀錄。</p>
        </div>
      ) : (
        <div className="space-y-8">
          {records.map((record, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-bold">
                  第 {records.length - index} 次考核
                </span>
                <span className="text-sm text-gray-500 font-mono">
                  {formatDate(record.timestamp)}
                </span>
              </div>
              
              <div className="p-6 grid gap-6">
                {/* Answers Section */}
                <div className="space-y-4">
                  {record.answers.map((answer, i) => (
                    <div key={i}>
                      <p className="text-xs font-bold text-gray-500 mb-1">Q{i + 1}</p>
                      <p className="text-gray-800 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                        {answer}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Scores Section */}
                <div className="border-t border-gray-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* AI Evaluation */}
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-purple-800 flex items-center gap-2 text-sm">
                        <Calculator size={16} /> AI 評分
                      </span>
                      <span className="text-xl font-bold text-purple-700">{record.aiScore || '-'}</span>
                    </div>
                    <div className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-purple-100 min-h-[60px]">
                      {record.aiComment || <span className="text-gray-400 italic">無評語</span>}
                    </div>
                  </div>

                  {/* Admin Evaluation & Final Score */}
                  <div className="space-y-3">
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-green-800 flex items-center gap-2 text-sm">
                          <UserCheck size={16} /> 管理員評分
                        </span>
                        <span className="text-xl font-bold text-green-700">{record.adminScore || '-'}</span>
                      </div>
                      <div className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-green-100 min-h-[60px]">
                        {record.adminComment || <span className="text-gray-400 italic">待複評</span>}
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-blue-600 text-white p-4 rounded-xl shadow-sm">
                      <span className="font-bold text-sm">最終總分</span>
                      <span className="text-2xl font-bold">{record.finalScore || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};