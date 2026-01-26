import { 
  AuthResponse, AssessmentRecord, AdminDataResponse, Employee, EmployeeListResponse, 
  DeficiencyRecord, Shift, FullShift, ShiftScheduleResponse, DeficiencyReportData, 
  UpdateScheduleRequest, User, ClockInData, ClockInResponse 
} from '../types';

async function apiRequest<T>(apiUrl: string, payload: any): Promise<T> {
    if (!apiUrl) throw new Error("API URL 未設定");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); 
    try {
      const url = payload.action ? `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}action=${payload.action}` : apiUrl;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const text = await response.text();
      try { return JSON.parse(text); } catch (e) {
        if (text.includes("<!DOCTYPE html>")) throw new Error("GAS 伺服器錯誤");
        throw new Error("無效的 JSON 回應");
      }
    } catch (error) { clearTimeout(timeoutId); throw error; }
}

export const authenticateEmployee = async (apiUrl: string, name: string, otp: string): Promise<AuthResponse> => { try { return await apiRequest<AuthResponse>(apiUrl, { action: 'authenticate', name, otp }); } catch (error) { return { success: false, message: error instanceof Error ? error.message : "連線錯誤" }; } };
export const submitAssessment = async (apiUrl: string, name: string, answers: string[], userDetails?: any, questions?: string[]): Promise<{ success: boolean; message: string }> => { try { return await apiRequest(apiUrl, { action: 'submitAssessment', name, answers, jobTitle: userDetails?.jobTitle, jobGrade: userDetails?.jobGrade, yearsOfService: userDetails?.yearsOfService, questions: questions || [] }); } catch (error) { return { success: false, message: "提交失敗" }; } };
export const fetchHistory = async (apiUrl: string, name: string): Promise<{ success: boolean; records: AssessmentRecord[]; message?: string }> => { try { return await apiRequest(apiUrl, { action: 'getHistory', name }); } catch (error) { return { success: false, records: [], message: "無法載入紀錄" }; } };
export const fetchAdminData = async (apiUrl: string): Promise<AdminDataResponse> => { try { return await apiRequest(apiUrl, { action: 'getAdminData' }); } catch (error) { return { success: false, records: [], questions: [] }; } };
export const updateQuestions = async (apiUrl: string, questions: string[]): Promise<{ success: boolean; message: string }> => { try { return await apiRequest(apiUrl, { action: 'updateQuestions', questions }); } catch (error) { return { success: false, message: "更新失敗" }; } };
export const updateAdminPassword = async (apiUrl: string, newPassword: string): Promise<{ success: boolean; message: string }> => { try { return await apiRequest(apiUrl, { action: 'updateAdminPassword', newPassword }); } catch (error) { return { success: false, message: "密碼更新失敗" }; } };
export const submitAdminReview = async (apiUrl: string, rowIndex: number, adminComment: string, adminScore: number): Promise<{ success: boolean; message: string }> => { try { return await apiRequest(apiUrl, { action: 'submitAdminReview', rowIndex, adminComment, adminScore }); } catch (error) { return { success: false, message: "評分失敗" }; } };
export const fetchEmployeeList = async (apiUrl: string): Promise<EmployeeListResponse> => { try { return await apiRequest(apiUrl, { action: 'getEmployeeList' }); } catch (error) { return { success: false, employees: [], message: "無法載入名單" }; } };
export const updateEmployeeList = async (apiUrl: string, employees: Employee[]): Promise<{ success: boolean; message: string }> => { try { return await apiRequest(apiUrl, { action: 'updateEmployeeList', employees }); } catch (error) { return { success: false, message: "更新失敗" }; } };

export const fetchDeficiencyRecords = async (apiUrl: string, name?: string): Promise<{ success: boolean; records: DeficiencyRecord[]; message?: string; kpi?: string | number; user?: any }> => { 
  try { 
    const recordsPromise = apiRequest<{ success: boolean; records: DeficiencyRecord[] }>(apiUrl, { action: 'getDeficiencyRecords', name: name || "" })
      .catch(async () => {
         const url = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}action=getDeficiencyRecords&name=${encodeURIComponent(name || "")}`;
         const res = await fetch(url);
         return await res.json();
      });
    const usersPromise = fetchUsers(apiUrl);
    const [data, users] = await Promise.all([recordsPromise, usersPromise]);
    let finalKpi = '';
    if (name && users && Array.isArray(users)) {
        const foundUser = users.find(u => u.name === name);
        if (foundUser) finalKpi = foundUser.kpi || '';
    }
    return { 
        success: data.success ?? (Array.isArray(data) || Array.isArray((data as any).records)), 
        records: (data as any).records || (Array.isArray(data) ? data : []),
        kpi: finalKpi,
    };
  } catch (error) { return { success: false, records: [], message: "無法載入稽核紀錄" }; } 
};

export const fetchShiftSchedule = async <T = any>(apiUrl: string, name?: string): Promise<ShiftScheduleResponse<T>> => { try { return await apiRequest(apiUrl, { action: 'getShiftSchedule', name: name || "" }); } catch (error) { return { success: false, shifts: [], message: "無法載入班表" }; } };
export const kickUser = async (apiUrl: string, name: string): Promise<{ success: boolean; message: string }> => { try { return await apiRequest(apiUrl, { action: 'kickUser', name }); } catch (error) { return { success: false, message: "指令失敗" }; } };

export const checkLoginStatus = async (apiUrl: string, name: string, sessionTime: number): Promise<{ 
    success: boolean; 
    kicked: boolean; 
    message?: string; 
    userDetails?: { 
        kpi?: string; 
        jobGrade?: string; 
        annualLeave?: string; 
        annualLeaveUsed?: string; 
        assignedStation?: string; 
        allowRemote?: boolean;
        permissionGranted?: boolean; 
    } 
}> => { 
    try { return await apiRequest(apiUrl, { action: 'checkLoginStatus', name, sessionTime }); } catch (error) { return { success: false, kicked: false }; } 
};

export const submitDeficiencyReport = async (apiUrl: string, data: DeficiencyReportData): Promise<{ success: boolean; message: string }> => { try { return await apiRequest(apiUrl, { action: 'submitDeficiencyReport', data }); } catch (error) { return { success: false, message: "連線失敗" }; } };
export const updateScheduleSource = async (apiUrl: string, data: UpdateScheduleRequest): Promise<{ success: boolean; message: string }> => { try { return await apiRequest(apiUrl, { action: 'updateScheduleSource', data }); } catch (error) { return { success: false, message: "連線失敗" }; } };

export const uploadImage = async (apiUrl: string, file: File): Promise<{ success: boolean; fileUrl?: string; message: string }> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target?.result as string;
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                let width = img.width; let height = img.height;
                const MAX_WIDTH = 1280;
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d'); ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                const base64Content = dataUrl.split(',')[1];
                try {
                    const response = await apiRequest<any>(apiUrl, { action: 'uploadImage', data: { fileName: file.name, mimeType: 'image/jpeg', base64: base64Content } });
                    resolve(response);
                } catch (e) { resolve({ success: false, message: "上傳發生錯誤" }); }
            };
        };
        reader.onerror = () => resolve({ success: false, message: "讀取檔案失敗" });
    });
};

const isValidKpi = (val: any): boolean => {
  if (val === undefined || val === null) return false;
  const str = String(val).trim();
  if (str === '') return false;
  if (str.includes('/') || str.includes('-') || str.includes('@')) return false;
  if (str.includes('%')) return true;
  const cleanStr = str.replace(/%|分/g, '');
  const num = Number(cleanStr);
  if (isNaN(num)) return false;
  return num > 0 && num <= 150;
};

export const fetchUsers = async (apiUrl: string): Promise<User[]> => {
  if (!apiUrl) return [];
  try {
    const response = await fetch(`${apiUrl}${apiUrl.includes('?') ? '&' : '?'}action=getUsers`, { method: 'GET', headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    if (!data.users || !Array.isArray(data.users)) {
      if (Array.isArray(data)) return mapUsersFromRows(data);
      return []; 
    }
    return mapUsersFromRows(data.users);
  } catch (error) { return []; }
};

const mapUsersFromRows = (rows: any[]): User[] => {
  return rows.map((row) => {
    if (row[0] === '姓名' || row[0] === 'Name') return null;
    let kpiFound = '';
    if (typeof row === 'object' && !Array.isArray(row)) {
       kpiFound = row.kpi || row.KPI || row.score || row.grade || row.performance || row['KPI Score'] || '';
       return {
         name: row.name || row.Name || '未知',
         jobTitle: row.jobTitle || row.title || '',
         jobGrade: row.jobGrade || row.grade || '',
         yearsOfService: row.yearsOfService || row.years || '0',
         kpi: kpiFound,
         joinDate: row.joinDate || row.date || '',
         isAdmin: row.isAdmin === true || String(row.isAdmin).toLowerCase() === 'true',
         canAssess: false,
         canEditSchedule: false,
         annualLeave: row.annualLeave || "0",
         annualLeaveUsed: row.annualLeaveUsed || "0",
         assignedStation: row.assignedStation || "",
         allowRemote: row.allowRemote === true || String(row.allowRemote).toLowerCase() === 'true'
       } as User;
    }
    return {
      name: row[0], jobTitle: row[1] || '', jobGrade: row[2] || '', yearsOfService: row[3] || '0', joinDate: row[4] || '', kpi: kpiFound, isAdmin: false, canAssess: false, canEditSchedule: false, annualLeave: "0", annualLeaveUsed: "0", assignedStation: "", allowRemote: false
    } as User;
  }).filter(Boolean) as User[];
};

export const fetchStationList = async (apiUrl: string): Promise<{ success: boolean; stations: string[] }> => { 
  try { 
    // ✅ 簡化：現在後端已修正為回傳純字串陣列，直接接收即可
    const res = await apiRequest<{ success: boolean, stations: string[] }>(apiUrl, { action: 'getStationList' });
    return { success: res.success, stations: res.stations || [] }; 
  } catch (error) { 
    return { success: false, stations: [] }; 
  } 
};

export const fetchOfficeList = async (apiUrl: string): Promise<{ success: boolean; offices: string[] }> => { 
    try { 
        const res = await apiRequest<{ success: boolean, offices: string[] }>(apiUrl, { action: 'getOfficeList' }); 
        return { success: res.success, stations: res.offices || [] } as any; 
    } catch (error) { return { success: false, offices: [] } as any; } 
};

export const submitClockIn = async (apiUrl: string, data: ClockInData): Promise<ClockInResponse> => {
  try {
    return await apiRequest<ClockInResponse>(apiUrl, {
      action: 'submitClockIn',
      data: data
    });
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "打卡連線失敗"
    };
  }
};

export const fetchClockInStatus = async (apiUrl: string, name: string): Promise<{ success: boolean; todayCount: number; lastRecord?: { time: string; station: string; status: string } }> => {
  try {
    return await apiRequest(apiUrl, { action: 'getClockInStatus', name });
  } catch (error) {
    return { success: false, todayCount: 0 };
  }
};
