import React, { useEffect, useState } from 'react';
import { FullShift, UpdateScheduleRequest, Employee } from '../types';
import { fetchShiftSchedule, updateScheduleSource, fetchEmployeeList } from '../services/api';
import { ArrowLeft, Calendar, Loader2, Save, X, Users, PenTool } from 'lucide-react';

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

// 擴充編輯表單，允許動態 key 以便處理所有欄位
interface ExtendedUpdateRequest extends UpdateScheduleRequest {
    [key: string]: any;
}

export const FullScheduleView: React.FC<FullScheduleViewProps> = ({ apiUrl, onBack, canEdit = false, onAlert }) => {
  const [shifts, setShifts] = useState<ExtendedShift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [colorMap, setColorMap] = useState<{ [key: string]: string }>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
   
  // 編輯相關
  const [editingShift, setEditingShift] = useState<ExtendedShift | null>(null);
  
  // 初始化完整表單狀態
  const [editForm, setEditForm] = useState<ExtendedUpdateRequest>({
      date: '', 
      // N1
      n1_night: '', n1_day: '', n1_d: '', n1_e: '', n1_f: '', n1_g: '', n1_sup: '',
      // N2
      n2_night: '', n2_day: '', n2_f: '', n2_g: '', n2_h: '', n2_i: '', n2_c: '', n2_sup: '',
      // Others
      maint_1: '', maint_2: '', other_1: '', other_2: '',
      leave: []
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
      const row = shift.fullRecord || [];

      // 依照 Excel 欄位順序對應 (0-based)
      setEditForm({
          date: shift.date,
          // N1 Area (Indices 2-8)
          n1_night: row[2] || '', 
          n1_day:   row[3] || '', 
          n1_d:     row[4] || '', 
          n1_e:     row[5] || '', 
          n1_f:     row[6] || '', 
          n1_g:     row[7] || '', 
          n1_sup:   row[8] || '', 
          
          // N2 Area (Indices 11-18) *跳過 9,10 參考欄
          n2_night: row[11] || '', 
          n2_day:   row[12] || '', 
          n2_f:     row[13] || '', 
          n2_g:     row[14] || '', 
          n2_h:     row[15] || '', 
          n2_i:     row[16] || '', 
          n2_c:     row[17] || '', 
          n2_sup:   row[18] || '', 

          // Others (Indices 19-22)
          maint_1:  row[19] || '', 
          maint_2:  row[20] || '', 
          other_1:  row[21] || '', 
          other_2:  row[22] || '', 

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
  
  // 輔助元件：下拉選單
  const FieldSelect = ({ label, field }: { label: string, field: string }) => (
    <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
        <select 
            value={editForm[field]} 
            onChange={e => setEditForm({...editForm, [field]: e.target.value})} 
            className="w-full p-2 border border-gray-300 rounded bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
            {renderEmployeeOptions()}
        </select>
    </div>
  );

  const simpleDate = (d: string) => d.split('/').slice(1).join('/');

  const filteredShifts = shifts.filter(shift => {
    const shiftDate = new Date(shift.date);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    cutoffDate.setHours(0, 0, 0, 0); 
    return shiftDate >= cutoffDate;
  });

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50 animate-in fade-in duration-500">
       
      <div className="flex-none bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm z-30">
          <div className="flex items-center gap-2">
              <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><ArrowLeft size={20} /></button>
              <div>
                  <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <Calendar className="text-blue-600" size={20}/> 北區維運班表
                  </h1>
                  <p className="text-xs text-gray-500">
                      {canEdit ? "💡 點擊任一行進行「全欄位編輯」" : "僅供檢視"}
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
                <table className="w-full border-collapse text-center text-sm">
                    <thead className="sticky top-0 z-20 shadow-sm">
                        <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300">
                            {/* 📌 Header 保持原樣 (你習慣的版本) */}
                            <th colSpan={2} className="p-2 border-r border-gray-300 bg-orange-100 min-w-[130px] sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                N1
                            </th>
                            
                            <th className="p-2 border-r border-gray-300 bg-orange-50 min-w-[100px]">N1大夜</th>
                            <th className="p-2 border-r border-gray-300 bg-orange-50 min-w-[100px]">N1小夜/假日</th>
                            <th className="p-2 border-r border-gray-300 bg-orange-50 min-w-[100px]">台北<br/>N1D</th>
                            <th className="p-2 border-r border-gray-300 bg-orange-50 min-w-[100px]">台北<br/>N1E</th>
                            <th className="p-2 border-r border-gray-300 bg-orange-50 min-w-[100px]">台北<br/>N1F</th>
                            <th className="p-2 border-r border-gray-300 bg-orange-50 min-w-[100px]">台北<br/>N1G</th>
                            <th className="p-2 border-r border-gray-300 bg-gray-100 min-w-[100px]">支援</th>

                            <th colSpan={2} className="p-2 border-r border-gray-300 bg-blue-100 min-w-[90px]">N2</th>

                            <th className="p-2 border-r border-gray-300 bg-blue-50 min-w-[100px]">N2大夜</th>
                            <th className="p-2 border-r border-gray-300 bg-blue-50 min-w-[100px]">N2小夜/假日</th>
                            <th className="p-2 border-r border-gray-300 bg-blue-50 min-w-[100px]">新北<br/>N2F</th>
                            <th className="p-2 border-r border-gray-300 bg-blue-50 min-w-[100px]">新北<br/>N2G</th>
                            <th className="p-2 border-r border-gray-300 bg-blue-50 min-w-[100px]">新北<br/>N2H</th>
                            <th className="p-2 border-r border-gray-300 bg-blue-50 min-w-[100px]">新北<br/>N2I</th>
                            <th className="p-2 border-r border-gray-300 bg-blue-50 min-w-[100px]">新北<br/>N2C</th>
                            <th className="p-2 border-r border-gray-300 bg-gray-100 min-w-[100px]">支援</th>
                            <th className="p-2 border-r border-gray-300 bg-green-50 min-w-[100px]">新北<br/>保養</th>
                            <th className="p-2 border-r border-gray-300 bg-green-50 min-w-[100px]">新北<br/>保養</th>
                            <th className="p-2 border-r border-gray-300 bg-gray-50 min-w-[100px]">其他業務</th>
                            <th className="p-2 border-r border-gray-300 bg-gray-50 min-w-[100px]">其他業務</th>

                            <th colSpan={5} className="p-2 bg-red-100 text-red-800 min-w-[500px]">請假名單</th>
                        </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredShifts.map((shift, idx) => {
                            const isToday = shift.date === todayStr;
                            const row = shift.fullRecord || []; 
                            const cellClass = "p-2 border-r border-gray-200 whitespace-nowrap";

                            return (
                                <tr key={idx} 
                                    onClick={() => handleEditClick(shift)}
                                    className={`hover:bg-blue-50 transition-colors cursor-pointer ${isToday ? 'bg-yellow-50 shadow-inner' : ''}`}
                                >
                                    <td className={`p-2 border-r border-gray-200 font-mono whitespace-nowrap sticky left-0 z-10 w-[90px] min-w-[90px] ${isToday ? 'text-red-600 font-bold bg-yellow-50' : 'text-gray-600 bg-white'}`}>
                                        {simpleDate(row[0] || shift.date)}
                                    </td>
                                    
                                    <td className={`p-2 border-r border-gray-300 font-bold whitespace-nowrap sticky left-[90px] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${isToday ? 'bg-yellow-50' : 'bg-white'} ${['六','日','Sat','Sun'].includes(row[1]) ? 'text-red-500' : 'text-gray-800'}`}>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-200">
           <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 overflow-y-auto max-h-[90vh] relative ${isSaving ? 'pointer-events-none' : ''}`}>
              
              {isSaving && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-2xl">
                      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                      <p className="text-blue-700 font-bold text-lg animate-pulse">正在寫入所有欄位...</p>
                  </div>
              )}

              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 sticky top-0 bg-white z-10">
                  <div>
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <PenTool className="text-blue-600"/> 編輯班表 ({editingShift.date})
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">請選擇各區段的人員配置，變更將即時同步。</p>
                  </div>
                  <button onClick={() => setEditingShift(null)} className="p-2 hover:bg-gray-100 rounded-full" disabled={isSaving}><X size={24} /></button>
              </div>

              <div className="space-y-6">
                 {/* N1 區塊 */}
                 <div className="bg-orange-50 p-5 rounded-xl border border-orange-100">
                    <h4 className="font-bold text-orange-800 mb-3 border-b border-orange-200 pb-2 flex items-center gap-2"><Users size={16}/> N1 台北組</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <FieldSelect label="大夜 (C)" field="n1_night" />
                        <FieldSelect label="小夜/假日 (D)" field="n1_day" />
                        <FieldSelect label="N1D (E)" field="n1_d" />
                        <FieldSelect label="N1E (F)" field="n1_e" />
                        <FieldSelect label="N1F (G)" field="n1_f" />
                        <FieldSelect label="N1G (H)" field="n1_g" />
                        <FieldSelect label="支援 (I)" field="n1_sup" />
                    </div>
                 </div>
                 
                 {/* N2 區塊 */}
                 <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                    <h4 className="font-bold text-blue-800 mb-3 border-b border-blue-200 pb-2 flex items-center gap-2"><Users size={16}/> N2 新北組</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <FieldSelect label="大夜 (L)" field="n2_night" />
                        <FieldSelect label="小夜/假日 (M)" field="n2_day" />
                        <FieldSelect label="N2F (N)" field="n2_f" />
                        <FieldSelect label="N2G (O)" field="n2_g" />
                        <FieldSelect label="N2H (P)" field="n2_h" />
                        <FieldSelect label="N2I (Q)" field="n2_i" />
                        <FieldSelect label="N2C (R)" field="n2_c" />
                        <FieldSelect label="支援 (S)" field="n2_sup" />
                    </div>
                 </div>

                 {/* 其他任務 */}
                 <div className="bg-green-50 p-5 rounded-xl border border-green-100">
                    <h4 className="font-bold text-green-800 mb-3 border-b border-green-200 pb-2 flex items-center gap-2"><Users size={16}/> 保養與其他任務</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <FieldSelect label="保養 (T)" field="maint_1" />
                        <FieldSelect label="保養 (U)" field="maint_2" />
                        <FieldSelect label="其他 (V)" field="other_1" />
                        <FieldSelect label="其他 (W)" field="other_2" />
                    </div>
                 </div>
                 
                 {/* 請假 */}
                 <div className="bg-red-50 p-5 rounded-xl border border-red-100">
                    <h4 className="font-bold text-red-800 mb-3 border-b border-red-200 pb-2">請假名單 (X~AB)</h4>
                    <label className="block text-sm font-bold text-gray-700 mb-1">輸入姓名 (以逗號分隔)</label>
                    <textarea value={leaveInput} onChange={e => setLeaveInput(e.target.value)} className="w-full p-2 border border-gray-300 rounded h-16 resize-none bg-white text-sm" placeholder="例如: 王大明, 李小華" />
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
