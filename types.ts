export interface User {
  name: string;
  jobTitle: string;
  jobGrade: string;
  yearsOfService: string;
  kpi: string;
  joinDate: string;
  isAdmin: boolean;
  canAssess: boolean;
  canEditSchedule: boolean;
  annualLeave: string;      // ✅ 新增
  annualLeaveUsed: string;  // ✅ 新增
  assignedStation: string;  // ✅ 新增
  allowRemote: boolean;     // ✅ 新增
}

export interface Employee {
  name: string;
  joinDate: string;
  jobTitle: string;
  yearsOfService: string;
  jobGrade: string;
  jobGradeBonus: string;
  kpi: string;
  salary: string;
  permission: boolean;
  color: string;
  canEditSchedule: boolean;
  annualLeave: string;      // ✅ 新增
  annualLeaveUsed: string;  // ✅ 新增
  assignedStation?: string; // ✅ 新增
  allowRemote?: boolean;    // ✅ 新增
}

export interface DeficiencyRecord {
  name: string;
  station: string;
  date: string;
  status: string; // ✅ 補上這個缺少的欄位
  ppe: string;
  fencing: string;
  boxClean: string;
  siteClean: string;
  order: string;
  gnop: string;
  other: string;
  auditor?: string;
  photoUrl?: string;
}

export interface AssessmentRecord {
  timestamp: string;
  name: string;
  jobTitle: string;
  jobGrade: string;
  yearsOfService: string;
  questions: string[];
  answers: string[];
  aiScore: number;
  aiComment: string;
  adminScore?: number;
  adminComment?: string;
  finalScore?: number;
  rowIndex?: number;
}

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
    kpi: string;
    joinDate: string;
    canEditSchedule: boolean;
    annualLeave: string;      // ✅ 新增
    annualLeaveUsed: string;  // ✅ 新增
    assignedStation: string;  // ✅ 新增
    allowRemote: boolean;     // ✅ 新增
  };
}

export interface AdminDataResponse {
  success: boolean;
  records: AssessmentRecord[];
  questions: string[];
  message?: string;
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

export interface FullShift {
  date: string;
  day: string;
  n1_day: string;
  n1_night: string;
  n2_day: string;
  n2_night: string;
  dayShift: string[];
  nightShift: string[];
  leave: string[];
}

export interface ShiftScheduleResponse<T> {
  success: boolean;
  shifts: T[];
  message?: string;
  colorMap?: Record<string, string>;
}

export interface DeficiencyReportData {
  targetName: string;
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
  photoUrl?: string[];
  auditor: string;
}

export interface UpdateScheduleRequest {
  date: string;
  n1_day: string;
  n1_night: string;
  n2_day: string;
  n2_night: string;
  leave: string[];
}

export interface ClockInData {
  name: string;
  station: string;
  lat: number;
  lng: number;
}

export interface ClockInResponse {
  success: boolean;
  message: string;
  distance?: number;
}