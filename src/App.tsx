import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  CalendarDays, 
  Package, 
  Settings as SettingsIcon, 
  LayoutDashboard, 
  Menu, 
  X, 
  CircleDot,
  Bell,
  Clock,
  LogOut,
  Building2,
  Calendar,
  Hash,
  Database,
  AlertTriangle,
  Archive,
  FolderClosed
} from 'lucide-react';

import { Employee, LeaveRequest, SupplyItem, SupplyRequest, SystemSettings, UserAccount, ArchiveRecord, AttendanceRecord } from './types';
import { getStoredData, saveStoredData, initialEmployees, initialLeaveRequests, initialSupplyItems, initialSupplyRequests, defaultSettings, initialAttendanceRecords } from './data';

// Import sections
import Dashboard from './components/Dashboard';
import EmployeeSection from './components/EmployeeSection';
import LeaveSection from './components/LeaveSection';
import SupplySection from './components/SupplySection';
import SettingsSection from './components/SettingsSection';
import LoginAuth from './components/LoginAuth';
import DocumentSection from './components/DocumentSection';
import AttendanceSection from './components/AttendanceSection';

export default function App() {
  const stored = getStoredData();

  // Core application states
  const [employees, setEmployees] = useState<Employee[]>(stored.employees);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(stored.leaveRequests);
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>(stored.supplyItems);
  const [supplyRequests, setSupplyRequests] = useState<SupplyRequest[]>(stored.supplyRequests);
  const [settings, setSettings] = useState<SystemSettings>(stored.settings);
  const [accounts, setAccounts] = useState<UserAccount[]>(stored.accounts || []);
  const [archives, setArchives] = useState<ArchiveRecord[]>(stored.archives || []);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(stored.attendanceRecords || []);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    if (typeof window !== 'undefined') {
      const storedSession = localStorage.getItem('office_session');
      if (storedSession) {
        try {
          const parsed = JSON.parse(storedSession);
          if (parsed && parsed.role === 'employee' && !parsed.employeeId) {
            // Heal the session by pointing it to Somchai
            parsed.employeeId = 'EMP-001';
            parsed.email = 'somchai.j@office.co.th';
            parsed.name = 'สมชาย ใจดี';
            localStorage.setItem('office_session', JSON.stringify(parsed));
          }
          return parsed;
        } catch (e) {
          console.warn('Stale session discarded', e);
        }
      }
    }
    return null;
  });

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Deep-link triggers
  const [openEmployeeAdd, setOpenEmployeeAdd] = useState(false);
  const [openLeaveAdd, setOpenLeaveAdd] = useState(false);
  const [openSupplyAdd, setOpenSupplyAdd] = useState(false);

  // UTC or Local Date configuration
  const formattedDateString = "วันอังคารที่ 23 มิถุนายน พ.ศ. 2569";

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onCallback: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  } | null>(null);

  const requestConfirm = (
    title: string,
    message: string,
    onCallback: () => void,
    isDanger = false,
    confirmText = 'ยืนยัน',
    cancelText = 'ยกเลิก'
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onCallback,
      confirmText,
      cancelText,
      isDanger
    });
  };

  // State modification handlers
  const handleAddEmployee = (emp: Omit<Employee, 'id'>) => {
    const newEmp: Employee = {
      ...emp,
      id: `emp-${Date.now()}`
    };
    const nextList = [newEmp, ...employees];
    setEmployees(nextList);
    saveStoredData({ employees: nextList });
  };

  const handleAddEmployeeBatch = (newEmps: Omit<Employee, 'id'>[]) => {
    const formattedEmps: Employee[] = newEmps.map((emp, idx) => ({
      ...emp,
      id: `emp-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`
    }));
    const nextList = [...formattedEmps, ...employees];
    setEmployees(nextList);
    saveStoredData({ employees: nextList });
  };

  const handleEditEmployee = (editedEmp: Employee) => {
    const nextList = employees.map(e => e.id === editedEmp.id ? editedEmp : e);
    setEmployees(nextList);
    saveStoredData({ employees: nextList });
  };

  const handleDeleteEmployee = (id: string) => {
    const nextList = employees.filter(e => e.id !== id);
    setEmployees(nextList);
    saveStoredData({ employees: nextList });
  };

  const handleAddLeaveRequest = (req: Omit<LeaveRequest, 'id' | 'createdAt'>) => {
    const newReq: LeaveRequest = {
      ...req,
      id: `leave-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    const nextList = [newReq, ...leaveRequests];
    setLeaveRequests(nextList);
    saveStoredData({ leaveRequests: nextList });
  };

  const handleApproveLeave = (id: string) => {
    const updatedLeaves = leaveRequests.map(l => {
      if (l.id === id) {
        return { 
          ...l, 
          status: 'approved' as const,
          reviewedBy: 'ฝ่ายบุคคล (Admin)',
          reviewedAt: new Date().toISOString().split('T')[0]
        };
      }
      return l;
    });
    setLeaveRequests(updatedLeaves);

    // Also look up employee and temporarily set status to 'leave'
    const targetLeave = leaveRequests.find(l => l.id === id);
    if (targetLeave) {
      const updatedEmployees = employees.map(emp => {
        if (emp.employeeId === targetLeave.employeeId) {
          return { ...emp, status: 'leave' as const };
        }
        return emp;
      });
      setEmployees(updatedEmployees);
      saveStoredData({ leaveRequests: updatedLeaves, employees: updatedEmployees });
    } else {
      saveStoredData({ leaveRequests: updatedLeaves });
    }
  };

  const handleRejectLeave = (id: string) => {
    const nextList = leaveRequests.map(l => l.id === id ? { ...l, status: 'rejected' as const } : l);
    setLeaveRequests(nextList);
    saveStoredData({ leaveRequests: nextList });
  };

  const handleAddSupplyItem = (item: Omit<SupplyItem, 'id' | 'code'>) => {
    const maxCode = supplyItems.reduce((max, sit) => {
      const num = parseInt(sit.code.replace('SUP-', ''));
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    const newCode = `SUP-${String(maxCode + 1).padStart(3, '0')}`;
    
    const newItem: SupplyItem = {
      ...item,
      id: `supply-${Date.now()}`,
      code: newCode
    };
    const nextList = [newItem, ...supplyItems];
    setSupplyItems(nextList);
    saveStoredData({ supplyItems: nextList });
  };

  const handleRestockItem = (id: string, amount: number) => {
    const nextList = supplyItems.map(item => {
      if (item.id === id) {
        return { ...item, stock: item.stock + amount };
      }
      return item;
    });
    setSupplyItems(nextList);
    saveStoredData({ supplyItems: nextList });
  };

  const handleAddSupplyRequest = (reqOrReqs: Omit<SupplyRequest, 'id' | 'createdAt' | 'status'> | Omit<SupplyRequest, 'id' | 'createdAt' | 'status'>[]) => {
    const isArray = Array.isArray(reqOrReqs);
    const reqsToProcess = isArray ? reqOrReqs : [reqOrReqs];
    
    const newRequests: SupplyRequest[] = reqsToProcess.map((req, index) => ({
      ...req,
      id: `req-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'pending'
    }));

    const nextList = [...newRequests, ...supplyRequests];
    setSupplyRequests(nextList);
    saveStoredData({ supplyRequests: nextList });
  };

  const handleApproveSupplyRequest = (id: string) => {
    const targetReq = supplyRequests.find(r => r.id === id);
    if (!targetReq) return;

    // Check if the stock has enough items
    const targetItem = supplyItems.find(item => item.id === targetReq.itemId);
    if (!targetItem) {
      alert('ไม่พบวัสดุอุปกรณ์ชิ้นนี้ในสต็อก');
      return;
    }
    if (targetItem.stock < targetReq.quantity) {
      alert(`ไม่สามารถอนุมัติได้เนื่องจากพัสดุ ${targetItem.name} มีสต็อกคงเหลือ (${targetItem.stock}) น้อยกว่าจำนวนที่ขอเบิก (${targetReq.quantity})`);
      return;
    }

    // Deduct stock
    const updatedInventory = supplyItems.map(item => {
      if (item.id === targetReq.itemId) {
        return { ...item, stock: item.stock - targetReq.quantity };
      }
      return item;
    });
    setSupplyItems(updatedInventory);

    // Update request state
    const updatedRequests = supplyRequests.map(r => r.id === id ? { ...r, status: 'approved' as const } : r);
    setSupplyRequests(updatedRequests);

    saveStoredData({
      supplyItems: updatedInventory,
      supplyRequests: updatedRequests
    });
  };

  const handleRejectSupplyRequest = (id: string) => {
    const nextList = supplyRequests.map(r => r.id === id ? { ...r, status: 'rejected' as const } : r);
    setSupplyRequests(nextList);
    saveStoredData({ supplyRequests: nextList });
  };

  const handleUpdateSettings = (updatedSettings: SystemSettings) => {
    setSettings(updatedSettings);
    saveStoredData({ settings: updatedSettings });
  };

  const handleResetAllState = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('office_employees');
        localStorage.removeItem('office_leaves');
        localStorage.removeItem('office_supply_items');
        localStorage.removeItem('office_supply_requests');
        localStorage.removeItem('office_settings');
        localStorage.removeItem('office_accounts');
        localStorage.removeItem('office_session');
        localStorage.removeItem('office_archives');
        localStorage.removeItem('office_attendance');
      } catch (error) {
        console.warn('Unable to clean localStorage:', error);
      }
      
      setEmployees(initialEmployees);
      setLeaveRequests(initialLeaveRequests);
      setSupplyItems(initialSupplyItems);
      setSupplyRequests(initialSupplyRequests);
      setSettings(defaultSettings);
      setArchives([]);
      setAttendanceRecords(initialAttendanceRecords);
      
      window.location.reload();
    }
  };

  const handleRegisterEmployee = (newEmployee: Omit<Employee, 'id'>, newAccount: UserAccount) => {
    const freshEmployee: Employee = {
      ...newEmployee,
      id: `emp-${Date.now()}`
    };
    const updatedEmployeesList = [freshEmployee, ...employees];
    const updatedAccountsList = [newAccount, ...accounts];

    setEmployees(updatedEmployeesList);
    setAccounts(updatedAccountsList);

    saveStoredData({ 
      employees: updatedEmployeesList,
      accounts: updatedAccountsList
    });
  };

  const handleUpdatePassword = (email: string, newPass: string, clearRequiresPasswordChange?: boolean) => {
    const updatedAccountsList = accounts.map(acc => {
      if (acc.email.toLowerCase() === email.toLowerCase().trim()) {
        const updated: UserAccount = { ...acc, password: newPass };
        if (clearRequiresPasswordChange !== undefined) {
          updated.requiresPasswordChange = !clearRequiresPasswordChange;
        }
        return updated;
      }
      return acc;
    });
    setAccounts(updatedAccountsList);
    saveStoredData({
      accounts: updatedAccountsList
    });
  };

  const handleAddAccount = (acc: UserAccount) => {
    const updatedAccountsList = [acc, ...accounts];
    setAccounts(updatedAccountsList);
    saveStoredData({
      accounts: updatedAccountsList
    });
  };

  const handleDeleteAccount = (email: string) => {
    const updatedAccountsList = accounts.filter(acc => acc.email.toLowerCase() !== email.toLowerCase().trim());
    setAccounts(updatedAccountsList);
    saveStoredData({
      accounts: updatedAccountsList
    });
  };

  const handleAddArchive = (newArch: ArchiveRecord) => {
    const nextList = [newArch, ...archives];
    setArchives(nextList);
    saveStoredData({ archives: nextList });
  };

  const handleDeleteArchive = (id: string) => {
    const nextList = archives.filter(a => a.id !== id);
    setArchives(nextList);
    saveStoredData({ archives: nextList });
  };

  const handleAddAttendance = (record: AttendanceRecord) => {
    const nextList = [record, ...attendanceRecords];
    setAttendanceRecords(nextList);
    saveStoredData({ attendanceRecords: nextList });
  };

  const handleAddAttendanceBatch = (records: AttendanceRecord[]) => {
    const nextList = [...records, ...attendanceRecords];
    setAttendanceRecords(nextList);
    saveStoredData({ attendanceRecords: nextList });
  };

  const handleDeleteAttendance = (id: string) => {
    const nextList = attendanceRecords.filter(rec => rec.id !== id);
    setAttendanceRecords(nextList);
    saveStoredData({ attendanceRecords: nextList });
  };

  const handleImportFullState = (full: any) => {
    if (full.employees) saveStoredData({ employees: full.employees });
    if (full.leaveRequests) saveStoredData({ leaveRequests: full.leaveRequests });
    if (full.supplyItems) saveStoredData({ supplyItems: full.supplyItems });
    if (full.supplyRequests) saveStoredData({ supplyRequests: full.supplyRequests });
    if (full.settings) saveStoredData({ settings: full.settings });
    if (full.accounts) saveStoredData({ accounts: full.accounts });
    if (full.archives) saveStoredData({ archives: full.archives });
    if (full.attendanceRecords) saveStoredData({ attendanceRecords: full.attendanceRecords });
    
    if (full.employees) setEmployees(full.employees);
    if (full.leaveRequests) setLeaveRequests(full.leaveRequests);
    if (full.supplyItems) setSupplyItems(full.supplyItems);
    if (full.supplyRequests) setSupplyRequests(full.supplyRequests);
    if (full.settings) setSettings(full.settings);
    if (full.accounts) setAccounts(full.accounts);
    if (full.archives) setArchives(full.archives);
    if (full.attendanceRecords) setAttendanceRecords(full.attendanceRecords);
  };

  // Resolve current active logged-in employee detail if it is not an admin
  const activeEmployeeDetail = currentUser?.role === 'employee' 
    ? employees.find(e => e.employeeId === currentUser.employeeId) 
    : null;

  const checkTabPermission = (tabId: string) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (tabId === 'backup' || tabId === 'settings') return false;
    if (tabId === 'employees' && currentUser.role === 'employee') return true;
    const perm = settings.menuPermissions?.[tabId] ?? (
      (tabId === 'employees' || tabId === 'archives') ? 'admin_only' : 'all'
    );
    return perm !== 'admin_only';
  };

  // Nav items configuration
  const navigationItems = [
    { id: 'dashboard', label: 'ภาพรวมระบบ', icon: LayoutDashboard },
    { id: 'employees', label: currentUser?.role === 'employee' ? 'ประวัติส่วนตัว' : 'ข้อมูลพนักงาน', icon: Users },
    { id: 'leaves', label: 'การลางาน', icon: CalendarDays },
    { id: 'attendance', label: 'ระบบลงเวลาทำงาน', icon: Clock },
    { id: 'supplies', label: 'เบิกจ่ายพัสดุ', icon: Package },
    { id: 'documents', label: 'แฟ้มเอกสาร', icon: FolderClosed },
    currentUser?.role === 'admin' && { id: 'settings', label: 'ตั้งค่าระบบ', icon: SettingsIcon },
  ].filter(Boolean)
    .filter(item => {
      if (!currentUser) return false;
      if (currentUser.role === 'admin') return true;
      if (item.id === 'settings') return false;
      if (item.id === 'employees' && currentUser.role === 'employee') return true;
      const perm = settings.menuPermissions?.[item.id] ?? (
        (item.id === 'employees') ? 'admin_only' : 'all'
      );
      return perm !== 'admin_only';
    }) as { id: string; label: string; icon: any }[];

  if (!currentUser) {
    return (
      <LoginAuth 
        accounts={accounts}
        employees={employees}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          localStorage.setItem('office_session', JSON.stringify(user));
        }}
        onRegisterCustomEmployee={handleRegisterEmployee}
        onUpdateAccountPassword={handleUpdatePassword}
        departments={settings.departments || []}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800 font-sans" id="applet-main-layout">
      
      {/* SIDEBAR NAVIGATION (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 min-h-screen p-5 border-r border-slate-800 flex-shrink-0 z-20" id="desktop-sidebar">
        {/* Core Brand Header */}
        <div className="p-2 flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
            O
          </div>
          <div>
            <span className="text-white font-bold text-lg tracking-tight block">OfficeConnect</span>
            <span className="text-[10px] text-slate-500 font-medium">ระบบสารสนเทศออฟฟิศ</span>
          </div>
        </div>

        {/* User Session Info Card (No Switcher) */}
        <div className="my-4 px-3 py-3 bg-slate-800/50 rounded-xl border border-slate-800/80 flex items-center gap-3" id="user-session-info-card">
          <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs shadow-sm overflow-hidden flex-shrink-0">
            {currentUser?.role === 'admin' ? (
              'AD'
            ) : (
              activeEmployeeDetail?.avatar && (activeEmployeeDetail.avatar.startsWith('data:image') || activeEmployeeDetail.avatar.startsWith('http') || activeEmployeeDetail.avatar.startsWith('/')) ? (
                <img src={activeEmployeeDetail.avatar} className="w-full h-full object-cover" alt="Avatar" referrerPolicy="no-referrer" />
              ) : (
                activeEmployeeDetail?.avatar || activeEmployeeDetail?.firstName?.slice(0, 2) || 'EM'
              )
            )}
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1">
              {currentUser?.role === 'admin' ? 'SYSTEM ADMIN' : 'STAFF MEMBER'}
            </span>
            <span className="block text-white font-semibold text-xs truncate" title={currentUser?.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : `${activeEmployeeDetail?.firstName || 'พนักงาน'} ${activeEmployeeDetail?.lastName || ''}`}>
              {currentUser?.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : `${activeEmployeeDetail?.firstName || 'พนักงาน'} ${activeEmployeeDetail?.lastName || ''}`}
            </span>
            <span className="block text-[10px] text-slate-400 font-mono truncate">
              {currentUser?.role === 'admin' ? 'IT / HR Dept' : currentUser?.employeeId}
            </span>
          </div>
        </div>

        {/* Links stack */}
        <nav className="flex-1 space-y-1 mt-4" id="desktop-nav-menu">
          {navigationItems.map((item) => {
            const IsActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  IsActive 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer details */}
        <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 space-y-2">
          <p className="font-mono truncate text-slate-400 px-1" title={settings.companyName}>
            🏢 {settings.companyName}
          </p>
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800/50 flex flex-col gap-1 text-[10px] text-slate-400 mb-2">
            <span className="text-slate-300 font-semibold">เวลาทำงาน:</span>
            <span>⏱️ {settings.workHoursStart} - {settings.workHoursEnd} น.</span>
            <span>📅 {settings.workDays.join(', ')}</span>
          </div>
          
          <button
            onClick={() => {
              requestConfirm(
                'ยืนยันการออกจากระบบ',
                'คุณต้องการออกจากระบบสารสนเทศนี้ใช่หรือไม่?',
                () => {
                  setCurrentUser(null);
                  localStorage.removeItem('office_session');
                  setActiveTab('dashboard');
                }
              );
            }}
            className="w-full flex items-center justify-center gap-2 py-2 bg-rose-950/20 hover:bg-rose-900/60 border border-rose-950/60 hover:border-rose-850 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            id="sidebar-btn-logout"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-450" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER (Phones & Tablets) */}
      <header className="md:hidden bg-slate-900 text-slate-300 p-4 flex items-center justify-between border-b border-slate-800 sticky top-0 z-30" id="mobile-header">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold">
            O
          </div>
          <div>
            <h2 className="font-bold text-white text-sm tracking-tight leading-tight">
              OfficeConnect
            </h2>
            <p className="text-[9px] text-slate-500 font-mono">ระบบจัดการออฟฟิศ</p>
          </div>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition cursor-pointer"
          id="btn-mobile-menu-toggle"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* MOBILE EXPANDED MENU DRAWER */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-slate-950 border-b border-slate-800 text-slate-300 absolute w-full left-0 top-[69px] z-20 shadow-xl overflow-hidden"
            id="mobile-nav-panel"
          >
            {/* User Session Info Card (No Switcher) */}
            <div className="p-4 border-b border-slate-900 bg-slate-900/60 mb-2 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xs shadow-sm overflow-hidden flex-shrink-0">
                {currentUser?.role === 'admin' ? (
                  'AD'
                ) : (
                  activeEmployeeDetail?.avatar && (activeEmployeeDetail.avatar.startsWith('data:image') || activeEmployeeDetail.avatar.startsWith('http') || activeEmployeeDetail.avatar.startsWith('/')) ? (
                    <img src={activeEmployeeDetail.avatar} className="w-full h-full object-cover" alt="Avatar" referrerPolicy="no-referrer" />
                  ) : (
                    activeEmployeeDetail?.avatar || activeEmployeeDetail?.firstName?.slice(0, 2) || 'EM'
                  )
                )}
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1">
                  {currentUser?.role === 'admin' ? 'SYSTEM ADMIN' : 'STAFF MEMBER'}
                </span>
                <span className="block text-white font-semibold text-xs truncate" title={currentUser?.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : `${activeEmployeeDetail?.firstName || 'พนักงาน'} ${activeEmployeeDetail?.lastName || ''}`}>
                  {currentUser?.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : `${activeEmployeeDetail?.firstName || 'พนักงาน'} ${activeEmployeeDetail?.lastName || ''}`}
                </span>
                <span className="block text-[10px] text-slate-400 font-mono truncate">
                  {currentUser?.role === 'admin' ? 'IT / HR Dept' : currentUser?.employeeId}
                </span>
              </div>
            </div>

            <nav className="p-4 pt-0 space-y-1">
              {navigationItems.map((item) => {
                const IsActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition cursor-pointer ${
                      IsActive 
                        ? 'bg-blue-600 text-white' 
                        : 'hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    <item.icon className="w-4.5 h-4.5" />
                    {item.label}
                  </button>
                );
              })}

              <button
                onClick={() => {
                  requestConfirm(
                    'ยืนยันการออกจากระบบ',
                    'คุณต้องการออกจากระบบสารสนเทศนี้ใช่หรือไม่?',
                    () => {
                      setCurrentUser(null);
                      localStorage.removeItem('office_session');
                      setIsMobileMenuOpen(false);
                      setActiveTab('dashboard');
                    }
                  );
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-rose-400 hover:bg-slate-900 transition cursor-pointer mt-2 border border-slate-900"
                id="mobile-btn-logout"
              >
                <LogOut className="w-4.5 h-4.5 text-rose-400" />
                <span>ออกจากระบบ (ออกจากบัญชี)</span>
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTAINER CONTENT */}
      <main className="flex-1 flex flex-col min-w-0" id="main-content-wrapper">
        
        {/* TOP STATUS BAR CONTAINER */}
        <div className="bg-white h-20 px-8 border-b border-slate-200 hidden md:flex items-center justify-between" id="top-status-bar">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 transition-all font-sans">
              {activeTab === 'dashboard' ? 'ภาพรวมระบบ' : activeTab === 'employees' ? (currentUser?.role === 'employee' ? 'ประวัติส่วนตัว' : 'ข้อมูลพนักงาน') : activeTab === 'leaves' ? 'การลางาน' : activeTab === 'attendance' ? 'ระบบลงเวลาทำงาน' : activeTab === 'supplies' ? 'เบิกจ่ายพัสดุ' : activeTab === 'documents' ? 'แฟ้มเอกสาร & ยื่นคำร้อง' : activeTab === 'archives' ? 'สรุปข้อมูลย้อนหลัง' : activeTab === 'backup' ? 'สำรอง & ซิงค์ข้อมูล' : 'ตั้งค่าระบบ'}
            </h1>
            <p className="text-sm text-slate-500">
              {currentUser?.role === 'admin' ? (
                `ยินดีต้อนรับกลับมา, ผู้ดูแลระบบ HR (Admin) • ${formattedDateString}`
              ) : (
                `ยินดีต้อนรับกลับมา, คุณ${activeEmployeeDetail?.firstName || 'พนักงาน'} (${currentUser?.employeeId}) • ${formattedDateString}`
              )}
            </p>
          </div>

          <div className="flex items-center gap-4" id="topbar-user-profiles">
            {/* Notify mock status */}
            <div className="relative p-1.5 hover:bg-slate-150 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer">
              <Bell className="w-5 h-5 text-slate-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </div>
            
            <div className="flex items-center gap-3 border-l pl-4 border-slate-200">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shadow-sm overflow-hidden">
                {currentUser?.role === 'admin' ? (
                  'AD'
                ) : (
                  activeEmployeeDetail?.avatar && (activeEmployeeDetail.avatar.startsWith('data:image') || activeEmployeeDetail.avatar.startsWith('http') || activeEmployeeDetail.avatar.startsWith('/')) ? (
                    <img src={activeEmployeeDetail.avatar} className="w-full h-full object-cover" alt="Avatar" referrerPolicy="no-referrer" />
                  ) : (
                    activeEmployeeDetail?.avatar || activeEmployeeDetail?.firstName?.slice(0, 2) || 'EM'
                  )
                )}
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-800">
                  {currentUser?.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : `${activeEmployeeDetail?.firstName || 'พนักงาน'} ${activeEmployeeDetail?.lastName || ''}`}
                </div>
                <div className="text-xs text-slate-400">
                  {currentUser?.role === 'admin' ? 'IT / HR Senior Manager' : `${activeEmployeeDetail?.position || 'พนักงานปฏิบัติการ'}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab content viewport */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto" id="viewport-container">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === 'dashboard' && checkTabPermission('dashboard') && (
                <Dashboard
                  employees={employees}
                  leaveRequests={leaveRequests}
                  supplyItems={supplyItems}
                  supplyRequests={supplyRequests}
                  setActiveTab={setActiveTab}
                  currentUser={currentUser}
                  openAddEmployeeModal={() => {
                    if (checkTabPermission('employees')) {
                      setActiveTab('employees');
                      setOpenEmployeeAdd(true);
                    }
                  }}
                  openRequestLeaveModal={() => {
                    if (checkTabPermission('leaves')) {
                      setActiveTab('leaves');
                      setOpenLeaveAdd(true);
                    }
                  }}
                  openRequestSupplyModal={() => {
                    if (checkTabPermission('supplies')) {
                      setActiveTab('supplies');
                      setOpenSupplyAdd(true);
                    }
                  }}
                />
              )}

              {activeTab === 'employees' && checkTabPermission('employees') && (
                <EmployeeSection
                  employees={employees}
                  currentUser={currentUser}
                  onAddEmployee={handleAddEmployee}
                  onEditEmployee={handleEditEmployee}
                  onDeleteEmployee={handleDeleteEmployee}
                  defaultAddOpen={openEmployeeAdd}
                  onClearDefaultAddOpen={() => setOpenEmployeeAdd(false)}
                  departments={settings.departments || []}
                  onUpdateDepartments={(depts) => handleUpdateSettings({ ...settings, departments: depts })}
                />
              )}

              {activeTab === 'leaves' && checkTabPermission('leaves') && (
                <LeaveSection
                  leaveRequests={leaveRequests}
                  employees={employees}
                  onAddLeaveRequest={handleAddLeaveRequest}
                  onApproveLeave={handleApproveLeave}
                  onRejectLeave={handleRejectLeave}
                  defaultAddOpen={openLeaveAdd}
                  onClearDefaultAddOpen={() => setOpenLeaveAdd(false)}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'attendance' && checkTabPermission('attendance') && (
                <AttendanceSection
                  attendanceRecords={attendanceRecords}
                  employees={employees}
                  onAddAttendance={handleAddAttendance}
                  onAddAttendanceBatch={handleAddAttendanceBatch}
                  onDeleteAttendance={handleDeleteAttendance}
                  currentUser={currentUser}
                  settings={settings}
                  onAddEmployeeBatch={handleAddEmployeeBatch}
                />
              )}

              {activeTab === 'supplies' && checkTabPermission('supplies') && (
                <SupplySection
                  supplyItems={supplyItems}
                  supplyRequests={supplyRequests}
                  employees={employees}
                  onAddSupplyItem={handleAddSupplyItem}
                  onRestockItem={handleRestockItem}
                  onAddSupplyRequest={handleAddSupplyRequest}
                  onApproveRequest={handleApproveSupplyRequest}
                  onRejectRequest={handleRejectSupplyRequest}
                  defaultAddOpen={openSupplyAdd}
                  onClearDefaultAddOpen={() => setOpenSupplyAdd(false)}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'documents' && checkTabPermission('documents') && (
                <DocumentSection
                  currentUser={currentUser}
                  employees={employees}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsSection
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  onResetAllState={handleResetAllState}
                  accounts={accounts}
                  employees={employees}
                  onAddAccount={handleAddAccount}
                  onDeleteAccount={handleDeleteAccount}
                  onUpdateAccountPassword={handleUpdatePassword}
                  activeUserEmail={currentUser?.email || ''}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Status Bar footer */}
        <footer className="bg-white h-10 px-8 border-t border-slate-200 hidden md:flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Server: Online
            </span>
            <span>Version 1.2.4-stable</span>
          </div>
          <div>© 2026 Office Management Solution - Privacy & Terms</div>
        </footer>
      </main>

      {/* Sleek Custom Confirm Modal */}
      <AnimatePresence>
        {confirmModal && confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" id="custom-confirm-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden"
              id="confirm-modal-box"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${confirmModal.isDanger ? 'bg-red-50 text-red-650' : 'bg-blue-50 text-blue-600'}`}>
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 font-sans">{confirmModal.title}</h3>
                </div>
                
                <p className="text-xs text-slate-500 leading-relaxed font-sans">{confirmModal.message}</p>
                
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmModal(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                    id="confirm-modal-cancel"
                  >
                    {confirmModal.cancelText || 'ยกเลิก'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      confirmModal.onCallback();
                      setConfirmModal(null);
                    }}
                    className={`px-5 py-2 text-white text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer ${
                      confirmModal.isDanger 
                        ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-200' 
                        : 'bg-blue-600 hover:bg-blue-500 shadow-blue-200'
                    }`}
                    id="confirm-modal-ok"
                  >
                    {confirmModal.confirmText || 'ยืนยัน'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
