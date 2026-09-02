import React, { useState, useEffect } from 'react';
import { User, Employee } from '../types';
import { submitDeficiencyReport, fetchEmployeeList, fetchStationList, fetchMaintenanceInfo } from '../services/api';
import { buildTicketUrl } from '../services/ticketLink';
import { ArrowLeft, Send, Loader2, ClipboardCheck, Upload, Image as ImageIcon, CheckCircle, AlertTriangle, ExternalLink, Calendar as CalendarIcon, X, Plus, ShieldCheck, ShieldAlert } from 'lucide-react';

interface DeficiencyReportFormProps {
  user: User;
  apiUrl: string;
  onBack: () => void;
  onAlert: (msg: string) => void;
}

// 圖片項目介面
interface PhotoItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'compressing' | 'ready' | 'uploading' | 'success' | 'error';
  compressedBase64?: string;
}

// 缺失內容項目定義（對應「缺失紀錄表」F~U 欄，8 組內容+筆數）
const DEFICIENCY_ITEMS = [
  { key: 'gnopClose', label: 'GNOP結案' },
  { key: 'vmAppearance', label: 'VM外觀' },
  { key: 'toolUsage', label: '工具使用' },
  { key: 'cargo', label: '車倉相關' },
  { key: 'siteDocs', label: '現場須立即填寫的文件' },
  { key: 'repairFlow', label: '現場維修流程' },
  { key: 'facility', label: '換電站的附屬設施檢查' },
  { key: 'environment', label: '換電站環境清潔' },
] as const;

// 分區選項
const ZONES = ['N1', 'N2', 'C1', 'C2', 'S1', 'S2'];

// 稽核類型選項（與試算表 E 欄現有值一致）
const AUDIT_TYPES = ['工單', '月保養', '半年保養', '年度保養'];

type DeficiencyKey = typeof DEFICIENCY_ITEMS[number]['key'];
type DeficiencyEntry = { text: string; score: string };

// 工單稽核僅顯示的項目
const TICKET_AUDIT_KEYS: DeficiencyKey[] = ['gnopClose', 'cargo', 'repairFlow'];

// 缺失項目定義說明
const DEFICIENCY_DEFINITIONS: { category: string; description: string }[] = [
  { category: 'GNOP結案', description: '離場照片、換料履歷填寫、結案備註內容、年保養/半年保養結案，備註欄內須有點檢表連結，已放寬標準於結案後24小時內點檢表須上傳到提供的連結位置 相關項目。' },
  { category: 'VM外觀', description: '設備外觀清潔、設備生鏽補漆、設備外觀破損更換、設備膠條檢查 相關項目。' },
  { category: '工具使用', description: '接地阻抗量測值照片、地組計使用、電表使用、扭力起子使用、後薄規使用。' },
  { category: '車倉相關', description: '車倉物料保管擺放方式、緊急應變器材、物料運送方式是否和合規。' },
  { category: '現場須立即填寫的文件', description: '保養點檢表備註的內容是否屬實、現場滅火器每月檢查紀錄卡填寫、中油或其他場內要求填寫簽到記錄。' },
  { category: '現場維修流程', description: '作業環境圍圍、安全穿戴、GNOP操作開始維或結案、斷電、離場確認。' },
  { category: '換電站的附屬設施檢查', description: '貼紙、照明、招牌、防撞桿、管材、線材檢查、開關箱、電錶箱、借電表箱 相關項目。' },
  { category: '換電站環境清潔', description: '開關箱內、交換站設施周圍、開關箱外觀、PFC外觀 相關項目。' },
];

const emptyDeficiencies = (): Record<DeficiencyKey, DeficiencyEntry> => {
  const obj = {} as Record<DeficiencyKey, DeficiencyEntry>;
  DEFICIENCY_ITEMS.forEach(item => { obj[item.key] = { text: '', score: '' }; });
  return obj;
};

export const DeficiencyReportFormV2: React.FC<DeficiencyReportFormProps> = ({ user, apiUrl, onBack, onAlert }) => {
  const [formData, setFormData] = useState({
    zone: '', station: '', date: new Date().toISOString().split('T')[0],
    auditType: '工單', ticketNo: ''
  });

  // 被稽核員工：可多位，送出後每位各寫一列；至少保留一個欄位
  const [targetNames, setTargetNames] = useState<string[]>(['']);
  const updateTargetName = (idx: number, value: string) =>
    setTargetNames(prev => prev.map((n, i) => (i === idx ? value : n)));
  const addTargetName = () => setTargetNames(prev => [...prev, '']);
  const removeTargetName = (idx: number) =>
    setTargetNames(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  // 是否有缺失：'' 未選 | '無缺失' | '有缺失'
  const [hasDeficiency, setHasDeficiency] = useState<'' | '無缺失' | '有缺失'>('');
  const [deficiencies, setDeficiencies] = useState<Record<DeficiencyKey, DeficiencyEntry>>(emptyDeficiencies);

  const [employees, setEmployees] = useState<Employee[]>(() => {
      try { return JSON.parse(localStorage.getItem('admin_employees') || '[]'); } catch { return []; }
  });
  const [stations, setStations] = useState<string[]>(() => {
      try { return JSON.parse(localStorage.getItem('cache_stations') || '[]'); } catch { return []; }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [progress, setProgress] = useState(0);

  // 月保養資訊 (預載全部，本地查詢)
  const [maintenanceMap, setMaintenanceMap] = useState<Record<string, { date: string; ticketId: string }>>({});
  const [maintenanceInfo, setMaintenanceInfo] = useState<{ date: string; ticketId: string } | null>(null);

  // 照片暫存佇列
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  // 放大預覽
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // 缺失定義說明彈窗
  const [showDefinitions, setShowDefinitions] = useState(false);

  useEffect(() => {
    // 一律背景重抓最新名單/站點（畫面先顯示 localStorage 快取，抓到後覆蓋），避免卡舊資料
    const fetchData = async () => {
        const empRes = await fetchEmployeeList(apiUrl);
        if (empRes.success) {
            setEmployees(empRes.employees);
            localStorage.setItem('admin_employees', JSON.stringify(empRes.employees));
        }
        const stationRes = await fetchStationList(apiUrl);
        if (stationRes.success) {
            setStations(stationRes.stations);
            localStorage.setItem('cache_stations', JSON.stringify(stationRes.stations));
        }
        const maintRes = await fetchMaintenanceInfo(apiUrl);
        if (maintRes.success && maintRes.records) {
            setMaintenanceMap(maintRes.records);
        }
    };
    fetchData();
  }, [apiUrl]);

  useEffect(() => {
    if (formData.station.trim() && Object.keys(maintenanceMap).length > 0) {
      const info = maintenanceMap[formData.station.trim()];
      setMaintenanceInfo(info && (info.date || info.ticketId) ? info : null);
    }
  }, [maintenanceMap]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'station') {
      const info = maintenanceMap[value.trim()];
      setMaintenanceInfo(info && (info.date || info.ticketId) ? info : null);
    }
    // 切換為工單稽核時，清除被隱藏項目已填的內容
    if (field === 'auditType' && value === '工單') {
      setDeficiencies(prev => {
        const next = { ...prev };
        DEFICIENCY_ITEMS.forEach(item => {
          if (!TICKET_AUDIT_KEYS.includes(item.key)) next[item.key] = { text: '', score: '' };
        });
        return next;
      });
    }
  };

  // 文字欄位按 Enter（手機鍵盤「前往/完成」）不可直接送出表單——
  // 否則站名只打到關鍵字就會被送出，產生「民生街」這種不完整的站名與照片資料夾
  const preventEnterSubmit = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter') return;
    const el = e.target as HTMLInputElement;
    if (el.tagName === 'INPUT' && el.type !== 'submit' && el.type !== 'button' && el.type !== 'file') {
      e.preventDefault();
    }
  };

  // 站名與站點清單的比對狀態：exact=清單內完整站名、partial=只是關鍵字（是某些站名的一部分）、none=清單未收錄
  const stationInput = formData.station.trim();
  const stationMatch = (() => {
    if (!stationInput || stations.length === 0) return { kind: 'empty' as const, candidates: [] as string[] };
    if (stations.includes(stationInput)) return { kind: 'exact' as const, candidates: [stationInput] };
    const candidates = stations.filter(s => s.includes(stationInput));
    return candidates.length > 0
      ? { kind: 'partial' as const, candidates }
      : { kind: 'none' as const, candidates: [] as string[] };
  })();

  // 依稽核類型決定顯示的缺失項目
  const visibleItems = formData.auditType === '工單'
    ? DEFICIENCY_ITEMS.filter(item => TICKET_AUDIT_KEYS.includes(item.key))
    : DEFICIENCY_ITEMS;

  const handleDeficiencyText = (key: DeficiencyKey, text: string) => {
    setDeficiencies(prev => ({
      ...prev,
      // 內容清空時，強制清除已選分數
      [key]: { text, score: text.trim() ? prev[key].score : '' }
    }));
  };

  const handleDeficiencyScore = (key: DeficiencyKey, score: string) => {
    setDeficiencies(prev => ({ ...prev, [key]: { ...prev[key], score } }));
  };

  // 選擇檔案後僅壓縮，送出時才上傳
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const newFiles = Array.from(e.target.files) as File[];

          const validFiles = newFiles.filter(f => f.size < 20 * 1024 * 1024);
          if (validFiles.length < newFiles.length) onAlert("部分檔案過大 (>20MB) 已被忽略");

          const newItems: PhotoItem[] = validFiles.map(file => ({
              id: Math.random().toString(36).substr(2, 9),
              file,
              previewUrl: URL.createObjectURL(file),
              status: 'compressing'
          }));

          setPhotos(prev => [...prev, ...newItems]);

          // 逐張壓縮（使用 Promise 確保完成）
          Promise.all(newItems.map(async (item) => {
              try {
                  const compressed = await compressImage(item.file);
                  setPhotos(cur => cur.map(p => p.id === item.id
                      ? { ...p, status: 'ready', compressedBase64: compressed }
                      : p
                  ));
              } catch {
                  setPhotos(cur => cur.map(p => p.id === item.id ? { ...p, status: 'error' } : p));
              }
          }));
      }
  };

  // 輔助函式：前端圖片壓縮 (轉 JPEG + Resize)
  const compressImage = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (e) => {
              const img = new Image();
              img.src = e.target?.result as string;
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  let width = img.width;
                  let height = img.height;

                  // 調整尺寸：最大邊長限制為 1280px
                  const MAX_WIDTH = 1280;
                  const MAX_HEIGHT = 1280;

                  if (width > height) {
                      if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                  } else {
                      if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                  }

                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                      ctx.drawImage(img, 0, 0, width, height);
                      // 壓縮為 JPEG 0.7
                      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                      resolve(dataUrl.split(',')[1]); // 只回傳 Base64 字串
                  } else {
                      reject(new Error("Canvas Error"));
                  }
              };
              img.onerror = () => reject(new Error("Image Load Error"));
          };
          reader.onerror = () => reject(new Error("File Read Error"));
      });
  };

  const removePhoto = (id: string) => {
      setPhotos(prev => {
          const target = prev.find(p => p.id === id);
          if (target) URL.revokeObjectURL(target.previewUrl);
          return prev.filter(p => p.id !== id);
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.zone) return onAlert("請選擇分區");

    // 員工檢查：每個欄位都要選、不可重複
    const names = targetNames.map(n => n.trim());
    const emptyIdx = names.findIndex(n => !n);
    if (emptyIdx >= 0) {
        return onAlert(names.length === 1 ? "請選擇員工" : `第 ${emptyIdx + 1} 位員工尚未選擇，請選擇或移除該欄位`);
    }
    const dupName = names.find((n, i) => names.indexOf(n) !== i);
    if (dupName) return onAlert(`員工「${dupName}」重複選取，請移除重複的欄位`);

    if (!stationInput) return onAlert("請輸入交換站名稱");

    // 站名只是關鍵字（清單中某些站名的一部分）→ 擋下，避免寫入不完整站名、建立多餘照片資料夾
    if (stationMatch.kind === 'partial') {
        if (stationMatch.candidates.length === 1) {
            const full = stationMatch.candidates[0];
            handleChange('station', full);
            return onAlert(`站名「${stationInput}」不完整，已自動帶入完整站名：\n${full}\n請確認無誤後再按一次送出`);
        }
        return onAlert(`站名「${stationInput}」只是關鍵字，清單中有 ${stationMatch.candidates.length} 個相符站點，請從清單點選完整站名`);
    }
    if (!hasDeficiency) return onAlert("請選擇「是否有缺失」");

    if (hasDeficiency === '有缺失') {
        const filled = visibleItems.filter(item => deficiencies[item.key].text.trim());
        if (filled.length === 0) return onAlert("已選「有缺失」，請至少填寫一項缺失內容");
        const missingScore = filled.find(item => !deficiencies[item.key].score);
        if (missingScore) return onAlert(`「${missingScore.label}」已填寫內容，請選擇 1~10 缺失筆數`);
    }

    if (photos.some(p => p.status === 'compressing')) {
        return onAlert("照片正在壓縮中，請稍候...");
    }

    const failedPhotos = photos.filter(p => p.status === 'error');
    if (failedPhotos.length > 0) {
        return onAlert(`有 ${failedPhotos.length} 張照片處理失敗，請移除後重試`);
    }

    setIsSubmitting(true);
    setProgress(0);

    try {
        const readyPhotos = photos.filter(p => p.status === 'ready' && p.compressedBase64);
        const uploadedUrls: string[] = [];
        const totalSteps = readyPhotos.length + 1;
        let completedSteps = 0;

        const updateProgress = () => {
            completedSteps++;
            setProgress(Math.min(Math.round((completedSteps / totalSteps) * 100), 99));
        };

        if (readyPhotos.length > 0) {
            setStatusMsg(`正在上傳照片 (${readyPhotos.length} 張)...`);

            const now = new Date();
            const timeSuffix = now.getHours().toString().padStart(2, '0') +
                               now.getMinutes().toString().padStart(2, '0') +
                               now.getSeconds().toString().padStart(2, '0');
            const safeStation = formData.station.trim().replace(/[\\/:*?"<>|]/g, "_") || "UnknownStation";

            // 標記全部為 uploading
            setPhotos(prev => prev.map(p => readyPhotos.some(rp => rp.id === p.id) ? { ...p, status: 'uploading' } : p));

            // 並行上傳（GAS 端資料夾鎖防止重複建立）
            const results = await Promise.all(readyPhotos.map(async (photo) => {
                const globalIdx = photos.findIndex(p => p.id === photo.id);
                const fileName = readyPhotos.length > 1
                    ? `${safeStation}-${globalIdx + 1}_${timeSuffix}.jpg`
                    : `${safeStation}_${timeSuffix}.jpg`;

                try {
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify({
                            action: 'uploadImage',
                            data: { fileName, mimeType: 'image/jpeg', base64: photo.compressedBase64, stationName: safeStation }
                        })
                    });
                    const res = await response.json();

                    if (res.success && res.fileUrl) {
                        setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'success' } : p));
                        updateProgress();
                        return res.fileUrl;
                    } else {
                        throw new Error("Upload Failed");
                    }
                } catch {
                    setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'error' } : p));
                    return null;
                }
            }));

            results.forEach(url => { if (url) uploadedUrls.push(url); });
        }

        // 檢查部分失敗
        const failedCount = photos.filter(p => p.status === 'error').length;
        if (photos.length > 0 && uploadedUrls.length === 0) {
            throw new Error("所有照片上傳失敗，無法送出回報單");
        }
        if (failedCount > 0) {
            throw new Error(`${failedCount} 張照片上傳失敗，請移除失敗照片後重試`);
        }

        setStatusMsg("正在寫入資料庫...");

        // 組裝缺失內容：僅帶有填寫的項目
        const deficiencyPayload: Record<string, { text: string; score: string }> = {};
        if (hasDeficiency === '有缺失') {
            visibleItems.forEach(item => {
                const entry = deficiencies[item.key];
                if (entry.text.trim()) deficiencyPayload[item.key] = { text: entry.text.trim(), score: entry.score };
            });
        }

        const result = await submitDeficiencyReport(apiUrl, {
            ...formData,
            targetName: names[0],
            targetNames: names,
            hasDeficiency,
            deficiencies: deficiencyPayload,
            auditor: user.name,
            photoUrl: uploadedUrls
        });

        updateProgress();
        setProgress(100);

        if (result.success) {
            onAlert(result.message || "稽核回報已成功送出！");
            onBack();
        } else if (result.unconfirmed) {
            // 後端沒回傳確認訊息，但資料通常已寫入 → 不要顯示空白彈窗、也不要讓使用者重送
            onAlert("已送出，但後端沒有回傳確認訊息。\n資料通常已經寫入，請到試算表確認該筆紀錄，\n確認前請勿重複送出。");
            onBack();
        } else {
            onAlert(result.message || "送出失敗，請稍後再試");
        }

    } catch (err) {
        onAlert("發生錯誤：" + (err instanceof Error ? err.message : "未知錯誤"));
    } finally {
        setIsSubmitting(false);
        setStatusMsg("");
        setProgress(0);
    }
  };

  return (
    <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

      {/* 全螢幕遮罩：防止觸控 + 顯示進度 */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex flex-col items-center justify-center backdrop-blur-[2px] animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center max-w-xs w-full mx-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">{statusMsg}</h3>

            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-blue-600 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-blue-600 font-bold text-sm">{progress}%</p>
          </div>
        </div>
      )}

      <button onClick={onBack} className="mb-6 flex items-center text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> 返回
      </button>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">

        <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-4">
             <div className="bg-red-100 p-3 rounded-xl text-red-600">
                 <ClipboardCheck size={28} />
             </div>
             <div>
                <h2 className="text-2xl font-bold text-gray-900">稽核回報</h2>
                <p className="text-gray-500 text-sm">填寫現場稽核發現之項目</p>
             </div>
        </div>

        <form onSubmit={handleSubmit} onKeyDown={preventEnterSubmit}>
            <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">分區</label>
                <select value={formData.zone} onChange={e => handleChange('zone', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white">
                    <option value="">-- 請選擇分區 --</option>
                    {ZONES.map(z => (<option key={z} value={z}>{z}</option>))}
                </select>
            </div>
            <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-bold text-gray-700">
                        被稽核員工 (姓名)
                        {targetNames.length > 1 && (
                          <span className="ml-2 text-xs text-gray-400 font-normal">共 {targetNames.length} 位，送出後每位各一筆</span>
                        )}
                    </label>
                    <button
                      type="button"
                      onClick={addTargetName}
                      className="inline-flex items-center text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                      title="新增一位被稽核員工"
                    >
                        <Plus size={14} className="mr-1" /> 新增員工
                    </button>
                </div>
                <div className="space-y-2">
                    {targetNames.map((name, idx) => (
                      <div key={idx} className="flex gap-2">
                        <select
                          value={name}
                          onChange={e => updateTargetName(idx, e.target.value)}
                          className="flex-1 min-w-0 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white"
                        >
                            <option value="">{targetNames.length > 1 ? `-- 請選擇第 ${idx + 1} 位員工 --` : '-- 請選擇員工 --'}</option>
                            {employees.map((emp, i) => (<option key={i} value={emp.name}>{emp.name}</option>))}
                        </select>
                        {targetNames.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTargetName(idx)}
                            className="w-12 flex-shrink-0 flex items-center justify-center border border-gray-300 rounded-lg text-gray-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors"
                            title="移除此員工"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-1">交換站名稱</label>
                    <input type="text" list="station-list" value={formData.station} onChange={e => handleChange('station', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" placeholder="輸入關鍵字搜尋..." />
                    <datalist id="station-list">{stations.map((s, i) => (<option key={i} value={s} />))}</datalist>
                    {stationMatch.kind === 'partial' && (
                      <p className="mt-1 text-xs text-amber-600 flex items-center">
                        <AlertTriangle size={12} className="mr-1 flex-shrink-0" />
                        這只是關鍵字，請從清單點選完整站名（符合 {stationMatch.candidates.length} 個）
                      </p>
                    )}
                    {stationMatch.kind === 'none' && (
                      <p className="mt-1 text-xs text-gray-400">此站名不在站點清單中，將以你輸入的文字寫入</p>
                    )}
                    {maintenanceInfo && (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm space-y-1">
                        <div className="flex items-center text-amber-800">
                          <CalendarIcon size={14} className="mr-1.5 flex-shrink-0" />
                          <span>上次月保：<span className="font-semibold">{maintenanceInfo.date || '無紀錄'}</span></span>
                        </div>
                        {maintenanceInfo.ticketId && (
                          <div className="flex items-center">
                            <ExternalLink size={14} className="mr-1.5 flex-shrink-0 text-blue-600" />
                            <a
                              href={buildTicketUrl(maintenanceInfo.ticketId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline break-all"
                            >
                              {maintenanceInfo.ticketId}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-1">稽核日期</label>
                    <input type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
            </div>
            <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  工單號碼 <span className="text-gray-400 font-normal text-xs">（選填）</span>
                </label>
                <input
                  type="text"
                  value={formData.ticketNo}
                  onChange={e => handleChange('ticketNo', e.target.value.trim())}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-mono"
                  placeholder="例如：GNT2605859689"
                />
                {formData.ticketNo && (
                  <a
                    href={buildTicketUrl(formData.ticketNo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    <ExternalLink size={11} className="mr-1" />
                    預覽連結
                  </a>
                )}
            </div>
            <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">稽核類型</label>
                <select value={formData.auditType} onChange={e => handleChange('auditType', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white">
                    {AUDIT_TYPES.map(t => (<option key={t} value={t}>{t}</option>))}
                </select>
            </div>

            <div className="mb-6 p-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center justify-between">
                    <div className="flex items-center"><ImageIcon className="w-4 h-4 mr-2 text-blue-600" /> 現場照片上傳 (可多選)</div>
                    <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded border">已選 {photos.length} 張</span>
                </label>

                <div className="space-y-3">
                    {photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {photos.map((photo) => (
                          <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-white">
                            <img
                              src={photo.previewUrl}
                              alt=""
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => setPreviewUrl(photo.previewUrl)}
                            />
                            {/* 狀態遮罩 */}
                            {photo.status !== 'ready' && (
                              <div className={`absolute inset-0 flex items-center justify-center
                                ${photo.status === 'compressing' ? 'bg-black/40' :
                                  photo.status === 'uploading' ? 'bg-black/40' :
                                  photo.status === 'success' ? 'bg-green-500/20' :
                                  'bg-red-500/30'}`}>
                                {photo.status === 'compressing' && <Loader2 size={20} className="text-white animate-spin" />}
                                {photo.status === 'uploading' && <Upload size={20} className="text-white animate-bounce" />}
                                {photo.status === 'success' && <CheckCircle size={20} className="text-green-600" />}
                                {photo.status === 'error' && <AlertTriangle size={20} className="text-red-600" />}
                              </div>
                            )}
                            {/* 刪除按鈕 */}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                              className="absolute top-1 right-1 w-6 h-6 bg-black/50 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="relative mt-2">
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <button type="button" className="w-full py-3 bg-white border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 font-medium flex items-center justify-center transition-colors">
                            <Upload className="w-4 h-4 mr-2" /> 點擊新增照片
                        </button>
                    </div>
                </div>
            </div>

            {/* 是否有缺失 */}
            <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">是否有缺失</label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setHasDeficiency('無缺失')}
                      className={`py-3 rounded-xl border-2 font-bold flex items-center justify-center transition-all ${
                        hasDeficiency === '無缺失'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-green-300'
                      }`}
                    >
                      <ShieldCheck className="w-5 h-5 mr-2" /> 無缺失
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasDeficiency('有缺失')}
                      className={`py-3 rounded-xl border-2 font-bold flex items-center justify-center transition-all ${
                        hasDeficiency === '有缺失'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-red-300'
                      }`}
                    >
                      <ShieldAlert className="w-5 h-5 mr-2" /> 有缺失
                    </button>
                </div>
            </div>

            {/* 缺失內容：僅在「有缺失」時顯示 */}
            {hasDeficiency === '有缺失' && (
              <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-lg font-bold text-gray-900">缺失內容</h3>
                    <button
                      type="button"
                      onClick={() => setShowDefinitions(true)}
                      className="w-5 h-5 rounded-full bg-gray-200 hover:bg-blue-500 text-gray-600 hover:text-white text-xs font-bold flex items-center justify-center transition-colors"
                      title="查看缺失項目定義說明"
                    >
                      ?
                    </button>
                  </div>
                  <span className="text-xs text-gray-400">填寫內容後須選擇 1~10 缺失筆數</span>
                </div>
                <div className="space-y-3">
                  {visibleItems.map(item => {
                    const entry = deficiencies[item.key];
                    const hasText = !!entry.text.trim();
                    return (
                      <div key={item.key}>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                          {item.label}
                          {hasText && !entry.score && (
                            <span className="ml-2 text-xs text-red-500 font-normal">請選擇缺失筆數</span>
                          )}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={entry.text}
                            onChange={e => handleDeficiencyText(item.key, e.target.value)}
                            className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                            placeholder="無缺失免填"
                          />
                          <select
                            value={entry.score}
                            disabled={!hasText}
                            onChange={e => handleDeficiencyScore(item.key, e.target.value)}
                            className={`w-20 p-2.5 border rounded-lg outline-none text-center font-bold transition-colors ${
                              !hasText
                                ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
                                : entry.score
                                  ? 'bg-red-50 text-red-700 border-red-300 focus:ring-2 focus:ring-red-500'
                                  : 'bg-white text-gray-700 border-red-300 focus:ring-2 focus:ring-red-500'
                            }`}
                          >
                            <option value="">筆數</option>
                            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                              <option key={n} value={String(n)}>{n}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 text-white rounded-xl font-bold flex items-center justify-center shadow-lg transition-all ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="animate-spin mr-2" />
                        {statusMsg || `處理中...`}
                    </>
                ) : (
                    <>
                        <Send className="mr-2" /> 送出回報單
                    </>
                )}
            </button>
        </form>
      </div>

      {/* 缺失項目定義說明彈窗 */}
      {showDefinitions && (
        <div
          className="fixed inset-0 bg-black/60 z-[9998] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowDefinitions(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">缺失項目定義說明</h3>
              <button
                onClick={() => setShowDefinitions(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3 border border-gray-200 font-bold text-gray-700 whitespace-nowrap">缺失項目分類</th>
                    <th className="text-left p-3 border border-gray-200 font-bold text-gray-700">項目說明</th>
                  </tr>
                </thead>
                <tbody>
                  {DEFICIENCY_DEFINITIONS.map((def, i) => (
                    <tr key={i} className={i % 2 === 1 ? 'bg-gray-50/50' : ''}>
                      <td className="p-3 border border-gray-200 font-bold text-gray-800 whitespace-nowrap align-top">{def.category}</td>
                      <td className="p-3 border border-gray-200 text-gray-600 leading-relaxed">{def.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 照片放大預覽 */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-colors z-10"
          >
            <X size={24} />
          </button>
          <img
            src={previewUrl}
            alt=""
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
