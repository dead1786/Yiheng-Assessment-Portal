import React, { useState, useEffect } from 'react';
import { User, AssessmentRecord, Employee, DeficiencyRecord, FullShift } from '../types';
import { fetchAdminData, updateAdminPassword, submitAdminReview, fetchEmployeeList, updateEmployeeList, kickUser, fetchDeficiencyRecords, fetchShiftSchedule, fetchOfficeList } from '../services/api';
import { LogOut, Users, Save, Loader2, RefreshCw, KeyRound, AlertTriangle, ChevronRight, Calendar, UserPlus, Trash2, Power, Settings, Cloud, X, Link, MapPin, Globe, Image as ImageIcon, MessageSquare, Star } from 'lucide-react';
import { FullScheduleView } from './FullScheduleView';

interface AdminDashboardProps {
  user: User;
  apiUrl: string;
  onLogout: () => void;
  onAlert: (msg: string) => void;
  onConfirm: (msg: string, onYes: () => void) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, apiUrl, onLogout, onAlert, onConfirm }) => {
  const [activeTab, setActiveTab] = useState<'records' | 'employees' | 'security' | 'deficiencies' | 'schedule'>('employees');
  
  const [records, setRecords] = useState<AssessmentRecord[]>(() => { try { return JSON.parse(localStorage.getItem('admin_records') || '[]'); } catch { return []; } });
  const [employees, setEmployees] = useState<Employee[]>(() => { try { return JSON.parse(localStorage.getItem('admin_employees') || '[]'); } catch { return []; } });
  const [allDeficiencies, setAllDeficiencies] = useState<DeficiencyRecord[]>(() => { try { return JSON.parse(localStorage.getItem('admin_deficiencies') || '[]'); } catch { return []; } });
  
  const [isLoading, setIsLoading] = useState(records.length === 0 && employees.length === 0);
  const [isSyncing, setIsSyncing] = useState(!isLoading); 
  const [isSaving, setIsSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [configUrl, setConfigUrl] = useState(apiUrl);
  
  // 可用的辦公室列表
  const [availableOffices, setAvailableOffices] = useState<string[]>([]);

  // Modal 狀態
  const [selectedRecord, setSelectedRecord] = useState<AssessmentRecord | null>(null);
  const [selectedDeficiencyUser, setSelectedDeficiencyUser] = useState<{name: string, records: DeficiencyRecord[]} | null>(null);
  const [adminReview, setAdminReview] = useState({ comment: '', score: '' });

  const [managingEmployee, setManagingEmployee] = useState<Employee | null>(null);

  const loadData = async (forceRefresh = false) => {
    if (forceRefresh) {
        setIsLoading(true);
        localStorage.removeItem('admin_records');
        localStorage.removeItem('admin_employees');
        localStorage.removeItem('admin_deficiencies');
        localStorage.removeItem('admin_schedule');
    }

    try {
      const data = await fetchAdminData(apiUrl);
      if (data.success) { setRecords(data.records); localStorage.setItem('admin_records', JSON.stringify(data.records)); }
      const empData = await fetchEmployeeList(apiUrl);
      if (empData.success) { setEmployees(empData.employees); localStorage.setItem('admin_employees', JSON.stringify(empData.employees)); }
      const defData = await fetchDeficiencyRecords(apiUrl);
      if (defData.success) { setAllDeficiencies(defData.records); localStorage.setItem('admin_deficiencies', JSON.stringify(defData.records)); }
      const schedData = await fetchShiftSchedule<FullShift>(apiUrl);
      if (schedData.success) { localStorage.setItem('admin_schedule', JSON.stringify(schedData.shifts)); }
      
      const officeRes = await fetchOfficeList(apiUrl);
      if (officeRes.success) setAvailableOffices(officeRes.stations);

    } catch (e) { console.error("Sync failed"); } 
    finally { setIsLoading(false); setIsSyncing(false); }
  };

  useEffect(() => { loadData(); }, [apiUrl]);

  const handleEmployeeChange = (empName: string, field: keyof Employee, value: any) => {
    const newEmployees = employees.map(e => e.name === empName ? { ...e, [field]: value } : e);
    setEmployees(newEmployees);
    if (managingEmployee && managingEmployee.name === empName) {
        setManagingEmployee(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const handleStationToggle = (stationName: string) => {
      if (!managingEmployee) return;
      const currentStations = managingEmployee.assignedStation ? managingEmployee.assignedStation.split(',') : [];
      let newStations;
      if (currentStations.includes(stationName)) {
          newStations = currentStations.filter(s => s !== stationName);
      } else {
          newStations = [...currentStations, stationName];
      }
      handleEmployeeChange(managingEmployee.name, 'assignedStation', newStations.join(','));
  };

  const handleKickUser = (name: string) => {
      onConfirm(`確定要強制登出「${name}」嗎？`, async () => {
          try {
             const res = await kickUser(apiUrl, name);
             if (res.success) onAlert(`已成功發送強制登出指令給 ${name}。`);
             else onAlert("失敗：" + res.message);
          } catch(e) { onAlert("連線錯誤"); }
      });
  };

  const handleAddEmployee = () => {
    const newEmp: Employee = { name: '新員工', joinDate: '', jobTitle: '職稱', yearsOfService: '0', jobGrade: '1', jobGradeBonus: '0', kpi: '', salary: '0', permission: true, color: '#ffffff', canEditSchedule: false, annualLeave: '0', annualLeaveUsed: '0' };
    setEmployees([...employees, newEmp]);
  };

  const handleDeleteEmployee = (name: string) => {
    onConfirm('確定要刪除此員工資料嗎？', () => {
        const newEmployees = employees.filter(e => e.name !== name);
        setEmployees(newEmployees);
        setManagingEmployee(null); 
    });
  };

  const handleSaveEmployees = async () => {
    setIsSaving(true);
    try {
      const result = await updateEmployeeList(apiUrl, employees);
      onAlert(result.message);
    } catch (error) { onAlert("儲存失敗"); } finally { setIsSaving(false); }
  };

  const handleChangePassword = async () => { if (!newPassword.trim()) { onAlert("請輸入新密碼"); return; } setIsSaving(true); try { const result = await updateAdminPassword(apiUrl, newPassword); onAlert(result.message); if (result.success) setNewPassword(''); } catch (error) { onAlert("失敗"); } finally { setIsSaving(false); } };
  const handleSaveUrl = () => { if (!configUrl.trim()) { onAlert("請輸入 URL"); return; } localStorage.setItem('gas_api_url', configUrl); onAlert("已更新！"); };
  const openReviewModal = (record: AssessmentRecord) => { setSelectedRecord(record); setAdminReview({ comment: record.adminComment || '', score: record.adminScore ? String(record.adminScore) : '' }); };
  const openDeficiencyModal = (empName: string) => { const userRecords = allDeficiencies.filter(r => r.name === empName); setSelectedDeficiencyUser({ name: empName, records: userRecords }); };
  const submitReview = async () => { if (!selectedRecord || selectedRecord.rowIndex === undefined) return; const score = parseInt(adminReview.score); if (isNaN(score) || score < 0 || score > 100) { onAlert("請輸入 0-100"); return; } setIsSaving(true); try { const result = await submitAdminReview(apiUrl, selectedRecord.rowIndex, adminReview.comment, score); if (result.success) { onAlert("已送出！"); setSelectedRecord(null); loadData(); } else { onAlert(result.message); } } catch (error) { onAlert("提交失敗"); } finally { setIsSaving(false); } };
  const calculateProjectedScore = () => { if (!selectedRecord) return 0; const ai = selectedRecord.aiScore || 0; const admin = parseInt(adminReview.score) || 0; return Math.round(ai * 0.6 + admin * 0.4); };
  const getDeficiencyCount = (name: string) => { return allDeficiencies.filter(d => d.name === name).length; };
  const formatDate = (dateStr: string) => { try { return new Date(dateStr).toLocaleDateString('zh-TW'); } catch { return dateStr; } };

  const calculateRemainingLeave = (total: string | undefined, used: string | undefined) => {
      const t = parseFloat(total || '0');
      const u = parseFloat(used || '0');
      return (t - u).toFixed(1).replace(/\.0$/, '');
  };

  return (
    <div className="w-full max-w-7xl animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed bottom-8 right-8 z-50 bg-orange-100/90 border border-orange-200 text-orange-700 px-4 py-2 rounded-full shadow-xl flex items-center gap-2 animate-bounce pointer-events-none backdrop-blur-sm">
           <Cloud size={16} />
           <span className="text-xs font-bold">正在同步最新資料...</span>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users className="text-blue-600" />管理員控制台</h1><p className="text-gray-500 mt-1">管理員：<span className="font-semibold">{user.name}</span></p></div>
        <div className="flex gap-3">
            <button onClick={() => loadData(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><RefreshCw size={20} className={isLoading ? "animate-spin" : ""} /></button>
            <button onClick={onLogout} className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"><LogOut className="w-4 h-4 mr-2" />登出</button>
        </div>
      </header>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button onClick={() => setActiveTab('employees')} className={`px-5 py-2.5 rounded-lg font-medium whitespace-nowrap ${activeTab === 'employees' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>員工管理</button>
        <button onClick={() => setActiveTab('records')} className={`px-5 py-2.5 rounded-lg font-medium whitespace-nowrap ${activeTab === 'records' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>員工填答狀況</button>
        <button onClick={() => setActiveTab('deficiencies')} className={`px-5 py-2.5 rounded-lg font-medium whitespace-nowrap flex items-center ${activeTab === 'deficiencies' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><AlertTriangle size={16} className="mr-2" />稽核紀錄</button>
        <button onClick={() => setActiveTab('schedule')} className={`px-5 py-2.5 rounded-lg font-medium whitespace-nowrap flex items-center ${activeTab === 'schedule' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><Calendar size={16} className="mr-2" />排班總表</button>
        <button onClick={() => setActiveTab('security')} className={`px-5 py-2.5 rounded-lg font-medium whitespace-nowrap flex items-center ${activeTab === 'security' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><KeyRound size={16} className="mr-2" />帳戶與系統安全</button>
      </div>

      {isLoading ? (<div className="text-center py-20 bg-white rounded-2xl"><Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" /><p className="text-gray-500">正在同步雲端資料...</p></div>) : activeTab === 'records' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead><tr className="bg-gray-50 border-b border-gray-200 text-gray-700 whitespace-nowrap"><th className="p-4 font-bold text-center">提交時間</th><th className="p-4 font-bold text-center">員工姓名</th><th className="p-4 font-bold text-center">AI 分數</th><th className="p-4 font-bold text-center">最終分數</th><th className="p-4 font-bold text-center min-w-[200px]">AI 評語</th><th className="p-4 font-bold text-right">操作</th></tr></thead><tbody>{records.length === 0 ? (<tr><td colSpan={6} className="p-8 text-center text-gray-400">目前尚無任何提交紀錄</td></tr>) : (records.map((record, idx) => (<tr key={idx} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors"><td className="p-4 text-sm text-gray-500 whitespace-nowrap text-center">{formatDate(record.timestamp)}</td><td className="p-4 font-medium text-gray-800 whitespace-nowrap text-center">{record.name}<div className="text-xs text-gray-400 font-normal">{record.jobTitle}</div></td><td className="p-4 text-center text-gray-500">{record.aiScore || '-'}</td><td className="p-4 text-center">{record.finalScore || '-'}</td><td className="p-4 text-sm text-gray-600 whitespace-pre-wrap min-w-[200px] max-w-[400px]">{record.aiComment ? <span className="line-clamp-3">{record.aiComment}</span> : <span className="text-gray-400 italic">待評分</span>}</td><td className="p-4 text-right"><button onClick={() => openReviewModal(record)} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium">查看與評分</button></td></tr>)))}</tbody></table></div></div>
      ) : activeTab === 'employees' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Users size={20} className="text-blue-600" /> 員工名單管理</h2>
             <button onClick={handleAddEmployee} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"><UserPlus size={18} className="mr-2" /> 新增員工</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-gray-50 text-gray-700 border-b border-gray-200 whitespace-nowrap">
                <th className="p-3 text-center w-16">設定</th>
                <th className="p-3 text-center">姓名</th>
                <th className="p-3 text-center">職稱</th>
                <th className="p-3 text-center">年資</th>
                <th className="p-3 text-center">職等</th>
                <th className="p-3 text-center min-w-[120px]">年度KPI</th>
                <th className="p-3 text-center min-w-[100px] text-blue-600 font-bold">剩餘特休</th>
                </tr>
            </thead>
            <tbody>
                {employees.map((emp, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-2 text-center">
                        <button onClick={() => setManagingEmployee(emp)} className="p-1.5 bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-colors"><Settings size={18} /></button>
                    </td>
                    <td className="p-2 min-w-[100px]"><input type="text" value={emp.name} onChange={(e) => handleEmployeeChange(emp.name, 'name', e.target.value)} className="w-full px-2 py-1 border border-gray-200 rounded text-center" /></td>
                    <td className="p-2 min-w-[100px]"><input type="text" value={emp.jobTitle} onChange={(e) => handleEmployeeChange(emp.name, 'jobTitle', e.target.value)} className="w-full px-2 py-1 border border-gray-200 rounded text-center" /></td>
                    <td className="p-2 w-[80px]"><input type="text" value={emp.yearsOfService} disabled className="w-full px-2 py-1 bg-gray-100 text-gray-500 rounded text-center" /></td>
                    <td className="p-2 w-[80px]"><input type="text" value={emp.jobGrade} onChange={(e) => handleEmployeeChange(emp.name, 'jobGrade', e.target.value)} className="w-full px-2 py-1 border border-gray-200 rounded text-center" /></td>
                    <td className="p-2 min-w-[120px]"><input type="text" value={emp.kpi || ''} disabled className="w-full px-2 py-1 bg-gray-200 text-gray-600 font-bold rounded text-center" /></td>
                    <td className="p-2 text-center font-mono font-bold text-blue-600">
                        {calculateRemainingLeave(emp.annualLeave, emp.annualLeaveUsed)}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
          </div>
          <div className="mt-6 border-t border-gray-100 pt-6">
            <button onClick={handleSaveEmployees} disabled={isSaving} className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex justify-center items-center shadow-md">
              {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 w-4 h-4" />} 儲存變更
            </button>
          </div>
        </div>
      ) : activeTab === 'deficiencies' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle size={20} className="text-red-500" /> 員工稽核狀況總覽
            </h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              共 {allDeficiencies.length} 筆稽核紀錄
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((emp, idx) => {
              const count = getDeficiencyCount(emp.name);
              return (
                <button 
                  key={idx} 
                  onClick={() => openDeficiencyModal(emp.name)} 
                  className={`flex justify-between items-center p-4 rounded-xl border transition-all hover:shadow-md ${
                    count > 0 
                    ? 'bg-red-50 border-red-200 hover:border-red-300' 
                    : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-left">
                    <h3 className="font-bold text-gray-800">{emp.name}</h3>
                    <p className="text-xs text-gray-500">{emp.jobTitle}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {count > 0 ? (
                      <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        {count} 稽核
                      </span>
                    ) : (
                      <span className="text-green-600 text-xs font-bold flex items-center">
                        <span className="mr-1">✓</span> 良好
                      </span>
                    )}
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ) : activeTab === 'schedule' ? (
        <FullScheduleView apiUrl={apiUrl} onBack={() => {}} canEdit={true} onAlert={onAlert} />
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8"><div className="flex items-center gap-3 mb-6 text-gray-800"><KeyRound className="text-blue-600" /><h2 className="text-xl font-bold">修改管理員密碼</h2></div><div className="space-y-4"><div><label className="block text-sm font-bold text-gray-700 mb-2">新密碼</label><input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div><button onClick={handleChangePassword} disabled={isSaving} className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex justify-center items-center shadow-md">{isSaving ? <Loader2 className="animate-spin mr-2" /> : "更新密碼"}</button></div></div>
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8"><div className="flex items-center gap-3 mb-6 text-gray-800"><Link className="text-purple-600" /><h2 className="text-xl font-bold">系統連線設定</h2></div><div className="space-y-4"><div><label className="block text-sm font-bold text-gray-700 mb-2">API 網址</label><input type="text" value={configUrl} onChange={(e) => setConfigUrl(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono" /></div><button onClick={handleSaveUrl} className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex justify-center items-center shadow-sm"><Save className="mr-2 w-4 h-4" /> 儲存網址設定</button></div></div>
        </div>
      )}

      {/* 1. 員工詳細設定 Modal */}
      {managingEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{managingEmployee.name}</h3>
                        <p className="text-sm text-gray-500">{managingEmployee.jobTitle}</p>
                    </div>
                    <button onClick={() => setManagingEmployee(null)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                </div>
                
                <div className="space-y-4">
                    <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">詳細資料</h4>
                        <div><label className="text-xs text-gray-500">到職日</label><input type="text" value={managingEmployee.joinDate} onChange={(e) => handleEmployeeChange(managingEmployee.name, 'joinDate', e.target.value)} className="w-full p-2 border rounded bg-white" /></div>
                        <div><label className="text-xs text-gray-500">職等加給</label><input type="text" value={managingEmployee.jobGradeBonus} onChange={(e) => handleEmployeeChange(managingEmployee.name, 'jobGradeBonus', e.target.value)} className="w-full p-2 border rounded bg-white" /></div>
                        <div><label className="text-xs text-gray-500">代表色</label><input type="color" value={managingEmployee.color || '#ffffff'} onChange={(e) => handleEmployeeChange(managingEmployee.name, 'color', e.target.value)} className="w-full h-8 p-0 border rounded cursor-pointer" /></div>
                    </div>

                    <div className="space-y-2 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1"><MapPin size={12}/> 指定打卡站點</h4>
                        <div className="mb-2 max-h-32 overflow-y-auto border border-indigo-200 rounded bg-white p-2">
                            {availableOffices.length > 0 ? (
                                availableOffices.map(office => {
                                    const isChecked = (managingEmployee.assignedStation || "").split(',').includes(office);
                                    return (
                                        <div key={office} className="flex items-center gap-2 mb-1 p-1 hover:bg-indigo-50 rounded">
                                            <input 
                                                type="checkbox" 
                                                checked={isChecked} 
                                                onChange={() => handleStationToggle(office)}
                                                className="w-4 h-4 accent-indigo-600 cursor-pointer"
                                            />
                                            <span className="text-sm text-gray-700">{office}</span>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-xs text-gray-400 text-center py-2">無可用站點，請先至後端設定</p>
                            )}
                        </div>
                        <div className="flex items-center justify-between bg-white p-2 rounded border border-indigo-100">
                            <div className="flex items-center gap-2"><Globe size={16} className="text-indigo-600"/><span className="font-bold text-gray-700 text-sm">允許遠端打卡</span></div>
                            <input type="checkbox" checked={managingEmployee.allowRemote || false} onChange={(e) => handleEmployeeChange(managingEmployee.name, 'allowRemote', e.target.checked)} className="w-5 h-5 accent-indigo-600 cursor-pointer"/>
                        </div>
                    </div>

                    <div className="space-y-2 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">系統權限</h4>
                        <div className="flex items-center justify-between"><span className="font-bold text-gray-700 text-sm">授權考核</span><input type="checkbox" checked={managingEmployee.permission} onChange={(e) => handleEmployeeChange(managingEmployee.name, 'permission', e.target.checked)} className="w-5 h-5 accent-blue-600 cursor-pointer"/></div>
                        <div className="flex items-center justify-between"><span className="font-bold text-gray-700 text-sm">排班權限</span><input type="checkbox" checked={managingEmployee.canEditSchedule || false} onChange={(e) => handleEmployeeChange(managingEmployee.name, 'canEditSchedule', e.target.checked)} className="w-5 h-5 accent-blue-600 cursor-pointer"/></div>
                    </div>
                    <button onClick={() => handleKickUser(managingEmployee.name)} className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 flex items-center justify-center transition-colors"><Power size={18} className="mr-2" /> 強制登出</button>
                    <button onClick={() => handleDeleteEmployee(managingEmployee.name)} className="w-full py-3 text-gray-400 hover:text-red-500 font-medium text-sm flex items-center justify-center transition-colors"><Trash2 size={16} className="mr-2" /> 刪除此員工資料</button>
                    <button onClick={() => setManagingEmployee(null)} className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 mt-4">完成設定</button>
                </div>
            </div>
        </div>
      )}

      {/* 2. ✅ 補上：稽核紀錄詳細 Modal */}
      {selectedDeficiencyUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={20} />
                {selectedDeficiencyUser.name} 的稽核紀錄
              </h3>
              <button onClick={() => setSelectedDeficiencyUser(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
              {selectedDeficiencyUser.records.length === 0 ? (
                <div className="text-center py-12 text-gray-400 flex flex-col items-center">
                   <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                     <Users size={32} className="text-gray-300" />
                   </div>
                   <p>該員工目前無任何稽核紀錄</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDeficiencyUser.records.map((rec, i) => (
                    <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                         <div className="flex items-center gap-2 text-gray-600 text-sm">
                           <Calendar size={14} />
                           <span>{formatDate(rec.date)}</span>
                           <span className="w-1 h-1 bg-gray-300 rounded-full mx-1"></span>
                           <MapPin size={14} />
                           <span>{rec.station}</span>
                         </div>
                         <span className={`text-xs font-bold px-2 py-1 rounded-full ${rec.status === '待改善' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                           {rec.status}
                         </span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                         {rec.ppe && <div className="text-sm text-gray-700"><span className="font-bold text-red-500 mr-2">PPE:</span>{rec.ppe}</div>}
                         {rec.fencing && <div className="text-sm text-gray-700"><span className="font-bold text-red-500 mr-2">圍籬:</span>{rec.fencing}</div>}
                         {rec.boxClean && <div className="text-sm text-gray-700"><span className="font-bold text-red-500 mr-2">箱體:</span>{rec.boxClean}</div>}
                         {rec.siteClean && <div className="text-sm text-gray-700"><span className="font-bold text-red-500 mr-2">環境:</span>{rec.siteClean}</div>}
                         {rec.order && <div className="text-sm text-gray-700"><span className="font-bold text-red-500 mr-2">順序:</span>{rec.order}</div>}
                         {rec.gnop && <div className="text-sm text-gray-700"><span className="font-bold text-red-500 mr-2">GNOP:</span>{rec.gnop}</div>}
                         {rec.other && <div className="text-sm text-gray-700"><span className="font-bold text-red-500 mr-2">其他:</span>{rec.other}</div>}
                      </div>

                      {rec.photoUrl && (
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                           {rec.photoUrl.split(',').map((url, pIdx) => (
                             url.trim() && (
                               <a key={pIdx} href={url.trim()} target="_blank" rel="noopener noreferrer" className="relative group flex-shrink-0">
                                 <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 overflow-hidden">
                                    <ImageIcon size={20} className="text-gray-400 group-hover:scale-110 transition-transform" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                 </div>
                                 <span className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">查看</span>
                               </a>
                             )
                           ))}
                        </div>
                      )}
                      
                      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 text-right">
                        稽核人員: {rec.auditor || '未知'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 bg-white border-t border-gray-100">
               <button onClick={() => setSelectedDeficiencyUser(null)} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">
                 關閉
               </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ✅ 補上：考核評分 Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
               <div>
                  <h3 className="text-xl font-bold text-gray-800">{selectedRecord.name} 的考核詳情</h3>
                  <div className="text-sm text-gray-500 flex gap-3 mt-1">
                     <span>{selectedRecord.jobTitle}</span>
                     <span>•</span>
                     <span>職等: {selectedRecord.jobGrade}</span>
                     <span>•</span>
                     <span>年資: {selectedRecord.yearsOfService}</span>
                  </div>
               </div>
               <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0 flex flex-col md:flex-row">
                <div className="flex-1 p-6 border-r border-gray-100 bg-white">
                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><MessageSquare size={18} className="text-blue-500" /> 問答內容</h4>
                    <div className="space-y-6">
                        {selectedRecord.questions && selectedRecord.questions.map((q, idx) => (
                            <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="font-bold text-gray-700 mb-2 text-sm">Q{idx+1}: {q}</div>
                                <div className="text-gray-800 bg-white p-3 rounded-lg border border-gray-200 text-sm leading-relaxed">
                                    {selectedRecord.answers && selectedRecord.answers[idx] ? selectedRecord.answers[idx] : <span className="text-gray-400 italic">未回答</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="w-full md:w-96 bg-gray-50/50 p-6 flex flex-col gap-6">
                    <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm">
                        <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2"><Cloud size={18} /> AI 評估分析</h4>
                        <div className="flex items-baseline gap-2 mb-3">
                           <span className="text-3xl font-black text-blue-600">{selectedRecord.aiScore}</span>
                           <span className="text-sm text-gray-500">/ 100 分</span>
                        </div>
                        <div className="text-sm text-gray-600 leading-relaxed bg-blue-50 p-3 rounded-lg border border-blue-100">
                           {selectedRecord.aiComment}
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm flex-1">
                        <h4 className="font-bold text-orange-800 mb-4 flex items-center gap-2"><Star size={18} /> 主管複評</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">主管評分 (0-100)</label>
                                <input 
                                    type="number" 
                                    value={adminReview.score} 
                                    onChange={(e) => setAdminReview({...adminReview, score: e.target.value})}
                                    className="w-full p-3 border border-gray-200 rounded-lg text-lg font-bold text-center focus:ring-2 focus:ring-orange-200 outline-none"
                                    placeholder="輸入分數..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">評語與建議</label>
                                <textarea 
                                    value={adminReview.comment} 
                                    onChange={(e) => setAdminReview({...adminReview, comment: e.target.value})}
                                    className="w-full p-3 border border-gray-200 rounded-lg h-32 text-sm focus:ring-2 focus:ring-orange-200 outline-none resize-none"
                                    placeholder="請輸入給員工的回饋..."
                                />
                            </div>
                            
                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex justify-between items-center text-sm mb-4">
                                   <span className="text-gray-500">預估最終分數 (AI 60% + 主管 40%)</span>
                                   <span className="font-bold text-gray-900 text-lg">{calculateProjectedScore()}</span>
                                </div>
                                <button 
                                    onClick={submitReview}
                                    disabled={isSaving}
                                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md shadow-orange-200 transition-all active:scale-95 flex justify-center items-center"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" /> : "送出評分"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};