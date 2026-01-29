import React, { useState, useEffect } from 'react';
import { User, Employee } from '../types';
import { submitDeficiencyReport, fetchEmployeeList, fetchStationList } from '../services/api';
import { ArrowLeft, Send, Loader2, ClipboardCheck, Upload, Image as ImageIcon, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';

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
  status: 'pending' | 'compressing' | 'ready' | 'uploading' | 'success' | 'error';
  compressedBase64?: string; // 暫存壓縮後的字串，不上傳
}

export const DeficiencyReportForm: React.FC<DeficiencyReportFormProps> = ({ user, apiUrl, onBack, onAlert }) => {
  const [formData, setFormData] = useState({
    targetName: '', station: '', date: new Date().toISOString().split('T')[0],
    status: '施作中', ppe: '', fencing: '', boxClean: '', siteClean: '',
    order: '', gnop: '', other: ''
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

  // 照片暫存佇列
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

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
    };
    fetchData();
  }, [apiUrl, employees.length]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 核心邏輯：選擇檔案後，僅進行「前端壓縮」，不上傳
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const newFiles = Array.from(e.target.files) as File[];
          
          // 過濾大檔
          const validFiles = newFiles.filter(f => f.size < 50 * 1024 * 1024);
          if (validFiles.length < newFiles.length) onAlert("部分檔案過大 (>50MB) 已被忽略");

          const newItems: PhotoItem[] = validFiles.map(file => ({
              id: Math.random().toString(36).substr(2, 9),
              file,
              previewUrl: URL.createObjectURL(file),
              status: 'compressing' // 初始狀態：壓縮中
          }));

          setPhotos(prev => [...prev, ...newItems]);

          // 開始前端壓縮
          newItems.forEach(async (item) => {
              try {
                  const compressed = await compressImage(item.file);
                  setPhotos(current => current.map(p => p.id === item.id 
                      ? { ...p, status: 'ready', compressedBase64: compressed } // 壓縮完成，標記為 Ready
                      : p
                  ));
              } catch (e) {
                  setPhotos(current => current.map(p => p.id === item.id ? { ...p, status: 'error' } : p));
              }
          });
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
        return onAlert("照片正在處理中，請稍候...");
    }

    setIsSubmitting(true);
    setProgress(0);
    setStatusMsg("初始化上傳...");

    try {
        const readyPhotos = photos.filter(p => p.status === 'ready' && p.compressedBase64);
        const uploadedUrls: string[] = [];
        
        // 計算總步驟：照片數量 + 1 (最後的資料寫入)
        const totalSteps = readyPhotos.length + 1;
        let completedSteps = 0;

        // 更新進度的輔助函式
        const updateProgress = () => {
            completedSteps++;
            const pct = Math.min(Math.round((completedSteps / totalSteps) * 100), 99);
            setProgress(pct);
        };

        const now = new Date();
        const timeSuffix = now.getHours().toString().padStart(2, '0') + 
                           now.getMinutes().toString().padStart(2, '0') + 
                           now.getSeconds().toString().padStart(2, '0');

        if (readyPhotos.length > 0) {
            setStatusMsg(`正在上傳照片 (0/${readyPhotos.length})...`);
            
            const uploadPromises = readyPhotos.map(async (photo, idx) => {
                setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'uploading' } : p));
                
                try {
                    const globalIdx = photos.findIndex(p => p.id === photo.id);
                    const fileNum = globalIdx + 1;
                    const safeStationName = formData.station.trim().replace(/[\\/:*?"<>|]/g, "_") || "UnknownStation";
                    const newFileName = photos.length > 1 
                        ? `${safeStationName}-${fileNum}_${timeSuffix}.jpg` 
                        : `${safeStationName}_${timeSuffix}.jpg`;

                    const payload = {
                        action: 'uploadImage',
                        data: {
                            fileName: newFileName,
                            mimeType: 'image/jpeg',
                            base64: photo.compressedBase64,
                            stationName: safeStationName 
                        }
                    };

                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify(payload)
                    });
                    
                    const res = await response.json();
                    
                    if (res.success && res.fileUrl) {
                        setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'success' } : p));
                        updateProgress(); // 上傳成功，更新進度
                        return res.fileUrl;
                    } else {
                        throw new Error("Upload Failed");
                    }
                } catch (err) {
                    setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: 'error' } : p));
                    return null; 
                }
            });

            const results = await Promise.all(uploadPromises);
            
            results.forEach(url => {
                if (url) uploadedUrls.push(url);
            });
        }

        if (photos.length > 0 && uploadedUrls.length === 0) {
             throw new Error("照片上傳失敗，無法送出回報單");
        }

        setStatusMsg("正在寫入資料庫...");
        
        const result = await submitDeficiencyReport(apiUrl, {
            ...formData,
            auditor: user.name,
            photoUrl: uploadedUrls 
        });
        
        updateProgress(); // 最後一步完成
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
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-1">稽核日期</label>
                    <input type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
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
                    {photos.map((photo, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200 shadow-sm animate-in fade-in slide-in-from-bottom-1">
                            <div className="flex items-center truncate flex-1 mr-2">
                                <div className={`w-8 h-8 rounded flex items-center justify-center mr-3 font-bold text-xs flex-shrink-0 transition-colors
                                    ${photo.status === 'success' ? 'bg-green-100 text-green-600' : 
                                      photo.status === 'error' ? 'bg-red-100 text-red-600' : 
                                      photo.status === 'uploading' || photo.status === 'compressing' ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-gray-100 text-gray-500'}
                                `}>
                                    {photo.status === 'success' ? <CheckCircle size={16}/> : 
                                     photo.status === 'error' ? <AlertTriangle size={16}/> :
                                     photo.status === 'uploading' ? <Upload size={16} className="animate-bounce"/> :
                                     photo.status === 'compressing' ? <Loader2 size={16} className="animate-spin"/> :
                                     idx + 1}
                                </div>
                                <div className="flex flex-col truncate">
                                    <span className="text-sm text-gray-700 truncate max-w-[150px]">{photo.file.name}</span>
                                    <span className="text-[10px] text-gray-400">
                                        {photo.status === 'compressing' && '正在壓縮處理...'}
                                        {photo.status === 'ready' && '等待送出 (已壓縮)'}
                                        {photo.status === 'uploading' && '正在上傳雲端...'}
                                        {photo.status === 'success' && '上傳完成'}
                                        {photo.status === 'error' && '失敗'}
                                    </span>
                                </div>
                            </div>
                            <button type="button" onClick={() => removePhoto(photo.id)} className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors flex-shrink-0">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}

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
    </div>
  );
};
