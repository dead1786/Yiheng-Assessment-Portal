import React, { useEffect, useState } from 'react';
import { User, Shift } from '../types';
import { fetchShiftSchedule } from '../services/api';
import { ArrowLeft, Calendar, Moon, Sun, Loader2 } from 'lucide-react';

interface ScheduleViewProps {
  user: User;
  apiUrl: string;
  onBack: () => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ user, apiUrl, onBack }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchShiftSchedule(apiUrl, user.name);
      if (data.success) {
        setShifts(data.shifts);
      }
      setIsLoading(false);
    };
    loadData();
  }, [apiUrl, user.name]);

  // 將班表按「月份」分組的輔助函式
  const groupShiftsByMonth = () => {
    const groups: { [key: string]: Shift[] } = {};
    shifts.forEach(shift => {
      // 假設 date 格式為 yyyy/MM/dd
      const month = shift.date.substring(0, 7); // 取得 yyyy/MM
      if (!groups[month]) groups[month] = [];
      groups[month].push(shift);
    });
    return groups;
  };

  const groupedShifts = groupShiftsByMonth();
  const sortedMonths = Object.keys(groupedShifts).sort();

  // 星期幾轉換 (GAS 給英文，轉中文)
  const formatDay = (day: string) => {
    const map: {[key:string]: string} = { 
      'Mon': '週一', 'Tue': '週二', 'Wed': '週三', 'Thu': '週四', 'Fri': '週五', 'Sat': '週六', 'Sun': '週日' 
    };
    return map[day] || day;
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-4">
          <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
             <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">排班表查詢</h2>
            <p className="text-gray-500 text-sm">顯示您本月與次月的維運值班日期</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
            <p className="text-gray-500">正在讀取班表...</p>
          </div>
        ) : shifts.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
             <p className="text-gray-500">近兩個月無排班紀錄，請好好休息！☕</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedMonths.map(month => (
              <div key={month}>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                  {month.replace('/', '年 ')} 月
                </h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {groupedShifts[month].map((shift, idx) => (
                    <div key={idx} className={`
                      flex items-center p-4 rounded-xl border border-l-4 shadow-sm transition-transform hover:scale-[1.02]
                      ${shift.type === '大夜班' 
                        ? 'bg-slate-50 border-slate-200 border-l-slate-800' 
                        : 'bg-orange-50 border-orange-200 border-l-orange-500'}
                    `}>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xl font-bold text-gray-900">{shift.date.split('/')[2]}</span>
                          <span className="text-sm text-gray-500 font-medium">{formatDay(shift.day)}</span>
                        </div>
                        <div className={`text-sm font-bold flex items-center gap-1.5
                          ${shift.type === '大夜班' ? 'text-slate-700' : 'text-orange-700'}
                        `}>
                          {shift.type === '大夜班' ? <Moon size={14} /> : <Sun size={14} />}
                          {shift.type}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};