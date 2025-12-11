import React, { useState, useEffect } from 'react';
import { User, AssessmentRecord, Employee, DeficiencyRecord } from '../types';
import { fetchAdminData, updateAdminPassword, submitAdminReview, fetchEmployeeList, updateEmployeeList, kickUser, fetchDeficiencyRecords } from '../services/api';
import { LogOut, Users, Save, Loader2, RefreshCw, KeyRound, MessageSquare, Calculator, X, Link, UserPlus, Trash2, Ban, AlertTriangle, ChevronRight } from 'lucide-react';

interface AdminDashboardProps {
  user: User;
  apiUrl: string;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, apiUrl, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'records' | 'employees' | 'security' | 'deficiencies'>('employees');
  
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allDeficiencies, setAllDeficiencies] = useState<DeficiencyRecord[]>([]); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [configUrl, setConfigUrl] = useState(apiUrl);
  
  const [selectedRecord, setSelectedRecord] = useState<AssessmentRecord | null>(null);
  const [selectedDeficiencyUser, setSelectedDeficiencyUser] = useState<{name: string, records: DeficiencyRecord[]} | null>(null);
  
  const [adminReview, setAdminReview] = useState({ comment: '', score: '' });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminData(apiUrl);
      if (data.success) setRecords(data.records);
      
      const empData = await fetchEmployeeList(apiUrl);
      if (empData.success) setEmployees(empData.employees);
      
      const defData = await fetchDeficiencyRecords(apiUrl);
      if (defData.success) setAllDeficiencies(defData.records);

    } catch (e) {
      console.error("Load data failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [apiUrl]);

  const handleEmployeeChange = (index: number, field: keyof Employee, value: any) => {
    const newEmployees = [...employees];
    newEmployees[index] = { ...newEmployees[index], [field]: value };
    setEmployees(newEmployees);
  };

  const handleKickUser = async (name: string) => {
      if (confirm(`確定要強制登出「${name}」嗎？\n這將使對方目前的登入立即失效，需重新驗證 OTP 才能登入。`)) {
          try {
             const res = await kickUser(apiUrl, name);
             if (res.success) alert(`已成功發送強制登出指令給 ${name}。`);
             else alert("指令發送失敗：" + res.message);
          } catch(e) { alert("連線錯誤，無法執行踢出。"); }
      }
  };

  const handleAddEmployee = () => {
    setEmployees([...employees, {
      name: '新員工',
      joinDate: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
      jobTitle: '職稱',
      yearsOfService: '0',
      jobGrade: '1',
      jobGradeBonus: '0',
      kpi: '',
      salary: '0',
      permission: true
    }]);
  };

  const handleDeleteEmployee = (index: number) => {
    if(confirm('確定要刪除此員工資料嗎？')) {
        const newEmployees = employees.filter((_, i) => i !== index);
        setEmployees(newEmployees);
    }
  };

  const handleSaveEmployees = async () => {
    setIsSaving(true);
    try {
      const result = await updateEmployeeList(apiUrl, employees);
      alert(result.message);
    } catch (error) { alert("儲存員工名單失敗"); } finally { setIsSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) return alert("請輸入新密碼");
    setIsSaving(true);
    try {
      const result = await updateAdminPassword(apiUrl, newPassword);
      alert(result.message);
      if (result.success) setNewPassword('');
    } catch (error) { alert("密碼更新失敗"); } finally { setIsSaving(false); }
  };

  const handleSaveUrl = () => {
    if (!configUrl.trim()) return alert("請輸入有效的 API URL");
    localStorage.setItem('gas_api_url', configUrl);
    alert("✅ 網址已更新！請登出並重新整理頁面以套用新設定。");
  };

  const openReviewModal = (record: AssessmentRecord) => {
    setSelectedRecord(record);
    setAdminReview({
      comment: record.adminComment || '',
      score: record.adminScore ? String(record.adminScore) : ''
    });
  };

  const openDeficiencyModal = (empName: string) => {
      const userRecords = allDeficiencies.filter(r => r.name === empName);
      setSelectedDeficiencyUser({ name: empName, records: userRecords });
  };

  const submitReview = async () => {
    if (!selectedRecord || selectedRecord.rowIndex === undefined) return;
    const score = parseInt(adminReview.score);
    if (isNaN(score) || score < 0 || score > 100) return alert("請輸入 0-100 的有效分數");
    setIsSaving(true);
    try {
      const result = await submitAdminReview(apiUrl, selectedRecord.rowIndex, adminReview.comment, score);
      if (result.success) {
        alert("評分已送出！");
        setSelectedRecord(null);
        loadData(); 
      } else { alert(result.message); }
    } catch (error) { alert("評分提交發生錯誤"); } finally { setIsSaving(false); }
  };

  const calculateProjectedScore = () => {
    if (!selectedRecord) return 0;
    const ai = selectedRecord.aiScore || 0;
    const admin = parseInt(adminReview.score) || 0;
    return Math.round(ai * 0.6 + admin * 0.4);
  };

  const formatDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString('zh-TW'); } catch { return dateStr; }
  };

  const getDeficiencyCount = (name: string) => {
      return allDeficiencies.filter(d => d.name === name).length;
  };

  return (
    <div className="w-full max-w-7xl animate-in fade-in duration-500 relative">
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
             <Users className="text-blue-600" />
             管理員控制台
           </h1>
           <p className="text-gray-500 mt-1">管理員：<span className="font-semibold">{user.name}</span></p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadData} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="重新整理">
            <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button onClick={onLogout} className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
            <LogOut className="w-4 h-4 mr-2" />
            登出
          </button>
        </div>
      </header>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button onClick={() => setActiveTab('employees')} className={`px-5 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'employees' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
          員工管理
        </button>
        <button onClick={() => setActiveTab('records')} className={`px-5 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'records' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
          員工填答狀況
        </button>
        <button onClick={() => setActiveTab('deficiencies')} className={`px-5 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center ${activeTab === 'deficiencies' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
          <AlertTriangle size={16} className="mr-2" />
          缺失紀錄
        </button>
        <button onClick={() => setActiveTab('security')} className={`px-5 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center ${activeTab === 'security' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
          <KeyRound size={16} className="mr-2" />
          帳戶與系統安全
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 bg-white rounded-2xl">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">正在同步雲端資料...</p>
        </div>
      ) : activeTab === 'records' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 whitespace-nowrap">
                  <th className="p-4 font-bold text-center">提交時間</th>
                  <th className="p-4 font-bold text-center">員工姓名</th>
                  <th className="p-4 font-bold text-center">AI 分數</th>
                  <th className="p-4 font-bold text-center">最終分數</th>
                  <th className="p-4 font-bold text-center min-w-[200px]">AI 評語</th>
                  <th className="p-4 font-bold text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-400">目前尚無任何提交紀錄</td></tr>
                ) : (
                  records.map((record, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                      <td className="p-4 text-sm text-gray-500 whitespace-nowrap text-center">{new Date(record.timestamp).toLocaleString('zh-TW')}</td>
                      <td className="p-4 font-medium text-gray-800 whitespace-nowrap text-center">
                        {record.name}
                        <div className="text-xs text-gray-400 font-normal">{record.jobTitle}</div>
                      </td>
                      <td className="p-4 text-center text-gray-500">{record.aiScore || '-'}</td>
                      <td className="p-4 text-center">{record.finalScore || '-'}</td>
                      <td className="p-4 text-sm text-gray-600 whitespace-pre-wrap min-w-[200px] max-w-[400px]">
                        {record.aiComment ? <span className="line-clamp-3">{record.aiComment}</span> : <span className="text-gray-400 italic">待評分</span>}
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => openReviewModal(record)} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium">查看與評分</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'employees' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users size={20} className="text-blue-600" /> 員工名單管理
            </h2>
            <button onClick={handleAddEmployee} className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm">
              <UserPlus size={18} className="mr-2" /> 新增員工
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-gray-50 text-gray-700 border-b border-gray-200 whitespace-nowrap">
                <th className="p-3 text-center w-16">管理</th>
                <th className="p-3 text-center">姓名</th>
                <th className="p-3 text-center">到職日</th>
                <th className="p-3 text-center">職稱</th>
                <th className="p-3 text-center">年資</th>
                <th className="p-3 text-center">職等</th>
                <th className="p-3 text-center">職等加給</th>
                <th className="p-3 text-center min-w-[120px]">KPI</th>
                <th className="p-3 text-center w-[90px]">薪資</th>
                <th className="p-3 text-center">授權</th>
                <th className="p-3 text-center"></th>
                </tr>
            </thead>
            <tbody>
                {employees.map((emp, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-2 text-center">
                        <button onClick={() => handleKickUser(emp.name)} className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"><Ban size={16} /></button>
                    </td>
                    <td className="p-2 min-w-[100px]"><input type="text" value={emp.name} onChange={(e) => handleEmployeeChange(index, 'name', e.target.value)} className="w-full px-2 py-1 border border-gray-200 rounded text-center" /></td>
                    <td className="p-2 min-w-[120px]"><input type="text" value={emp.joinDate} onChange={(e) => handleEmployeeChange(index, 'joinDate', e.target.value)} className="w-full px-2 py-1 border border-gray-200 rounded text-center" /></td>
                    <td className="p-2 min-w-[100px]"><input type="text" value={emp.jobTitle} onChange={(e) => handleEmployeeChange(index, 'jobTitle', e.target.value)} className="w-full px-2 py-1 border border-gray-200 rounded text-center" /></td>
                    <td className="p-2 w-[80px]"><input type="text" value={emp.yearsOfService} disabled className="w-full px-2 py-1 bg-gray-100 text-gray-500 rounded text-center" /></td>
                    <td className="p-2 w-[80px]"><input type="text" value={emp.jobGrade} onChange={(e) => handleEmployeeChange(index, 'jobGrade', e.target.value)} className="w-full px-2 py-1 border border-gray-200 rounded text-center" /></td>
                    <td className="p-2 min-w-[100px]"><input type="text" value={emp.jobGradeBonus} onChange={(e) => handleEmployeeChange(index, 'jobGradeBonus', e.target.value)} className="w-full px-2 py-1 border border-gray-200 rounded text-center" /></td>
                    <td className="p-2 min-w-[120px]"><input type="text" value={emp.kpi || ''} disabled className="w-full px-2 py-1 bg-gray-200 text-gray-600 font-bold rounded text-center" /></td>
                    <td className="p-2 w-[90px]"><input type="text" value={emp.salary} disabled className="w-full px-2 py-1 bg-gray-100 text-gray-500 rounded text-center" /></td>
                    <td className="p-2 text-center w-[60px]"><input type="checkbox" checked={emp.permission} onChange={(e) => handleEmployeeChange(index, 'permission', e.target.checked)} className="w-5 h-5" /></td>
                    <td className="p-2 text-center w-[50px]"><button onClick={() => handleDeleteEmployee(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={18} /></button></td>
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
               <AlertTriangle size={20} className="text-red-500" /> 員工缺失狀況總覽
             </h2>
             <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
               共 {allDeficiencies.length} 筆缺失紀錄
             </span>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map((emp, idx) => {
                  const count = getDeficiencyCount(emp.name);
                  return (
                    <button 
                      key={idx}
                      onClick={() => openDeficiencyModal(emp.name)}
                      className={`flex justify-between items-center p-4 rounded-xl border transition-all hover:shadow-md
                        ${count > 0 ? 'bg-red-50 border-red-200 hover:border-red-300' : 'bg-white border-gray-200 hover:border-blue-300'}
                      `}
                    >
                       <div className="text-left">
                          <h3 className="font-bold text-gray-800">{emp.name}</h3>
                          <p className="text-xs text-gray-500">{emp.jobTitle}</p>
                       </div>
                       <div className="flex items-center gap-3">
                          {count > 0 ? (
                            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">{count} 缺失</span>
                          ) : (
                            <span className="text-green-600 text-xs font-bold flex items-center"><span className="mr-1">✓</span> 良好</span>
                          )}
                          <ChevronRight size={16} className="text-gray-400" />
                       </div>
                    </button>
                  )
              })}
           </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6 text-gray-800">
              <KeyRound className="text-blue-600" />
              <h2 className="text-xl font-bold">修改管理員密碼</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">新密碼</label>
                <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
              </div>
              <button onClick={handleChangePassword} disabled={isSaving} className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex justify-center items-center shadow-md">
                {isSaving ? <Loader2 className="animate-spin mr-2" /> : "更新密碼"}
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6 text-gray-800">
              <Link className="text-purple-600" />
              <h2 className="text-xl font-bold">系統連線設定</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">API 網址</label>
                <input type="text" value={configUrl} onChange={(e) => setConfigUrl(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono" />
              </div>
              <button onClick={handleSaveUrl} className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex justify-center items-center shadow-sm">
                <Save className="mr-2 w-4 h-4" /> 儲存網址設定
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRecord && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0">
              <div>
                 <h3 className="text-xl font-bold text-gray-800">{selectedRecord.name} 的考核詳情</h3>
                 <p className="text-sm text-gray-500">{new Date(selectedRecord.timestamp).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={24} className="text-gray-500" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-6">
                 <h4 className="font-bold text-gray-700 border-l-4 border-blue-500 pl-3">員工回答</h4>
                 {selectedRecord.answers.map((ans, i) => (
                   <div key={i} className="bg-gray-50 p-4 rounded-xl"><p className="text-xs font-bold text-gray-500 mb-1">Q{i+1}</p><p className="text-gray-800 text-sm whitespace-pre-wrap">{ans}</p></div>
                 ))}
               </div>
               <div className="space-y-6">
                  <h4 className="font-bold text-gray-700 border-l-4 border-purple-500 pl-3">AI 評估結果</h4>
                  <div className="bg-purple-50 p-5 rounded-xl border border-purple-100">
                    <div className="flex justify-between items-center mb-2"><span className="text-purple-700 font-bold flex items-center gap-2"><Calculator size={16}/> AI 評分</span><span className="text-2xl font-bold text-purple-700">{selectedRecord.aiScore}</span></div>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-purple-100 whitespace-pre-wrap">{selectedRecord.aiComment}</p>
                  </div>
                  <div className="border-t border-gray-100 pt-6">
                    <h4 className="font-bold text-gray-700 border-l-4 border-green-500 pl-3 mb-4">主管複評</h4>
                    <div className="space-y-4">
                      <input type="number" value={adminReview.score} onChange={(e) => setAdminReview({...adminReview, score: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="0-100" />
                      <textarea rows={3} value={adminReview.comment} onChange={(e) => setAdminReview({...adminReview, comment: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none" placeholder="評語..."></textarea>
                      <div className="bg-gray-100 p-4 rounded-lg flex justify-between items-center"><span className="font-medium text-gray-600">預估最終分數</span><span className="text-2xl font-bold text-blue-600">{calculateProjectedScore()}</span></div>
                      <button onClick={submitReview} disabled={isSaving} className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-md flex justify-center">{isSaving ? <Loader2 className="animate-spin" /> : "確認送出評分"}</button>
                    </div>
                  </div>
               </div>
            </div>
           </div>
         </div>
      )}

      {selectedDeficiencyUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0">
                 <div>
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <AlertTriangle className="text-red-500" />
                      {selectedDeficiencyUser.name} 的缺失紀錄
                    </h3>
                    <p className="text-sm text-gray-500">共 {selectedDeficiencyUser.records.length} 筆資料</p>
                 </div>
                 <button onClick={() => setSelectedDeficiencyUser(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={24} className="text-gray-500" /></button>
              </div>
              <div className="p-0 overflow-auto">
                 {selectedDeficiencyUser.records.length === 0 ? (
                    <div className="text-center py-20 text-gray-400"><p>太棒了！該員工目前無任何缺失紀錄。</p></div>
                 ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                           <thead className="bg-gray-50 text-gray-700 whitespace-nowrap sticky top-0 z-10">
                             <tr>
                               <th className="p-3 border-b min-w-[100px] bg-gray-50">日期</th>
                               <th className="p-3 border-b min-w-[120px] bg-gray-50">站點</th>
                               <th className="p-3 border-b min-w-[160px] bg-gray-50">防護及圍籬</th>
                               <th className="p-3 border-b min-w-[160px] bg-gray-50">清潔(箱內/外)</th>
                               <th className="p-3 border-b min-w-[100px] bg-gray-50">SOP</th>
                               <th className="p-3 border-b min-w-[100px] bg-gray-50">GNOP</th>
                               <th className="p-3 border-b min-w-[150px] bg-gray-50">其他</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                             {selectedDeficiencyUser.records.map((rec, idx) => (
                               <tr key={idx} className="hover:bg-gray-50">
                                 <td className="p-3 font-mono text-gray-500">{formatDate(rec.date)}</td>
                                 <td className="p-3 font-medium">{rec.station}</td>
                                 <td className="p-3">
                                   <div className="flex flex-col gap-1 text-xs">
                                     <span className={rec.ppe.includes('不') ? 'text-red-600 font-bold' : ''}>PPE: {rec.ppe}</span>
                                     <span className={rec.fencing.includes('不') ? 'text-red-600 font-bold' : ''}>圍籬: {rec.fencing}</span>
                                   </div>
                                 </td>
                                 <td className="p-3">
                                   <div className="flex flex-col gap-1 text-xs">
                                     <span className={rec.boxClean.includes('不') ? 'text-red-600 font-bold' : ''}>內: {rec.boxClean}</span>
                                     <span className={rec.siteClean.includes('不') ? 'text-red-600 font-bold' : ''}>外: {rec.siteClean}</span>
                                   </div>
                                 </td>
                                 <td className={`p-3 ${rec.order.includes('不') ? 'text-red-600 font-bold' : ''}`}>{rec.order}</td>
                                 <td className={`p-3 ${rec.gnop.includes('不') ? 'text-red-600 font-bold' : ''}`}>{rec.gnop}</td>
                                 <td className="p-3 text-gray-600">{rec.other || '-'}</td>
                               </tr>
                             ))}
                           </tbody>
                        </table>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};