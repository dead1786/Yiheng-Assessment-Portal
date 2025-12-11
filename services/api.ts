import { AuthResponse, AssessmentRecord, AdminDataResponse, Employee, EmployeeListResponse, DeficiencyRecord } from '../types';
import { Shift } from '../types';

async function apiRequest<T>(apiUrl: string, payload: any): Promise<T> {
    if (!apiUrl) throw new Error("API URL 未設定");
  
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); 
  
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
  
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        if (text.includes("<!DOCTYPE html>")) {
          throw new Error("GAS 伺服器錯誤 (可能為權限不足或程式崩潰)");
        }
        throw new Error("無效的 JSON 回應: " + text.substring(0, 50));
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error("連線逾時 (超過90秒)，請檢查網路或稍後再試。");
      }
      throw error;
    }
  }

export const authenticateEmployee = async (
    apiUrl: string,
    name: string,
    otp: string
  ): Promise<AuthResponse> => {
    try {
      return await apiRequest<AuthResponse>(apiUrl, {
        action: 'authenticate',
        name,
        otp
      });
    } catch (error) {
      console.error("Auth Error:", error);
      let msg = error instanceof Error ? error.message : "連線錯誤";
      if (msg.includes("Failed to fetch")) msg = "無法連線到伺服器，請檢查 CORS 或權限設定。";
      return { success: false, message: msg };
    }
  };

export const submitAssessment = async (
    apiUrl: string,
    name: string,
    answers: string[],
    userDetails?: { jobTitle?: string, jobGrade?: string, yearsOfService?: string },
    questions?: string[]
  ): Promise<{ success: boolean; message: string }> => {
    try {
      return await apiRequest(apiUrl, {
        action: 'submitAssessment',
        name,
        answers,
        jobTitle: userDetails?.jobTitle || "",
        jobGrade: userDetails?.jobGrade || "",
        yearsOfService: userDetails?.yearsOfService || "",
        questions: questions || []
      });
    } catch (error) {
      console.error("Submit Error:", error);
      return { success: false, message: "提交失敗: " + (error instanceof Error ? error.message : "未知錯誤") };
    }
  };
  
  export const fetchHistory = async (
    apiUrl: string,
    name: string
  ): Promise<{ success: boolean; records: AssessmentRecord[]; message?: string }> => {
    try {
      return await apiRequest(apiUrl, {
        action: 'getHistory',
        name
      });
    } catch (error) {
      return { success: false, records: [], message: "無法載入歷史紀錄" };
    }
  };
  
  export const fetchAdminData = async (apiUrl: string): Promise<AdminDataResponse> => {
    try {
      return await apiRequest(apiUrl, { action: 'getAdminData' });
    } catch (error) {
      return { success: false, records: [], questions: [] };
    }
  };
  
  export const updateQuestions = async (
    apiUrl: string,
    questions: string[]
  ): Promise<{ success: boolean; message: string }> => {
    try {
      return await apiRequest(apiUrl, {
        action: 'updateQuestions',
        questions
      });
    } catch (error) {
      return { success: false, message: "更新失敗" };
    }
  };
  
  export const updateAdminPassword = async (
    apiUrl: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      return await apiRequest(apiUrl, {
        action: 'updateAdminPassword',
        newPassword
      });
    } catch (error) {
      return { success: false, message: "密碼更新失敗" };
    }
  };
  
  export const submitAdminReview = async (
    apiUrl: string,
    rowIndex: number,
    adminComment: string,
    adminScore: number
  ): Promise<{ success: boolean; message: string }> => {
    try {
      return await apiRequest(apiUrl, {
        action: 'submitAdminReview',
        rowIndex,
        adminComment,
        adminScore
      });
    } catch (error) {
      return { success: false, message: "評分提交失敗" };
    }
  };
  
  export const fetchEmployeeList = async (apiUrl: string): Promise<EmployeeListResponse> => {
    try {
      return await apiRequest(apiUrl, { action: 'getEmployeeList' });
    } catch (error) {
      return { success: false, employees: [], message: "無法載入員工名單" };
    }
  };
  
  export const updateEmployeeList = async (
    apiUrl: string,
    employees: Employee[]
  ): Promise<{ success: boolean; message: string }> => {
    try {
      return await apiRequest(apiUrl, {
        action: 'updateEmployeeList',
        employees
      });
    } catch (error) {
      return { success: false, message: "更新員工名單失敗" };
    }
  };

  export const fetchDeficiencyRecords = async (
  apiUrl: string,
  name?: string // 修改：變成可選參數
): Promise<{ success: boolean; records: DeficiencyRecord[]; message?: string }> => {
  try {
    return await apiRequest(apiUrl, {
      action: 'getDeficiencyRecords',
      name: name || "" // 如果沒傳名字，就傳空字串給後端
    });
  } catch (error) {
    return { success: false, records: [], message: "無法載入缺失紀錄" };
  }
};


export const fetchShiftSchedule = async (
  apiUrl: string,
  name: string
): Promise<{ success: boolean; shifts: Shift[]; message?: string }> => {
  try {
    return await apiRequest(apiUrl, {
      action: 'getShiftSchedule',
      name
    });
  } catch (error) {
    return { success: false, shifts: [], message: "無法載入班表" };
  }
};

// ✅ 新增：強制踢出 API
export const kickUser = async (
    apiUrl: string,
    name: string
): Promise<{ success: boolean; message: string }> => {
    try {
        return await apiRequest(apiUrl, {
            action: 'kickUser',
            name
        });
    } catch (error) {
        return { success: false, message: "踢出指令發送失敗" };
    }
};

// ✅ 新增：檢查登入狀態 API (確認是否被踢)
export const checkLoginStatus = async (
    apiUrl: string,
    name: string,
    sessionTime: number
): Promise<{ success: boolean; kicked: boolean; message?: string }> => {
    try {
        return await apiRequest(apiUrl, {
            action: 'checkLoginStatus',
            name,
            sessionTime
        });
    } catch (error) {
        // 若連線失敗，預設不踢出，避免網路波動影響使用
        return { success: false, kicked: false }; 
    }
};