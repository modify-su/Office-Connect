import { Employee, LeaveRequest, SupplyItem, SupplyRequest, SystemSettings, UserAccount, ArchiveRecord, AttendanceRecord } from './types';

export const initialEmployees: Employee[] = [
  {
    id: 'emp-001',
    employeeId: 'EMP-001',
    firstName: 'สมชาย',
    lastName: 'ใจดี',
    position: 'ผู้จัดการฝ่ายไอที',
    department: 'เทคโนโลยีสารสนเทศ (IT)',
    email: 'somchai.j@office.co.th',
    phone: '081-234-5678',
    startDate: '2025-01-15',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    personalId: '1100100234567',
    birthDate: '1990-05-20',
    address: '123/45 ซอยสุขุมวิท 23 แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพฯ 10110',
    emergencyContact: {
      name: 'นางพรรณลดา ใจดี',
      relationship: 'ภรรยา',
      phone: '089-876-5432'
    },
    verificationStatus: 'pending'
  },
  {
    id: 'emp-002',
    employeeId: 'EMP-002',
    firstName: 'สมใจ',
    lastName: 'รักดี',
    position: 'เจ้าหน้าที่สรรหาบุคลากร',
    department: 'ทรัพยากรบุคคล (HR)',
    email: 'somjai.r@office.co.th',
    phone: '082-345-6789',
    startDate: '2025-03-01',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    personalId: '1100200345678',
    birthDate: '1993-08-14',
    address: '456/78 ถ.รัชดาภิเษก แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310',
    emergencyContact: {
      name: 'นายวิทยา รักดี',
      relationship: 'บิดา',
      phone: '088-765-4321'
    },
    verificationStatus: 'pending'
  },
  {
    id: 'emp-003',
    employeeId: 'EMP-003',
    firstName: 'อนันต์',
    lastName: 'รุ่งเรือง',
    position: 'เจ้าหน้าที่ฝ่ายขายอาวุโส',
    department: 'ฝ่ายขายและการตลาด',
    email: 'anant.r@office.co.th',
    phone: '083-456-7890',
    startDate: '2024-06-10',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150',
    personalId: '1100300456789',
    birthDate: '1988-11-05',
    address: '789/12 ซอยพหลโยธิน 32 แขวงเสนานิคม เขตจตุจักร กรุงเทพฯ 10900',
    emergencyContact: {
      name: 'นางศิริพรรณ รุ่งเรือง',
      relationship: 'มารดา',
      phone: '087-654-3210'
    },
    verificationStatus: 'pending'
  }
];

export const initialLeaveRequests: LeaveRequest[] = [];

export const initialAttendanceRecords: AttendanceRecord[] = [];

export const initialSupplyItems: SupplyItem[] = [
  {
    id: 'sup-001',
    code: 'SUP-001',
    name: 'กระดาษดับเบิ้ลเอ A4 80 แกรม',
    category: 'เครื่องเขียน',
    stock: 50,
    minStock: 10,
    unit: 'รีม',
    price: 135
  },
  {
    id: 'sup-002',
    code: 'SUP-002',
    name: 'ปากกาลูกลื่นสีน้ำเงิน Lancer (กล่อง 50 ด้าม)',
    category: 'เครื่องเขียน',
    stock: 12,
    minStock: 5,
    unit: 'กล่อง',
    price: 150
  },
  {
    id: 'sup-003',
    code: 'SUP-003',
    name: 'หน้ากากอนามัย 3 ชั้น (กล่อง 50 ชิ้น)',
    category: 'เวชภัณฑ์',
    stock: 30,
    minStock: 8,
    unit: 'กล่อง',
    price: 75
  },
  {
    id: 'sup-004',
    code: 'SUP-004',
    name: 'สายชาร์จ USB-C to USB-C (1.2 เมตร)',
    category: 'เทคโนโลยี',
    stock: 15,
    minStock: 3,
    unit: 'เส้น',
    price: 290
  },
  {
    id: 'sup-005',
    code: 'SUP-005',
    name: 'น้ำยาล้างจาน 3M (ถัง 3.8 ลิตร)',
    category: 'อื่นๆ',
    stock: 4,
    minStock: 2,
    unit: 'ถัง',
    price: 185
  }
];

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
  otStartTime: '18:00',
  otRate: 1.5,
  lateThresholdMins: 15,
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
  ],
  loginLogoUrl: '',
  loginTitle: 'OfficeConnect',
  loginSubtitle: 'ระบบบริหารจัดการและประมวลผลข้อมูลองค์กรแบบเรียลไทม์',
  supplyCategories: [
    'เครื่องเขียน',
    'อุปกรณ์สำนักงาน',
    'เวชภัณฑ์',
    'เทคโนโลยี',
    'อื่นๆ'
  ],
  lineChannelToken: 'eyJhY2Nlc3NUb2tlbiI6ImxpbmUtYm90LWNoYW5uZWwtYWNjZXNzLXRva2VuLXNpbXVsYXRlZC0yMDI2In0=',
  lineChannelSecret: '8f92a4e5100fbd451833aa3b34ff60b3',
  lineWebhookUrl: 'https://ais-dev-bmco3xexmw2r26vzq6bz4v-713032521366.asia-southeast1.run.app/api/line/webhook'
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
