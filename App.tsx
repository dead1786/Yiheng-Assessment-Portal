// 📂 請覆蓋 App.tsx
import React, { useState, useEffect } from 'react';
import { LoginForm } from './components/LoginForm';
import { AssessmentPlaceholder } from './components/AssessmentPlaceholder';
import { AssessmentForm } from './components/AssessmentForm';
// ✅ 修正點：這裡必須用 { } 因為 AdminDashboard 是具名匯出
import { AdminDashboard } from './components/AdminDashboard'; 
import { HistoryView } from './components/HistoryView';
import { ProfileView } from './components/ProfileView';
import { ScheduleView } from './components/ScheduleView';
import { authenticateEmployee } from './services/api';
import { User } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'form' | 'history' | 'profile' | 'schedule'>('dashboard');
  const [apiUrl, setApiUrl] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);

  // ✅ 新增：15天免登入邏輯 (App 啟動時執行)
  useEffect(() => {
    const checkSession = () => {
      const savedSession = localStorage.getItem('app_session');
      const savedApiUrl = localStorage.getItem('gas_api_url'); // 確保 URL 也被記住
      
      if (savedApiUrl) setApiUrl(savedApiUrl);

      if (savedSession) {
        try {
          const sessionData = JSON.parse(savedSession);
          // 檢查是否過期 (15天)
          if (Date.now() < sessionData.expiry) {
            setUser(sessionData.user);
            // 如果有題目緩存也可以讀取，這裡先簡化
            console.log('✅ 自動登入成功');
          } else {
            localStorage.removeItem('app_session'); // 過期清除
          }
        } catch (e) {
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
    localStorage.setItem('gas_api_url', url); // 記住 API URL

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

        setUser(userData);
        
        // ✅ 新增：寫入 Session (15天效期)
        const expiryTime = Date.now() + (15 * 24 * 60 * 60 * 1000);
        localStorage.setItem('app_session', JSON.stringify({
          user: userData,
          expiry: expiryTime
        }));
        
        if (response.questions && response.questions.length > 0) {
          setQuestions(response.questions);
        } else {
            setQuestions([
                "過去一季中，請列出你在專案或工作職責上的兩項主要成就與其帶來的具體數據影響。",
                "請描述你在最近一個團隊合作專案中，如何有效地解決了一次嚴重的意見衝突或技術障礙。",
                "根據你的職等和職涯規劃，未來六個月內你希望學習或精進哪一項專業技能？"
              ]);
        }

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
    localStorage.removeItem('app_session'); // ✅ 登出時清除 Session
  };

  const handleAssessmentSuccess = () => {
    if (user) {
      const updatedUser = { ...user, canAssess: false };
      setUser(updatedUser);
      // 更新 Session 裡的狀態
      const savedSession = localStorage.getItem('app_session');
      if (savedSession) {
         const sessionData = JSON.parse(savedSession);
         sessionData.user = updatedUser;
         localStorage.setItem('app_session', JSON.stringify(sessionData));
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