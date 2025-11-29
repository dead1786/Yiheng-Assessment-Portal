import React, { useState } from 'react';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onLogin: (name: string, otp: string, apiUrl: string) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin, isLoading, errorMessage }) => {
  // Hardcoded API URL as requested (Updated)
  const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbwbKWSXgJ2ZuaL4KIMI9oIbTBL3Z4GxjsY3HTbzRsXeVPyIwir5GNdVjJhHCRUDvIXC7A/exec";
  
  // 優先從 localStorage 讀取設定的網址，若無則使用預設值
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [apiUrl] = useState(() => localStorage.getItem('gas_api_url') || DEFAULT_API_URL);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(name, otp, apiUrl);
  };

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
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
              // Change to password type to hide characters and force English keyboard on mobile
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
  );
}