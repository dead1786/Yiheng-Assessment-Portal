// 📂 請覆蓋 types.ts
export interface AuthResponse {
  success: boolean;
  message: string;
  isAdmin?: boolean;
  canAssess?: boolean;
  questions?: string[];
  userDetails?: {
    jobTitle: string;
    jobGrade: string;
    yearsOfService: string;
    kpi?: string;
    joinDate?: string;
  };
}

export interface User {
  name: string;
  isAdmin: boolean;
  canAssess: boolean;
  jobTitle?: string;
  jobGrade?: string;
  yearsOfService?: string;
  kpi?: string;
  joinDate?: string;
}

export interface Employee {
  name: string;
  joinDate: string;
  jobTitle: string;
  yearsOfService: string;
  jobGrade: string;
  jobGradeBonus: string;
  salary: string; 
  kpi?: string;
  permission: boolean; // 這就是控制是否被踢出的關鍵
}

export interface AssessmentRecord {
  rowIndex?: number; 
  timestamp: string;
  name: string;
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

export interface DeficiencyRecord {
  name?: string;
  station: string;
  date: string;
  status: string;
  ppe: string;
  fencing: string;
  boxClean: string;
  siteClean: string;
  order: string;
  gnop: string;
  other: string;
}

export interface Shift {
  date: string;
  day: string;
  type: string;
}