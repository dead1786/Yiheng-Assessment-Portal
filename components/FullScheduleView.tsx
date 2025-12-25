import React, { useEffect, useState } from 'react';
import { FullShift, UpdateScheduleRequest, Employee } from '../types';
import { fetchShiftSchedule, updateScheduleSource, fetchEmployeeList } from '../services/api';
import { ArrowLeft, Calendar, Loader2, Save, X } from 'lucide-react';

interface FullScheduleViewProps {
  apiUrl: string;
  onBack: () => void;
  canEdit?: boolean; 
  onAlert?: (msg: string) => void;
}

// 擴充型別以包含完整 raw data
interface ExtendedShift extends FullShift {
    fullRecord?: string[];
}

export const FullScheduleView: React.FC<FullScheduleViewProps> = ({ apiUrl, onBack, canEdit = false, onAlert }) => {
  const [shifts, setShifts] = useState<ExtendedShift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [colorMap, setColorMap] = useState<{ [key: string]: string }>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // 編輯相關
  const [editingShift, setEditingShift] = useState<ExtendedShift | null>(null);
  const [editForm, setEditForm] = useState<UpdateScheduleRequest>({
      date: '', n1_night: '', n2_night: '', n1_day: '', n2_day: '', leave: []
  });
  const [leaveInput, setLeaveInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const today = new Date();
  const todayStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    const loadData = async () => {
      try {
        const [schedData, empData] = await Promise.all([
            fetchShiftSchedule<ExtendedShift>(apiUrl),
            fetchEmployeeList(apiUrl)
        ]);

        if (schedData.success) {
          setShifts(schedData.shifts);
          if (schedData.colorMap) setColorMap(schedData.colorMap);
        }
        if (empData.success) {
            setEmployees(empData.employees);
        }
      } catch (e) { 
          console.error("Load failed"); 
      } finally { 
          setIsLoading(false); 
      }
    };
    loadData();
  }, [apiUrl]);

  const handleEditClick = (shift: ExtendedShift) => {
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
      if (!onAlert || !editingShift) return;
      setIsSaving(true);
      
      const leaveArray = leaveInput.split(/[,，\s]+/).map(s => s.trim()).filter(s => s);
      const payload = { ...editForm, leave: leaveArray };

      try {
          const res = await updateScheduleSource(apiUrl, payload);
          onAlert(res.message);
          
          if (res.success) {
              onAlert("儲存成功！正在重新載入最新班表...");
              const refresh = await fetchShiftSchedule<ExtendedShift>(apiUrl);
              if (refresh.success) setShifts(refresh.shifts);
              setEditingShift(null);
          }
      } catch(e) {
          onAlert("儲存失敗，請檢查網路連線。");
      } finally {
          setIsSaving(false);
      }
  };

  const getCellStyle = (name: string) => {
      if (!name || name === '-') return {};
      const bg = colorMap[name];
      if (!bg) return {};
      const r = parseInt(bg.substr(1, 2), 16);
      const g = parseInt(bg.substr(3, 2), 16);
      const b = parseInt(bg.substr(5, 2), 16);
      const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
      const color = (yiq >= 128) ? '#000000' : '#ffffff';
      return { backgroundColor: bg, color: color, fontWeight: 'bold' };
  };

  const renderEmployeeOptions = () => ( <> <option value="">(空)</option> {employees.map((emp, idx) => ( <option key={idx} value={emp.name}>{emp.name}</option> ))} </> );
  const simpleDate = (d: string) => d.split('/').slice(1).join('/');

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50 animate-in fade-in duration-500">
      
      <div className="flex-none bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm z-20">
          <div className="flex items-center gap-2">
              <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><ArrowLeft size={20} /></button>
              <div>
                  <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <Calendar className="text-blue-600" size={20}/> 北區維運班表
                  </h1>
                  <p className="text-xs text-gray-500">
                      {canEdit ? "💡 點擊任一行編輯 (可雙指縮放)" : "僅供檢視 (可雙指縮放)"}
                  </p>
              </div>
          </div>
          {isSyncing && <div className="text-xs font-bold text-orange-600 flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> 同步中</div>}
      </div>

      <div className="flex-1 overflow-auto p-2">
        {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Loader2 size={40} className="animate-spin mb-4 text-blue-500"/>
                <p>正在載入完整班表...</p>
            </div>
        ) : (
            <div className="bg-white shadow-lg border border-gray-300 inline-block min-w-full">
                {/* 移除 table-fixed 讓瀏覽器根據 min-w 自動撐開，避免內容被切掉 */}
                <table className="w-full border-collapse text-center text-sm">
                    <thead className="sticky top-0 z-10 shadow-sm">
                        <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300">
                            {/* ✅ 修改：增加 min-w 到 100px */}
                            <th colSpan={2} className="p-2 border-r border-gray-300 bg-orange-100 min-w-[90px]">N1</th>
                            
                            <th className="p-2 border-r border-gray-300 bg-orange-50 min-w-[100px]">N1大夜</th>
                            <th className="p-2 border-r border-gray-300 bg-orange-50 min-w-[100px]">N1小夜</th>
                            <th className="p-2 border-r border-gray-300 bg-orange-50 min-w-[100px]">台北<br/>N1D</th>
                            <th className="p-2 border-r border-gray-300 bg-orange-50 min-w-[100px]">台北<br/>N1E</th>
                            <th className="p-2 border-r border-gray-300 bg-orange-50 min-w-[100px]">台北<br/>N1F</th>
                            <th className="p-2 border-r border-gray-300 bg-orange-50 min-w-[100px]">台北<br/>N1G</th>
                            <th className="p-2 border-r border-gray-300 bg-gray-100 min-w-[100px]">支援</th>

                            <th colSpan={2} className="p-2 border-r border-gray-300 bg-blue-100 min-w-[90px]">N2</th>

                            <th className="p-2 border-r border-gray-300 bg-blue-50 min-w-[100px]">N2大夜</th>
                            <th className="p-2 border-r border-gray-300 bg-blue-50 min-w-[100px]">N2小夜</th>
                            <th className="p-2 border-r border-gray-300 bg-blue-50 min-w-[100px]">新北<br/>N2F</th>
                            <th className="p-2 border-r border-gray-300 bg-blue-50 min-w-[100px]">新北<br/>N2G</th>
                            <th className="p-2 border-r border-gray-300 bg-blue-50 min-w-[100px]">新北<br/>N2H</th>
                            <th className="p-2 border-r border-gray-300 bg-blue-50 min-w-[100px]">新北<br/>N2I</th>
                            <th className="p-2 border-r border-gray-300 bg-blue-50 min-w-[100px]">新北<br/>N2C</th>
                            <th className="p-2 border-r border-gray-300 bg-gray-100 min-w-[100px]">支援</th>
                            <th className="p-2 border-r border-gray-300 bg-green-50 min-w-[100px]">新北<br/>保養</th>
                            <th className="p-2 border-r border-gray-300 bg-green-50 min-w-[100px]">新北<br/>保養</th>
                            <th className="p-2 border-r border-gray-300 bg-gray-50 min-w-[100px]">其他</th>
                            <th className="p-2 border-r border-gray-300 bg-gray-50 min-w-[100px]">其他</th>

                            <th colSpan={5} className="p-2 bg-red-100 text-red-800 min-w-[500px]">請假名單</th>
                        </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-200">
                        {shifts.map((shift, idx) => {
                            const isToday = shift.date === todayStr;
                            const row = shift.fullRecord || []; 
                            
                            // ✅ 修改：移除了 overflow-hidden 和 text-ellipsis，保留 whitespace-nowrap 確保不換行但完整顯示
                            const cellClass = "p-2 border-r border-gray-200 whitespace-nowrap";

                            return (
                                <tr key={idx} 
                                    onClick={() => handleEditClick(shift)}
                                    className={`hover:bg-blue-50 transition-colors cursor-pointer ${isToday ? 'bg-yellow-50 shadow-inner' : ''}`}
                                >
                                    <td className={`p-2 border-r border-gray-200 font-mono whitespace-nowrap ${isToday ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                                        {simpleDate(row[0] || shift.date)}
                                    </td>
                                    <td className={`p-2 border-r border-gray-300 font-bold whitespace-nowrap ${['六','日','Sat','Sun'].includes(row[1]) ? 'text-red-500' : 'text-gray-800'}`}>
                                        {row[1]}
                                    </td>

                                    <td style={getCellStyle(row[2])} className={cellClass}>{row[2]}</td>
                                    <td style={getCellStyle(row[3])} className={`${cellClass} border-gray-300`}>{row[3]}</td>
                                    
                                    <td style={getCellStyle(row[4])} className={cellClass}>{row[4]}</td>
                                    <td style={getCellStyle(row[5])} className={cellClass}>{row[5]}</td>
                                    <td style={getCellStyle(row[6])} className={cellClass}>{row[6]}</td>
                                    <td style={getCellStyle(row[7])} className={cellClass}>{row[7]}</td>
                                    
                                    <td style={getCellStyle(row[8])} className={`${cellClass} border-gray-300`}>{row[8]}</td>

                                    <td className="p-2 border-r border-gray-200 font-mono text-gray-400 text-xs whitespace-nowrap">{simpleDate(row[9])}</td>
                                    <td className="p-2 border-r border-gray-300 text-gray-400 text-xs whitespace-nowrap">{row[10]}</td>

                                    <td style={getCellStyle(row[11])} className={cellClass}>{row[11]}</td>
                                    <td style={getCellStyle(row[12])} className={`${cellClass} border-gray-300`}>{row[12]}</td>

                                    <td style={getCellStyle(row[13])} className={cellClass}>{row[13]}</td>
                                    <td style={getCellStyle(row[14])} className={cellClass}>{row[14]}</td>
                                    <td style={getCellStyle(row[15])} className={cellClass}>{row[15]}</td>
                                    <td style={getCellStyle(row[16])} className={cellClass}>{row[16]}</td>
                                    <td style={getCellStyle(row[17])} className={cellClass}>{row[17]}</td>

                                    <td style={getCellStyle(row[18])} className={`${cellClass} border-gray-300`}>{row[18]}</td>

                                    <td style={getCellStyle(row[19])} className={cellClass}>{row[19]}</td>
                                    <td style={getCellStyle(row[20])} className={`${cellClass} border-gray-300`}>{row[20]}</td>

                                    <td style={getCellStyle(row[21])} className={cellClass}>{row[21]}</td>
                                    <td style={getCellStyle(row[22])} className={`${cellClass} border-gray-300`}>{row[22]}</td>

                                    <td className="p-2 border-r border-gray-200 text-red-600 font-bold whitespace-nowrap">{row[23]}</td>
                                    <td className="p-2 border-r border-gray-200 text-red-600 font-bold whitespace-nowrap">{row[24]}</td>
                                    <td className="p-2 border-r border-gray-200 text-red-600 font-bold whitespace-nowrap">{row[25]}</td>
                                    <td className="p-2 border-r border-gray-200 text-red-600 font-bold whitespace-nowrap">{row[26]}</td>
                                    <td className="p-2 text-red-600 font-bold whitespace-nowrap">{row[27]}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      {editingShift && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh] relative ${isSaving ? 'pointer-events-none' : ''}`}>
              
              {isSaving && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-2xl">
                      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                      <p className="text-blue-700 font-bold text-lg animate-pulse">正在寫入班表...</p>
                  </div>
              )}

              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                  <div>
                      <h3 className="text-xl font-bold text-gray-900">編輯班表 ({editingShift.date})</h3>
                      <p className="text-sm text-red-500 mt-1">注意：僅能修改大小夜與請假，其他欄位請至源頭修改。</p>
                  </div>
                  <button onClick={() => setEditingShift(null)} className="p-2 hover:bg-gray-100 rounded-full" disabled={isSaving}><X size={24} /></button>
              </div>

              <div className="space-y-6">
                 <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <h4 className="font-bold text-orange-800 mb-3 border-b border-orange-200 pb-2">N1 台北組</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">N1 大夜 (C)</label><select value={editForm.n1_night} onChange={e => setEditForm({...editForm, n1_night: e.target.value})} className="w-full p-2 border border-gray-300 rounded bg-white">{renderEmployeeOptions()}</select></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">N1 小夜 (D)</label><select value={editForm.n1_day} onChange={e => setEditForm({...editForm, n1_day: e.target.value})} className="w-full p-2 border border-gray-300 rounded bg-white">{renderEmployeeOptions()}</select></div>
                    </div>
                 </div>
                 
                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h4 className="font-bold text-blue-800 mb-3 border-b border-blue-200 pb-2">N2 新北組</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">N2 大夜 (L)</label><select value={editForm.n2_night} onChange={e => setEditForm({...editForm, n2_night: e.target.value})} className="w-full p-2 border border-gray-300 rounded bg-white">{renderEmployeeOptions()}</select></div>
                        <div><label className="block text-sm font-bold text-gray-700 mb-1">N2 小夜 (M)</label><select value={editForm.n2_day} onChange={e => setEditForm({...editForm, n2_day: e.target.value})} className="w-full p-2 border border-gray-300 rounded bg-white">{renderEmployeeOptions()}</select></div>
                    </div>
                 </div>
                 
                 <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <h4 className="font-bold text-red-800 mb-3 border-b border-red-200 pb-2">請假名單 (X~AB)</h4>
                    <label className="block text-sm font-bold text-gray-700 mb-1">輸入姓名 (以逗號分隔)</label>
                    <textarea value={leaveInput} onChange={e => setLeaveInput(e.target.value)} className="w-full p-2 border border-gray-300 rounded h-20 resize-none bg-white" placeholder="例如: 王大明, 李小華" />
                 </div>
                 
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
