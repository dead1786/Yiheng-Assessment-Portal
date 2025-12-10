import React, { useState, useEffect } from 'react';
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

  // 1. 初始化檢查
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
  }, []);

  // 2. 狀態檢查 (Heartbeat) - 極簡化顯示
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
                        // 簡化顯示：只顯示連線與狀態，不顯示時間
                        const apiStatus = res.success ? "✅ 連線正常" : "❌ 連線失敗";
                        
                        if (res.success && res.kicked) {
                            setDebugInfo(`${apiStatus}\n🔴 狀態: 已被踢出`);
                            alert("⚠️ 您的帳號已被管理員強制登出，請重新驗證。");
                            handleLogout();
                        } else {
                            // 若後端回傳 "Unknown Action" 代表 GAS 沒發布新版
                            if (!res.success && res.message && res.message.includes("Unknown")) {
                                 setDebugInfo(`❌ GAS版本過舊\n(請重新發布)`);
                            } else {
                                 setDebugInfo(`${apiStatus}\n🟢 API 狀態: 正常`);
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

    // 立即檢查一次
    checkStatus();

    // 每 5 秒檢查一次
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
    setUser(null);
    setError(null);
    setView('dashboard');
    localStorage.removeItem('app_session'); 
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
    setView('dashboard');
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
            onBack={() => setView('dashboard')}
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
            onBack={() => setView('dashboard')}
          />
        );
      case 'profile':
        return (
          <ProfileView 
            user={user}
            apiUrl={apiUrl}
            onBack={() => setView('dashboard')}
          />
        );
      case 'schedule':
        return (
          <ScheduleView 
            user={user}
            apiUrl={apiUrl}
            onBack={() => setView('dashboard')}
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
      
      {/* ✅ 監控面板：右上角，只顯示 API 連線與帳號狀態，無時間 */}
      {user && !user.isAdmin && (
          <div className="fixed top-20 right-2 bg-black/80 text-green-400 p-2 rounded-lg text-[10px] font-mono z-50 shadow-lg pointer-events-none whitespace-pre-wrap border border-green-800 opacity-80">
              {debugInfo}
          </div>
      )}
    </div>
  );
};

export default App;