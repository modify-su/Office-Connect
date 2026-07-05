export type EmployeeStatus = 'active' | 'leave' | 'suspended';

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  startDate: string;
  status: EmployeeStatus;
  avatar: string;
  personalId: string;
  birthDate: string;
  address: string;
  emergencyContact: EmergencyContact;
  verificationStatus?: 'verified' | 'pending';
}

export type LeaveType = 'sick' | 'annual' | 'personal' | 'maternity' | 'other' | 'swap';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  swapFromDate?: string;
  swapToDate?: string;
}

export interface SupplyItem {
  id: string;
  code: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  price: number;
}

export type SupplyRequestStatus = 'pending' | 'approved' | 'rejected';

export interface SupplyRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  itemId: string;
  itemName: string;
  quantity: number;
  purpose: string;
  status: SupplyRequestStatus;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface SystemSettings {
  companyName: string;
  companyAddress: string;
  workDays: string[];
  workHoursStart: string;
  workHoursEnd: string;
  maxLeaveDays: {
    sick: number;
    annual: number;
    personal: number;
  };
  hasOvertime: boolean;
  menuPermissions?: Record<string, 'all' | 'admin_only'>;
  departments?: string[];
  loginLogoUrl?: string;
  loginTitle?: string;
  loginSubtitle?: string;
}

export interface UserAccountPermissions {
  canApproveLeave?: boolean;
  canApproveSupply?: boolean;
  canManageEmployees?: boolean;
  canManageSettings?: boolean;
  canViewArchives?: boolean;
}

export interface UserAccount {
  email: string;
  username?: string;
  password?: string;
  role: 'admin' | 'employee';
  employeeId?: string;
  name: string;
  requiresPasswordChange?: boolean;
  permissions?: UserAccountPermissions;
}

export interface ArchiveRecord {
  id: string;
  archiveName: string;
  archivedAt: string;
  dateRange: string;
  notes: string;
  stats: {
    totalEmployees: number;
    totalLeaveRequests: number;
    totalLeaveDays: number;
    approvedLeavesCount: number;
    sickLeavesCount: number;
    annualLeavesCount: number;
    personalLeavesCount: number;
    totalSupplyRequests: number;
    approvedSupplyRequestsCount: number;
    totalDispensedUnits: number;
    lowStockCount: number;
  };
  snapshot: {
    employees: Employee[];
    leaveRequests: LeaveRequest[];
    supplyItems: SupplyItem[];
    supplyRequests: SupplyRequest[];
  };
}

export type AttendanceType = 'clock_in' | 'clock_out' | 'late' | 'overtime';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  time: string;
  type: AttendanceType;
  otHours?: number;
  notes?: string;
  recordedBy: string;
}

