import React, { useState, useEffect, useRef } from 'react'; // ✅ 新增 useRef
import { LoginForm } from './components/LoginForm';
import { AssessmentPlaceholder } from './components/AssessmentPlaceholder';
import { AssessmentForm } from './components/AssessmentForm';
import { AdminDashboard } from './components/AdminDashboard'; 
import { HistoryView } from './components/HistoryView';
import { ProfileView } from './components/ProfileView';
import { ScheduleView } from './components/ScheduleView';
import { authenticateEmployee, checkLoginStatus } from './services/api'; 
import { User } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'form' | 'history' | 'profile' | 'schedule'>('dashboard');
  const [apiUrl, setApiUrl] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  
  // Debug 狀態
  const [debugInfo, setDebugInfo] = useState<string>("連線檢查中...");

  // ✅ 新增：用來判斷是否正在「返回」(避免無窮迴圈)
  const isPopping = useRef(false);

  // ✅ 1. 初始化檢查
  useEffect(() => {
    const initCheck = () => {
      const savedSession = localStorage.getItem('app_session');
      const savedApiUrl = localStorage.getItem('gas_api_url'); 
      
      if (savedApiUrl) setApiUrl(savedApiUrl);

      if (savedSession) {
        try {
          const sessionData = JSON.parse(savedSession);
          if (Date.now() < sessionData.expiry) {
            console.log('🔄 Session 有效，自動還原登入狀態');
            setUser(sessionData.user);
            if (sessionData.questions && sessionData.questions.length > 0) {
                setQuestions(sessionData.questions);
            }
          } else {
            console.log('⚠️ Session 已過期');
            localStorage.removeItem('app_session'); 
          }
        } catch (e) {
          localStorage.removeItem('app_session');
        }
      }
    };
    initCheck();

    // 🌟 初始化 History (讓第一頁變成 Dashboard)
    window.history.replaceState({ view: 'dashboard' }, '');
  }, []);

  // ✅ 2. 處理瀏覽器返回 (手勢返回)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
        isPopping.current = true; // 標記為正在返回，避免 useEffect 重複 push
        if (event.state && event.state.view) {
            setView(event.state.view);
        } else {
            // 如果沒有 state (例如退無可退)，預設回 Dashboard
            setView('dashboard');
        }
        // 重置標記
        setTimeout(() => { isPopping.current = false; }, 50);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ✅ 3. 當 View 改變時，推入 History (除了 dashboard)
  useEffect(() => {
    if (isPopping.current) return; // 如果是手勢返回觸發的，不要再 push

    if (view !== 'dashboard') {
        // 進入子頁面 -> 告訴瀏覽器這是一頁 (啟用手勢返回)
        window.history.pushState({ view }, '', `#${view}`);
    } 
    // 注意：回到 Dashboard 不 push，而是讓 onBack 觸發 history.back()
  }, [view]);

  // ✅ 4. 統一的返回邏輯 (給子頁面按鈕用)
  const handleBackToDashboard = () => {
    // 如果瀏覽器歷史紀錄顯示我們在子頁面，就用瀏覽器的 Back (這樣手勢跟按鈕才同步)
    if (window.history.state && window.history.state.view !== 'dashboard') {
        window.history.back();
    } else {
        setView('dashboard');
    }
  };

  // 5. 狀態檢查 (Heartbeat) - 右上角
  useEffect(() => {
    if (!user || !apiUrl || user.isAdmin) return;

    const checkStatus = () => {
        const savedSession = localStorage.getItem('app_session');
        if (savedSession) {
            try {
                const sessionData = JSON.parse(savedSession);
                const loginTime = sessionData.loginTime || 0;
                
                checkLoginStatus(apiUrl, user.name, loginTime)
                    .then((res: any) => {
                        const apiStatus = res.success ? "✅ 連線正常" : "❌ 連線失敗";
                        
                        if (res.success && res.kicked) {
                            setDebugInfo(`${apiStatus}\n🔴 狀態: 已被踢出`);
                            alert("⚠️ 您的帳號已被管理員強制登出，請重新驗證。");
                            handleLogout();
                        } else {
                            if (!res.success && res.message && res.message.includes("Unknown")) {
                                 setDebugInfo(`❌ GAS版本過舊\n(請重新發布)`);
                            } else {
                                 setDebugInfo(`${apiStatus}\n🟢 狀態: 線上`);
                            }
                        }
                    })
                    .catch(err => {
                        setDebugInfo(`❌ 連線錯誤`);
                    });
            } catch (e) {
                setDebugInfo("❌ 資料讀取錯誤");
            }
        } else {
             setDebugInfo("⚠️ 無登入資料");
        }
    };

    checkStatus();
    const timer = setInterval(checkStatus, 5000);
    return () => clearInterval(timer);
  }, [user, apiUrl]);

  const handleLogin = async (name: string, otp: string, url: string) => {
    setIsLoading(true);
    setError(null);
    setApiUrl(url);
    localStorage.setItem('gas_api_url', url); 

    try {
      const response = await authenticateEmployee(url, name, otp);
      
      if (response.success) {
        const userData: User = { 
          name, 
          isAdmin: response.isAdmin || false,
          canAssess: response.canAssess || false, 
          jobTitle: response.userDetails?.jobTitle,
          jobGrade: response.userDetails?.jobGrade,
          yearsOfService: response.userDetails?.yearsOfService,
          kpi: response.userDetails?.kpi, 
          joinDate: response.userDetails?.joinDate
        };

        const loadedQuestions = response.questions && response.questions.length > 0 
            ? response.questions 
            : [
                "過去一季中，請列出你在專案或工作職責上的兩項主要成就與其帶來的具體數據影響。",
                "請描述你在最近一個團隊合作專案中，如何有效地解決了一次嚴重的意見衝突或技術障礙。",
                "根據你的職等和職涯規劃，未來六個月內你希望學習或精進哪一項專業技能？"
              ];

        setUser(userData);
        setQuestions(loadedQuestions);
        
        const now = Date.now();
        const expiryTime = now + (15 * 24 * 60 * 60 * 1000);
        localStorage.setItem('app_session', JSON.stringify({
          user: userData,
          questions: loadedQuestions,
          expiry: expiryTime,
          loginTime: now 
        }));
        
        // 登入成功時，確保 History 乾淨
        window.history.replaceState({ view: 'dashboard' }, '');
        setView('dashboard');
      } else {
        setError(response.message);
      }
    } catch (e) {
      setError("發生未預期的錯誤，請稍後再試。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    // 登出確認
    if (window.confirm("確定要登出系統嗎？")) {
        setUser(null);
        setError(null);
        setView('dashboard');
        localStorage.removeItem('app_session'); 
        // 登出後重置網址
        window.history.replaceState(null, '', ' ');
    }
  };

  const handleAssessmentSuccess = () => {
    if (user) {
      const updatedUser = { ...user, canAssess: false };
      setUser(updatedUser);
      
      const savedSession = localStorage.getItem('app_session');
      if (savedSession) {
         try {
             const sessionData = JSON.parse(savedSession);
             sessionData.user = updatedUser;
             localStorage.setItem('app_session', JSON.stringify(sessionData));
         } catch(e) {
             console.error("更新 Session 失敗");
         }
      }
    }
    // 成功後返回 Dashboard
    handleBackToDashboard();
  };

  const renderContent = () => {
    if (!user) {
      return (
        <LoginForm 
          onLogin={handleLogin} 
          isLoading={isLoading} 
          errorMessage={error} 
        />
      );
    }

    if (user.isAdmin) {
      return (
        <AdminDashboard 
          user={user} 
          apiUrl={apiUrl} 
          onLogout={handleLogout} 
        />
      );
    }

    switch (view) {
      case 'form':
        return (
          <AssessmentForm 
            user={user}
            onBack={handleBackToDashboard} // ✅ 改用新的返回函式
            onSuccess={handleAssessmentSuccess}
            questions={questions}
            apiUrl={apiUrl}
          />
        );
      case 'history':
        return (
          <HistoryView 
            user={user}
            apiUrl={apiUrl}
            onBack={handleBackToDashboard} // ✅ 改用新的返回函式
          />
        );
      case 'profile':
        return (
          <ProfileView 
            user={user}
            apiUrl={apiUrl}
            onBack={handleBackToDashboard} // ✅ 改用新的返回函式
          />
        );
      case 'schedule':
        return (
          <ScheduleView 
            user={user}
            apiUrl={apiUrl}
            onBack={handleBackToDashboard} // ✅ 改用新的返回函式
          />
        );
      case 'dashboard':
      default:
        return (
          <AssessmentPlaceholder 
            user={user} 
            onLogout={handleLogout} 
            onStartAssessment={() => setView('form')}
            onViewHistory={() => setView('history')}
            onViewProfile={() => setView('profile')} 
            onViewSchedule={() => setView('schedule')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-gray-100 to-gray-200">
      <div className="w-full flex justify-center">
        {renderContent()}
      </div>
      
      {/* 監控面板：右上角 */}
      {user && !user.isAdmin && (
          <div className="fixed top-20 right-2 bg-black/80 text-green-400 p-2 rounded-lg text-[10px] font-mono z-50 shadow-lg pointer-events-none whitespace-pre-wrap border border-green-800 opacity-80">
              {debugInfo}
          </div>
      )}
    </div>
  );
};

export default App;