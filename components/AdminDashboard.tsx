import React, { useState, useEffect } from 'react';
import { User, AssessmentRecord, Employee } from '../types';
import { fetchAdminData, updateAdminPassword, submitAdminReview, fetchEmployeeList, updateEmployeeList } from '../services/api';
import { LogOut, Users, Save, Loader2, RefreshCw, KeyRound, MessageSquare, Calculator, X, Link, UserPlus, Trash2 } from 'lucide-react';

interface AdminDashboardProps {
  user: User;
  apiUrl: string;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, apiUrl, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'records' | 'employees' | 'security'>('records');
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [configUrl, setConfigUrl] = useState(apiUrl);
  const [selectedRecord, setSelectedRecord] = useState<AssessmentRecord | null>(null);
  const [adminReview, setAdminReview] = useState({ comment: '', score: '' });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminData(apiUrl);
      if (data.success) {
        setRecords(data.records);
      }
      const empData = await fetchEmployeeList(apiUrl);
      if (empData.success) {
        setEmployees(empData.employees);
      }
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
    const newEmployees = employees.filter((_, i) => i !== index);
    setEmployees(newEmployees);
  };

  const handleSaveEmployees = async () => {
    setIsSaving(true);
    try {
      const result = await updateEmployeeList(apiUrl, employees);
      alert(result.message);
    } catch (error) {
      alert("儲存員工名單失敗");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) return alert("請輸入新密碼");
    setIsSaving(true);
    try {
      const result = await updateAdminPassword(apiUrl, newPassword);
      alert(result.message);
      if (result.success) {
        setNewPassword('');
      }
    } catch (error) {
      alert("密碼更新失敗: " + (error instanceof Error ? error.message : "未知錯誤"));
    } finally {
      setIsSaving(false);
    }
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
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert("評分提交發生錯誤: " + (error instanceof Error ? error.message : "未知錯誤"));
    } finally {
      setIsSaving(false);
    }
  };

  const calculateProjectedScore = () => {
    if (!selectedRecord) return 0;
    const ai = selectedRecord.aiScore || 0;
    const admin = parseInt(adminReview.score) || 0;
    // 修改: 權重 6:4
    return Math.round(ai * 0.6 + admin * 0.4);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('zh-TW');
    } catch {
      return dateStr;
    }
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
          <button 
             onClick={loadData}
             className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
             title="重新整理資料"
          >
            <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            登出
          </button>
        </div>
      </header>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('records')}
          className={`px-5 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
            activeTab === 'records' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          員工填答狀況
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-5 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
            activeTab === 'employees' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          員工管理
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-5 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center ${
            activeTab === 'security' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
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
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">目前尚無任何提交紀錄</td>
                  </tr>
                ) : (
                  records.map((record, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                      <td className="p-4 text-sm text-gray-500 whitespace-nowrap text-center">{formatDate(record.timestamp)}</td>
                      <td className="p-4 font-medium text-gray-800 whitespace-nowrap text-center">
                        {record.name}
                        <div className="text-xs text-gray-400 font-normal">{record.jobTitle} {record.jobGrade && `(${record.jobGrade})`}</div>
                      </td>
                      <td className="p-4 text-center text-gray-500 whitespace-nowrap">{record.aiScore || '-'}</td>
                      <td className="p-4 text-center whitespace-nowrap">
                        {record.finalScore ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold
                            ${record.finalScore >= 80 ? 'bg-green-100 text-green-800' : 
                              record.finalScore >= 60 ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'}`}>
                            {record.finalScore}
                          </span>
                        ) : <span className="text-gray-400 text-sm">未複評</span>}
                      </td>
                      <td className="p-4 text-sm text-gray-600 whitespace-pre-wrap min-w-[200px] max-w-[400px]">
                        {record.aiComment ? (
                           <div className="flex items-start gap-1">
                             <MessageSquare size={14} className="mt-1 flex-shrink-0 text-blue-400" />
                             <span className="line-clamp-3">{record.aiComment}</span>
                           </div>
                        ) : <span className="text-gray-400 italic">待評分</span>}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <button 
                          onClick={() => openReviewModal(record)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                        >
                          查看與評分
                        </button>
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
            <button 
              onClick={handleAddEmployee}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <UserPlus size={18} className="mr-2" /> 新增員工
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-700 border-b border-gray-200 whitespace-nowrap">
                  <th className="p-3 text-center">姓名</th>
                  <th className="p-3 text-center">到職日</th>
                  <th className="p-3 text-center">職稱</th>
                  <th className="p-3 text-center">年資</th>
                  <th className="p-3 text-center">職等</th>
                  <th className="p-3 text-center">職等加給</th>
                  <th className="p-3 text-center">KPI</th>
                  <th className="p-3 text-center">薪資</th>
                  <th className="p-3 text-center">授權</th>
                  <th className="p-3 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-2 min-w-[100px]">
                      <input 
                        type="text" 
                        value={emp.name}
                        onChange={(e) => handleEmployeeChange(index, 'name', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 outline-none text-center"
                      />
                    </td>
                    <td className="p-2 w-[80px]">
                      <input 
                        type="text" 
                        value={emp.kpi || ''} // 如果沒有資料就顯示空白
                        disabled // 🔒 關鍵：鎖定不給改
                        className="w-full px-2 py-1 border border-gray-200 rounded bg-gray-100 text-gray-500 cursor-not-allowed outline-none text-center font-bold"
                        // bg-gray-100 讓它看起來灰灰的，暗示不能點
                      />
                    </td>
                    <td className="p-2 min-w-[120px]">
                      <input 
                        type="text" 
                        value={emp.joinDate}
                        onChange={(e) => handleEmployeeChange(index, 'joinDate', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 outline-none text-center"
                        placeholder="YYYY/M/D"
                      />
                    </td>
                    <td className="p-2 min-w-[100px]">
                      <input 
                        type="text" 
                        value={emp.jobTitle}
                        onChange={(e) => handleEmployeeChange(index, 'jobTitle', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 outline-none text-center"
                      />
                    </td>
                    <td className="p-2 w-[80px]">
                      <input 
                        type="text" 
                        value={emp.yearsOfService}
                        disabled
                        className="w-full px-2 py-1 border border-gray-200 rounded bg-gray-100 text-gray-500 cursor-not-allowed outline-none text-center"
                      />
                    </td>
                    <td className="p-2 w-[80px]">
                      <input 
                        type="text" 
                        value={emp.jobGrade}
                        onChange={(e) => handleEmployeeChange(index, 'jobGrade', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 outline-none text-center"
                      />
                    </td>
                    <td className="p-2 min-w-[100px]">
                      <input 
                        type="text" 
                        value={emp.jobGradeBonus}
                        onChange={(e) => handleEmployeeChange(index, 'jobGradeBonus', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 outline-none text-center"
                      />
                    </td>
                    <td className="p-2 min-w-[100px]">
                      <input 
                        type="text" 
                        value={emp.salary}
                        disabled
                        className="w-full px-2 py-1 border border-gray-200 rounded bg-gray-100 text-gray-500 cursor-not-allowed outline-none text-center"
                      />
                    </td>
                    <td className="p-2 text-center w-[60px]">
                      <input 
                        type="checkbox" 
                        checked={emp.permission}
                        onChange={(e) => handleEmployeeChange(index, 'permission', e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-2 text-center w-[50px]">
                      <button 
                        onClick={() => handleDeleteEmployee(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="刪除"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-6">
            <button
              onClick={handleSaveEmployees}
              disabled={isSaving}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex justify-center items-center shadow-md active:scale-95 transition-all"
            >
              {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 w-4 h-4" />}
              儲存變更 (更新至試算表)
            </button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          {/* Password Change Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6 text-gray-800">
              <KeyRound className="text-blue-600" />
              <h2 className="text-xl font-bold">修改管理員密碼</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">新密碼</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="請輸入新密碼 (預設為 abc123)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={isSaving}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex justify-center items-center shadow-md active:scale-95 transition-all"
              >
                {isSaving ? <Loader2 className="animate-spin mr-2" /> : "更新密碼"}
              </button>
            </div>
          </div>

          {/* API URL Config Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6 text-gray-800">
              <Link className="text-purple-600" />
              <h2 className="text-xl font-bold">系統連線設定</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">API 網址 (Google Apps Script)</label>
                <input
                  type="text"
                  value={configUrl}
                  onChange={(e) => setConfigUrl(e.target.value)}
                  placeholder="https://script.google.com/..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none break-all text-sm font-mono"
                />
                <p className="text-xs text-gray-500 mt-2">
                  注意：修改此網址將改變系統連線目標。修改後請重新登入。
                </p>
              </div>
              <button
                onClick={handleSaveUrl}
                className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex justify-center items-center shadow-sm active:scale-95 transition-all"
              >
                <Save className="mr-2 w-4 h-4" />
                儲存網址設定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail & Review Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0">
              <div>
                 <h3 className="text-xl font-bold text-gray-800">{selectedRecord.name} 的考核詳情</h3>
                 <p className="text-sm text-gray-500">
                   {formatDate(selectedRecord.timestamp)}
                   <span className="ml-2 text-gray-400">|</span>
                   <span className="ml-2 text-gray-600">{selectedRecord.jobTitle} {selectedRecord.jobGrade && `(${selectedRecord.jobGrade})`}</span>
                   <span className="ml-2 text-gray-400">|</span>
                   <span className="ml-2 text-gray-600">年資: {selectedRecord.yearsOfService}</span>
                 </p>
              </div>
              <button 
                onClick={() => setSelectedRecord(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Q&A */}
              <div className="space-y-6">
                <h4 className="font-bold text-gray-700 border-l-4 border-blue-500 pl-3">員工回答</h4>
                {selectedRecord.answers.map((ans, i) => (
                  <div key={i} className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-xs font-bold text-gray-500 mb-1">Q{i + 1}</p>
                    <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">{ans}</p>
                  </div>
                ))}
              </div>

              {/* Right Column: Scoring */}
              <div className="space-y-6">
                <h4 className="font-bold text-gray-700 border-l-4 border-purple-500 pl-3">AI 評估結果</h4>
                <div className="bg-purple-50 p-5 rounded-xl border border-purple-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-purple-700 font-bold flex items-center gap-2">
                      <Calculator size={16} /> AI 評分
                    </span>
                    <span className="text-2xl font-bold text-purple-700">{selectedRecord.aiScore}</span>
                  </div>
                  {/* 加入 whitespace-pre-wrap 讓 Modal 內的評語也正確換行 */}
                  <p className="text-sm text-gray-700 leading-relaxed bg-white p-3 rounded-lg border border-purple-100 whitespace-pre-wrap">
                    {selectedRecord.aiComment}
                  </p>
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <h4 className="font-bold text-gray-700 border-l-4 border-green-500 pl-3 mb-4">主管複評</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">主管評分 (佔 40%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={adminReview.score}
                        onChange={(e) => setAdminReview({...adminReview, score: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        placeholder="0-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">主管評語</label>
                      <textarea
                        rows={3}
                        value={adminReview.comment}
                        onChange={(e) => setAdminReview({...adminReview, comment: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none"
                        placeholder="請輸入您的補充評語..."
                      ></textarea>
                    </div>

                    <div className="bg-gray-100 p-4 rounded-lg flex justify-between items-center">
                      <span className="font-medium text-gray-600">預估最終分數 (60% AI + 40% 主管)</span>
                      <span className="text-2xl font-bold text-blue-600">{calculateProjectedScore()}</span>
                    </div>

                    <button
                      onClick={submitReview}
                      disabled={isSaving}
                      className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-md active:scale-95 transition-all flex justify-center"
                    >
                      {isSaving ? <Loader2 className="animate-spin" /> : "確認送出評分"}
                    </button>
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