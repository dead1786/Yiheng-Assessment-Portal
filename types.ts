export interface AuthResponse {
  success: boolean;
  message: string;
  isAdmin?: boolean;
  questions?: string[];
  userDetails?: {
    jobTitle: string;
    jobGrade: string;
    yearsOfService: string;
  };
}

export interface User {
  name: string;
  isAdmin: boolean;
  jobTitle?: string;
  jobGrade?: string;
  yearsOfService?: string;
}

export interface Employee {
  name: string;
  joinDate: string;
  jobTitle: string;
  yearsOfService: string;
  jobGrade: string;
  jobGradeBonus: string; // 新增: 職等加給
  salary: string; 
  permission: boolean;
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