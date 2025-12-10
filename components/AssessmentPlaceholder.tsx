import React from 'react';
import { User } from '../types';
import { LogOut, ClipboardList, CheckCircle2, UserCircle, Lock, Calendar } from 'lucide-react';

interface AssessmentPlaceholderProps {
  user: User;
  onLogout: () => void;
  onStartAssessment: () => void;
  onViewHistory: () => void;
  onViewProfile: () => void;
  onViewSchedule: () => void; // 確保介面定義有這行
}

// ⚠️ 修正點：這裡補上了 onViewSchedule
export const AssessmentPlaceholder: React.FC<AssessmentPlaceholderProps> = ({ 
  user, 
  onLogout, 
  onStartAssessment, 
  onViewHistory,
  onViewProfile,
  onViewSchedule 
}) => {
  return (
    <div className="w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
           <h1 className="text-3xl font-bold text-gray-900">員工管理儀表板</h1>
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

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"> 
        
        {/* 卡片 1: 個人資訊 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition-shadow group">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 text-purple-600 group-hover:scale-110 transition-transform">
            <UserCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">個人檔案</h3>
          <p className="text-gray-500 mb-6 text-sm">檢視 KPI、年資與稽核缺失。</p>
          <button 
            onClick={onViewProfile}
            className="mt-auto w-full py-2.5 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
          >
            查看檔案
          </button>
        </div>

        {/* 卡片 2: 排班查詢 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition-shadow group">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4 text-indigo-600 group-hover:scale-110 transition-transform">
            <Calendar size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">排班表</h3>
          <p className="text-gray-500 mb-6 text-sm">查看本月與次月值班日期。</p>
          <button 
            onClick={onViewSchedule}
            className="mt-auto w-full py-2.5 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
          >
            查看班表
          </button>
        </div>

        {/* 卡片 3: 開始考核 */}
        <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center transition-shadow ${user.canAssess ? 'hover:shadow-md group' : 'opacity-60 bg-gray-50'}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-transform ${user.canAssess ? 'bg-blue-100 text-blue-600 group-hover:scale-110' : 'bg-gray-200 text-gray-400'}`}>
            {user.canAssess ? <ClipboardList size={32} /> : <Lock size={32} />}
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">升階考核</h3>
          <p className="text-gray-500 mb-6 text-sm">
            {user.canAssess ? "填寫本季績效評估報告。" : "目前無需考核或未開放。"}
          </p>
          <button 
            onClick={onStartAssessment}
            disabled={!user.canAssess}
            className={`mt-auto w-full py-2.5 px-4 rounded-lg font-medium transition-colors ${
              user.canAssess 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {user.canAssess ? "進入考核" : "未開放"}
          </button>
        </div>

        {/* 卡片 4: 歷史紀錄 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition-shadow group">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600 group-hover:scale-110 transition-transform">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">歷史紀錄</h3>
          <p className="text-gray-500 mb-6 text-sm">檢視過去所有考核評分。</p>
          <button 
            onClick={onViewHistory}
            className="mt-auto w-full py-2.5 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            查看紀錄
          </button>
        </div>

      </div>
    </div>
  );
};