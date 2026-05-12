import React from 'react';
import { User } from '../types';
import { LogOut, ClipboardList, CheckCircle2, UserCircle, Lock, Calendar, LayoutGrid, Navigation, Wrench, AlertTriangle } from 'lucide-react';

interface AssessmentPlaceholderProps {
  user: User;
  onLogout: () => void;
  onStartAssessment: () => void;
  onViewHistory: () => void;
  onViewProfile: () => void;
  onViewSchedule: () => void;
  onViewFullSchedule: () => void;
  onReportDeficiency: () => void;
  onViewAuditRecords: () => void;
}

export const AssessmentPlaceholder: React.FC<AssessmentPlaceholderProps> = ({
  user,
  onLogout,
  onStartAssessment,
  onViewHistory,
  onViewProfile,
  onViewSchedule,
  onViewFullSchedule,
  onReportDeficiency,
  onViewAuditRecords
}) => {
  
  const isLeader = (title?: string) => {
      if (!title) return false;
      const roles = ['組長', '副理', '經理', '主任', '處長', '總監'];
      return roles.some(r => title.includes(r)) && !title.includes('助理');
  };

  const canSeeFullSchedule = isLeader(user.jobTitle) || user.canEditSchedule;

  return (
    <div className="w-full max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
           <h1 className="text-3xl font-bold text-gray-900 text-center md:text-left">益恆科技-維運平台</h1>
           <div className="flex flex-col md:flex-row items-center gap-2 mt-1">
             <p className="text-gray-500">歡迎回來，<span className="font-semibold text-blue-600">{user.name}</span></p>
           </div>
        </div>
        <button onClick={onLogout} className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200">
          <LogOut className="w-4 h-4 mr-2" /> 登出
        </button>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"> 
        
        {/* 卡片 1: 個人檔案 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition-shadow group">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 text-purple-600 group-hover:scale-110 transition-transform">
            <UserCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">個人檔案</h3>
          <p className="text-gray-500 mb-6 text-sm">檢視 KPI、年資與稽核狀況。</p>
          <button onClick={onViewProfile} className="mt-auto w-full py-2.5 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors">
            查看檔案
          </button>
        </div>

        {/* 卡片 2: 維運管理 (稽核回報) - 僅組長級以上顯示 */}
        {isLeader(user.jobTitle) && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition-shadow group">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600 group-hover:scale-110 transition-transform">
              <Wrench size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">維運管理</h3>
            <p className="text-gray-500 mb-6 text-sm">現場稽核與缺失回報。</p>
            <button onClick={onReportDeficiency} className="mt-auto w-full py-2.5 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors flex items-center justify-center">
              <ClipboardList size={18} className="mr-2"/> 稽核缺失回報
            </button>
          </div>
        )}

        {/* 卡片 3: 勤務打卡 (已改為外部連結) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex flex-col items-center text-center hover:shadow-md transition-shadow group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          </div>
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-600 group-hover:scale-110 transition-transform">
            <Navigation size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">勤務打卡</h3>
          <p className="text-gray-500 mb-6 text-sm">前往打卡平台 (需開啟 GPS)</p>
          <button
            onClick={() => window.open('https://yiheng.vercel.app/', '_blank')}
            className="mt-auto w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            前往打卡
          </button>
        </div>

        {/* 稽核紀錄 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 flex flex-col items-center text-center hover:shadow-md transition-shadow group">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 text-orange-600 group-hover:scale-110 transition-transform">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">稽核紀錄</h3>
          <p className="text-gray-500 mb-6 text-sm">查看由我填寫的現場稽核紀錄。</p>
          <button onClick={onViewAuditRecords} className="mt-auto w-full py-2.5 px-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-colors">
            查看紀錄
          </button>
        </div>

      </div>
    </div>
  );
};