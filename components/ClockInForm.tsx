import React, { useState, useEffect } from 'react';
import { User, Shift } from '../types'; 
import { submitClockIn, fetchClockInStatus, fetchShiftSchedule } from '../services/api'; 
import { ArrowLeft, MapPin, Clock, Loader2, CheckCircle, Navigation, ShieldCheck, Globe, ChevronDown, History, AlertTriangle, Info, LogIn, LogOut } from 'lucide-react';

interface ClockInFormProps {
  user: User;
  apiUrl: string;
  onBack: () => void;
  onAlert: (msg: string) => void;
}

export const ClockInForm: React.FC<ClockInFormProps> = ({ user, apiUrl, onBack, onAlert }) => {
  const [station, setStation] = useState('');
  const [stations, setStations] = useState<string[]>([]);
  const [loadingStations, setLoadingStations] = useState(true);

  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; msg: string } | null>(null);

  // 狀態與班別資訊
  const [lastStatus, setLastStatus] = useState<{ time: string; station: string; status: string } | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [currentShiftType, setCurrentShiftType] = useState<string>("一般"); 
  const [yesterdayShiftType, setYesterdayShiftType] = useState<string>(""); 
  const [checkingStatus, setCheckingStatus] = useState(true);

  // 二次確認彈窗狀態 (新增 actionType 紀錄是用哪個按鈕觸發的)
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; desc: string; type: 'warning' | 'info'; actionType: 'clock-in' | 'clock-out' } | null>(null);

  // 1. 初始化資料
  useEffect(() => {
    const initData = async () => {
        // A. 處理站點
        const assignedStr = user.assignedStation || ""; 
        const allowedStations = assignedStr.split(/[,，]/).map((s: string) => s.trim()).filter((s: string) => s);
        if (allowedStations.length > 0) {
            setStations(allowedStations);
            setStation(allowedStations[0]); 
        } else {
            setStations([]); 
            setStation("");
        }
        setLoadingStations(false);

        // B. 優先讀取班表快取
        const cachedSchedule = localStorage.getItem(`shift_cache_${user.name}`);
        if (cachedSchedule) {
            try {
                const shifts = JSON.parse(cachedSchedule);
                processShiftData(shifts);
                setCheckingStatus(false);
            } catch(e) {}
        }

        // C. 背景更新
        try {
            const [statusRes, scheduleRes] = await Promise.all([
                fetchClockInStatus(apiUrl, user.name),
                fetchShiftSchedule<Shift>(apiUrl, user.name)
            ]);

            if (statusRes.success) {
                setTodayCount(statusRes.todayCount);
                setLastStatus(statusRes.lastRecord || null);
            }

            if (scheduleRes.success && scheduleRes.shifts.length > 0) {
                localStorage.setItem(`shift_cache_${user.name}`, JSON.stringify(scheduleRes.shifts));
                processShiftData(scheduleRes.shifts);
            }
        } catch (e) {
            console.error("狀態載入失敗", e);
        } finally {
            setCheckingStatus(false);
        }
    };

    initData();
  }, [user, apiUrl]);

  const processShiftData = (shifts: Shift[]) => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const todayStr = today.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/');
      const yesterdayStr = yesterday.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/');

      const todayShift = shifts.find(s => s.date === todayStr);
      const prevShift = shifts.find(s => s.date === yesterdayStr);
      
      if (todayShift) setCurrentShiftType(todayShift.type || "一般");
      if (prevShift) setYesterdayShiftType(prevShift.type || "");
  };

  const handleGetLocation = () => {
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setIsGettingLocation(false);
      },
      () => {
        onAlert("無法獲取 GPS 座標，請檢查授權。");
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  useEffect(() => { handleGetLocation(); }, []);

  // ✅ 核心邏輯修改：根據按鈕類型 (In/Out) 進行不同的檢查
  const checkConstraints = (type: 'clock-in' | 'clock-out') => {
      if (!location) return { pass: false, msg: "等待 GPS 定位中..." };
      if (!station && !user.allowRemote) return { pass: false, msg: "請選擇站點" };
      
      const now = new Date();
      const currentHour = now.getHours();
      const hasClockedIn = todayCount > 0;

      // 1. 上班打卡檢查 (主要檢查重複)
      if (type === 'clock-in') {
          if (hasClockedIn) {
              return { 
                  pass: true, // 仍允許打卡，但需確認
                  warning: { 
                      type: 'info', 
                      title: '今日已簽到', 
                      msg: '系統偵測到您今日已有打卡紀錄，確定要再次「上班打卡」嗎？' 
                  } 
              };
          }
          // 大夜班上班提醒
          if (currentShiftType.includes("大夜") && currentHour >= 18) {
               // 這是正常時段，直接通過
               return { pass: true };
          }
      }

      // 2. 下班打卡檢查 (主要檢查早退)
      if (type === 'clock-out') {
          // A. 大夜班跨日檢查
          if (yesterdayShiftType.includes("大夜") && currentHour < 13) {
              if (currentHour < 9) {
                  return { 
                      pass: true, 
                      warning: { type: 'warning', title: '尚未到下班時間', msg: '大夜班下班時間為 09:00，現在打卡將視為早退。' } 
                  };
              }
              // 09:00~13:00 正常下班，無警告
              return { pass: true };
          }

          // B. 小夜班檢查
          if (currentShiftType.includes("小夜")) {
              if (currentHour < 21) {
                  return { 
                      pass: true, 
                      warning: { type: 'warning', title: '尚未到下班時間', msg: '小夜班下班時間為 21:00，現在打卡將視為早退。' } 
                  };
              }
              return { pass: true };
          }

          // C. 正常班/假日班檢查
          if (!currentShiftType.includes("夜")) {
              if (currentHour < 18) {
                  return { 
                      pass: true, 
                      warning: { type: 'warning', title: '尚未到下班時間', msg: '正常班下班時間為 18:00，現在打卡將視為早退。' } 
                  };
              }
              return { pass: true };
          }
      }

      return { pass: true };
  };

  // 按下按鈕的攔截處理
  const handlePreSubmit = (type: 'clock-in' | 'clock-out') => {
      const check = checkConstraints(type);
      
      if (!check.pass) {
          onAlert(check.msg || "無法打卡");
          return;
      }

      // 如果有警告，跳出確認窗
      if (check.warning) {
          setConfirmModal({
              show: true,
              title: check.warning.title,
              desc: check.warning.msg,
              type: check.warning.type as 'warning' | 'info',
              actionType: type
          });
          return;
      }

      // 沒問題則直接送出
      executeSubmit(type);
  };

  // 真正的送出邏輯
  const executeSubmit = async (type: 'clock-in' | 'clock-out') => {
    setConfirmModal(null);
    setIsSubmitting(true);
    
    // 這裡我們不改後端，但前端可以利用 note 或單純分開按鈕來優化體驗
    // 後端只接收 lat/lng/station，這裡維持原樣發送
    const res = await submitClockIn(apiUrl, {
      name: user.name,
      station: station || "遠端打卡", 
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy,
      // 雖然是 auto，但我們透過按鈕分流了前端的檢查邏輯
      type: 'auto' 
    });

    if (res.success) {
      const actionText = type === 'clock-in' ? '上班' : '下班';
      setResult({ success: true, msg: `${actionText}打卡成功！` }); // 前端自己顯示成功訊息
      localStorage.removeItem(`shift_cache_${user.name}`);
      setTimeout(onBack, 3000);
    } else {
      onAlert(res.message);
      setIsSubmitting(false);
    }
  };

  // 資訊方塊顯示內容 (不控制按鈕，只顯示資訊)
  const renderInfoBox = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // 根據時間給予一個當下的狀態描述，但不影響按鈕功能
      let infoText = "請選擇對應按鈕進行打卡";
      let infoColor = "text-gray-600";
      
      if (currentShiftType.includes("大夜") && currentHour >= 18) {
          infoText = "目前時段：大夜班上班中";
          infoColor = "text-purple-600";
      } else if (!currentShiftType.includes("夜") && currentHour >= 18) {
          infoText = "目前時段：正常班下班";
          infoColor = "text-green-600";
      } else if (todayCount > 0) {
          infoText = `今日已打卡 ${todayCount} 次`;
          infoColor = "text-blue-600";
      }

      return (
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-center mb-4">
            <Info size={16} className={`mr-2 ${infoColor}`} />
            <span className={`text-xs font-bold ${infoColor}`}>{infoText}</span>
        </div>
      );
  };

  return (
    <div className="w-full max-w-md p-4 animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden relative">
        
        {/* 上次打卡資訊列 */}
        {!checkingStatus && lastStatus && (
            <div className="absolute top-0 left-0 w-full bg-indigo-50 px-4 py-2 flex justify-between items-center z-10 text-[10px] text-indigo-800 font-medium border-b border-indigo-100">
                <span className="flex items-center gap-1"><History size={12}/> 上次：{lastStatus.time} ({lastStatus.status})</span>
                <span>{lastStatus.station}</span>
            </div>
        )}

        <div className="bg-blue-600 p-8 pt-12 text-white relative">
          <button onClick={onBack} className="absolute top-8 left-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="mt-2 flex flex-col items-center">
            <div className="bg-white/20 p-4 rounded-2xl mb-4 backdrop-blur-md">
                <Clock size={40} className="animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold">勤務打卡</h2>
            <div className="text-blue-100 text-sm mt-1 flex flex-col items-center">
                <span>📅 今日班別：{currentShiftType}</span>
                {yesterdayShiftType.includes("大夜") && <span className="text-xs text-yellow-300">(延續昨日大夜班)</span>}
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          
          {renderInfoBox()}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-400 uppercase">目前站點</label>
            <div className="relative">
              {stations.length > 0 ? (
                  <select 
                    value={station} 
                    onChange={(e) => setStation(e.target.value)}
                    className="w-full appearance-none p-4 pl-10 bg-gray-50 rounded-xl border border-gray-200 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                      {stations.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
              ) : (
                  <div className="w-full p-4 pl-10 bg-gray-50 rounded-xl border border-gray-200 text-gray-400 font-bold text-sm">
                      {user.allowRemote ? "遠端打卡模式" : "無授權站點 (請聯繫管理員)"}
                  </div>
              )}
              
              <ShieldCheck size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
              {stations.length > 0 && (
                  <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              )}
            </div>
          </div>

          <div className={`p-5 rounded-2xl border transition-all ${location ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Navigation size={18} className={location ? 'text-green-600' : 'text-orange-500 animate-bounce'} />
                <span className={`text-sm font-bold ${location ? 'text-green-700' : 'text-orange-700'}`}>
                  {isGettingLocation ? '正在鎖定衛星...' : location ? 'GPS 訊號良好' : '搜尋訊號中'}
                </span>
              </div>
              <button onClick={handleGetLocation} className="text-xs text-blue-600 font-bold px-2 py-1 bg-white rounded-lg shadow-sm border border-blue-50">重試</button>
            </div>
            
            {location ? (
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                    <span>LAT: {location.lat.toFixed(6)}</span>
                    <span>LNG: {location.lng.toFixed(6)}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${Math.max(10, 100 - location.accuracy)}%` }} />
                </div>
                <p className="text-[10px] text-center text-gray-500">精準度誤差約 {Math.round(location.accuracy)} 公尺</p>
              </div>
            ) : (
              <div className="py-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-400" /></div>
            )}
          </div>

          {user.allowRemote && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-xl border border-purple-100 text-purple-700">
                <Globe size={16} />
                <span className="text-xs font-bold">已開啟遠端打卡權限</span>
            </div>
          )}

          {/* ✅ 雙按鈕設計 */}
          {result ? (
              <div className="w-full py-5 rounded-2xl bg-green-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg">
                  <CheckCircle size={24} /> {result.msg}
              </div>
          ) : (
              <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handlePreSubmit('clock-in')}
                    disabled={isSubmitting || !location || (!station && !user.allowRemote)}
                    className="w-full py-5 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:bg-gray-300 disabled:shadow-none"
                  >
                     {isSubmitting ? <Loader2 className="animate-spin mb-1"/> : <LogIn size={24} className="mb-1" />}
                     上班打卡
                  </button>

                  <button
                    onClick={() => handlePreSubmit('clock-out')}
                    disabled={isSubmitting || !location || (!station && !user.allowRemote)}
                    className="w-full py-5 rounded-2xl font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-200 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:bg-gray-300 disabled:shadow-none"
                  >
                     {isSubmitting ? <Loader2 className="animate-spin mb-1"/> : <LogOut size={24} className="mb-1" />}
                     下班打卡
                  </button>
              </div>
          )}

          <p className="text-[10px] text-center text-gray-400 leading-relaxed mt-2">
            系統將自動比對您選擇的站點座標<br/>
            (允許誤差範圍：100m)
          </p>
        </div>
      </div>

      {/* ✅ 二次確認 Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className={`p-4 rounded-full ${confirmModal.type === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        {confirmModal.type === 'warning' ? <AlertTriangle size={40} /> : <Info size={40} />}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{confirmModal.title}</h3>
                    <p className="text-gray-600 text-base leading-relaxed whitespace-pre-wrap">{confirmModal.desc}</p>
                    
                    <div className="flex gap-3 w-full mt-4">
                        <button 
                            onClick={() => setConfirmModal(null)} 
                            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                        >
                            取消
                        </button>
                        <button 
                            onClick={() => executeSubmit(confirmModal.actionType)} 
                            className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg transition-colors ${
                                confirmModal.type === 'warning' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                            }`}
                        >
                            確認{confirmModal.actionType === 'clock-in' ? '上班' : '下班'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
