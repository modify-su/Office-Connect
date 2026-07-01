import { Employee, LeaveRequest, SupplyItem, SupplyRequest, SystemSettings, UserAccount, ArchiveRecord, AttendanceRecord } from './types';

export const initialEmployees: Employee[] = [];

export const initialLeaveRequests: LeaveRequest[] = [];

export const initialAttendanceRecords: AttendanceRecord[] = [];

export const initialSupplyItems: SupplyItem[] = [];

export const initialSupplyRequests: SupplyRequest[] = [];

export const defaultSettings: SystemSettings = {
  companyName: 'บริษัท อินโนเวทีฟ ออฟฟิศ โซลูชั่นส์ จำกัด',
  companyAddress: 'อาคารเอไอทาวเวอร์ ชั้น 18, ถ.สุขุมวิท 21 แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพฯ 10110',
  workDays: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'],
  workHoursStart: '08:30',
  workHoursEnd: '17:30',
  maxLeaveDays: {
    sick: 30,
    annual: 12,
    personal: 6
  },
  hasOvertime: true,
  menuPermissions: {
    dashboard: 'all',
    employees: 'admin_only',
    leaves: 'all',
    supplies: 'all',
    documents: 'all',
    archives: 'admin_only'
  },
  departments: [
    'เทคโนโลยีสารสนเทศ (IT)',
    'ทรัพยากรบุคคล (HR)',
    'ฝ่ายขายและการตลาด',
    'บัญชีและการเงิน',
    'ฝ่ายบริหารองค์กร'
  ]
};

export const initialAccounts: UserAccount[] = [
  {
    email: 'admin@office.com',
    username: 'modify',
    password: '1234',
    role: 'admin',
    name: 'ผู้ดูแลระบบ (Admin)'
  },
  {
    email: 'somchai.j@office.co.th',
    username: 'somchai.j',
    password: 'password123',
    role: 'employee',
    employeeId: 'EMP-001',
    name: 'สมชาย ใจดี'
  }
];

// LocalStorage helpers to load/save state
export const getStoredData = () => {
  if (typeof window === 'undefined') {
    return {
      employees: initialEmployees,
      leaveRequests: initialLeaveRequests,
      supplyItems: initialSupplyItems,
      supplyRequests: initialSupplyRequests,
      settings: defaultSettings,
      accounts: initialAccounts,
      archives: [] as ArchiveRecord[],
    };
  }

  try {
    // One-time automatic reset of existing localStorage mock data to keep it fully empty
    const clearedFlag = localStorage.getItem('office_v4_fully_cleared');
    if (!clearedFlag) {
      localStorage.removeItem('office_employees');
      localStorage.removeItem('office_leaves');
      localStorage.removeItem('office_supply_items');
      localStorage.removeItem('office_supply_requests');
      localStorage.removeItem('office_archives');
      localStorage.removeItem('office_documents');
      localStorage.removeItem('office_written_requests');
      localStorage.removeItem('office_attendance');
      localStorage.removeItem('office_session');
      localStorage.setItem('office_v4_fully_cleared', 'true');
    }

    const employeesStr = localStorage.getItem('office_employees');
    const leavesStr = localStorage.getItem('office_leaves');
    const supplyItemsStr = localStorage.getItem('office_supply_items');
    const supplyRequestsStr = localStorage.getItem('office_supply_requests');
    const settingsStr = localStorage.getItem('office_settings');
    const accountsStr = localStorage.getItem('office_accounts');
    const archivesStr = localStorage.getItem('office_archives');
    const attendanceStr = localStorage.getItem('office_attendance');

    let employees = initialEmployees;
    let leaveRequests = initialLeaveRequests;
    let supplyItems = initialSupplyItems;
    let supplyRequests = initialSupplyRequests;
    let settings = defaultSettings;
    let accounts = initialAccounts;
    let archives: ArchiveRecord[] = [];
    let attendanceRecords = initialAttendanceRecords;

    if (employeesStr) {
      try {
        const parsed = JSON.parse(employeesStr);
        if (Array.isArray(parsed)) {
          employees = parsed;
        }
      } catch (e) {
        console.warn('Error parsing employees from storage', e);
      }
    }
    // Ensure default demo employee is always present
    initialEmployees.forEach(initialEmp => {
      if (!employees.some(emp => emp.employeeId === initialEmp.employeeId)) {
        employees.push(initialEmp);
      }
    });

    if (leavesStr) {
      try {
        const parsed = JSON.parse(leavesStr);
        if (Array.isArray(parsed)) {
          leaveRequests = parsed.filter(l => l && !l.id.toString().startsWith('leave-mock'));
        }
      } catch (e) {
        console.warn('Error parsing leave requests from storage', e);
      }
    }

    if (supplyItemsStr) {
      try {
        const parsed = JSON.parse(supplyItemsStr);
        if (Array.isArray(parsed)) {
          supplyItems = parsed.filter(s => s && !s.id.toString().startsWith('supply-mock'));
        }
      } catch (e) {
        console.warn('Error parsing supply items from storage', e);
      }
    }

    if (supplyRequestsStr) {
      try {
        const parsed = JSON.parse(supplyRequestsStr);
        if (Array.isArray(parsed)) {
          supplyRequests = parsed.filter(r => r && !r.id.toString().startsWith('req-'));
        }
      } catch (e) {
        console.warn('Error parsing supply requests from storage', e);
      }
    }

    if (settingsStr) {
      try {
        const parsed = JSON.parse(settingsStr);
        if (parsed && typeof parsed === 'object') {
          settings = { ...defaultSettings, ...parsed };
        }
      } catch (e) {
        console.warn('Error parsing settings from storage', e);
      }
    }

    if (accountsStr) {
      try {
        const parsed = JSON.parse(accountsStr);
        if (Array.isArray(parsed)) {
          accounts = parsed;
        }
      } catch (e) {
        console.warn('Error parsing accounts from storage', e);
      }
    } else {
      localStorage.setItem('office_accounts', JSON.stringify(initialAccounts));
    }
    // Ensure default accounts are always present
    initialAccounts.forEach(initialAcc => {
      if (!accounts.some(acc => acc.email.toLowerCase() === initialAcc.email.toLowerCase())) {
        accounts.push(initialAcc);
      }
    });

    if (archivesStr) {
      try {
        const parsed = JSON.parse(archivesStr);
        if (Array.isArray(parsed)) {
          archives = parsed;
        }
      } catch (e) {
        console.warn('Error parsing archives from storage', e);
      }
    }

    if (attendanceStr) {
      try {
        const parsed = JSON.parse(attendanceStr);
        if (Array.isArray(parsed)) {
          attendanceRecords = parsed;
        }
      } catch (e) {
        console.warn('Error parsing attendance from storage', e);
      }
    } else {
      localStorage.setItem('office_attendance', JSON.stringify(initialAttendanceRecords));
    }

    return {
      employees,
      leaveRequests,
      supplyItems,
      supplyRequests,
      settings,
      accounts,
      archives,
      attendanceRecords,
    };
  } catch (error) {
    console.error('Error reading localStorage, reverting to defaults', error);
    return {
      employees: initialEmployees,
      leaveRequests: initialLeaveRequests,
      supplyItems: initialSupplyItems,
      supplyRequests: initialSupplyRequests,
      settings: defaultSettings,
      accounts: initialAccounts,
      archives: [] as ArchiveRecord[],
      attendanceRecords: initialAttendanceRecords,
    };
  }
};

export const saveStoredData = (data: {
  employees?: Employee[];
  leaveRequests?: LeaveRequest[];
  supplyItems?: SupplyItem[];
  supplyRequests?: SupplyRequest[];
  settings?: SystemSettings;
  accounts?: UserAccount[];
  archives?: ArchiveRecord[];
  attendanceRecords?: AttendanceRecord[];
}) => {
  if (typeof window === 'undefined') return;

  try {
    if (data.employees) localStorage.setItem('office_employees', JSON.stringify(data.employees));
    if (data.leaveRequests) localStorage.setItem('office_leaves', JSON.stringify(data.leaveRequests));
    if (data.supplyItems) localStorage.setItem('office_supply_items', JSON.stringify(data.supplyItems));
    if (data.supplyRequests) localStorage.setItem('office_supply_requests', JSON.stringify(data.supplyRequests));
    if (data.settings) localStorage.setItem('office_settings', JSON.stringify(data.settings));
    if (data.accounts) localStorage.setItem('office_accounts', JSON.stringify(data.accounts));
    if (data.archives) localStorage.setItem('office_archives', JSON.stringify(data.archives));
    if (data.attendanceRecords) localStorage.setItem('office_attendance', JSON.stringify(data.attendanceRecords));
  } catch (error) {
    console.warn('Unable to write to localStorage (sandboxed iframe or storage quota exceeded):', error);
  }
};
