export interface User {
  name: string;
  jobTitle: string;
  jobGrade: string;
  yearsOfService: string;
  kpi: string;             // I 欄：年度KPI
  kpiWeightedAvg?: string; // AD 欄：年度加權平均
  kpiMonth?: string;       // AE 欄：當月KPI進度（不含當周）
  kpiWeek?: string;        // AF 欄：當周KPI進度
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
  kpiWeightedAvg?: string;
  kpiMonth?: string;
  kpiWeek?: string;
  salary: string;
  permission: boolean;
  color: string;
  canEditSchedule: boolean;
  annualLeave: string;
  annualLeaveUsed: string;
  assignedStation?: string;
  allowRemote?: boolean;
  password?: string;
  hasPassword?: boolean;
}

export interface DeficiencyRecord {
  name: string;
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
  auditor?: string;
  photoUrl?: string;
  ticketUrl?: string;
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
    kpiWeightedAvg?: string;
    kpiMonth?: string;
    kpiWeek?: string;
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

// 新版稽核回報送出格式（寫入「缺失紀錄表」）
export interface DeficiencyReportData {
  zone: string;            // 分區 N1/N2/C1/C2/S1/S2
  targetName: string;
  station: string;
  date: string;
  auditType: string;       // 工單/月保養/半年保養/年度保養
  ticketNo?: string;
  hasDeficiency: string;   // 無缺失/有缺失
  deficiencies: Record<string, { text: string; score: string }>;
  photoUrl?: string[];
  auditor: string;
}

// ===== 稽核紀錄顯示（新舊格式並存） =====
export interface DeficiencyItemV2 {
  label: string;   // 缺失項目分類名稱
  text: string;    // 缺失內容
  count: string;   // 缺失筆數
}

export interface DeficiencyRecordV2 {
  version: 'v2';
  zone: string;
  name: string;
  station: string;
  date: string;
  auditType: string;
  ticketNo?: string;
  ticketUrl?: string;
  items: DeficiencyItemV2[];  // 空陣列 = 無缺失
  photoUrl?: string;
  auditor?: string;
}

export type DeficiencyRecordV1 = DeficiencyRecord & { version?: 'v1' };
export type AnyDeficiencyRecord = DeficiencyRecordV1 | DeficiencyRecordV2;

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
  accuracy: number; // 新增
  type: string;     // 新增
}

export interface ClockInResponse {
  success: boolean;
  message: string;
  distance?: number;
}
