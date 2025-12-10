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

export interface AuthResponse {
  success: boolean;
  message: string;
  isAdmin?: boolean;
  canAssess?: boolean; // 新增：控制是否顯示考核按鈕
  questions?: string[];
  userDetails?: {
    jobTitle: string;
    jobGrade: string;
    yearsOfService: string;
    kpi?: string;   // 新增
    joinDate?: string; // 新增
  };
}

export interface User {
  name: string;
  isAdmin: boolean;
  canAssess: boolean; // 新增
  jobTitle?: string;
  jobGrade?: string;
  yearsOfService?: string;
  kpi?: string;    // 新增
  joinDate?: string;  // 新增
}

// 新增缺失紀錄介面
export interface DeficiencyRecord {
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

// ... Employee, AssessmentRecord 等保持原樣 ...
export interface Employee {
    name: string;
    joinDate: string;
    jobTitle: string;
    yearsOfService: string;
    jobGrade: string;
    jobGradeBonus: string;
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

  export interface Shift {
  date: string;
  day: string;
  type: string;
}