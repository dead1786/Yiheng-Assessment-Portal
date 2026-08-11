import React from 'react';
import { User, Shift } from '../types';
import { fetchShiftSchedule } from '../services/api';
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import { useCloudSync } from '../services/useCloudSync';
import { SyncStatus } from './SyncStatus';

interface ScheduleViewProps {
  user: User;
  apiUrl: string;
  onBack: () => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ user, apiUrl, onBack }) => {
  const { data: shifts, isLoading, isSyncing, syncFailed, lastSyncedAt, refresh } = useCloudSync<Shift[]>(
    `cache_schedule_${user.name}`,
    async () => {
      const data = await fetchShiftSchedule<Shift>(apiUrl, user.name);
      return data.success ? data.shifts : null;
    },
    []
  );

  // 今天的日期字串 (YYYY/MM/DD)
  const today = new Date();
  const todayStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;

  const formatDay = (day: string) => {
    const map: {[key:string]: string} = { 'Mon': '一', 'Tue': '二', 'Wed': '三', 'Thu': '四', 'Fri': '五', 'Sat': '六', 'Sun': '日' };
    return map[day] || day;
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

  // 🔥 核心修改：取得班別的顯示樣式 (文字 + 顏色)
  const getShiftStyle = (shift: Shift) => {
    const date = new Date(shift.date);
    const day = date.getDay(); // 0 是週日, 6 是週六
    const isWeekend = day === 0 || day === 6;

    // 1. 如果是大夜班 (後端回傳 type: 'night')
    if (shift.type === 'night' || shift.type === '大夜班') {
      return { 
        text: '大夜班', 
        bg: '#d9d2e9', // 紫藕色
        color: '#3c364e', // 深紫色文字
        border: '#c5bbd8'
      };
    }

    // 2. 如果是日班 (後端回傳 type: 'day')
    if (shift.type === 'day' || shift.type === '一般') {
      if (isWeekend) {
        // 假日 -> 假日班
        return { 
          text: '假日班', 
          bg: '#fce5cd', // 淺橘色
          color: '#7e5a3d', // 深橘咖啡色文字
          border: '#e8d2ba'
        };
      } else {
        // 平日 -> 小夜班
        return { 
          text: '小夜班', 
          bg: '#d9ead3', // 淺綠色
          color: '#3d5c3a', // 深綠色文字
          border: '#c2dcc1'
        };
      }
    }

    // 3. 其他狀況 (預設)
    return { 
      text: shift.type || '一般', 
      bg: '#f3f4f6', 
      color: '#374151',
      border: '#e5e7eb'
    };
  };

  return (
    <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      <SyncStatus isSyncing={isSyncing} syncFailed={syncFailed} lastSyncedAt={lastSyncedAt} onRetry={refresh} syncingText="正在同步最新班表..." />

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
                  const isWeekend = ['Sat', 'Sun', '六', '日'].includes(shift.day);
                  const isToday = shift.date === todayStr;
                  const style = getShiftStyle(shift); // 取得樣式
                  
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
                        <span 
                          className="px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap inline-block shadow-sm"
                          style={{ 
                            backgroundColor: style.bg, 
                            color: style.color,
                            border: `1px solid ${style.border}`
                          }}
                        >
                          {style.text}
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
