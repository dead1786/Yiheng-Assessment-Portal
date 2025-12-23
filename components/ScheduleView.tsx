import React, { useEffect, useState } from 'react';
import { User, Shift } from '../types';
import { fetchShiftSchedule } from '../services/api';
import { ArrowLeft, Calendar, Loader2, Cloud } from 'lucide-react';

interface ScheduleViewProps {
  user: User;
  apiUrl: string;
  onBack: () => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ user, apiUrl, onBack }) => {
  const [shifts, setShifts] = useState<Shift[]>(() => {
      try {
          const saved = localStorage.getItem(`cache_schedule_${user.name}`);
          return saved ? JSON.parse(saved) : [];
      } catch { return []; }
  });

  const [isLoading, setIsLoading] = useState(shifts.length === 0);
  const [isSyncing, setIsSyncing] = useState(shifts.length > 0);

  // 今天的日期字串 (YYYY/MM/DD)
  const today = new Date();
  const todayStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    const loadData = async () => {
      if (shifts.length === 0) setIsLoading(true);
      try {
        const data = await fetchShiftSchedule<Shift>(apiUrl, user.name);
        if (data.success) {
          setShifts(data.shifts);
          localStorage.setItem(`cache_schedule_${user.name}`, JSON.stringify(data.shifts));
        }
      } catch (e) {
        console.error("Sync failed");
      } finally {
        setIsLoading(false);
        setIsSyncing(false);
      }
    };
    loadData();
  }, [apiUrl, user.name]);

  const formatDay = (day: string) => {
    const map: {[key:string]: string} = { 'Mon': '一', 'Tue': '二', 'Wed': '三', 'Thu': '四', 'Fri': '五', 'Sat': '六', 'Sun': '日' };
    return map[day] || day;
  };

  // ✅ 統一日期格式: 2025/12/15
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

  return (
    <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {isSyncing && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 z-50 bg-orange-100/90 border border-orange-200 text-orange-700 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse pointer-events-none backdrop-blur-sm">
           <Cloud size={16} />
           <span className="text-xs font-bold">正在同步最新班表...</span>
        </div>
      )}

      <button onClick={onBack} className="mb-6 flex items-center text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回儀表板
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-4">
          <Calendar className="w-8 h-8 text-indigo-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">我的班表</h2>
            <p className="text-gray-500 text-sm">僅顯示本月與次月班表</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-4" />
            <p className="text-gray-500">載入班表中...</p>
          </div>
        ) : shifts.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-xl">
            <p className="text-gray-500">目前尚無排班資料。</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="p-4 font-bold border-b w-[35%] text-center">日期</th>
                  <th className="p-4 font-bold border-b w-[20%] text-center">星期</th>
                  <th className="p-4 font-bold border-b w-[45%]">班別</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shifts.map((shift, idx) => {
                  const isWeekend = ['Sat', 'Sun'].includes(shift.day);
                  const isToday = shift.date === todayStr; 
                  
                  return (
                    <tr key={idx} className={`transition-colors ${isToday ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                      <td className={`p-4 font-mono text-center ${isToday ? 'text-yellow-700 font-bold' : 'text-gray-600'}`}>
                          {formatDate(shift.date)}
                          {isToday && <span className="block text-[10px] bg-yellow-500 text-white px-1.5 py-0.5 rounded mt-1 mx-auto w-fit">TODAY</span>}
                      </td>
                      <td className={`p-4 font-medium text-center ${isWeekend ? 'text-red-500' : 'text-gray-800'}`}>
                        {formatDay(shift.day)}
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap inline-block ${
                          shift.type === '大夜班' 
                            ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                            : 'bg-orange-50 text-orange-700 border border-orange-100'
                        }`}>
                          {shift.type}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};