import React from 'react';
import { User } from '../types';
import { LogOut, ClipboardList, CheckCircle2 } from 'lucide-react';

interface AssessmentPlaceholderProps {
  user: User;
  onLogout: () => void;
  onStartAssessment: () => void;
  onViewHistory: () => void;
}

export const AssessmentPlaceholder: React.FC<AssessmentPlaceholderProps> = ({ user, onLogout, onStartAssessment, onViewHistory }) => {
  return (
    <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
           <h1 className="text-3xl font-bold text-gray-900">考核儀表板</h1>
           <p className="text-gray-500 mt-1">歡迎回來，<span className="font-semibold text-blue-600">{user.name}</span></p>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
        >
          <LogOut className="w-4 h-4 mr-2" />
          登出
        </button>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
            <ClipboardList size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">開始新的考核</h3>
          <p className="text-gray-500 mb-6">開始填寫您的績效評估報告。</p>
          <button 
            onClick={onStartAssessment}
            className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            進入考核頁面
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">已完成紀錄</h3>
          <p className="text-gray-500 mb-6">檢視您過去提交的所有考核紀錄與歷史資料。</p>
          <button 
            onClick={onViewHistory}
            className="w-full py-2.5 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            查看歷史紀錄
          </button>
        </div>
      </div>

      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
        <h4 className="font-bold text-blue-900 mb-2">系統公告</h4>
        <p className="text-sm text-blue-800">
          本考核系統目前為測試版本 (Prototype)。所有提交的資料將直接同步至 Google Sheets 後端。若有任何問題，請聯繫系統管理員。
        </p>
      </div>
    </div>
  );
};