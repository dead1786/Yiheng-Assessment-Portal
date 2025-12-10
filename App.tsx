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

  // 1. 初始化檢查 (網頁剛開時)
  useEffect(() => {
    const initCheck = () => {
      const savedSession = localStorage.getItem('app_session');
      const savedApiUrl = localStorage.getItem('gas_api_url'); 
      
      if (savedApiUrl) setApiUrl(savedApiUrl);

      if (savedSession) {
        try {
          const sessionData = JSON.parse(savedSession);
          // 檢查是否過期 (15天)
          if (Date.now() < sessionData.expiry) {
            console.log('🔄 偵測到有效 Session，自動登入中...');
            setUser(sessionData.user);
            if (sessionData.questions && sessionData.questions.length > 0) {
                setQuestions(sessionData.questions);
            }
          } else {
            console.log('⚠️ Session 已過期，清除紀錄');
            localStorage.removeItem('app_session'); 
          }
        } catch (e) {
          localStorage.removeItem('app_session');
        }
      }
    };
    initCheck();
  }, []);

  // ✅ 2. 核心修正：每 5 秒檢查一次是否被踢出 (Heartbeat)
  useEffect(() => {
    // 如果沒登入或網址未設定，就不檢查
    if (!user || !apiUrl) return;
    
    // 如果是管理員，也不用檢查被踢狀態
    if (user.isAdmin) return;

    const timer = setInterval(() => {
        const savedSession = localStorage.getItem('app_session');
        if (savedSession) {
            try {
                const sessionData = JSON.parse(savedSession);
                const loginTime = sessionData.loginTime || 0;
                
                // 背景呼叫 API 確認狀態
                checkLoginStatus(apiUrl, user.name, loginTime)
                    .then(res => {
                        if (res.success && res.kicked) {
                            // 發現被踢，立刻登出
                            alert("⚠️ 您的帳號已被管理員強制登出，請重新驗證。");
                            handleLogout();
                        }
                    })
                    .catch(err => console.error("狀態檢查失敗(可能是網路問題)", err));
            } catch (e) {
                console.error("Session 讀取錯誤");
            }
        }
    }, 5000); // 每 5000 毫秒 (5秒) 檢查一次

    // 當元件卸載或 user 改變時，清除計時器
    return () => clearInterval(timer);
  }, [user, apiUrl]); // 依賴 user 和 apiUrl，有變動會重設計時器

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
    </div>
  );
};

export default App;