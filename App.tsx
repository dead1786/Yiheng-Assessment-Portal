import React, { useState } from 'react';
import { LoginForm } from './components/LoginForm';
import { AssessmentPlaceholder } from './components/AssessmentPlaceholder';
import { AssessmentForm } from './components/AssessmentForm';
import { AdminDashboard } from './components/AdminDashboard';
import { HistoryView } from './components/HistoryView';
import { authenticateEmployee } from './services/api';
import { User } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'form' | 'history'>('dashboard');
  const [apiUrl, setApiUrl] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);

  const handleLogin = async (name: string, otp: string, url: string) => {
    setIsLoading(true);
    setError(null);
    setApiUrl(url);

    try {
      const response = await authenticateEmployee(url, name, otp);
      
      if (response.success) {
        setUser({ 
          name, 
          isAdmin: response.isAdmin || false,
          // 儲存詳細資訊
          jobTitle: response.userDetails?.jobTitle,
          jobGrade: response.userDetails?.jobGrade,
          yearsOfService: response.userDetails?.yearsOfService
        });
        
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
      case 'dashboard':
      default:
        return (
          <AssessmentPlaceholder 
            user={user} 
            onLogout={handleLogout} 
            onStartAssessment={() => setView('form')}
            onViewHistory={() => setView('history')}
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