import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// ✅ 改為明確繼承 React.Component
export class ErrorBoundary extends React.Component<Props, State> {
  
  // ✅ 修正：移除 'override' 關鍵字，但保留宣告以解決 TS2339 找不到 props 的問題
  public props: Props;

  public state: State = {
    hasError: false,
    error: null
  };

  constructor(props: Props) {
    super(props);
    // 這裡手動指派是為了讓嚴格模式下的 TS 閉嘴，React 內部其實會自己處理
    this.props = props;
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">系統發生錯誤</h2>
            <p className="text-gray-500 mb-6 text-sm">
              很抱歉，程式執行時遇到了預期外的狀況。
              <br />
              <span className="text-xs text-red-400 mt-2 block bg-red-50 p-2 rounded break-all">
                {this.state.error?.message || "Unknown Error"}
              </span>
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('app_session'); 
                window.location.reload();
              }}
              className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition-colors flex items-center justify-center"
            >
              <RefreshCw size={18} className="mr-2" />
              清除暫存並重整
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}