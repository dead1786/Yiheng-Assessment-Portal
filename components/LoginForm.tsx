import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onLogin: (name: string, otp: string, apiUrl: string) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
  // ✅ 新增：接收彈窗函式
  onAlert: (msg: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin, isLoading, errorMessage, onAlert }) => {
  const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbwKSb_3jdRoay06C-iAvpqQoicrI4PmfKLDaUqxg8m6YwNDpZexAy4Bwcv1cZyy2Okd/exec";
  
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [apiUrl] = useState(() => localStorage.getItem('gas_api_url') || DEFAULT_API_URL);
  const [showPassword, setShowPassword] = useState(false);
  const [isSendingLine, setIsSendingLine] = useState(false);
  
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const savedTargetTime = localStorage.getItem('otp_cooldown_target');
    if (savedTargetTime) {
      const targetTime = parseInt(savedTargetTime, 10);
      const now = Date.now();
      if (targetTime > now) {
        const remainingSeconds = Math.ceil((targetTime - now) / 1000);
        setCountdown(remainingSeconds);
      } else {
        localStorage.removeItem('otp_cooldown_target');
      }
    }
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      localStorage.removeItem('otp_cooldown_target');
    }
  }, [countdown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(name, otp, apiUrl);
  };

  const handleLineOtp = async () => {
    if (!name.trim()) {
      // ✅ 改用自訂彈窗
      onAlert("請先輸入您的姓名，系統才能找到您的 LINE ID。");
      return;
    }
    
    setIsSendingLine(true);
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'sendLineOtp', name: name })
      });
      
      const result = await response.json();
      // ✅ 改用自訂彈窗
      onAlert(result.message); 
      
      if (result.success) {
        const cooldownSeconds = 60; 
        setCountdown(cooldownSeconds);
        const targetTime = Date.now() + (cooldownSeconds * 1000);
        localStorage.setItem('otp_cooldown_target', targetTime.toString());
      }
      
    } catch (e) {
      onAlert("連線錯誤，無法發送 LINE 請求。");
    } finally {
      setIsSendingLine(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-100 relative z-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">員工登入</h2>
        </div>

        {errorMessage && (
          <div className="mb-6 flex items-start p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">
            <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              姓名 (Name)
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              placeholder="請輸入您的姓名"
            />
          </div>

          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
              密碼 / OTP
            </label>
            <div className="relative">
              <input
                id="otp"
                type={showPassword ? "text" : "password"}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                autoComplete="off"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-mono tracking-widest pr-12"
                placeholder="••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            <div className="flex justify-end mt-2">
              <button 
                type="button"
                onClick={handleLineOtp}
                disabled={isSendingLine || countdown > 0} 
                className={`text-xs font-bold flex items-center gap-1 transition-colors ${
                    (isSendingLine || countdown > 0)
                      ? "text-gray-400 cursor-not-allowed" 
                      : "text-[#06C755] hover:text-[#05b34c]"
                }`}
              >
                {isSendingLine ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    發送中...
                  </>
                ) : countdown > 0 ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    請稍後 ({formatTime(countdown)}) 再試
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M12 2C6.48 2 2 5.56 2 10.12c0 2.42 1.25 4.58 3.28 6.08-.14.52-.5 1.9-.57 2.22-.06.29.13.56.4.31.22-.2 2.37-2.06 2.53-2.21.03-.03.07-.05.1-.07.41.08.84.13 1.26.13 5.52 0 10-3.56 10-8.12S17.52 2 12 2z"/>
                    </svg>
                    獲取 LINE 驗證碼
                  </>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !apiUrl}
            className={`w-full py-3 px-4 rounded-lg text-white font-medium flex items-center justify-center transition-all shadow-md hover:shadow-lg
              ${isLoading || !apiUrl 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
              }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                驗證中...
              </>
            ) : (
              '確認登入'
            )}
          </button>
        </form>
      </div>
      
      {/* 🗑️ 已移除右下角圖片 */}
    </>
  );
}