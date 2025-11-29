export interface AuthResponse {
  success: boolean;
  message: string;
  isAdmin?: boolean;
  questions?: string[];
  // 新增: 登入時回傳的員工詳細資訊
  userDetails?: {
    jobTitle: string;
    jobGrade: string;
    yearsOfService: string;
  };
}

export interface User {
  name: string;
  isAdmin: boolean;
  // 新增: 用於快照當前狀態
  jobTitle?: string;
  jobGrade?: string;
  yearsOfService?: string;
}

export interface Employee {
  name: string;
  joinDate: string;
  jobTitle: string;
  yearsOfService: string; // 試算表可能存為數字或公式，前端視為字串處理較安全
  jobGrade: string;
  permission: boolean; // 授權開關
}

export interface AssessmentRecord {
  rowIndex?: number; 
  timestamp: string;
  name: string;
  // 新增: 紀錄當下的職位狀態
  jobTitle?: string;
  jobGrade?: string;
  yearsOfService?: string;
  answers: string[];
  aiScore?: number;
  aiComment?: string;
  adminScore?: number;
  adminComment?: string;
  finalScore?: number;
}

export interface AdminDataResponse {
  success: boolean;
  records: AssessmentRecord[];
  questions: string[];
}

export interface EmployeeListResponse {
  success: boolean;
  employees: Employee[];
  message?: string;
}