import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  Building, 
  MapPin, 
  Calendar, 
  Clock, 
  Plane, 
  HeartCrack,
  RefreshCw,
  Save,
  CheckCircle,
  HelpCircle,
  Lock,
  Heart,
  Users,
  UserPlus,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
  ShieldAlert,
  Sparkles,
  Key,
  ShieldCheck,
  UserCheck,
  Upload,
  LayoutDashboard,
  Package,
  FolderClosed,
  Archive,
  CalendarDays,
  MessageSquare,
  Bot,
  AlertTriangle,
  Copy,
  Terminal,
  Send,
  Zap,
  Check as CheckedIcon
} from 'lucide-react';
import { SystemSettings, UserAccount, Employee } from '../types';

interface SettingsSectionProps {
  settings: SystemSettings;
  onUpdateSettings: (settings: SystemSettings) => void;
  onResetAllState: () => void;
  accounts: UserAccount[];
  employees: Employee[];
  onAddAccount: (acc: UserAccount) => void;
  onDeleteAccount: (email: string) => void;
  onUpdateAccountPassword: (email: string, newPass: string, clearRequiresPasswordChange?: boolean) => void;
  onUpdateAccount?: (acc: UserAccount) => void;
  activeUserEmail: string;
}

export default function SettingsSection({
  settings,
  onUpdateSettings,
  onResetAllState,
  accounts = [],
  employees = [],
  onAddAccount,
  onDeleteAccount,
  onUpdateAccountPassword,
  onUpdateAccount,
  activeUserEmail
}: SettingsSectionProps) {
  // Navigation level tab: system settings OR User/password settings
  const [activeSubTab, setActiveSubTab] = useState<'system' | 'users'>('system');

  // Permissions Modal state
  const [selectedPermsAccount, setSelectedPermsAccount] = useState<UserAccount | null>(null);
  const [modalRole, setModalRole] = useState<'admin' | 'employee'>('employee');
  const [modalCanApproveLeave, setModalCanApproveLeave] = useState(false);
  const [modalCanApproveLeaveHR, setModalCanApproveLeaveHR] = useState(false);
  const [modalCanApproveLeaveManager, setModalCanApproveLeaveManager] = useState(false);
  const [modalCanApproveSupply, setModalCanApproveSupply] = useState(false);
  const [modalCanManageEmployees, setModalCanManageEmployees] = useState(false);
  const [modalCanManageSettings, setModalCanManageSettings] = useState(false);
  const [modalCanViewArchives, setModalCanViewArchives] = useState(false);
  const [modalCanManageSupplyItems, setModalCanManageSupplyItems] = useState(false);
  const [modalCanClearLeaveHistory, setModalCanClearLeaveHistory] = useState(false);

  const handleOpenPermissionsModal = (acc: UserAccount) => {
    setSelectedPermsAccount(acc);
    setModalRole(acc.role);
    setModalCanApproveLeave(acc.permissions?.canApproveLeave || false);
    setModalCanApproveLeaveHR(acc.permissions?.canApproveLeaveHR ?? acc.permissions?.canApproveLeave ?? false);
    setModalCanApproveLeaveManager(acc.permissions?.canApproveLeaveManager ?? acc.permissions?.canApproveLeave ?? false);
    setModalCanApproveSupply(acc.permissions?.canApproveSupply || false);
    setModalCanManageEmployees(acc.permissions?.canManageEmployees || false);
    setModalCanManageSettings(acc.permissions?.canManageSettings || false);
    setModalCanViewArchives(acc.permissions?.canViewArchives || false);
    setModalCanManageSupplyItems(acc.permissions?.canManageSupplyItems || false);
    setModalCanClearLeaveHistory(acc.permissions?.canClearLeaveHistory || false);
  };

  const applyPermissionTemplate = (type: 'hr' | 'inventory' | 'general' | 'coadmin') => {
    if (type === 'hr') {
      setModalRole('employee');
      setModalCanApproveLeave(true);
      setModalCanApproveLeaveHR(true);
      setModalCanApproveLeaveManager(false);
      setModalCanApproveSupply(false);
      setModalCanManageEmployees(true);
      setModalCanManageSettings(false);
      setModalCanViewArchives(true);
      setModalCanManageSupplyItems(false);
      setModalCanClearLeaveHistory(true);
    } else if (type === 'inventory') {
      setModalRole('employee');
      setModalCanApproveLeave(false);
      setModalCanApproveLeaveHR(false);
      setModalCanApproveLeaveManager(false);
      setModalCanApproveSupply(true);
      setModalCanManageEmployees(false);
      setModalCanManageSettings(false);
      setModalCanViewArchives(false);
      setModalCanManageSupplyItems(true);
      setModalCanClearLeaveHistory(false);
    } else if (type === 'general') {
      setModalRole('employee');
      setModalCanApproveLeave(false);
      setModalCanApproveLeaveHR(false);
      setModalCanApproveLeaveManager(false);
      setModalCanApproveSupply(false);
      setModalCanManageEmployees(false);
      setModalCanManageSettings(false);
      setModalCanViewArchives(false);
      setModalCanManageSupplyItems(false);
      setModalCanClearLeaveHistory(false);
    } else if (type === 'coadmin') {
      setModalRole('employee');
      setModalCanApproveLeave(true);
      setModalCanApproveLeaveHR(true);
      setModalCanApproveLeaveManager(true);
      setModalCanApproveSupply(true);
      setModalCanManageEmployees(true);
      setModalCanManageSettings(true);
      setModalCanViewArchives(true);
      setModalCanManageSupplyItems(true);
      setModalCanClearLeaveHistory(true);
    }
  };

  const handleSavePermissions = () => {
    if (!selectedPermsAccount) return;
    if (onUpdateAccount) {
      onUpdateAccount({
        ...selectedPermsAccount,
        role: modalRole,
        permissions: {
          canApproveLeave: modalCanApproveLeaveHR || modalCanApproveLeaveManager,
          canApproveLeaveHR: modalCanApproveLeaveHR,
          canApproveLeaveManager: modalCanApproveLeaveManager,
          canApproveSupply: modalCanApproveSupply,
          canManageEmployees: modalCanManageEmployees,
          canManageSettings: modalCanManageSettings,
          canViewArchives: modalCanViewArchives,
          canManageSupplyItems: modalCanManageSupplyItems,
          canClearLeaveHistory: modalCanClearLeaveHistory
        }
      });
      setUserNotification(`อัปเดตสิทธิ์ผู้ใช้ ${selectedPermsAccount.name} เรียบร้อยแล้ว`);
      setTimeout(() => setUserNotification(null), 4000);
    }
    setSelectedPermsAccount(null);
  };

  // New Account fields
  const [newAccName, setNewAccName] = useState('');
  const [newAccEmail, setNewAccEmail] = useState('');
  const [newAccPassword, setNewAccPassword] = useState('');
  const [newAccRole, setNewAccRole] = useState<'admin' | 'employee'>('employee');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [newAccForceReset, setNewAccForceReset] = useState(true);

  // Password editing inline states
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Feedback notifications
  const [userNotification, setUserNotification] = useState<string | null>(null);
  const [userErrorNotification, setUserErrorNotification] = useState<string | null>(null);

  // Local form states (general company settings)
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [companyAddress, setCompanyAddress] = useState(settings.companyAddress);
  const [workHoursStart, setWorkHoursStart] = useState(settings.workHoursStart);
  const [workHoursEnd, setWorkHoursEnd] = useState(settings.workHoursEnd);
  const [hasOvertime, setHasOvertime] = useState(settings.hasOvertime);
  const [otStartTime, setOtStartTime] = useState(settings.otStartTime || '18:00');
  const [otRate, setOtRate] = useState(settings.otRate ?? 1.5);
  const [lateThresholdMins, setLateThresholdMins] = useState(settings.lateThresholdMins ?? 15);
  
  // Login Branding state variables
  const [loginLogoUrl, setLoginLogoUrl] = useState(settings.loginLogoUrl || '');
  const [loginTitle, setLoginTitle] = useState(settings.loginTitle || 'OfficeConnect');
  const [loginSubtitle, setLoginSubtitle] = useState(settings.loginSubtitle || 'ระบบบริหารจัดการและประมวลผลข้อมูลองค์กรแบบเรียลไทม์');
  const [logoType, setLogoType] = useState<'image' | 'emoji'>(() => {
    const val = settings.loginLogoUrl || '';
    if (!val) return 'image';
    if (val.startsWith('http') || val.startsWith('data:image')) return 'image';
    return 'emoji';
  });


  
  // Max leave days
  const [sickMax, setSickMax] = useState(settings.maxLeaveDays.sick);
  const [annualMax, setAnnualMax] = useState(settings.maxLeaveDays.annual);
  const [personalMax, setPersonalMax] = useState(settings.maxLeaveDays.personal);

  // Selected work days
  const allDaysThai = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
  const [workDays, setWorkDays] = useState<string[]>(settings.workDays);

  const [menuPermissions, setMenuPermissions] = useState<Record<string, 'all' | 'admin_only'>>(
    settings.menuPermissions || {
      dashboard: 'all',
      employees: 'admin_only',
      leaves: 'all',
      supplies: 'all',
      documents: 'all',
      archives: 'admin_only'
    }
  );

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Toggle work day checkbox
  const handleToggleDay = (day: string) => {
    if (workDays.includes(day)) {
      setWorkDays(workDays.filter(d => d !== day));
    } else {
      setWorkDays([...workDays, day]);
    }
  };

  // Employee lookup auto filler helper
  const handleSelectEmployeeForAccount = (empId: string) => {
    setSelectedEmployeeId(empId);
    if (!empId) {
      setNewAccName('');
      setNewAccEmail('');
      return;
    }
    const emp = employees.find(e => e.employeeId === empId);
    if (emp) {
      setNewAccName(`${emp.firstName} ${emp.lastName}`);
      setNewAccEmail(emp.email);
    }
  };

  // Generate a random high-quality safe password
  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewAccPassword(pass);
  };

  // Create new account
  const handleCreateAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserNotification(null);
    setUserErrorNotification(null);

    const emailClean = newAccEmail.trim();
    if (!newAccName || !emailClean || !newAccPassword) {
      setUserErrorNotification('กรุณากรอกข้อมูลสำคัญของบัญชีผู้ใช้ให้ครบถ้วน');
      return;
    }

    if (newAccPassword.length < 4) {
      setUserErrorNotification('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษรเพื่อความปลอดภัย');
      return;
    }

    const duplicate = accounts.some(acc => acc.email.toLowerCase() === emailClean.toLowerCase());
    if (duplicate) {
      setUserErrorNotification(`ชื่อผู้ใช้งานหรืออีเมล "${emailClean}" มีในระบบอยู่แล้ว`);
      return;
    }

    const newAcc: UserAccount = {
      name: newAccName,
      email: emailClean,
      password: newAccPassword,
      role: newAccRole,
      employeeId: newAccRole === 'employee' && selectedEmployeeId ? selectedEmployeeId : undefined,
      requiresPasswordChange: newAccForceReset
    };

    onAddAccount(newAcc);
    setUserNotification(`เพิ่มบัญชีผู้ใช้งานระบบ "${newAccName}" พร้อมรหัสผ่านเรียบร้อย!`);
    
    // Reset fields
    setNewAccName('');
    setNewAccEmail('');
    setNewAccPassword('');
    setNewAccRole('employee');
    setSelectedEmployeeId('');
    setNewAccForceReset(true);

    setTimeout(() => {
      setUserNotification(null);
    }, 4500);
  };

  // Save modified user password
  const handleSavePasswordChange = (email: string) => {
    if (tempPassword.length < 4) {
      setUserErrorNotification('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      setTimeout(() => setUserErrorNotification(null), 3000);
      return;
    }
    onUpdateAccountPassword(email, tempPassword);
    setEditingEmail(null);
    setTempPassword('');
    setUserNotification('อัปเดตและเปลี่ยนแปลงรหัสผ่านของผู้ใช้เรียบร้อยแล้ว!');
    setTimeout(() => setUserNotification(null), 4500);
  };

  // Delete user account with verification
  const handleDeleteAccountConfirm = (email: string, name: string) => {
    if (email.toLowerCase() === activeUserEmail.toLowerCase() || email.toLowerCase() === 'admin@office.com') {
      setUserErrorNotification('คุณไม่สามารถลบบัญชีที่เปิดเข้าสู่ระบบใช้งานเครื่องนี้อยู่ หรือบัญชีแอดมินหลักของออฟฟิศได้');
      setTimeout(() => setUserErrorNotification(null), 3500);
      return;
    }
    
    onDeleteAccount(email);
    setUserNotification(`เสร็จสิ้น! บัญชีผู้ใช้ของ "${name}" ถูกลบออกจากสารบบระบบงานสำเร็จแล้ว`);
    setTimeout(() => setUserNotification(null), 4500);
  };

  const togglePasswordVisibility = (email: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [email]: !prev[email]
    }));
  };

  // Handle save form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      companyName,
      companyAddress,
      workDays,
      workHoursStart,
      workHoursEnd,
      maxLeaveDays: {
        sick: sickMax,
        annual: annualMax,
        personal: personalMax
      },
      hasOvertime,
      otStartTime,
      otRate,
      lateThresholdMins,
      menuPermissions,
      departments: settings.departments,
      loginLogoUrl,
      loginTitle,
      loginSubtitle
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };



  return (
    <div className="space-y-6" id="settings-section-container">
      {/* Header with Sub-tabs selector for System Settings vs Account settings */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4" id="settings-header-panel">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 font-sans flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            การตั้งค่าและแผงควบคุมระบบ
          </h2>
          <p className="text-xs text-slate-500">ปรับเปลี่ยนข้อมูลโครงสร้างสากล วันเวลาทำการ และจัดการรักษาความปลอดภัยบัญชีใช้งาน</p>
        </div>

        {/* Dynamic Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-xs shrink-0 self-start md:self-auto" id="settings-tab-switcher">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('system');
              setUserNotification(null);
              setUserErrorNotification(null);
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'system'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building className="w-4 h-4" />
            พารามิเตอร์โครงสร้าง
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('users');
              setUserNotification(null);
              setUserErrorNotification(null);
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'users'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            บัญชีผู้ใช้ & รหัสผ่าน
          </button>

        </div>
      </div>

      {activeSubTab === 'system' ? (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="settings-layout-form">
          
          {/* LEFT COLUMN: COMPANY PROFILE & RULES (2 Columns wide in desktop) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Company Profile Info */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-base font-bold text-slate-800 font-sans flex items-center gap-2 pb-2 border-b border-slate-50">
                <Building className="w-5 h-5 text-blue-600" />
                ข้อมูลทั่วไปหลักของสถานประกอบการ
              </h3>

              <div className="space-y-4">
                 <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">ชื่อหน่วยงาน / ชื่อบริษัทจำกัด *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    id="settings-company-name-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">ที่อยู่อาศัยส่วนกลาง / สำนักงานใหญ่</label>
                  <textarea
                    rows={3}
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
                    id="settings-company-address-input"
                  />
                </div>
              </div>
            </div>

            {/* Section 1.5: Login Screen Branding */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4" id="settings-branding-section">
              <h3 className="text-base font-bold text-slate-800 font-sans flex items-center gap-2 pb-2 border-b border-slate-50">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                ปรับแต่งภาพลักษณ์หน้าเข้าสู่ระบบ (Login Branding)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Form controls */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">หัวข้อหลักบนหน้า Login *</label>
                    <input
                      type="text"
                      required
                      value={loginTitle}
                      onChange={(e) => setLoginTitle(e.target.value)}
                      placeholder="เช่น OfficeConnect"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">คำบรรยาย / สโลแกนหน้า Login</label>
                    <input
                      type="text"
                      value={loginSubtitle}
                      onChange={(e) => setLoginSubtitle(e.target.value)}
                      placeholder="เช่น ระบบสารสนเทศสำหรับออฟฟิศครบวงจร"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2">ประเภทโลโก้หน้า Login</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-xs mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          setLogoType('image');
                          setLoginLogoUrl('');
                        }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                          logoType === 'image'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        รูปภาพโลโก้ (Image)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLogoType('emoji');
                          setLoginLogoUrl('🏢');
                        }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                          logoType === 'emoji'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        ไอคอนอีโมจิ (Emoji)
                      </button>
                    </div>

                    {logoType === 'emoji' ? (
                      <div className="space-y-3 animate-fadeIn">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 mb-1">ระบุอีโมจิ หรืออักขระที่ต้องการ</label>
                          <input
                            type="text"
                            maxLength={5}
                            value={loginLogoUrl}
                            onChange={(e) => setLoginLogoUrl(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono text-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 mb-1.5">อีโมจิแนะนำยอดนิยม</label>
                          <div className="flex flex-wrap gap-2 justify-between">
                            {['🏢', '🚀', '💻', '🔒', '🎯', '⚡', '📊', '🤝', '⚙️', '🌟'].map((em) => (
                              <button
                                key={em}
                                type="button"
                                onClick={() => setLoginLogoUrl(em)}
                                className={`w-8 h-8 rounded-lg border text-sm flex items-center justify-center cursor-pointer hover:bg-slate-50 transition ${
                                  loginLogoUrl === em ? 'border-blue-500 bg-blue-50/50 scale-110 shadow-xs' : 'border-slate-200'
                                }`}
                              >
                                {em}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 animate-fadeIn">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 mb-1">ลิงก์ URL รูปภาพโลโก้</label>
                          <input
                            type="text"
                            value={loginLogoUrl.startsWith('data:') ? '' : loginLogoUrl}
                            onChange={(e) => setLoginLogoUrl(e.target.value)}
                            placeholder="https://example.com/logo.png"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-slate-200"></div>
                          </div>
                          <div className="relative flex justify-center text-xs">
                            <span className="px-2 bg-white text-slate-400 text-[10px] font-semibold uppercase">หรือ อัปโหลดจากเครื่อง</span>
                          </div>
                        </div>

                        {/* Drag and Drop zone with standard manual trigger click */}
                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                if (typeof reader.result === 'string') {
                                  setLoginLogoUrl(reader.result);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-4 transition-colors text-center cursor-pointer group relative bg-slate-50/50 hover:bg-white"
                        >
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  if (typeof reader.result === 'string') {
                                    setLoginLogoUrl(reader.result);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div className="flex flex-col items-center justify-center space-y-1">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Upload className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="text-xs font-semibold text-slate-600">ลากรูปภาพมาวางที่นี่ หรือ คลิกเพื่ออัปโหลด</span>
                            <span className="text-[10px] text-slate-400">รองรับไฟล์ภาพ JPG, PNG, WEBP, SVG</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Interactive Preview */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-inner relative overflow-hidden h-[340px]" id="branding-live-preview-box">
                  {/* Background grid accents */}
                  <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
                  
                  <div className="relative z-10 text-center space-y-4 my-auto">
                    <span className="bg-slate-800/80 text-blue-400 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border border-slate-700/60">
                      พรีวิวหน้าจอจริง (Live Preview)
                    </span>

                    <div className="flex flex-col items-center space-y-3">
                      {/* Interactive Logo Rendering */}
                      {logoType === 'emoji' ? (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center text-3xl shadow-lg border border-slate-700">
                          {loginLogoUrl || '🏢'}
                        </div>
                      ) : loginLogoUrl ? (
                        <div className="w-16 h-16 rounded-2xl bg-white p-2.5 flex items-center justify-center shadow-lg border border-slate-700 overflow-hidden">
                          <img 
                            src={loginLogoUrl} 
                            alt="Logo Preview" 
                            className="max-w-full max-h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                          O
                        </div>
                      )}

                      <div className="space-y-1 max-w-[240px] mx-auto">
                        <h4 className="text-white font-black text-xl tracking-tight leading-none truncate">
                          {loginTitle || 'OfficeConnect'}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-medium leading-normal line-clamp-2">
                          {loginSubtitle || 'ระบบบริหารจัดการและประมวลผลข้อมูลองค์กรแบบเรียลไทม์'}
                        </p>
                      </div>
                    </div>

                    {/* Mock login fields to make it realistic */}
                    <div className="space-y-2 max-w-[200px] mx-auto opacity-40 select-none">
                      <div className="h-7 bg-slate-800 rounded-lg border border-slate-700 text-[9px] text-left px-2 flex items-center text-slate-500">
                        ชื่อผู้ใช้งาน หรือ อีเมล
                      </div>
                      <div className="h-7 bg-slate-950 rounded-lg border border-slate-850 text-[9px] text-left px-2 flex items-center text-slate-500">
                        รหัสผ่าน
                      </div>
                      <div className="h-7 bg-blue-600 rounded-lg text-[9px] font-bold flex items-center justify-center text-white">
                        เข้าสู่ระบบ
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Work Days and Work Hours */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-base font-bold text-slate-800 font-sans flex items-center gap-2 pb-2 border-b border-slate-50">
                <Calendar className="w-5 h-5 text-emerald-600" />
                ตารางกำหนดวันและเวลาทำงานอย่างเป็นทางการ
              </h3>

              <div className="space-y-5">
                {/* Checkboxes days selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">วันปฏิบัติราชการปกติประจำสัปดาห์</label>
                  <div className="flex flex-wrap gap-2">
                    {allDaysThai.map((day) => {
                      const isSelected = workDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleToggleDay(day)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            isSelected 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Working Hours range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      เวลาแสกนเข้างานปกติ (น.)
                    </label>
                    <input
                      type="time"
                      value={workHoursStart}
                      onChange={(e) => setWorkHoursStart(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      เวลาแสกนออกงานปกติ (น.)
                    </label>
                    <input
                      type="time"
                      value={workHoursEnd}
                      onChange={(e) => setWorkHoursEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Late Grace Period and OT Start Time / Rate */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      อนุญาตให้สายได้สูงสุด (นาที)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={lateThresholdMins}
                      onChange={(e) => setLateThresholdMins(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      เวลาเริ่มนับโอที (OT) (น.)
                    </label>
                    <input
                      type="time"
                      disabled={!hasOvertime}
                      value={otStartTime}
                      onChange={(e) => setOtStartTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      อัตราค่าทำงานล่วงเวลา (เท่า)
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={0.1}
                      disabled={!hasOvertime}
                      value={otRate}
                      onChange={(e) => setOtRate(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-50"
                    />
                  </div>
                </div>

                {/* Has OT toggling */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="hasOvertime"
                    checked={hasOvertime}
                    onChange={(e) => setHasOvertime(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <label htmlFor="hasOvertime" className="text-xs font-medium text-slate-600 cursor-pointer select-none">
                    อนุญาตให้คิดค่าล่วงเวลา (Overtime - OT) ของพนักงานนอกช่วงชั่วโมงการทำงานปกติ
                  </label>
                </div>
              </div>
            </div>

            {/* Section 5: Menu Access Permissions */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-base font-bold text-slate-800 font-sans flex items-center gap-2 pb-2 border-b border-slate-50">
                <Lock className="w-5 h-5 text-indigo-600" />
                ตั้งค่าสิทธิ์การเข้าถึงหน้าเมนูพนักงาน
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                ผู้ดูแลระบบสามารถกำหนดได้ว่าเมนูใดบ้างที่จะเปิดโอกาสให้ "พนักงานทั่วไป" มองเห็นและเข้าถึงรายละเอียดการทำงานได้ หรือเมนูใดที่ต้องการล็อกไว้ให้เฉพาะ "ผู้ดูแลระบบ (Admin)" เท่านั้น
              </p>

              <div className="divide-y divide-slate-100 mt-2">
                {[
                  { id: 'dashboard', label: 'ภาพรวมระบบ (Dashboard)', icon: LayoutDashboard, desc: 'หน้าแรกสำหรับแสดงภาพสรุป สถิติการเบิกจ่ายพัสดุและอัตราการทำงาน' },
                  { id: 'employees', label: 'ข้อมูลพนักงาน (Employees)', icon: Users, desc: 'แฟ้มทะเบียนประวัติพนักงาน เบอร์โทร อีเมล และตำแหน่งหน้าที่' },
                  { id: 'leaves', label: 'การลางาน (Leaves)', icon: CalendarDays, desc: 'ประวัติและแบบฟอร์มการส่งคำขออนุมัติลางานของพนักงานในออฟฟิศ' },
                  { id: 'supplies', label: 'เบิกจ่ายพัสดุ (Inventory)', icon: Package, desc: 'คลังวัสดุอุปกรณ์ และการเขียนคำขอเบิกเครื่องใช้สำนักงาน' },
                  { id: 'documents', label: 'แฟ้มเอกสาร & คำร้อง (Documents)', icon: FolderClosed, desc: 'คลังสัญญากลาง เอกสารหนังสือมอบอำนาจ และใบเสนอราคาสากล' },
                  { id: 'archives', label: 'สรุปข้อมูลย้อนหลัง (Archives)', icon: Archive, desc: 'หน้ารวมสถิติย้อนหลังและข้อมูลสรุปเพื่อการวางแผนองค์กร' },
                ].map((menu) => {
                  const currentPermission = menuPermissions[menu.id] || 'all';
                  return (
                    <div key={menu.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0">
                      <div className="flex items-start gap-3 max-w-md">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl mt-0.5 shrink-0">
                          <menu.icon className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800 font-sans">{menu.label}</h4>
                          <p className="text-xs text-slate-400 leading-normal">{menu.desc}</p>
                        </div>
                      </div>

                      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 max-w-xs shrink-0 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setMenuPermissions(prev => ({ ...prev, [menu.id]: 'all' }))}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                            currentPermission === 'all'
                              ? 'bg-white text-indigo-600 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          พนักงานทุกคนเข้าได้
                        </button>
                        <button
                          type="button"
                          onClick={() => setMenuPermissions(prev => ({ ...prev, [menu.id]: 'admin_only' }))}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                            currentPermission === 'admin_only'
                              ? 'bg-white text-rose-600 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          เฉพาะแอดมิน
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: LEAVE RESTRICTIONS & CORE TOOLS (1 Column wide) */}
          <div className="space-y-6">
            {/* Section 3: Leave limits */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-base font-bold text-slate-800 font-sans flex items-center gap-2 pb-2 border-b border-slate-50">
                <Plane className="w-5 h-5 text-amber-500" />
                เกณฑ์อัตราโควตาการลาหยุดส่วนบุคคล
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
                    <span>สิทธิ์ลาพักร้อนประจำปีสูงสุด (วัน/ปี):</span>
                    <span className="text-blue-600 font-bold font-mono">{annualMax} วัน</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={annualMax}
                    onChange={(e) => setAnnualMax(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
                    <span>สิทธิ์ลาป่วยสูงสุดโดยได้รับเงินเดือน (วัน/ปี):</span>
                    <span className="text-rose-600 font-bold font-mono">{sickMax} วัน</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={60}
                    value={sickMax}
                    onChange={(e) => setSickMax(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-650"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center justify-between">
                    <span>สิทธิ์ลากิจส่วนตัวสูงสุด (วัน/ปี):</span>
                    <span className="text-amber-600 font-bold font-mono">{personalMax} วัน</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={15}
                    value={personalMax}
                    onChange={(e) => setPersonalMax(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-650"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Maintenance Actions */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-1.5 pb-2 border-b border-rose-50">
                <RefreshCw className="w-4 h-4 text-rose-500" />
                การจัดการและล้างคืนค่าระบบ (Danger Zone)
              </h3>

              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                หากต้องการรีเซ็ตประวัติ ข้อมูลการเบิกจ่าย และแฟ้มประวัติพนักงานทั้งหมด กลับคืนเหมือนพึ่งติดตั้งระบบครั้งแรก ให้กดปุ่มด้านล่างนี้:
              </p>

              {!showResetConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold rounded-xl hover:bg-rose-100 hover:text-rose-700 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  ลบข้อมูลและคืนค่าระบบทั้งหมด
                </button>
              ) : (
                <div className="bg-rose-50 border border-rose-250 rounded-xl p-4 space-y-3" id="settings-inline-confirm">
                  <div className="text-xs text-rose-700 font-bold flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-rose-500 animate-spin" />
                    คุณมั่นใจใช่หรือไม่? ข้อมูลทั้งหมดจะถูกลบและย้อนคืนไม่ได้
                  </div>
                  <p className="text-[11px] text-rose-500 leading-normal font-sans">
                    การรีเซ็ตจะทำลายข้อมูลพนักงาน บันทึกวันลา และคลังพัสดุคืนสู่ค่าดีฟอลต์แรกเริ่ม
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onResetAllState()}
                      className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-750 text-white text-xs font-bold rounded-lg cursor-pointer transition text-center"
                    >
                      ใช่, ล้างข้อมูลเลย
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer hover:bg-slate-50 transition"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM PANEL: ACTIONS SAVE & STATUS FEEDBACK */}
          <div className="lg:col-span-3 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2">
              {saveSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl font-semibold"
                >
                  <CheckCircle className="w-4 h-4" />
                  บันทึกการตั้งค่าโครงสร้างและองค์กรเรียบร้อยแล้ว!
                </motion.div>
              ) : (
                <div className="text-xs text-slate-400 font-medium">
                  * กรุณากดปุ่ม บันทึกการตั้งค่า เพื่อยืนยันลงไปประยุกต์ใช้กับพนักงานทุกคน
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-6 py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              บันทึกการตั้งค่าระบบสำนักงาน
            </button>
          </div>

        </form>
      ) : (
        /* USER ACCOUNTS & PASSWORD DIRECTORY */
        <div className="space-y-6 animate-fadeIn" id="settings-users-tab-content">
          
          {/* Feedbacks */}
          {userNotification && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl p-3.5 text-xs flex items-center gap-2 shadow-xs"
              id="user-mgmt-success-notif"
            >
              <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
              <span className="font-semibold">{userNotification}</span>
            </motion.div>
          )}

          {userErrorNotification && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-50 text-rose-800 border border-rose-200 rounded-xl p-3.5 text-xs flex items-center gap-2 shadow-xs"
              id="user-mgmt-error-notif"
            >
              <ShieldAlert className="w-4.5 h-4.5 text-rose-600 shrink-0" />
              <span className="font-semibold">{userErrorNotification}</span>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT SIDE: ACCOUNT LIST TABLE (2 COLUMNS) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="account-directory-card">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-base font-sans flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" />
                    สารบบบัญชีผู้ใช้งานระบบทั้งหมด ({accounts.length})
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">รวมผู้ใช้ที่มีสิทธิ์แอดมินหรือพนักงานทั่วไปในการเข้าสู่ฐานข้อมูลระบบ</p>
                </div>
              </div>

              {/* Accounts table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" id="user-accounts-list-table">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">ผู้ใช้งาน (User)</th>
                      <th className="py-3 px-4">ชื่อล็อกอิน (Login/Email)</th>
                      <th className="py-3 px-4">รหัสผ่าน (Password)</th>
                      <th className="py-3 px-4 text-center">สิทธิ์การทำงาน</th>
                      <th className="py-3 px-4 text-right">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {accounts.map((acc, idx) => {
                      const isSelf = acc.email.toLowerCase() === activeUserEmail.toLowerCase();
                      const isMainAdmin = acc.email.toLowerCase() === 'admin@office.com';
                      const isEditing = editingEmail === acc.email;
                      const isPwdVisible = !!visiblePasswords[acc.email];

                      return (
                        <tr 
                          key={acc.email + idx} 
                          className={`hover:bg-slate-50/50 transition-colors ${
                            isSelf ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          {/* User Display Info */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                acc.role === 'admin' 
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}>
                                {acc.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 flex flex-wrap items-center gap-1 leading-tight font-sans">
                                  {acc.name}
                                  {isSelf && <span className="text-[9px] bg-blue-600 text-white font-semibold px-1 rounded">คุณ</span>}
                                  {acc.requiresPasswordChange && (
                                    <span className="text-[9px] bg-amber-500 text-white font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5" title="ผู้ใช้ต้องเปลี่ยนรหัสผ่านเมื่อล็อกอินครั้งแรก">
                                      ⚠️ กำหนดเปลี่ยนรหัสผ่าน
                                    </span>
                                  )}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  {acc.employeeId ? `ID: ${acc.employeeId}` : 'บัญชีอิสระ (Standalone)'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Login Ident */}
                          <td className="py-3.5 px-4 font-mono text-slate-600 text-xs">
                            <span className="bg-slate-100 px-2 py-1 rounded border border-slate-150/60 font-medium">
                              {acc.email}
                            </span>
                          </td>

                          {/* Dynamic Password Modify Action Cell */}
                          <td className="py-3.5 px-4">
                            {isEditing ? (
                              <div className="flex items-center gap-1 max-w-[150px]">
                                <input
                                  type="text"
                                  value={tempPassword}
                                  onChange={(e) => setTempPassword(e.target.value)}
                                  className="w-full px-2 py-1 border border-blue-500 rounded text-xs text-blue-700 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                  placeholder="รหัสผ่านใหม่"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSavePasswordChange(acc.email)}
                                  className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition cursor-pointer shrink-0"
                                  title="บันทึกรหัสผ่านใหม่"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingEmail(null);
                                    setTempPassword('');
                                    setUserErrorNotification(null);
                                  }}
                                  className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer shrink-0"
                                  title="ยกเลิก"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-slate-700 font-semibold select-all bg-slate-50 px-2 py-1 rounded">
                                  {isPwdVisible ? (acc.password || '••••••••') : '••••••••'}
                                </span>
                                
                                <div className="flex items-center">
                                  {/* Visibility Switcher */}
                                  <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility(acc.email)}
                                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition cursor-pointer"
                                    title={isPwdVisible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                                  >
                                    {isPwdVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                  
                                  {/* Pen Edit Switcher */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingEmail(acc.email);
                                      setTempPassword(acc.password || '');
                                      setUserErrorNotification(null);
                                      setUserNotification(null);
                                    }}
                                    className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition cursor-pointer"
                                    title="แก้ไขรหัสผ่าน"
                                  >
                                    <Key className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Role access badge */}
                          <td className="py-3.5 px-4 text-center">
                            {acc.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 border border-indigo-150 text-indigo-600">
                                <ShieldCheck className="w-3 h-3" />
                                ผู้ดูแลระบบ (Admin)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-150 text-emerald-600 font-sans">
                                <UserCheck className="w-3 h-3" />
                                ผู้ใช้งาน (User)
                              </span>
                            )}
                          </td>

                          {/* Control actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!isMainAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPermissionsModal(acc)}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 hover:text-indigo-800 text-[11px] font-bold rounded-xl transition cursor-pointer inline-flex items-center gap-1"
                                  title="กำหนดสิทธิ์ตามตำแหน่งและบทบาทหน้าที่"
                                >
                                  <Lock className="w-3 h-3" />
                                  กำหนดสิทธิ์
                                </button>
                              )}
                              {isSelf || isMainAdmin ? (
                                <span className="text-[10px] text-slate-400 font-semibold italic select-none">
                                  {isSelf ? 'บัญชีที่คุณใช้' : 'แอดมินหลัก'}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAccountConfirm(acc.email, acc.name)}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-750 text-xs font-semibold rounded-xl transition cursor-pointer inline-flex items-center gap-1"
                                  title="ลบบัญชีผู้ใช้งานระบบ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  ลบผู้ใช้
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT SIDE: CREATE USER ACCOUNT FORM (1 COLUMN) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="account-creation-panel">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-base font-sans flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-500" />
                  เพิ่มและผูกบัญชีผู้ใช้งานใหม่
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">สร้างบัญชีผู้ใช้ ล็อกอิน และรหัสผ่านใหม่ลงโครงสร้างฐานข้อมูล</p>
              </div>

              <form onSubmit={handleCreateAccountSubmit} className="space-y-4" id="form-add-new-user-credentials">
                
                {/* Check alignment link with employees directory */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">เลือกพนักงานสืบค้น (Employee Link)</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => handleSelectEmployeeForAccount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- ไม่เชื่อมโยงพนักงาน / สมัครบัญชีอิสระ --</option>
                    {employees.map(emp => (
                      <option key={emp.employeeId} value={emp.employeeId}>
                        {emp.firstName} {emp.lastName} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    เมื่อเลือกพนักงาน ระบบจะดึงชื่อพนักงานและอีเมลมาใส่ให้ด้านล่างอัตโนมัติ
                  </p>
                </div>

                {/* Display Name Input */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">ชื่อแสดงของบัญชีผู้ใช้ *</label>
                  <input
                    type="text"
                    required
                    placeholder="สมใจ หมายใจดี"
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                  />
                </div>

                {/* Email / Login Account name */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">ชื่อผู้ใช้ล็อกอิน (Email / Username) *</label>
                  <input
                    type="text"
                    required
                    placeholder="somjai.m@office.co.th"
                    value={newAccEmail}
                    onChange={(e) => setNewAccEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                {/* Password field with random generator */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 flex items-center justify-between">
                    <span>รหัสผ่านตั้งต้น *</span>
                    <button
                      type="button"
                      onClick={handleGenerateRandomPassword}
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-yellow-500 animate-pulse" />
                      สุ่มรหัสผ่านปลอดภัย
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ขั้นต่ำ 4 ตัวอักษร"
                    value={newAccPassword}
                    onChange={(e) => setNewAccPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-yellow-600 font-bold bg-slate-50"
                  />
                </div>

                {/* System Role Selection - Default is 'employee' meaning 'user' according to specifications */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">สิทธิ์ผู้ใช้งาน (System Role)</label>
                  <select
                    value={newAccRole}
                    onChange={(e) => setNewAccRole(e.target.value as 'admin' | 'employee')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="employee">ผู้ใช้งานทั่วไป (User)</option>
                    <option value="admin">ผู้ดูแลระบบสูงสุด (Admin)</option>
                  </select>
                  <p className="text-[10px] text-slate-400">
                    * สมัครใช้งานครั้งแรกแนะนำให้ใช้บทบาทผู้ใช้งานทั่วไป (User) เพื่อความปลอดภัยสูงสุด
                  </p>
                </div>

                {/* Force Reset Password Checkbox */}
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="newAccForceReset"
                    checked={newAccForceReset}
                    onChange={(e) => setNewAccForceReset(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 border-slate-200 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="newAccForceReset" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    บังคับให้เปลี่ยนรหัสผ่านเมื่อเข้าใช้งานครั้งแรก
                    <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                      ระบบจะแสดงหน้าต่างให้พนักงานกำหนดรหัสผ่านของตนเองหลังจากป้อนรหัสผ่านตั้งต้น
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-100 transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  เพิ่มบัญชีสมาชิกใหม่ลงระบบ
                </button>
              </form>
            </div>

          </div>
        </div>
      )}



      {/* DETAILED USER PERMISSIONS MODAL */}
      {selectedPermsAccount && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" id="user-perms-modal">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-800 font-sans">
                    ตั้งค่าระดับสิทธิ์ผู้ใช้งานระบบ
                  </h3>
                  <p className="text-[11px] text-slate-400">กำหนดสิทธิ์รายบุคคลตามลำดับตำแหน่งและบทบาทหน้าที่</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPermsAccount(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-150 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Linked Employee Info Card */}
              <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100/50 space-y-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-md">
                  ข้อมูลบัญชีผู้ใช้งานผู้เชื่อมโยง
                </span>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{selectedPermsAccount.name}</h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedPermsAccount.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full font-bold">
                      {selectedPermsAccount.role === 'admin' ? 'บทบาท: แอดมิน (Admin)' : 'บทบาท: พนักงาน (User)'}
                    </span>
                  </div>
                </div>

                {/* Resolve matched employee details for "ตามลำดับตำแหน่งและหน้าที่" requirement */}
                {(() => {
                  const emp = selectedPermsAccount.employeeId 
                    ? employees.find(e => e.employeeId === selectedPermsAccount.employeeId)
                    : null;
                  if (emp) {
                    return (
                      <div className="pt-2 mt-2 border-t border-indigo-100/50 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div>
                          <span className="text-slate-400 text-[10px]">แผนก/ฝ่ายปฏิบัติงาน:</span>
                          <p className="font-semibold text-slate-700">{emp.department || '-'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px]">ตำแหน่ง/หน้าที่ความรับผิดชอบ:</span>
                          <p className="font-semibold text-slate-700">{emp.position || '-'}</p>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <p className="text-[11px] text-slate-400 italic pt-1">
                        * บัญชีอิสระ (ไม่ได้ผูกโยงกับทะเบียนประวัติพนักงานรายบุคคล)
                      </p>
                    );
                  }
                })()}
              </div>

              {/* Roles Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600">บทบาทระบบหลัก (System Role)</label>
                <select
                  value={modalRole}
                  onChange={(e) => {
                    const r = e.target.value as 'admin' | 'employee';
                    setModalRole(r);
                    if (r === 'admin') {
                      // Admin automatically has all permissions
                      setModalCanApproveLeave(true);
                      setModalCanApproveSupply(true);
                      setModalCanManageEmployees(true);
                      setModalCanManageSettings(true);
                      setModalCanViewArchives(true);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                >
                  <option value="employee">ผู้ใช้งานทั่วไป (User) - กำหนดสิทธิ์แยกตามตำแหน่งหน้าที่</option>
                  <option value="admin">ผู้ดูแลระบบสูงสุด (Admin) - ได้รับสิทธิ์เข้าถึงทุกส่วนอัตโนมัติ</option>
                </select>
              </div>

              {modalRole === 'employee' && (
                <>
                  {/* Quick templates helper */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600">เทมเพลตสิทธิ์ด่วน (Quick Templates)</label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyPermissionTemplate('general')}
                        className="px-2.5 py-1 text-[10px] font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition cursor-pointer"
                      >
                        พนักงานทั่วไป (General)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPermissionTemplate('hr')}
                        className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-150 text-emerald-600 transition cursor-pointer"
                      >
                        ฝ่ายบุคคล / HR Manager
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPermissionTemplate('inventory')}
                        className="px-2.5 py-1 text-[10px] font-bold bg-amber-50 hover:bg-amber-100 border border-amber-150 text-amber-600 transition cursor-pointer"
                      >
                        ผู้จัดการคลัง / Supply Manager
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPermissionTemplate('coadmin')}
                        className="px-2.5 py-1 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-600 transition cursor-pointer"
                      >
                        แอดมินร่วม / Co-Admin
                      </button>
                    </div>
                  </div>

                  {/* Granular permissions switches */}
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-bold text-slate-600 border-b border-slate-100 pb-1">
                      สิทธิ์การใช้งานและการดำเนินการย่อย (Granular Permissions)
                    </label>

                    {/* Can approve leaves - HR */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50/60 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">อนุมัติการลาขั้นแรก (ฝ่ายบุคคล / HR)</span>
                        <span className="text-[10px] text-slate-400">อนุญาตให้พิจารณากลั่นกรองและอนุมัติการลาขั้นแรก ก่อนส่งให้ผู้จัดการ</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={modalCanApproveLeaveHR}
                        onChange={(e) => setModalCanApproveLeaveHR(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    {/* Can approve leaves - Manager */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50/60 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">อนุมัติการลาขั้นสุดท้าย (ผู้จัดการ / Manager)</span>
                        <span className="text-[10px] text-slate-400">อนุญาตให้พิจารณาอนุมัติขั้นสุดท้ายเพื่อให้พนักงานสามารถหยุดงานได้จริง</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={modalCanApproveLeaveManager}
                        onChange={(e) => setModalCanApproveLeaveManager(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    {/* Can approve supplies */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50/60 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">อนุมัติจ่ายพัสดุและเบิกสิ่งของ</span>
                        <span className="text-[10px] text-slate-400">อนุญาตให้ลงรายการอนุมัติปล่อยจ่ายเครื่องเขียนและของใช้ออฟฟิศ</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={modalCanApproveSupply}
                        onChange={(e) => setModalCanApproveSupply(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    {/* Can manage supply items */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50/60 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">จัดการเพิ่มรายการคลัง</span>
                        <span className="text-[10px] text-slate-400">อนุญาตให้เพิ่ม ลบ แก้ไขข้อมูลวัสดุอุปกรณ์ และจัดการหมวดหมู่ในระบบคลังพัสดุ</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={modalCanManageSupplyItems}
                        onChange={(e) => setModalCanManageSupplyItems(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    {/* Can manage employees */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50/60 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">จัดการและแก้ไขทะเบียนพนักงาน</span>
                        <span className="text-[10px] text-slate-400">อนุญาตให้เพิ่ม ลบ หรือแก้ไขประวัติส่วนตัว/เงินเดือนของบุคลากรในบริษัท</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={modalCanManageEmployees}
                        onChange={(e) => setModalCanManageEmployees(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    {/* Can manage settings */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50/60 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">จัดการตั้งค่าระบบและบริษัท</span>
                        <span className="text-[10px] text-slate-400">อนุญาตให้แก้ไขชั่วโมงเวลาทำงาน วันหยุด หรือสิทธิ์การเข้าถึงภาพรวม</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={modalCanManageSettings}
                        onChange={(e) => setModalCanManageSettings(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    {/* Can view archives */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50/60 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">เรียกดูสถิติและประวัติรายงานย้อนหลัง</span>
                        <span className="text-[10px] text-slate-400">อนุญาตให้เปิดดูสรุปบัญชี คลังจัดเก็บ และประวัติพนักงานที่ลาออกแล้ว</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={modalCanViewArchives}
                        onChange={(e) => setModalCanViewArchives(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    {/* Can clear leave history */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50/60 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">สิทธิ์ลบหรือเคลียร์ประวัติรายการขอลางาน</span>
                        <span className="text-[10px] text-slate-400">อนุญาตให้ล้างข้อมูลประวัติคำขอลากิจทั้งหมดของพนักงานออกจากระบบ</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={modalCanClearLeaveHistory}
                        onChange={(e) => setModalCanClearLeaveHistory(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-200 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </>
              )}

              {modalRole === 'admin' && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-150 text-xs text-amber-700 leading-relaxed font-semibold flex items-start gap-2">
                  <span className="text-base">⚠️</span>
                  <span>
                    เมื่อตั้งค่าเป็นผู้ดูแลระบบหลัก (Admin) บัญชีนี้จะได้รับสิทธิ์ในการอนุมัติใบลา, สั่งจ่ายพัสดุ, แก้ไขทะเบียนข้อมูลพนักงาน, เข้าถึงการตั้งค่า และดูคลังรายงานย้อนหลังทั้งหมดโดยอัตโนมัติ ไม่จำเป็นต้องทำรายการติ๊กเลือกแยกย่อย
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedPermsAccount(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-100 transition cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                บันทึกการตั้งค่าสิทธิ์
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
