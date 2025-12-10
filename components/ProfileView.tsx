import React, { useEffect, useState } from 'react';
import { User, DeficiencyRecord } from '../types';
import { fetchDeficiencyRecords } from '../services/api';
// 修改引入：新增 Target 或 TrendingUp 圖示，移除 Wallet
import { ArrowLeft, User as UserIcon, AlertTriangle, Loader2, Award, Target } from 'lucide-react';

interface ProfileViewProps {
  user: User;
  apiUrl: string;
  onBack: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, apiUrl, onBack }) => {
  const [deficiencies, setDeficiencies] = useState<DeficiencyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchDeficiencyRecords(apiUrl, user.name);
      if (data.success) {
        setDeficiencies(data.records);
      }
      setIsLoading(false);
    };
    loadData();
  }, [apiUrl, user.name]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('zh-TW');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={onBack}
        className="mb-6 flex items-center text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        返回儀表板
      </button>

      {/* 個人資訊卡片 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <UserIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">個人檔案與資訊</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">姓名</p>
            <p className="text-lg font-bold text-gray-800">{user.name}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500 mb-1">職稱 / 年資</p>
            <p className="text-lg font-bold text-gray-800">{user.jobTitle || '-'} / {user.yearsOfService} 年</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-blue-700 font-medium">職等</p>
            </div>
            <p className="text-lg font-bold text-blue-900">{user.jobGrade || '-'}</p>
          </div>
          
          {/* 修改區塊：年度 KPI */}
          <div className="p-4 bg-red-50 rounded-xl border border-red-100">
             <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-red-600" /> {/* 換成靶心圖示 */}
                <p className="text-sm text-red-700 font-medium">年度 KPI</p>
            </div>
            <p className="text-lg font-bold text-red-900">{user.kpi || '尚未設定'}</p>
          </div>
        </div>
      </div>

      {/* 缺失紀錄區塊 (保持不變) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-red-50/50">
          <div className="flex items-center gap-3">
             <AlertTriangle className="w-6 h-6 text-red-500" />
             <h3 className="text-xl font-bold text-gray-900">稽核缺失紀錄</h3>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">正在載入紀錄...</p>
          </div>
        ) : deficiencies.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
             <p>太棒了！目前沒有任何缺失紀錄。</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700 font-bold whitespace-nowrap">
                <tr>
                  <th className="p-4">稽核日期</th>
                  <th className="p-4">交換站名稱</th>
                  <th className="p-4">施作狀況</th>
                  <th className="p-4">防護裝備</th>
                  <th className="p-4">圈圍架設</th>
                  <th className="p-4">清潔(箱內/現場)</th>
                  <th className="p-4">作業順序</th>
                  <th className="p-4">GNOP</th>
                  <th className="p-4 min-w-[200px]">其他問題</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deficiencies.map((record, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 whitespace-nowrap font-mono text-gray-500">{formatDate(record.date)}</td>
                    <td className="p-4 font-medium text-gray-900">{record.station}</td>
                    <td className="p-4">{record.status}</td>
                    <td className={`p-4 ${record.ppe?.includes('不') ? 'text-red-600 font-bold' : 'text-green-600'}`}>{record.ppe}</td>
                    <td className={`p-4 ${record.fencing?.includes('不') ? 'text-red-600 font-bold' : 'text-green-600'}`}>{record.fencing}</td>
                    <td className="p-4">
                        <div className="flex flex-col gap-1">
                           <span className={record.boxClean?.includes('不') ? 'text-red-600' : ''}>內: {record.boxClean}</span>
                           <span className={record.siteClean?.includes('不') ? 'text-red-600' : ''}>外: {record.siteClean}</span>
                        </div>
                    </td>
                    <td className="p-4">{record.order}</td>
                    <td className="p-4">{record.gnop}</td>
                    <td className="p-4 text-gray-600">{record.other}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};