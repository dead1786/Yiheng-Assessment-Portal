import React, { useState, useEffect } from 'react';
import { User, Employee } from '../types';
import { submitDeficiencyReport, fetchEmployeeList, fetchStationList, fetchMaintenanceInfo } from '../services/api';
import { ArrowLeft, Send, Loader2, ClipboardCheck, Upload, Image as ImageIcon, Trash2, CheckCircle, AlertTriangle, ExternalLink, Calendar as CalendarIcon, X } from 'lucide-react';

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

export const DeficiencyReportForm: React.FC<DeficiencyReportFormProps> = ({ user, apiUrl, onBack, onAlert }) => {
  const [formData, setFormData] = useState({
    targetName: '', station: '', date: new Date().toISOString().split('T')[0],
    status: '施作中', ppe: '', fencing: '', boxClean: '', siteClean: '',
    order: '', gnop: '', other: '', ticketNo: ''
  });

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

  useEffect(() => {
    const fetchData = async () => {
        if (employees.length === 0) {
            const empRes = await fetchEmployeeList(apiUrl);
            if (empRes.success) {
                setEmployees(empRes.employees);
                localStorage.setItem('admin_employees', JSON.stringify(empRes.employees));
            }
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
  }, [apiUrl, employees.length]);

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
    if (!formData.targetName) return onAlert("請選擇員工");
    if (!formData.station) return onAlert("請輸入交換站名稱");

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
        const result = await submitDeficiencyReport(apiUrl, {
            ...formData,
            auditor: user.name,
            photoUrl: uploadedUrls
        });

        updateProgress();
        setProgress(100);
        onAlert(result.message);
        if (result.success) onBack();

    } catch (err) {
        onAlert("發生錯誤：" + (err instanceof Error ? err.message : "未知錯誤"));
    } finally {
        setIsSubmitting(false);
        setStatusMsg("");
        setProgress(0);
    }
  };

  const renderInput = (label: string, field: keyof typeof formData, placeholder: string = "") => (
      <div className="mb-4">
          <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
          <input 
            type="text" 
            value={formData[field]} 
            onChange={e => handleChange(field as string, e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
            placeholder={placeholder}
          />
      </div>
  );

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
        
        {/* 已移除舊的頂部 Loader */}

        <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-4">
             <div className="bg-red-100 p-3 rounded-xl text-red-600">
                 <ClipboardCheck size={28} />
             </div>
             <div>
                <h2 className="text-2xl font-bold text-gray-900">稽核回報</h2>
                <p className="text-gray-500 text-sm">填寫現場稽核發現之項目</p>
             </div>
        </div>

        <form onSubmit={handleSubmit}>
            <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">被稽核員工 (姓名)</label>
                <select value={formData.targetName} onChange={e => handleChange('targetName', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white">
                    <option value="">-- 請選擇員工 --</option>
                    {employees.map((emp, i) => (<option key={i} value={emp.name}>{emp.name} ({emp.jobTitle})</option>))}
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-1">交換站名稱</label>
                    <input type="text" list="station-list" value={formData.station} onChange={e => handleChange('station', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" placeholder="輸入關鍵字搜尋..." />
                    <datalist id="station-list">{stations.map((s, i) => (<option key={i} value={s} />))}</datalist>
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
                              href={`https://prod-gnop-app.gogoro.com/ticket/report/detail/${maintenanceInfo.ticketId}`}
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
                    href={`https://prod-gnop.gogoro.com/ticket/management/search/detail/${formData.ticketNo}`}
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
                <label className="block text-sm font-bold text-gray-700 mb-1">施作狀況</label>
                <select value={formData.status} onChange={e => handleChange('status', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white">
                    <option value="施作中">施作中</option>
                    <option value="施作完成">施作完成</option>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderInput("個人防護裝備", "ppe", "例如：未戴帽子...")}
                {renderInput("圈圍架設", "fencing", "例如：三角錐距離不足...")}
                {renderInput("開關箱內清潔完整", "boxClean", "例如：有人工垃圾...")}
                {renderInput("現場清潔完整", "siteClean", "例如：遺留垃圾...")}
                {renderInput("維運/保養作業順序正確", "order", "例如：未先斷電...")}
                {renderInput("GNOP 結單內容正確", "gnop", "例如：註記不完善...")}
            </div>

            <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-1">其他問題描述</label>
                <textarea value={formData.other} onChange={e => handleChange('other', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none h-24 resize-none" placeholder="其他補充說明..." />
            </div>

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
