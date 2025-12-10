import React, { useState, useEffect } from 'react';
import { LoginForm } from './components/LoginForm';
import { AssessmentPlaceholder } from './components/AssessmentPlaceholder';
import { AssessmentForm } from './components/AssessmentForm';
import { AdminDashboard } from './components/AdminDashboard'; 
import { HistoryView } from './components/HistoryView';
import { ProfileView } from './components/ProfileView';
import { ScheduleView } from './components/ScheduleView';
import { authenticateEmployee, checkLoginStatus } from './services/api'; // ✅ 引入 checkLoginStatus
import { User } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'form' | 'history' | 'profile' | 'schedule'>('dashboard');
  const [apiUrl, setApiUrl] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);

  useEffect(() => {
    const checkSession = async () => {
      const savedSession = localStorage.getItem('app_session');
      const savedApiUrl = localStorage.getItem('gas_api_url'); 
      
      if (savedApiUrl) setApiUrl(savedApiUrl);

      if (savedSession) {
        try {
          const sessionData = JSON.parse(savedSession);
          // 檢查是否過期 (15天)
          if (Date.now() < sessionData.expiry) {
            console.log('🔄 偵測到有效 Session，自動登入中...');
            
            // 先讓用戶進去 (UI 體驗流暢)
            setUser(sessionData.user);
            if (sessionData.questions && sessionData.questions.length > 0) {
                setQuestions(sessionData.questions);
            }

            // ✅ 背景檢查：是否被踢出 (如果有 API URL)
            if (savedApiUrl && sessionData.user && !sessionData.user.isAdmin) {
                const loginTime = sessionData.loginTime || 0; // 必須要有登入時間
                checkLoginStatus(savedApiUrl, sessionData.user.name, loginTime)
                    .then(result => {
                        if (result.success && result.kicked) {
                            console.warn("⚠️ 此帳號已被管理員強制登出");
                            alert("您的登入狀態已失效 (被強制登出)，請重新進行驗證。");
                            handleLogout();
                        }
                    });
            }

          } else {
            console.log('⚠️ Session 已過期，清除紀錄');
            localStorage.removeItem('app_session'); 
          }
        } catch (e) {
          console.error('Session 解析失敗', e);
          localStorage.removeItem('app_session');
        }
      }
    };
    checkSession();
  }, []);

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
        
        // ✅ 修正：存入 loginTime (當下時間)，用來跟後端的 "踢出時間" 比對
        const now = Date.now();
        const expiryTime = now + (15 * 24 * 60 * 60 * 1000);
        localStorage.setItem('app_session', JSON.stringify({
          user: userData,
          questions: loadedQuestions,
          expiry: expiryTime,
          loginTime: now // 關鍵欄位
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