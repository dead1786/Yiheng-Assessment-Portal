import React, { useState, useEffect, useRef } from 'react';
import { User, Shift } from '../types';
import { submitClockIn, fetchClockInStatus, fetchStationList, fetchShiftSchedule } from '../services/api';
import { MapPin, Clock, AlertCircle, CheckCircle2, Navigation, RefreshCw } from 'lucide-react';

interface ClockInFormProps {
  user: User;
  apiUrl: string;
}

// 定義站點介面
interface Station {
  name: string;
  lat: number;
  lng: number;
}

export const ClockInForm: React.FC<ClockInFormProps> = ({ user, apiUrl }) => {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // 站點相關狀態
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [targetLocation, setTargetLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [todayCount, setTodayCount] = useState(0);
  const [lastRecord, setLastRecord] = useState<any>(null);
  const [schedule, setSchedule] = useState<Shift | null>(null);

  const watchId = useRef<number | null>(null);

  // 1. 初始化：讀取站點、打卡紀錄、個人班表
  useEffect(() => {
    const initData = async () => {
      try {
        // A. 讀取站點列表 (含座標)
        const stationData = await fetchStationList(apiUrl);
        if (stationData.success && Array.isArray(stationData.stations)) {
          // 後端現在回傳 { name, lat, lng } 物件陣列
          const validStations = stationData.stations.map((s: any) => {
             // 相容性處理：如果後端還是回傳字串陣列 (舊版)，則給預設座標
             if (typeof s === 'string') return { name: s, lat: 25.07886, lng: 121.57916 };
             return s;
          });
          setStations(validStations);
          
          // 預設選取第一個，或使用者的指定站點
          if (validStations.length > 0) {
            // 優先選取使用者的指定站點
            const defaultStation = user.assignedStation 
              ? validStations.find(s => s.name === user.assignedStation) || validStations[0]
              : validStations[0];
            
            setSelectedStation(defaultStation.name);
            setTargetLocation({ lat: defaultStation.lat, lng: defaultStation.lng });
          }
        }

        // B. 讀取今日打卡次數
        const statusData = await fetchClockInStatus(apiUrl, user.name);
        if (statusData.success) {
          setTodayCount(statusData.todayCount);
          setLastRecord(statusData.lastRecord);
        }

        // C. 讀取今日班表 (判斷大夜班/日班)
        const scheduleData = await fetchShiftSchedule(apiUrl, user.name);
        if (scheduleData.success) {
           // 找今天的班
           const todayStr = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/');
           // 簡單比對日期字串
           const todayShift = scheduleData.shifts.find(s => {
               const d1 = new Date(s.date);
               const d2 = new Date();
               return d1.getFullYear() === d2.getFullYear() && 
                      d1.getMonth() === d2.getMonth() && 
                      d1.getDate() === d2.getDate();
           });
           setSchedule(todayShift || null);
        }

      } catch (error) {
        console.error("Init failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, [apiUrl, user.name, user.assignedStation]);

  // 2. 監聽 GPS 位置
  useEffect(() => {
    if ('geolocation' in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const newLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(newLoc);

          // 如果有目標站點座標，就即時計算距離
          if (targetLocation) {
            const d = haversineDistance(newLoc, targetLocation);
            setDistance(Math.round(d));
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          setMessage('無法獲取位置資訊，請確認 GPS 已開啟');
          setStatus('error');
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    } else {
      setMessage('您的瀏覽器不支援地理定位');
      setStatus('error');
    }

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [targetLocation]); // 當目標座標改變時 (切換站點)，距離會重算

  // 3. 切換站點處理
  const handleStationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStationName = e.target.value;
    setSelectedStation(newStationName);
    
    // 更新目標座標
    const target = stations.find(s => s.name === newStationName);
    if (target) {
      setTargetLocation({ lat: target.lat, lng: target.lng });
      // 立即重算距離
      if (location) {
        const d = haversineDistance(location, { lat: target.lat, lng: target.lng });
        setDistance(Math.round(d));
      }
    }
  };

  // 距離計算公式 (Haversine)
  const haversineDistance = (coords1: { lat: number; lng: number }, coords2: { lat: number; lng: number }) => {
    const R = 6371e3;
    const phi1 = (coords1.lat * Math.PI) / 180;
    const phi2 = (coords2.lat * Math.PI) / 180;
    const deltaPhi = ((coords2.lat - coords1.lat) * Math.PI) / 180;
    const deltaLambda = ((coords2.lng - coords1.lng) * Math.PI) / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handleClockIn = async (type: 'clock-in' | 'clock-out') => {
    if (!location) {
      setMessage('正在獲取位置，請稍候...');
      setStatus('error');
      return;
    }

    setIsClockingIn(true);
    setMessage('');
    setStatus('idle');

    try {
      const result = await submitClockIn(apiUrl, {
        name: user.name,
        lat: location.lat,
        lng: location.lng,
        type: type,
        station: selectedStation
      });

      if (result.success) {
        setStatus('success');
        setMessage(result.message);
        // 更新狀態
        const statusData = await fetchClockInStatus(apiUrl, user.name);
        if (statusData.success) {
          setTodayCount(statusData.todayCount);
          setLastRecord(statusData.lastRecord);
        }
      } else {
        setStatus('error');
        setMessage(result.message);
      }
    } catch (error) {
      setStatus('error');
      setMessage('打卡請求失敗，請檢查網路連線');
    } finally {
      setIsClockingIn(false);
    }
  };

  // 判斷按鈕文字與狀態
  const isNightShift = schedule?.type === 'night';
  const getButtonConfig = () => {
    // 預設邏輯
    let btn1 = { text: "上班打卡", action: () => handleClockIn('clock-in'), disabled: false };
    let btn2 = { text: "下班打卡", action: () => handleClockIn('clock-out'), disabled: true };

    if (todayCount === 0) {
      // 尚未打卡 -> 只能按上班
      btn2.disabled = true;
    } else if (todayCount % 2 === 1) {
      // 打過單數次 (已上班) -> 只能按下班
      btn1.disabled = true;
      btn2.disabled = false;
    } else {
      // 打過雙數次 (已下班) -> 視為新的一班或加班，看你要不要鎖
      // 這裡維持開放，讓他們可以再打下一班
      btn1.disabled = false;
      btn2.disabled = true;
    }

    // 大夜班特殊邏輯 (範例：如果現在是早上 06:00~12:00 且是大夜班，優先顯示下班)
    // 這裡先保持通用邏輯，避免過度複雜
    return { btn1, btn2 };
  };

  const { btn1, btn2 } = getButtonConfig();

  return (
    <div className="w-full max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 頂部資訊卡 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isNightShift ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isNightShift ? '大夜班打卡' : '日常打卡'}
              </h2>
              <p className="text-xs text-gray-500">
                {new Date().toLocaleDateString('zh-TW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="text-right">
             <div className="text-xs text-gray-400">今日打卡</div>
             <div className="text-2xl font-black text-gray-800 font-mono">{todayCount}</div>
          </div>
        </div>

        {/* 站點選擇與距離顯示 */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">選擇打卡站點</label>
            <div className="relative">
              <select 
                value={selectedStation}
                onChange={handleStationChange}
                disabled={isLoading}
                className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {stations.length === 0 && <option>載入中...</option>}
                {stations.map(s => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-gray-600">
              <Navigation className={`w-4 h-4 mr-1.5 ${location ? 'text-green-500' : 'text-gray-400 animate-pulse'}`} />
              {location ? 'GPS 定位已獲取' : '正在搜尋 GPS...'}
            </div>
            <div className={`font-mono font-bold ${
              distance === null ? 'text-gray-400' :
              distance <= 100 ? 'text-green-600' : 'text-red-500'
            }`}>
              {distance !== null ? `距離 ${distance}m` : '-- m'}
            </div>
          </div>
        </div>
      </div>

      {/* 狀態訊息 */}
      {message && (
        <div className={`p-4 rounded-xl flex items-start gap-3 text-sm ${
          status === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 
          status === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-gray-50 text-gray-600'
        }`}>
          {status === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="leading-5 pt-0.5">{message}</span>
        </div>
      )}

      {/* 打卡按鈕區 */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={btn1.action}
          disabled={btn1.disabled || isClockingIn || !location}
          className={`
            relative overflow-hidden p-4 rounded-xl font-bold text-lg transition-all duration-200 shadow-sm
            ${btn1.disabled 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-blue-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
            }
          `}
        >
          {isClockingIn ? <RefreshCw className="w-6 h-6 mx-auto animate-spin" /> : btn1.text}
        </button>

        <button
          onClick={btn2.action}
          disabled={btn2.disabled || isClockingIn || !location}
          className={`
             relative overflow-hidden p-4 rounded-xl font-bold text-lg transition-all duration-200 shadow-sm
             ${btn2.disabled 
               ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
               : 'bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50 active:scale-[0.98]'
             }
          `}
        >
          {isClockingIn ? <RefreshCw className="w-6 h-6 mx-auto animate-spin" /> : btn2.text}
        </button>
      </div>

      {/* 最後打卡紀錄 */}
      {lastRecord && (
        <div className="text-center">
           <p className="text-xs text-gray-400 mb-1">最後打卡紀錄</p>
           <p className="text-sm font-medium text-gray-600">
             {lastRecord.time} ({lastRecord.status}) @ {lastRecord.station}
           </p>
        </div>
      )}

    </div>
  );
};
