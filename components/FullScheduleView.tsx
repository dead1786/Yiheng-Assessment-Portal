import React, { useEffect, useState } from 'react';
import { FullShift, UpdateScheduleRequest, Employee } from '../types';
import { fetchShiftSchedule, updateScheduleSource, fetchEmployeeList } from '../services/api';
import { ArrowLeft, Calendar, Moon, Sun, Loader2, UserMinus, Cloud, Edit3, X, Save } from 'lucide-react';

interface FullScheduleViewProps {
  apiUrl: string;
  onBack: () => void;
  canEdit?: boolean; 
  onAlert?: (msg: string) => void;
}

export const FullScheduleView: React.FC<FullScheduleViewProps> = ({ apiUrl, onBack, canEdit = false, onAlert }) => {
  const [shifts, setShifts] = useState<FullShift[]>(() => {
      try { return JSON.parse(localStorage.getItem('cache_full_schedule') || '[]'); } catch { return []; }
  });
  
  const [employees, setEmployees] = useState<Employee[]>(() => {
      try { return JSON.parse(localStorage.getItem('admin_employees') || '[]'); } catch { return []; }
  });

  const [colorMap, setColorMap] = useState<{ [key: string]: string }>(() => {
      try { return JSON.parse(localStorage.getItem('cache_color_map') || '{}'); } catch { return {}; }
  });

  const [isLoading, setIsLoading] = useState(shifts.length === 0);
  const [isSyncing, setIsSyncing] = useState(shifts.length > 0);
  
  // 編輯相關
  const [editingShift, setEditingShift] = useState<FullShift | null>(null);
  const [editForm, setEditForm] = useState<UpdateScheduleRequest>({
      date: '', n1_night: '', n2_night: '', n1_day: '', n2_day: '', leave: []
  });
  const [leaveInput, setLeaveInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const today = new Date();
  const todayStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    const loadData = async () => {
      if (shifts.length === 0) setIsLoading(true);
      try {
        const data = await fetchShiftSchedule<FullShift>(apiUrl);
        if (data.success) {
          setShifts(data.shifts);
          if (data.colorMap) setColorMap(data.colorMap);
          localStorage.setItem('cache_full_schedule', JSON.stringify(data.shifts));
          if (data.colorMap) localStorage.setItem('cache_color_map', JSON.stringify(data.colorMap));
        }
        if (employees.length === 0) {
            const empRes = await fetchEmployeeList(apiUrl);
            if (empRes.success) {
                setEmployees(empRes.employees);
                localStorage.setItem('admin_employees', JSON.stringify(empRes.employees));
            }
        }
      } catch (e) { console.error("Sync failed"); } 
      finally { setIsLoading(false); setIsSyncing(false); }
    };
    loadData();
  }, [apiUrl]);

  const handleEditClick = (shift: FullShift) => {
      if (!canEdit) return;
      setEditingShift(shift);
      setEditForm({
          date: shift.date,
          n1_night: shift.n1_night || '',
          n2_night: shift.n2_night || '',
          n1_day: shift.n1_day || '',
          n2_day: shift.n2_day || '',
          leave: shift.leave || []
      });
      setLeaveInput((shift.leave || []).join(','));
  };

  const handleModalSave = async () => {
      if (!onAlert) return;
      
      setIsSaving(true);
      
      const leaveArray = leaveInput.split(/[,，\s]+/).map(s => s.trim()).filter(s => s);
      const payload = { ...editForm, leave: leaveArray };

      try {
          const res = await updateScheduleSource(apiUrl, payload);
          onAlert(res.message);
          
          if (res.success) {
              const updatedShift: FullShift = {
                  ...editingShift!,
                  n1_night: editForm.n1_night,
                  n2_night: editForm.n2_night,
                  n1_day: editForm.n1_day,
                  n2_day: editForm.n2_day,
                  leave: leaveArray,
                  nightShift: [editForm.n1_night, editForm.n2_night].filter(n => n),
                  dayShift: [editForm.n1_day, editForm.n2_day].filter(n => n)
              };
              setShifts(prev => prev.map(s => s.date === editingShift!.date ? updatedShift : s));
              setEditingShift(null);
          }
      } catch(e) {
          onAlert("儲存失敗，請檢查網路連線。");
      } finally {
          setIsSaving(false);
      }
  };

  const groupShiftsByMonth = () => { const groups: { [key: string]: FullShift[] } = {}; shifts.forEach(shift => { const month = shift.date.substring(0, 7); if (!groups[month]) groups[month] = []; groups[month].push(shift); }); return groups; };
  const groupedShifts = groupShiftsByMonth();
  const sortedMonths = Object.keys(groupedShifts).sort();
  const formatDay = (day: string) => { const map: {[key:string]: string} = { 'Mon': '星期一', 'Tue': '星期二', 'Wed': '星期三', 'Thu': '星期四', 'Fri': '星期五', 'Sat': '星期六', 'Sun': '星期日' }; return map[day] || day; };
  const getContrastColor = (hexcolor: string) => { if (!hexcolor || hexcolor === '#ffffff') return '#374151'; const r = parseInt(hexcolor.substr(1, 2), 16); const g = parseInt(hexcolor.substr(3, 2), 16); const b = parseInt(hexcolor.substr(5, 2), 16); const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000; return (yiq >= 128) ? '#000000' : '#ffffff'; };
  const getNameBadge = (name: string) => { let bgColor = colorMap[name] || '#f3f4f6'; if (bgColor.toLowerCase() === '#ffffff') bgColor = '#f3f4f6'; const textColor = getContrastColor(bgColor); return ( <span key={name} style={{ backgroundColor: bgColor, color: textColor }} className="px-2 py-1 rounded text-sm font-bold shadow-sm border border-black/5 whitespace-nowrap">{name}</span> ); };
  const formatDate = (dateStr: string) => { try { const d = new Date(dateStr); if (isNaN(d.getTime())) return dateStr; const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}/${m}/${day}`; } catch { return dateStr; } };
  const renderEmployeeOptions = () => ( <> <option value="">(空)</option> {employees.map((emp, idx) => ( <option key={idx} value={emp.name}>{emp.name}</option> ))} </> );

  return (
    <div className="w-full max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {isSyncing && (<div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 z-50 bg-orange-100/90 border border-orange-200 text-orange-700 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-pulse pointer-events-none backdrop-blur-sm"><Cloud size={16} /><span className="text-xs font-bold">正在同步最新班表...</span></div>)}
      
      <div className="flex justify-between items-center mb-6"><button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-800 transition-colors"><ArrowLeft className="w-4 h-4 mr-1" /> 返回</button></div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-4">
          <div className="bg-indigo-600 p-3 rounded-xl text-white"><Calendar className="w-6 h-6" /></div>
          <div><h2 className="text-2xl font-bold text-gray-900">排班總表</h2><p className="text-gray-500 text-sm">{canEdit ? "點擊表格行即可編輯人員" : "僅供檢視"}</p></div>
        </div>

        {shifts.length === 0 ? (
           <div className="text-center py-20 bg-gray-50 rounded-xl"><p className="text-gray-500">尚無排班資料</p></div>
        ) : (
          <div className="space-y-10">
            {sortedMonths.map(month => (
              <div key={month}>
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2 sticky top-0 bg-white py-2 z-10">
                  <span className="w-2 h-6 bg-indigo-500 rounded-full"></span> {month.replace('/', '年 ')} 月
                </h3>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-gray-50 text-gray-700">
                            <tr>
                                <th className="p-3 border-b text-center min-w-[120px]">日期</th>
                                {/* ✅ 順序對調：小夜在左 */}
                                <th className="p-3 border-b min-w-[200px]"><div className="flex items-center gap-2"><Sun size={16} className="text-orange-500"/> 小夜/假日 (18-21/19-21)</div></th>
                                <th className="p-3 border-b min-w-[200px]"><div className="flex items-center gap-2"><Moon size={16} className="text-slate-600"/> 大夜班 (21-09)</div></th>
                                <th className="p-3 border-b min-w-[150px]"><div className="flex items-center gap-2"><UserMinus size={16} className="text-red-500"/> 請假人員</div></th>
                                {canEdit && <th className="p-3 border-b w-10"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {groupedShifts[month].map((shift, idx) => {
                                const isToday = shift.date === todayStr;
                                const isWeekend = ['Sat', 'Sun'].includes(shift.day);
                                let rowClass = canEdit ? 'cursor-pointer hover:bg-blue-50 transition-colors' : 'hover:bg-gray-50';
                                if (isToday) rowClass += ' bg-yellow-100 border-l-4 border-l-yellow-500 shadow-inner'; else if (isWeekend) rowClass += ' bg-orange-50/60';
                                
                                return (
                                    <tr key={idx} className={rowClass} onClick={() => handleEditClick(shift)}>
                                        <td className={`p-3 text-center border-r border-gray-100 ${isToday ? 'font-extrabold text-yellow-900' : ''}`}><div className={`font-bold ${isToday ? 'text-xl' : 'text-gray-800 text-lg'}`}>{formatDate(shift.date)}</div><div className={`text-xs font-medium ${isToday ? 'text-yellow-700' : (isWeekend ? 'text-red-500' : 'text-gray-400')}`}>{formatDay(shift.day)}{isToday && <span className="block text-[10px] bg-yellow-500 text-white rounded px-1 mt-1">TODAY</span>}</div></td>
                                        {/* ✅ 順序對調：先渲染 dayShift */}
                                        <td className="p-3"><div className="flex flex-wrap gap-2">{shift.dayShift.length > 0 ? shift.dayShift.map(getNameBadge) : <span className="text-gray-300 text-sm">-</span>}</div></td>
                                        <td className="p-3"><div className="flex flex-wrap gap-2">{shift.nightShift.length > 0 ? shift.nightShift.map(getNameBadge) : <span className="text-gray-300 text-sm">-</span>}</div></td>
                                        <td className={`p-3 border-l border-gray-100 ${isToday ? 'bg-yellow-50/50' : 'bg-red-50/30'}`}><div className="flex flex-wrap gap-2">{shift.leave && shift.leave.length > 0 ? shift.leave.map(n => (<span key={n} className="px-2 py-1 bg-white border border-red-200 text-red-600 rounded text-xs font-bold shadow-sm whitespace-nowrap">{n}</span>)) : <span className="text-gray-300 text-sm">-</span>}</div></td>
                                        {canEdit && <td className="p-3 text-gray-400"><Edit3 size={16} /></td>}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 編輯視窗 (Modal) */}
      {editingShift && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh] transition-all relative ${isSaving ? 'pointer-events-none' : ''}`}>
              
              {isSaving && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-2xl">
                      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                      <p className="text-blue-700 font-bold text-lg animate-pulse">正在寫入班表...</p>
                  </div>
              )}

              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4"><h3 className="text-xl font-bold text-gray-900">編輯班表 ({formatDate(editingShift.date)})</h3><button onClick={() => setEditingShift(null)} className="p-2 hover:bg-gray-100 rounded-full" disabled={isSaving}><X size={24} /></button></div>
              <div className="space-y-6">
                 {/* ✅ 順序對調：編輯彈窗也將小夜放上面或左邊 */}
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold text-orange-700 mb-1">小夜 - 左 (N1)</label><select value={editForm.n1_day} onChange={e => setEditForm({...editForm, n1_day: e.target.value})} className="w-full p-2 border border-gray-300 rounded bg-white">{renderEmployeeOptions()}</select></div>
                    <div><label className="block text-sm font-bold text-orange-700 mb-1">小夜 - 右 (N2)</label><select value={editForm.n2_day} onChange={e => setEditForm({...editForm, n2_day: e.target.value})} className="w-full p-2 border border-gray-300 rounded bg-white">{renderEmployeeOptions()}</select></div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold text-slate-700 mb-1">大夜 - 左 (N1)</label><select value={editForm.n1_night} onChange={e => setEditForm({...editForm, n1_night: e.target.value})} className="w-full p-2 border border-gray-300 rounded bg-white">{renderEmployeeOptions()}</select></div>
                    <div><label className="block text-sm font-bold text-slate-700 mb-1">大夜 - 右 (N2)</label><select value={editForm.n2_night} onChange={e => setEditForm({...editForm, n2_night: e.target.value})} className="w-full p-2 border border-gray-300 rounded bg-white">{renderEmployeeOptions()}</select></div>
                 </div>
                 
                 <div><label className="block text-sm font-bold text-red-700 mb-1">請假人員 (逗號分隔)</label><textarea value={leaveInput} onChange={e => setLeaveInput(e.target.value)} className="w-full p-2 border border-gray-300 rounded h-20 resize-none" placeholder="例如: 王大明, 李小華" /></div>
                 
                 <button onClick={handleModalSave} disabled={isSaving} className={`w-full py-4 text-white rounded-xl font-bold flex justify-center items-center shadow-lg transition-all ${isSaving ? 'bg-gray-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}>
                    {isSaving ? "儲存中..." : <><Save className="mr-2"/> 確認修改並儲存</>}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};