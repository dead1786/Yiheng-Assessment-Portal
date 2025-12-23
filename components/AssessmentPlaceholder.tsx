import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { LogOut, ClipboardList, CheckCircle2, UserCircle, Lock, Calendar, LayoutGrid, Navigation, SignalHigh, SignalLow, Wrench } from 'lucide-react';

interface AssessmentPlaceholderProps {
  user: User;
  onLogout: () => void;
  onStartAssessment: () => void;
  onViewHistory: () => void;
  onViewProfile: () => void;
  onViewSchedule: () => void;
  onViewFullSchedule: () => void;
  onReportDeficiency: () => void;
  onClockIn: () => void;
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
  onClockIn 
}) => {
  const [preLocation, setPreLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

  // ✅ GPS 預熱機制：現在對「所有員工」開放
  useEffect(() => {
    if (navigator.geolocation) {
      console.log("GPS 背景預熱中...");
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setPreLocation({ 
            lat: pos.coords.latitude, 
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy 
          });
        },
        (err) => console.warn("定位預熱失敗", err),
        { 
            enableHighAccuracy: true, 
            timeout: 10000, 
            maximumAge: 0 
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []); // 移除 user.name 依賴，只在組件掛載時執行一次

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
             
             {/* ✅ GPS 訊號狀態：現在對所有人顯示 */}
             {preLocation && (
                <div className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold ${preLocation.accuracy < 100 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {preLocation.accuracy < 100 ? <SignalHigh size={12}/> : <SignalLow size={12}/>}
                    GPS 誤差: {Math.round(preLocation.accuracy)}m 
                    {preLocation.accuracy > 500 && " (訊號極差，建議靠近窗邊)"}
                </div>
             )}
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

        {/* 卡片 2: 勤務打卡 (✅ 已全面開放) */}
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
          <p className="text-gray-500 mb-6 text-sm">需連網並開啟GPS</p>
          <button onClick={onClockIn} className="mt-auto w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
            立即打卡
          </button>
        </div>

        {/* 卡片 3: 勤務班表 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition-shadow group">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4 text-indigo-600 group-hover:scale-110 transition-transform">
            <Calendar size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">勤務班表</h3>
          <p className="text-gray-500 mb-6 text-sm">查看個人或全體排班狀況。</p>
          <div className="mt-auto w-full space-y-2">
             <button onClick={onViewSchedule} className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors">
                我的班表
             </button>
             {canSeeFullSchedule && (
                <button onClick={onViewFullSchedule} className="w-full py-2.5 px-4 bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 font-medium transition-colors flex items-center justify-center">
                    <LayoutGrid size={16} className="mr-2"/> 全體總表
                </button>
             )}
          </div>
        </div>

        {/* 卡片 4: 升階考核 */}
        <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center transition-shadow ${user.canAssess ? 'hover:shadow-md group' : 'bg-gray-50'}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-transform ${user.canAssess ? 'bg-emerald-100 text-emerald-600 group-hover:scale-110' : 'bg-gray-200 text-gray-400'}`}>
            {user.canAssess ? <ClipboardList size={32} /> : <Lock size={32} />}
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">升階考核</h3>
          <p className="text-gray-500 mb-6 text-sm">
            {user.canAssess ? "進行本季績效評估。" : "目前無需考核或未開放。"}
          </p>
          <div className="mt-auto w-full space-y-2">
             <button 
                onClick={onStartAssessment}
                disabled={!user.canAssess}
                className={`w-full py-2.5 px-4 rounded-lg font-medium transition-colors ${
                  user.canAssess 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {user.canAssess ? "進入考核" : "未開放"}
             </button>
             <button onClick={onViewHistory} className="w-full py-2.5 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors flex items-center justify-center">
                <CheckCircle2 size={16} className="mr-2"/> 歷史紀錄
             </button>
          </div>
        </div>

        {/* 卡片 5: 維運管理 (稽核回報) - 僅組長級以上顯示 */}
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

      </div>
    </div>
  );
};