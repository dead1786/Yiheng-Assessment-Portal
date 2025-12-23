import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { ArrowLeft, Send, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { submitAssessment } from '../services/api';

interface AssessmentFormProps {
  user: User;
  onBack: () => void;
  onSuccess: () => void; // 新增這個屬性
  questions: string[];
  apiUrl: string;
}

export const AssessmentForm: React.FC<AssessmentFormProps> = ({ user, onBack, onSuccess, questions, apiUrl }) => {
  const [answers, setAnswers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);

  useEffect(() => {
    if (questions.length > 0) {
      setAnswers(prev => {
        if (prev.length === questions.length) return prev;
        const newArr = new Array(questions.length).fill('');
        prev.forEach((val, idx) => {
          if (idx < newArr.length) newArr[idx] = val;
        });
        return newArr;
      });
    }
  }, [questions]);

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[index] = value;
      return newAnswers;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    for (let i = 0; i < questions.length; i++) {
      const ans = answers[i];
      if (!ans || ans.trim() === "") {
        setStatusMessage({type: 'error', text: `⚠️ 第 ${i + 1} 題尚未回答，請填寫完整。`});
        return; 
      }
    }

    setIsSubmitting(true);
    setStatusMessage({type: 'info', text: '正在同步資料至 Google Sheets，請稍候...'});
    
    try {
      await new Promise(r => setTimeout(r, 500));
      
      const result = await submitAssessment(
        apiUrl, 
        user.name, 
        answers, 
        {
          jobTitle: user.jobTitle,
          jobGrade: user.jobGrade,
          yearsOfService: user.yearsOfService
        },
        questions
      );
      
      if (result.success) {
        setStatusMessage({type: 'success', text: '✅ 提交成功！系統已完成 AI 評分。即將返回...'});
        setTimeout(() => {
            onSuccess(); // 成功後呼叫 onSuccess，這會觸發 App.tsx 把權限關掉
        }, 2000);
      } else {
        setStatusMessage({type: 'error', text: `❌ 提交失敗：${result.message}`});
      }
    } catch (error) {
      setStatusMessage({type: 'error', text: `❌ 系統錯誤：${error instanceof Error ? error.message : "未知錯誤"}`});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl animate-in fade-in slide-in-from-right-8 duration-500 pb-12">
      <button 
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        返回儀表板
      </button>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-blue-600 p-6 text-white">
          <h2 className="text-2xl font-bold">員工自我績效考核</h2>
          <div className="flex flex-wrap gap-4 mt-2 text-blue-100 text-sm">
            <p>填表人：{user.name}</p>
            {user.jobTitle && <p>職稱：{user.jobTitle}</p>}
            {user.jobGrade && <p>職等：{user.jobGrade}</p>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {questions.map((question, index) => (
            <div key={index} className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <label className="block text-base font-bold text-gray-800 mb-3 leading-relaxed">
                {index + 1}. {question}
              </label>
              <textarea
                rows={5}
                value={answers[index] || ''}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white text-gray-700 leading-relaxed"
                placeholder="請在此輸入您的回答..."
              ></textarea>
            </div>
          ))}

          <div className="pt-4 flex flex-col items-center gap-4">
            {statusMessage && (
              <div className={`w-full p-4 rounded-lg flex items-start gap-3 border animate-in fade-in slide-in-from-bottom-2 ${
                statusMessage.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' :
                statusMessage.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
                'bg-blue-50 text-blue-800 border-blue-200'
              }`}>
                {statusMessage.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
                {statusMessage.type === 'error' && <XCircle className="w-5 h-5 flex-shrink-0" />}
                {statusMessage.type === 'info' && <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />}
                <p className="font-medium text-sm">{statusMessage.text}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg flex items-center justify-center shadow-lg transition-all
                ${isSubmitting 
                  ? 'bg-gray-400 cursor-not-allowed text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white'
                }`}
            >
              {isSubmitting ? (
                 <>
                   <Loader2 className="animate-spin mr-2" />
                   資料同步中...
                 </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  提交考核至系統
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};