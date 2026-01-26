import React from 'react';
import { User } from '../types';
import { ArrowLeft, ExternalLink } from 'lucide-react';

interface ClockInFormProps {
  user: User;
  apiUrl: string;
  onBack: () => void;
  onAlert: (msg: string) => void;
}

export const ClockInForm: React.FC<ClockInFormProps> = ({ onBack }) => {
  // ⚠️ 請在此處填入新的打卡網站網址
  const NEW_CLOCKIN_URL = "https://yiheng.vercel.app/";

  return (
    <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button onClick={onBack} className="mb-6 flex items-center text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回
      </button>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
        <div className="bg-blue-50 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <ExternalLink className="w-10 h-10 text-blue-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">打卡功能已遷移</h2>
        <p className="text-gray-500 mb-8">
            為了提供更穩定的服務，打卡系統已搬遷至新平台。<br/>
            請點擊下方按鈕前往進行打卡。
        </p>

        <a 
            href={NEW_CLOCKIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center"
        >
            前往打卡網站 <ExternalLink className="w-4 h-4 ml-2" />
        </a>
      </div>
    </div>
  );
};
