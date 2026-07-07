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
  CheckCircle2,
  RefreshCw,
  Bell,
  Clock,
  LogOut,
  Building2,
  Calendar,
  Hash,
  Database,
  AlertTriangle,
  Archive,
  FolderClosed,
  Download,
  Smartphone,
  Share2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import { Employee, LeaveRequest, SupplyItem, SupplyRequest, SystemSettings, UserAccount, ArchiveRecord, AttendanceRecord } from './types';
import { getStoredData, saveStoredData, initialEmployees, initialLeaveRequests, initialSupplyItems, initialSupplyRequests, defaultSettings, initialAttendanceRecords } from './data';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { 
  seedFirestoreIfEmpty,
  saveEmployeeCloud,
  deleteEmployeeCloud,
  saveLeaveRequestCloud,
  deleteLeaveRequestCloud,
  saveSupplyItemCloud,
  deleteSupplyItemCloud,
  saveSupplyRequestCloud,
  deleteSupplyRequestCloud,
  saveSettingsCloud,
  saveAccountCloud,
  deleteAccountCloud,
  saveArchiveCloud,
  deleteArchiveCloud,
  saveAttendanceRecordCloud,
  deleteAttendanceRecordCloud,
  clearAllAttendanceCloud,
  resetAllCloudStateCloud
} from './lib/dbSync';

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
            parsed.email = 'email';
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    }
    return false;
  });

  // Progressive Web App (PWA) States & Handlers
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hide_pwa_banner') !== 'true';
    }
    return true;
  });
  const [showIOSInstruction, setShowIOSInstruction] = useState(false);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);

  React.useEffect(() => {
    // 1. Listen for standard browser installation prompt invitation (Chrome/Android/Edge)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('PWA: beforeinstallprompt triggered and captured.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 2. Detect if app is currently running in standalone (installed) display mode
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;
    setIsStandaloneApp(checkStandalone);

    // 3. Listen to appinstalled event to provide successful feedback
    const handleAppInstalled = () => {
      setIsStandaloneApp(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      triggerToast('ติดตั้งแอป Office HQ OS บนอุปกรณ์ของคุณเสร็จสมบูรณ์!');
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleTriggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } else {
      // If no browser prompt exists (e.g. on iOS or manual), check if iOS Safari
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        setShowIOSInstruction(true);
      } else {
        triggerToast('ระบบตรวจไม่พบตัวติดตั้งเบราว์เซอร์ (คุณอาจติดตั้งแอปนี้ไว้แล้ว หรือจำเป็นต้องเปิดผ่านเบราว์เซอร์ Chrome/Safari)', 'sync');
      }
    }
  };

  const handleDismissBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('hide_pwa_banner', 'true');
  };

  // Deep-link triggers
  const [openEmployeeAdd, setOpenEmployeeAdd] = useState(false);
  const [openLeaveAdd, setOpenLeaveAdd] = useState(false);
  const [openSupplyAdd, setOpenSupplyAdd] = useState(false);

  // UTC or Local Date configuration
  const formattedDateString = "วันอังคารที่ 23 มิถุนายน พ.ศ. 2569";

  // Real-time synchronization & feedback toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'sync'>('success');
  
  const triggerToast = (msg: string, type: 'success' | 'sync' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
  };

  React.useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // 1. Seed Firestore if it is empty (ensures basic demo accounts and settings always exist on cloud)
  React.useEffect(() => {
    seedFirestoreIfEmpty();
  }, []);

  // 2. Real-time Firebase Firestore Sync Listeners
  const [isCloudSyncing, setIsCloudSyncing] = useState(true);

  React.useEffect(() => {
    setIsCloudSyncing(true);

    // Sync Employees
    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
      const list: Employee[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as Employee);
      });
      if (list.length > 0) {
        setEmployees(list);
        saveStoredData({ employees: list });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'employees');
    });

    // Sync Leave Requests
    const unsubLeaves = onSnapshot(collection(db, 'leaveRequests'), (snapshot) => {
      const list: LeaveRequest[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as LeaveRequest);
      });
      // Sort by creation date descending
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLeaveRequests(list);
      saveStoredData({ leaveRequests: list });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'leaveRequests');
    });

    // Sync Supply Items
    const unsubSupplies = onSnapshot(collection(db, 'supplyItems'), (snapshot) => {
      const list: SupplyItem[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as SupplyItem);
      });
      list.sort((a, b) => a.code.localeCompare(b.code));
      setSupplyItems(list);
      saveStoredData({ supplyItems: list });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'supplyItems');
    });

    // Sync Supply Requests
    const unsubSupplyReqs = onSnapshot(collection(db, 'supplyRequests'), (snapshot) => {
      const list: SupplyRequest[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as SupplyRequest);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSupplyRequests(list);
      saveStoredData({ supplyRequests: list });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'supplyRequests');
    });

    // Sync User Accounts
    const unsubAccounts = onSnapshot(collection(db, 'accounts'), (snapshot) => {
      const list: UserAccount[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as UserAccount);
      });
      if (list.length > 0) {
        setAccounts(list);
        saveStoredData({ accounts: list });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'accounts');
    });

    // Sync Settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'system'), (docSnap) => {
      if (docSnap.exists()) {
        const val = docSnap.data() as SystemSettings;
        setSettings(val);
        saveStoredData({ settings: val });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/system');
    });

    // Sync Archives
    const unsubArchives = onSnapshot(collection(db, 'archives'), (snapshot) => {
      const list: ArchiveRecord[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as ArchiveRecord);
      });
      list.sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime());
      setArchives(list);
      saveStoredData({ archives: list });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'archives');
    });

    // Sync Attendance Records
    const unsubAttendance = onSnapshot(collection(db, 'attendanceRecords'), (snapshot) => {
      const list: AttendanceRecord[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as AttendanceRecord);
      });
      list.sort((a, b) => {
        const dateTimeA = new Date(`${a.date}T${a.time}`).getTime();
        const dateTimeB = new Date(`${b.date}T${b.time}`).getTime();
        return dateTimeB - dateTimeA;
      });
      setAttendanceRecords(list);
      saveStoredData({ attendanceRecords: list });
      setIsCloudSyncing(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'attendanceRecords');
    });

    return () => {
      unsubEmployees();
      unsubLeaves();
      unsubSupplies();
      unsubSupplyReqs();
      unsubAccounts();
      unsubSettings();
      unsubArchives();
      unsubAttendance();
    };
  }, []);

  // Sync cross-tab session only
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'office_session') {
        const storedSession = localStorage.getItem('office_session');
        if (storedSession) {
          try {
            setCurrentUser(JSON.parse(storedSession));
          } catch (err) {
            console.warn(err);
          }
        } else {
          setCurrentUser(null);
        }
        triggerToast('ประสานข้อมูลความเปลี่ยนแปลงในระบบแบบเรียลไทม์ (Cross-tab Synced)', 'sync');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

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
    saveEmployeeCloud(newEmp);
    triggerToast(`เพิ่มพนักงานใหม่ "${newEmp.firstName} ${newEmp.lastName}" สำเร็จและบันทึกข้อมูลเรียบร้อย`);
  };

  const handleAddEmployeeBatch = (newEmps: Omit<Employee, 'id'>[]) => {
    const formattedEmps: Employee[] = newEmps.map((emp, idx) => ({
      ...emp,
      id: `emp-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`
    }));
    const nextList = [...formattedEmps, ...employees];
    setEmployees(nextList);
    saveStoredData({ employees: nextList });
    formattedEmps.forEach(emp => saveEmployeeCloud(emp));
    triggerToast(`นำเข้าข้อมูลพนักงานจำนวน ${newEmps.length} คนเข้าระบบเรียบร้อย`);
  };

  const handleEditEmployee = (editedEmp: Employee) => {
    const oldEmp = employees.find(e => e.id === editedEmp.id);
    
    let updatedLeaveRequests = leaveRequests;
    let updatedSupplyRequests = supplyRequests;
    let updatedAccounts = accounts;
    let updatedAttendanceRecords = attendanceRecords;

    if (oldEmp) {
      const idChanged = oldEmp.employeeId !== editedEmp.employeeId;
      const oldFullName = `${oldEmp.firstName} ${oldEmp.lastName}`;
      const newFullName = `${editedEmp.firstName} ${editedEmp.lastName}`;
      const nameChanged = oldFullName !== newFullName;

      if (idChanged || nameChanged) {
        // Cascade changes to Leave Requests
        updatedLeaveRequests = leaveRequests.map(lr => {
          if (lr.employeeId === oldEmp.employeeId) {
            const updated = {
              ...lr,
              employeeId: editedEmp.employeeId,
              employeeName: nameChanged ? newFullName : lr.employeeName
            };
            saveLeaveRequestCloud(updated);
            return updated;
          }
          return lr;
        });

        // Cascade changes to Supply Requests
        updatedSupplyRequests = supplyRequests.map(sr => {
          if (sr.employeeId === oldEmp.employeeId) {
            const updated = {
              ...sr,
              employeeId: editedEmp.employeeId,
              employeeName: nameChanged ? newFullName : sr.employeeName
            };
            saveSupplyRequestCloud(updated);
            return updated;
          }
          return sr;
        });

        // Cascade changes to Accounts
        updatedAccounts = accounts.map(acc => {
          if (acc.employeeId === oldEmp.employeeId) {
            const updated = {
              ...acc,
              employeeId: editedEmp.employeeId,
              name: nameChanged ? newFullName : acc.name,
              email: acc.email === oldEmp.email ? editedEmp.email : acc.email
            };
            saveAccountCloud(updated);
            return updated;
          }
          return acc;
        });

        // Cascade changes to Attendance Records
        updatedAttendanceRecords = attendanceRecords.map(ar => {
          if (ar.employeeId === oldEmp.employeeId) {
            const updated = {
              ...ar,
              employeeId: editedEmp.employeeId,
              employeeName: nameChanged ? newFullName : ar.employeeName
            };
            saveAttendanceRecordCloud(updated);
            return updated;
          }
          return ar;
        });

        // Also update currentUser in localStorage if the edited employee is current user
        if (currentUser && currentUser.employeeId === oldEmp.employeeId) {
          const updatedUser: UserAccount = {
            ...currentUser,
            employeeId: editedEmp.employeeId,
            name: nameChanged ? newFullName : currentUser.name,
            email: currentUser.email === oldEmp.email ? editedEmp.email : currentUser.email
          };
          setCurrentUser(updatedUser);
          localStorage.setItem('office_session', JSON.stringify(updatedUser));
        }
      }
    }

    const nextList = employees.map(e => e.id === editedEmp.id ? editedEmp : e);
    setEmployees(nextList);
    setLeaveRequests(updatedLeaveRequests);
    setSupplyRequests(updatedSupplyRequests);
    setAccounts(updatedAccounts);
    setAttendanceRecords(updatedAttendanceRecords);

    saveStoredData({ 
      employees: nextList,
      leaveRequests: updatedLeaveRequests,
      supplyRequests: updatedSupplyRequests,
      accounts: updatedAccounts,
      attendanceRecords: updatedAttendanceRecords
    });
    
    saveEmployeeCloud(editedEmp);
    triggerToast(`บันทึกการแก้ไขข้อมูลของ "${editedEmp.firstName} ${editedEmp.lastName}" เรียบร้อยแล้ว`);
  };

  const handleDeleteEmployee = (id: string) => {
    const emp = employees.find(e => e.id === id);
    const nextList = employees.filter(e => e.id !== id);
    setEmployees(nextList);
    saveStoredData({ employees: nextList });
    deleteEmployeeCloud(id);
    triggerToast(`ลบข้อมูลพนักงาน "${emp ? `${emp.firstName} ${emp.lastName}` : ''}" เรียบร้อยแล้ว`);
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
    saveLeaveRequestCloud(newReq);
    triggerToast('ยื่นคำขอลาพักร้อนสำเร็จและเก็บข้อมูลแบบเรียลไทม์');
  };

  const handleApproveLeave = (id: string) => {
    const updatedLeaves = leaveRequests.map(l => {
      if (l.id === id) {
        const u = { 
          ...l, 
          status: 'approved' as const,
          reviewedBy: 'ฝ่ายบุคคล (Admin)',
          reviewedAt: new Date().toISOString().split('T')[0]
        };
        saveLeaveRequestCloud(u);
        return u;
      }
      return l;
    });
    setLeaveRequests(updatedLeaves);

    // Also look up employee and temporarily set status to 'leave'
    const targetLeave = leaveRequests.find(l => l.id === id);
    if (targetLeave) {
      const updatedEmployees = employees.map(emp => {
        if (emp.employeeId === targetLeave.employeeId) {
          const u = { ...emp, status: 'leave' as const };
          saveEmployeeCloud(u);
          return u;
        }
        return emp;
      });
      setEmployees(updatedEmployees);
      saveStoredData({ leaveRequests: updatedLeaves, employees: updatedEmployees });
    } else {
      saveStoredData({ leaveRequests: updatedLeaves });
    }
    triggerToast('อนุมัติการลาพักผ่อนและปรับปรุงสิทธิ์เรียบร้อยแล้ว');
  };

  const handleRejectLeave = (id: string) => {
    const nextList = leaveRequests.map(l => {
      if (l.id === id) {
        const u = { ...l, status: 'rejected' as const };
        saveLeaveRequestCloud(u);
        return u;
      }
      return l;
    });
    setLeaveRequests(nextList);
    saveStoredData({ leaveRequests: nextList });
    triggerToast('ปฏิเสธคำขอลาพักร้อนเรียบร้อยแล้ว');
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
    saveSupplyItemCloud(newItem);
    triggerToast(`เพิ่มอุปกรณ์ใหม่ "${newItem.name}" สำเร็จและบันทึกสต็อกเรียบร้อย`);
  };

  const handleRestockItem = (id: string, amount: number) => {
    const nextList = supplyItems.map(item => {
      if (item.id === id) {
        const u = { ...item, stock: item.stock + amount };
        saveSupplyItemCloud(u);
        return u;
      }
      return item;
    });
    setSupplyItems(nextList);
    saveStoredData({ supplyItems: nextList });
    triggerToast('บันทึกการเติมสต็อกอุปกรณ์สำนักงานเรียบร้อย');
  };

  const handleUpdateSupplyItems = (items: SupplyItem[]) => {
    setSupplyItems(items);
    saveStoredData({ supplyItems: items });
    items.forEach(item => saveSupplyItemCloud(item));
  };

  const handleUpdateSupplyItem = (updatedItem: SupplyItem) => {
    const nextList = supplyItems.map(item => item.id === updatedItem.id ? updatedItem : item);
    setSupplyItems(nextList);
    saveStoredData({ supplyItems: nextList });
    saveSupplyItemCloud(updatedItem);
    triggerToast(`อัปเดตข้อมูล "${updatedItem.name}" เรียบร้อยแล้ว`);
  };

  const handleDeleteSupplyItem = (id: string) => {
    const itemToDelete = supplyItems.find(item => item.id === id);
    if (!itemToDelete) return;
    const nextList = supplyItems.filter(item => item.id !== id);
    setSupplyItems(nextList);
    saveStoredData({ supplyItems: nextList });
    deleteSupplyItemCloud(id);
    triggerToast(`ลบข้อมูล "${itemToDelete.name}" เรียบร้อยแล้ว`);
  };

  const handleAddSupplyRequest = (reqOrReqs: Omit<SupplyRequest, 'id' | 'createdAt' | 'status'> | Omit<SupplyRequest, 'id' | 'createdAt' | 'status'>[]) => {
    const isArray = Array.isArray(reqOrReqs);
    const reqsToProcess = isArray ? reqOrReqs : [reqOrReqs];
    
    const newRequests: SupplyRequest[] = reqsToProcess.map((req, index) => {
      const u = {
        ...req,
        id: `req-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date().toISOString().split('T')[0],
        status: 'pending' as const
      };
      saveSupplyRequestCloud(u);
      return u;
    });

    const nextList = [...newRequests, ...supplyRequests];
    setSupplyRequests(nextList);
    saveStoredData({ supplyRequests: nextList });
    triggerToast('ส่งคำขอเบิกพัสดุอุปกรณ์สำเร็จและจัดเก็บแบบเรียลไทม์');
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
        const u = { ...item, stock: item.stock - targetReq.quantity };
        saveSupplyItemCloud(u);
        return u;
      }
      return item;
    });
    setSupplyItems(updatedInventory);

    // Update request state
    const updatedRequests = supplyRequests.map(r => {
      if (r.id === id) {
        const u = { ...r, status: 'approved' as const };
        saveSupplyRequestCloud(u);
        return u;
      }
      return r;
    });
    setSupplyRequests(updatedRequests);

    saveStoredData({
      supplyItems: updatedInventory,
      supplyRequests: updatedRequests
    });
    triggerToast('อนุมัติคำขอเบิกพัสดุและตัดสต็อกสินค้าแบบเรียลไทม์');
  };

  const handleRejectSupplyRequest = (id: string) => {
    const nextList = supplyRequests.map(r => {
      if (r.id === id) {
        const u = { ...r, status: 'rejected' as const };
        saveSupplyRequestCloud(u);
        return u;
      }
      return r;
    });
    setSupplyRequests(nextList);
    saveStoredData({ supplyRequests: nextList });
    triggerToast('ปฏิเสธคำขอเบิกวัสดุอุปกรณ์สำนักงานเรียบร้อย');
  };

  const handleUpdateSettings = (updatedSettings: SystemSettings) => {
    setSettings(updatedSettings);
    saveStoredData({ settings: updatedSettings });
    saveSettingsCloud(updatedSettings);
    triggerToast('บันทึกการเปลี่ยนแปลงการตั้งค่าระบบเรียบร้อยแล้ว');
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
      
      resetAllCloudStateCloud().then(() => {
        window.location.reload();
      });
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

    saveEmployeeCloud(freshEmployee);
    saveAccountCloud(newAccount);
  };

  const handleUpdatePassword = (email: string, newPass: string, clearRequiresPasswordChange?: boolean) => {
    const updatedAccountsList = accounts.map(acc => {
      if (acc.email.toLowerCase() === email.toLowerCase().trim()) {
        const updated: UserAccount = { ...acc, password: newPass };
        if (clearRequiresPasswordChange !== undefined) {
          updated.requiresPasswordChange = !clearRequiresPasswordChange;
        }
        saveAccountCloud(updated);
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
    saveAccountCloud(acc);
  };

  const handleDeleteAccount = (email: string) => {
    const updatedAccountsList = accounts.filter(acc => acc.email.toLowerCase() !== email.toLowerCase().trim());
    setAccounts(updatedAccountsList);
    saveStoredData({
      accounts: updatedAccountsList
    });
    deleteAccountCloud(email);
  };

  const handleUpdateAccount = (updatedAcc: UserAccount) => {
    const updatedAccountsList = accounts.map(acc => {
      if (acc.email.toLowerCase() === updatedAcc.email.toLowerCase().trim()) {
        saveAccountCloud(updatedAcc);
        return updatedAcc;
      }
      return acc;
    });
    setAccounts(updatedAccountsList);
    saveStoredData({
      accounts: updatedAccountsList
    });
    
    // Also update currentUser in state if it is the updated account
    if (currentUser && currentUser.email.toLowerCase() === updatedAcc.email.toLowerCase().trim()) {
      setCurrentUser(updatedAcc);
      localStorage.setItem('office_session', JSON.stringify(updatedAcc));
    }
    
    triggerToast(`อัปเดตสิทธิ์ผู้ใช้งาน "${updatedAcc.name}" เรียบร้อยแล้ว`);
  };

  const handleAddArchive = (newArch: ArchiveRecord) => {
    const nextList = [newArch, ...archives];
    setArchives(nextList);
    saveStoredData({ archives: nextList });
    saveArchiveCloud(newArch);
  };

  const handleDeleteArchive = (id: string) => {
    const nextList = archives.filter(a => a.id !== id);
    setArchives(nextList);
    saveStoredData({ archives: nextList });
    deleteArchiveCloud(id);
  };

  const handleAddAttendance = (record: AttendanceRecord) => {
    const nextList = [record, ...attendanceRecords];
    setAttendanceRecords(nextList);
    saveStoredData({ attendanceRecords: nextList });
    saveAttendanceRecordCloud(record);
    triggerToast('ลงเวลาเข้างาน/ออกงานเสร็จสิ้นและจัดเก็บแบบเรียลไทม์');
  };

  const handleAddAttendanceBatch = (records: AttendanceRecord[]) => {
    const nextList = [...records, ...attendanceRecords];
    setAttendanceRecords(nextList);
    saveStoredData({ attendanceRecords: nextList });
    records.forEach(rec => saveAttendanceRecordCloud(rec));
    triggerToast(`นำเข้าข้อมูลการลงเวลาจำนวน ${records.length} รายการสำเร็จ`);
  };

  const handleDeleteAttendance = (id: string) => {
    const nextList = attendanceRecords.filter(rec => rec.id !== id);
    setAttendanceRecords(nextList);
    saveStoredData({ attendanceRecords: nextList });
    deleteAttendanceRecordCloud(id);
    triggerToast('ลบรายการบันทึกเวลาปฏิบัติงานเรียบร้อย');
  };

  const handleClearAttendance = () => {
    setAttendanceRecords([]);
    saveStoredData({ attendanceRecords: [] });
    clearAllAttendanceCloud();
    triggerToast('ล้างประวัติการลงเวลาปฏิบัติงานทั้งหมดเรียบร้อย');
  };

  const handleSetAttendanceRecords = (records: AttendanceRecord[]) => {
    setAttendanceRecords(records);
    saveStoredData({ attendanceRecords: records });
    records.forEach(rec => saveAttendanceRecordCloud(rec));
    triggerToast('ปรับปรุงประวัติบันทึกเวลาทั้งหมดสำเร็จ');
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

    // Save all to cloud
    if (full.employees) full.employees.forEach((x: any) => saveEmployeeCloud(x));
    if (full.leaveRequests) full.leaveRequests.forEach((x: any) => saveLeaveRequestCloud(x));
    if (full.supplyItems) full.supplyItems.forEach((x: any) => saveSupplyItemCloud(x));
    if (full.supplyRequests) full.supplyRequests.forEach((x: any) => saveSupplyRequestCloud(x));
    if (full.settings) saveSettingsCloud(full.settings);
    if (full.accounts) full.accounts.forEach((x: any) => saveAccountCloud(x));
    if (full.archives) full.archives.forEach((x: any) => saveArchiveCloud(x));
    if (full.attendanceRecords) full.attendanceRecords.forEach((x: any) => saveAttendanceRecordCloud(x));
  };

  // Resolve current active logged-in employee detail if it is not an admin
  const activeEmployeeDetail = currentUser?.role === 'employee' 
    ? employees.find(e => e.employeeId === currentUser.employeeId) 
    : null;

  const checkTabPermission = (tabId: string) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (tabId === 'backup') return false;
    if (tabId === 'settings') {
      return !!currentUser.permissions?.canManageSettings;
    }
    // Check custom permissions first
    if (tabId === 'employees' && currentUser.permissions?.canManageEmployees) return true;
    if (tabId === 'leaves' && currentUser.permissions?.canApproveLeave) return true;
    if (tabId === 'supplies' && (currentUser.permissions?.canApproveSupply || currentUser.permissions?.canManageSupplyItems)) return true;
    if (tabId === 'archives' && currentUser.permissions?.canViewArchives) return true;

    if (tabId === 'employees' && currentUser.role === 'employee') return true;
    const perm = settings.menuPermissions?.[tabId] ?? (
      (tabId === 'employees' || tabId === 'archives') ? 'admin_only' : 'all'
    );
    return perm !== 'admin_only';
  };

  // Nav items configuration
  const navigationItems = [
    { id: 'dashboard', label: 'ภาพรวมระบบ', icon: LayoutDashboard },
    { id: 'employees', label: (currentUser?.role === 'employee' && !currentUser?.permissions?.canManageEmployees) ? 'ประวัติส่วนตัว' : 'ข้อมูลพนักงาน', icon: Users },
    { id: 'leaves', label: 'การลางาน', icon: CalendarDays },
    { id: 'attendance', label: 'ระบบลงเวลาทำงาน', icon: Clock },
    { id: 'supplies', label: 'เบิกจ่ายพัสดุ', icon: Package },
    { id: 'documents', label: 'แฟ้มเอกสาร', icon: FolderClosed },
    (currentUser?.role === 'admin' || currentUser?.permissions?.canManageSettings) && { id: 'settings', label: 'ตั้งค่าระบบ', icon: SettingsIcon },
  ].filter(Boolean)
    .filter(item => {
      if (!currentUser) return false;
      if (currentUser.role === 'admin') return true;
      if (item.id === 'settings') return !!currentUser.permissions?.canManageSettings;
      
      // Allow if user has explicit permission
      if (item.id === 'employees' && currentUser.permissions?.canManageEmployees) return true;
      if (item.id === 'leaves' && currentUser.permissions?.canApproveLeave) return true;
      if (item.id === 'supplies' && (currentUser.permissions?.canApproveSupply || currentUser.permissions?.canManageSupplyItems)) return true;
      if (item.id === 'archives' && currentUser.permissions?.canViewArchives) return true;

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
        settings={settings}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800 font-sans" id="applet-main-layout">
      
      {/* SIDEBAR NAVIGATION (Desktop) */}
      <aside className={`hidden md:flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-slate-300 min-h-screen ${isSidebarCollapsed ? 'p-3' : 'p-5'} border-r border-slate-800 flex-shrink-0 transition-all duration-300 ease-in-out z-20`} id="desktop-sidebar">
        {/* Core Brand Header */}
        <div className={`p-2 flex ${isSidebarCollapsed ? 'flex-col gap-3 items-center justify-center' : 'items-center justify-between'} pb-4 border-b border-slate-800`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0">
              O
            </div>
            {!isSidebarCollapsed && (
              <div className="transition-all duration-300">
                <span className="text-white font-bold text-lg tracking-tight block">OfficeConnect</span>
                <span className="text-[10px] text-slate-500 font-medium">ระบบสารสนเทศออฟฟิศ</span>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            title={isSidebarCollapsed ? "ขยายแถบเมนู" : "ย่อแถบเมนู"}
            id="btn-sidebar-toggle"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* User Session Info Card (No Switcher) */}
        <div className={`my-4 ${isSidebarCollapsed ? 'px-1 py-2 justify-center' : 'px-3 py-3'} bg-slate-800/50 rounded-xl border border-slate-800/80 flex items-center gap-3 overflow-hidden transition-all duration-300`} id="user-session-info-card">
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
          {!isSidebarCollapsed && (
            <div className="min-w-0 transition-all duration-300">
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
          )}
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
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'} rounded-xl text-sm font-medium transition-all duration-300 ${
                  IsActive 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isSidebarCollapsed && <span className="transition-all duration-300">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer details */}
        <div className={`pt-4 border-t border-slate-800 text-xs text-slate-500 ${isSidebarCollapsed ? 'space-y-4' : 'space-y-2'} transition-all duration-300`}>
          {!isSidebarCollapsed ? (
            <>
              <p className="font-mono truncate text-slate-400 px-1" title={settings.companyName}>
                🏢 {settings.companyName}
              </p>
              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800/50 flex flex-col gap-1 text-[10px] text-slate-400 mb-2">
                <span className="text-slate-300 font-semibold">เวลาทำงาน:</span>
                <span>⏱️ {settings.workHoursStart} - {settings.workHoursEnd} น.</span>
                <span>📅 {settings.workDays.join(', ')}</span>
              </div>

              {/* PWA Install Promo Box inside Sidebar Footer */}
              {!isStandaloneApp && (
                <div className="bg-gradient-to-br from-blue-950/40 to-slate-800/40 p-3 rounded-xl border border-blue-900/30 flex flex-col gap-2 mb-2">
                  <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-[10px]">
                    <Smartphone className="w-3.5 h-3.5 animate-pulse" />
                    <span>พร้อมติดตั้งบนอุปกรณ์นี้</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    ติดตั้งระบบเพื่อให้เปิดใช้งานได้รวดเร็วดุจแอปจริงบนมือถือและพีซีของคุณ
                  </p>
                  <button
                    type="button"
                    onClick={handleTriggerInstall}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    ติดตั้งแอปพลิเคชัน
                  </button>
                </div>
              )}
              {isStandaloneApp && (
                <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2 text-emerald-400 text-[10px] mb-2 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>📱 เปิดใช้งานในโหมดแอปพลิเคชันแล้ว</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 mb-2">
              <span className="text-slate-400 text-center text-sm cursor-help" title={settings.companyName}>🏢</span>
              <span className="text-slate-400 text-center text-sm cursor-help" title={`เวลาทำงาน: ${settings.workHoursStart} - ${settings.workHoursEnd} น. (${settings.workDays.join(', ')})`}>⏱️</span>
            </div>
          )}
          
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
            className={`w-full flex items-center justify-center ${isSidebarCollapsed ? 'p-2' : 'gap-2 py-2'} bg-rose-950/20 hover:bg-rose-900/60 border border-rose-950/60 hover:border-rose-850 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all cursor-pointer`}
            id="sidebar-btn-logout"
            title={isSidebarCollapsed ? "ออกจากระบบ" : undefined}
          >
            <LogOut className="w-3.5 h-3.5 text-rose-450 flex-shrink-0" />
            {!isSidebarCollapsed && <span>ออกจากระบบ</span>}
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

              {/* Mobile PWA Install Trigger */}
              {!isStandaloneApp && (
                <div className="mx-2 my-3 p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs">
                    <Smartphone className="w-4 h-4 animate-bounce" />
                    <span>พร้อมย้ายไปติดตั้งเป็นแอป</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    เข้าใช้งานผ่านหน้าจอโฮมโดยตรง ดุจใช้งานแอปพลิเคชันจริง รวดเร็ว ไม่ต้องลงชื่อเข้าใหม่บ่อยๆ
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleTriggerInstall();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    ติดตั้งแอปบนหน้าจอมือถือ
                  </button>
                </div>
              )}
              {isStandaloneApp && (
                <div className="mx-2 my-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping flex-shrink-0"></span>
                  <span>เปิดใช้งานบนโหมดโมบายแอปสมบูรณ์แบบ</span>
                </div>
              )}

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
                  onClearAttendance={handleClearAttendance}
                  onSetAttendanceRecords={handleSetAttendanceRecords}
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
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  onUpdateSupplyItems={handleUpdateSupplyItems}
                  onUpdateSupplyItem={handleUpdateSupplyItem}
                  onDeleteSupplyItem={handleDeleteSupplyItem}
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
                  onUpdateAccount={handleUpdateAccount}
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

      {/* Real-time Dynamic Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-[120] max-w-sm w-full md:w-auto"
            id="realtime-toast"
          >
            <div className={`flex items-center gap-3 p-4 rounded-2xl shadow-xl border ${
              toastType === 'sync' 
                ? 'bg-sky-50 border-sky-200 text-sky-800' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <div className={`p-1.5 rounded-xl ${
                toastType === 'sync' ? 'bg-sky-500 text-white animate-spin' : 'bg-emerald-500 text-white'
              }`}>
                {toastType === 'sync' ? (
                  <RefreshCw className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 text-xs font-semibold font-sans">
                <span className="block text-[10px] uppercase tracking-wider opacity-60 mb-0.5 font-bold">
                  {toastType === 'sync' ? 'การประมวลผลข้อมูลแบบเรียลไทม์' : 'ระบบบันทึกความเปลี่ยนแปลงเสร็จสมบูรณ์'}
                </span>
                {toastMessage}
              </div>
              <button 
                onClick={() => setToastMessage(null)}
                className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Installation Instruction Modal */}
      <AnimatePresence>
        {showIOSInstruction && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" id="ios-pwa-modal">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-white rounded-t-3xl sm:rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden pb-6 sm:pb-0"
              id="ios-modal-box"
            >
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-slate-950 font-sans">คู่มือติดตั้งบน iOS (Safari)</span>
                  </div>
                  <button
                    onClick={() => setShowIOSInstruction(false)}
                    className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 text-slate-700 text-xs leading-relaxed">
                  <p className="font-medium text-slate-500 font-sans">
                    คุณสามารถใช้งานระบบ Office HQ OS ได้รวดเร็วดุจแอปจริง โดยไม่ต้องดาวน์โหลดผ่าน App Store เพียงทำตามขั้นตอนนี้:
                  </p>

                  <div className="flex gap-3.5 items-start">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                      1
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block font-sans">แตะปุ่ม "แชร์" (Share)</span>
                      <p className="text-slate-500 mt-0.5">
                        แตะปุ่มแชร์รูปสี่เหลี่ยมที่มีลูกศรชี้ขึ้น <span className="inline-flex items-center justify-center p-1 bg-slate-100 rounded text-slate-600 mx-0.5 font-bold"><Share2 className="w-3.5 h-3.5" /></span> บริเวณแถบด้านล่างของจอภาพ Safari
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 items-start">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                      2
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block font-sans">เลือก "เพิ่มไปยังหน้าจอโฮม"</span>
                      <p className="text-slate-500 mt-0.5">
                        เลื่อนรายการเมนูลงมาด้านล่าง แล้วแตะที่ <span className="font-bold text-blue-600">"เพิ่มไปยังหน้าจอโฮม"</span> (Add to Home Screen)
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 items-start">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                      3
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block font-sans">แตะ "เพิ่ม" (Add)</span>
                      <p className="text-slate-500 mt-0.5">
                        พิมพ์ชื่อแอปพลิเคชัน (หรือปล่อยเป็นค่าเริ่มต้น) แล้วแตะ "เพิ่ม" (Add) ที่มุมขวาบน เพื่อเสร็จสิ้นขั้นตอน
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowIOSInstruction(false)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition"
                >
                  เข้าใจแล้ว
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Floating PWA Installation Promo Assistant */}
      <AnimatePresence>
        {!isStandaloneApp && showInstallBanner && (isInstallable || (/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream)) && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 z-[90] max-w-sm w-auto"
            id="pwa-floating-assistant"
          >
            <div className="bg-slate-900/95 border border-slate-800 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-md relative overflow-hidden">
              {/* Sleek top ambient light bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500"></div>
              
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-black text-base shadow-lg animate-pulse">
                  O
                </div>
                <div className="flex-1">
                  <span className="block text-[10px] text-blue-400 font-black uppercase tracking-wider mb-0.5">
                    MOBILE APP INSTALL READY
                  </span>
                  <h4 className="text-xs font-bold font-sans text-white">ติดตั้งแอป Office HQ OS</h4>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5 font-sans">
                    ย้ายไอคอนมาอยู่บนจอโฮมเพื่อเข้าใช้งานที่สะดวก รวดเร็ว และประหยัดพลังงานมากกว่าเว็บทั่วไป
                  </p>
                  
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      type="button"
                      onClick={handleTriggerInstall}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black rounded-lg transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      ติดตั้งเลย
                    </button>
                    <button
                      type="button"
                      onClick={handleDismissBanner}
                      className="text-slate-400 hover:text-white text-[10px] font-semibold transition"
                    >
                      ไว้ภายหลัง
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDismissBanner}
                  className="text-slate-500 hover:text-slate-300 transition p-1 h-fit"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
