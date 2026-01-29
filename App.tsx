import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LoginForm } from './components/LoginForm';
import { AssessmentPlaceholder } from './components/AssessmentPlaceholder';
import { AssessmentForm } from './components/AssessmentForm';
import { AdminDashboard } from './components/AdminDashboard'; 
import { HistoryView } from './components/HistoryView';
import { ProfileView } from './components/ProfileView';
import { ScheduleView } from './components/ScheduleView';
import { FullScheduleView } from './components/FullScheduleView';
import { DeficiencyReportForm } from './components/DeficiencyReportForm';
// ✅ 新增引用外部 ErrorBoundary
import { ErrorBoundary } from './components/ErrorBoundary';
import { authenticateEmployee, checkLoginStatus } from './services/api'; 
import { User } from './types';
import { AlertTriangle, Cloud } from 'lucide-react';

// ✅ 原本這裡的 ErrorBoundary 類別定義已全部移除，改用 import

const ModalDialog = ({ isOpen, type, message, onConfirm, onCancel }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100">
        <div className="flex flex-col items-center text-center gap-4">
          <div className={`p-3 rounded-full ${type === 'alert' ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600'}`}><AlertTriangle size={32} /></div>
          <p className="text-gray-800 font-medium text-lg leading-relaxed whitespace-pre-wrap">{message}</p>
          <div className="flex gap-3 w-full mt-2">
            {type === 'confirm' && (<button onClick={onCancel} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">取消</button>)}
            <button onClick={onConfirm} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors">確定</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
      try {
          const saved = localStorage.getItem('app_session');
          if (saved) {
              const data = JSON.parse(saved);
              if (data && data.user && data.user.name) return data.user;
          }
      } catch(e) {}
      return null;
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [view, setView] = useState<'dashboard' | 'form' | 'history' | 'profile' | 'schedule' | 'full-schedule' | 'report-deficiency'>('dashboard');
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('gas_api_url') || '');
  const [questions, setQuestions] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('app_session') || '{}').questions || []; } catch { return []; } });
  const [debugInfo, setDebugInfo] = useState<string>("連線檢查中...");
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; type: 'alert' | 'confirm'; message: string; onConfirm: () => void; onCancel?: () => void; }>({ isOpen: false, type: 'alert', message: '', onConfirm: () => {} });
  
  const isPopping = useRef(false);
  const viewRef = useRef(view);
  const modalConfigRef = useRef(modalConfig);

  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { modalConfigRef.current = modalConfig; }, [modalConfig]);

  const showAlert = useCallback((msg: string) => { return new Promise<void>((resolve) => { setModalConfig({ isOpen: true, type: 'alert', message: msg, onConfirm: () => { setModalConfig(prev => ({ ...prev, isOpen: false })); resolve(); } }); }); }, []);
  const showConfirm = useCallback((msg: string, onYes: () => void, onNo?: () => void) => { 
      setModalConfig({ 
          isOpen: true, 
          type: 'confirm', 
          message: msg, 
          onConfirm: () => { setModalConfig(prev => ({ ...prev, isOpen: false })); onYes(); }, 
          onCancel: () => { setModalConfig(prev => ({ ...prev, isOpen: false })); if(onNo) onNo(); } 
      }); 
  }, []);

  useEffect(() => { const initApp = async () => { const savedApiUrl = localStorage.getItem('gas_api_url'); if (savedApiUrl) setApiUrl(savedApiUrl); }; initApp(); window.history.replaceState({ view: 'dashboard' }, ''); }, []);
  
  const performSync = useCallback(async () => {
    if (!user || !apiUrl || user.isAdmin) return;
    const savedSession = localStorage.getItem('app_session');
    if (!savedSession) return;

    try {
        const sessionData = JSON.parse(savedSession);
        if (sessionData.expiry && Date.now() >= sessionData.expiry) { handleLogout(); return; }
        const loginTime = sessionData.loginTime || 0;
        
        const res = await checkLoginStatus(apiUrl, user.name, loginTime);
        const apiStatus = res.success ? "✅ 連線正常" : "❌ 連線失敗"; 

        if (res.success && res.kicked) { 
            setDebugInfo(`${apiStatus}\n🔴 狀態: 已被踢出`); 
            showAlert("⚠️ 您的帳號已登出，請重新驗證。").then(() => handleLogout()); 
        } else { 
            if (!res.success && res.message && res.message.includes("Unknown")) setDebugInfo(`❌ GAS版本過舊`); 
            else {
                setDebugInfo(`${apiStatus}\n🟢 狀態: 線上`); 
                if (res.userDetails) {
                    setUser(prev => {
                        if (!prev) return null;
                        if (
                            prev.kpi !== res.userDetails?.kpi ||
                            prev.annualLeave !== res.userDetails?.annualLeave || 
                            prev.annualLeaveUsed !== res.userDetails?.annualLeaveUsed ||
                            prev.jobGrade !== res.userDetails?.jobGrade ||
                            prev.assignedStation !== res.userDetails?.assignedStation ||
                            prev.allowRemote !== res.userDetails?.allowRemote ||
                            prev.canAssess !== res.userDetails?.permissionGranted 
                        ) {
                            const updatedUser = { 
                                ...prev, 
                                kpi: res.userDetails?.kpi || prev.kpi,
                                jobGrade: res.userDetails?.jobGrade || prev.jobGrade,
                                annualLeave: res.userDetails?.annualLeave || "0",
                                annualLeaveUsed: res.userDetails?.annualLeaveUsed || "0",
                                assignedStation: res.userDetails?.assignedStation || "",
                                allowRemote: res.userDetails?.allowRemote || false,
                                canAssess: res.userDetails?.permissionGranted || false 
                            };
                            const newSession = { ...sessionData, user: updatedUser };
                            localStorage.setItem('app_session', JSON.stringify(newSession));
                            return updatedUser;
                        }
                        return prev;
                    });
                }
            }
        }
    } catch (e) { setDebugInfo("❌ 資料錯誤"); }
  }, [user, apiUrl, showAlert]); 

  const handleManualRefresh = async () => {
      setIsSyncing(true);
      await performSync();
      setTimeout(() => setIsSyncing(false), 800);
  };

  useEffect(() => {
    if (!user || !apiUrl || user.isAdmin) return;
    const timer = setInterval(performSync, 10000);
    return () => clearInterval(timer);
  }, [user, apiUrl, performSync]);

  useEffect(() => { 
      const handlePopState = (event: PopStateEvent) => { 
          isPopping.current = true; 
          const currentView = viewRef.current;
          
          // 非 dashboard 頁面：直接返回上一個視圖
          if (currentView !== 'dashboard') {
              if (event.state && event.state.view) {
                  setView(event.state.view);
              } else {
                  setView('dashboard');
              }
          } 
          // dashboard 頁面：攔截並確認是否離開
          else if (currentView === 'dashboard' && (!event.state || event.state.view !== 'dashboard')) {
              window.history.pushState({ view: 'dashboard' }, '');
              if (!modalConfigRef.current.isOpen) {
                  showConfirm(
                      "確定要離開應用程式嗎？", 
                      () => { try { window.history.go(-2); } catch(e) { window.close(); } },
                      () => {}
                  );
              }
          }
          
          setTimeout(() => { isPopping.current = false; }, 50); 
      }; 
      
      window.addEventListener('popstate', handlePopState); 
      return () => window.removeEventListener('popstate', handlePopState); 
  }, [showConfirm]);

  useEffect(() => { if (isPopping.current) return; if (view !== 'dashboard') window.history.pushState({ view }, ''); }, [view]);

  const forceToDashboard = () => setView('dashboard');
  
  const handleLogin = async (name: string, otp: string, url: string) => {
    setIsLoading(true); setError(null); setApiUrl(url); localStorage.setItem('gas_api_url', url); 
    setIsSyncing(true);

    try {
      const response = await authenticateEmployee(url, name, otp);
      if (response.success) {
        const userData: User = { 
          name, 
          isAdmin: response.isAdmin || false, 
          canAssess: response.canAssess || false, 
          jobTitle: response.userDetails?.jobTitle || "", 
          jobGrade: response.userDetails?.jobGrade || "", 
          yearsOfService: response.userDetails?.yearsOfService || "", 
          kpi: response.userDetails?.kpi || "", 
          joinDate: response.userDetails?.joinDate || "", 
          canEditSchedule: response.userDetails?.canEditSchedule || false,
          annualLeave: response.userDetails?.annualLeave || "0",
          annualLeaveUsed: response.userDetails?.annualLeaveUsed || "0",
          assignedStation: response.userDetails?.assignedStation || "",
          allowRemote: response.userDetails?.allowRemote || false
        };
        
        const qs = response.questions && response.questions.length > 0 ? response.questions : ["..."];
        setUser(userData); setQuestions(qs);
        const now = Date.now(); const expiryTime = now + (15 * 24 * 60 * 60 * 1000);
        localStorage.setItem('app_session', JSON.stringify({ user: userData, questions: qs, expiry: expiryTime, loginTime: now }));
        window.history.pushState({ view: 'dashboard' }, ''); 
        setView('dashboard');
      } else { setError(response.message); }
    } catch (e) { setError("發生錯誤，請稍後再試。"); } finally { 
        setIsLoading(false); 
        setIsSyncing(false); 
    }
  };

  const handleLogout = () => { setUser(null); setError(null); setView('dashboard'); localStorage.removeItem('app_session'); window.history.replaceState(null, ''); };
  const handleAssessmentSuccess = () => { if (user) { const updatedUser = { ...user, canAssess: false }; setUser(updatedUser); const savedSession = localStorage.getItem('app_session'); if (savedSession) { try { const sessionData = JSON.parse(savedSession); sessionData.user = updatedUser; localStorage.setItem('app_session', JSON.stringify(sessionData)); } catch(e) {} } } forceToDashboard(); };
  const requestLogout = () => { showConfirm("確定要登出系統嗎？", () => { handleLogout(); }); };

  const renderContent = () => {
    if (!user) return <LoginForm onLogin={handleLogin} isLoading={isLoading} errorMessage={error} onAlert={showAlert} />;
    if (user.isAdmin) return <AdminDashboard user={user} apiUrl={apiUrl} onLogout={requestLogout} onAlert={showAlert} onConfirm={showConfirm} />;
    
    switch (view) {
      case 'form': return <AssessmentForm user={user} onBack={forceToDashboard} onSuccess={handleAssessmentSuccess} questions={questions} apiUrl={apiUrl} />;
      case 'history': return <HistoryView user={user} apiUrl={apiUrl} onBack={forceToDashboard} />;
      case 'profile': return <ProfileView user={user} apiUrl={apiUrl} onBack={forceToDashboard} onRefresh={handleManualRefresh} />;
      case 'schedule': return <ScheduleView user={user} apiUrl={apiUrl} onBack={forceToDashboard} />;
      case 'full-schedule': return <FullScheduleView apiUrl={apiUrl} onBack={forceToDashboard} canEdit={user.canEditSchedule} onAlert={showAlert} />;
      case 'report-deficiency': return <DeficiencyReportForm user={user} apiUrl={apiUrl} onBack={forceToDashboard} onAlert={showAlert} />;
      case 'dashboard': default: return (
        <AssessmentPlaceholder 
            user={user} 
            onLogout={requestLogout} 
            onStartAssessment={() => setView('form')} 
            onViewHistory={() => setView('history')} 
            onViewProfile={() => setView('profile')} 
            onViewSchedule={() => setView('schedule')} 
            onViewFullSchedule={() => setView('full-schedule')} 
            onReportDeficiency={() => setView('report-deficiency')}
        />
      );
    }
  };

  return (
    <div className={`min-h-screen flex justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-gray-100 to-gray-200 relative ${user ? 'items-start pt-10 md:pt-14' : 'items-center'}`}>
      <div className="w-full flex justify-center">{renderContent()}</div>
      {user && !user.isAdmin && (<div className="fixed bottom-2 left-2 bg-black/80 text-green-400 p-2 rounded-lg text-[10px] font-mono z-50 shadow-lg pointer-events-none border border-green-800 opacity-80">{debugInfo}</div>)}
      {isSyncing && user && !user.isAdmin && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-orange-100/95 border border-orange-200 text-orange-700 px-4 py-2 rounded-full shadow-xl flex items-center gap-2 animate-pulse pointer-events-none backdrop-blur-sm whitespace-nowrap transition-opacity duration-500">
           <Cloud size={16} />
           <span className="text-xs font-bold">同步資料中...</span>
        </div>
      )}
      <ModalDialog isOpen={modalConfig.isOpen} type={modalConfig.type} message={modalConfig.message} onConfirm={modalConfig.onConfirm} onCancel={modalConfig.onCancel} />
    </div>
  );
};

// 這裡會使用 import 進來的 ErrorBoundary
const AppWrapper = () => ( <ErrorBoundary><App /></ErrorBoundary> );
export default AppWrapper;