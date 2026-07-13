import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle2, 
  UserPlus, 
  KeyRound, 
  Building2, 
  Briefcase, 
  Eye, 
  EyeOff,
  CornerUpLeft,
  Settings,
  HelpCircle,
  UserCheck
} from 'lucide-react';
import { Employee, UserAccount, SystemSettings } from '../types';

interface LoginAuthProps {
  accounts: UserAccount[];
  employees: Employee[];
  onLoginSuccess: (user: UserAccount) => void;
  onRegisterCustomEmployee: (newEmployee: Omit<Employee, 'id'>, account: UserAccount) => void;
  onUpdateAccountPassword: (email: string, newPass: string, clearRequiresPasswordChange?: boolean, newUsername?: string) => void;
  departments?: string[];
  settings?: SystemSettings;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'first-login-change-password';

const formatPhoneNumber = (value: string): string => {
  const clean = value.replace(/\D/g, '');
  const trimmed = clean.slice(0, 10);
  const parts = [];
  if (trimmed.length > 0) parts.push(trimmed.substring(0, 3));
  if (trimmed.length > 3) parts.push(trimmed.substring(3, 6));
  if (trimmed.length > 6) parts.push(trimmed.substring(6, 10));
  return parts.join('-');
};

export default function LoginAuth({
  accounts,
  employees,
  onLoginSuccess,
  onRegisterCustomEmployee,
  onUpdateAccountPassword,
  departments = [
    'เทคโนโลยีสารสนเทศ (IT)',
    'ทรัพยากรบุคคล (HR)',
    'ฝ่ายขายและการตลาด',
    'บัญชีและการเงิน',
    'ฝ่ายบริหารองค์กร'
  ],
  settings
}: LoginAuthProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  
  // First Login Password Change state
  const [pendingChangePassAccount, setPendingChangePassAccount] = useState<UserAccount | null>(null);
  const [newEmployeeUsername, setNewEmployeeUsername] = useState('');
  const [newEmployeePassword, setNewEmployeePassword] = useState('');
  const [confirmNewEmployeePassword, setConfirmNewEmployeePassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Login form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Register form states
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regPosition, setRegPosition] = useState('เจ้าหน้าที่ธุรการ');
  const [regDepartment, setRegDepartment] = useState(departments[0] || 'ทรัพยากรบุคคล (HR)');
  const [regPhone, setRegPhone] = useState('089-111-2233');

  useEffect(() => {
    if (departments && departments.length > 0 && !departments.includes(regDepartment)) {
      setRegDepartment(departments[0]);
    }
  }, [departments]);

  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [recoveryAccount, setRecoveryAccount] = useState<UserAccount | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [recoverySuccessMessage, setRecoverySuccessMessage] = useState('');

  // Status/Feedback alert states
  const [errorAlert, setErrorAlert] = useState('');
  const [successAlert, setSuccessAlert] = useState('');

  // Auto Quick Login fill
  const handleQuickLogin = (role: 'admin' | 'employee') => {
    setErrorAlert('');
    setSuccessAlert('');
    if (role === 'admin') {
      setLoginEmail('modify');
      setLoginPassword('1234');
    } else {
      setLoginEmail('somchai.j@office.co.th');
      setLoginPassword('password123');
    }
  };

  // Perform Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAlert('');
    setSuccessAlert('');

    if (!loginEmail || !loginPassword) {
      setErrorAlert('กรุณากรอกชื่อผู้ใช้งาน/อีเมล และรหัสผ่านให้ครบถ้วน');
      return;
    }

    // Find account by email or username
    const matched = accounts.find(
      acc => 
        acc.email.toLowerCase() === loginEmail.toLowerCase().trim() ||
        (acc.username && acc.username.toLowerCase() === loginEmail.toLowerCase().trim())
    );

    if (!matched) {
      setErrorAlert('ไม่พบบัญชีผู้ใช้งานนี้ในระบบ กรุณาตรวจสอบชื่อผู้ใช้งานหรืออีเมลอีกครั้ง');
      return;
    }

    if (matched.password !== loginPassword) {
      setErrorAlert('รหัสผ่านไม่ถูกต้อง กรุณาอัปเดตหรือลองใหม่อีกครั้ง');
      return;
    }

    // Intercept if first login change password is required
    if (matched.requiresPasswordChange) {
      setPendingChangePassAccount(matched);
      setNewEmployeeUsername(matched.username || matched.email.split('@')[0] || '');
      setNewEmployeePassword('');
      setConfirmNewEmployeePassword('');
      setMode('first-login-change-password');
      setSuccessAlert('ยืนยันตัวตนสำเร็จ! เพื่อความปลอดภัยสูงสุด กรุณากำหนดชื่อผู้ใช้งาน (User) และรหัสผ่านใหม่ของท่านเอง');
      return;
    }

    // Success Authentication
    setSuccessAlert(`ยินดีต้อนรับเข้าสู่ระบบ! เข้าสู่ระบบในฐานะคุณ ${matched.name}`);
    setTimeout(() => {
      onLoginSuccess(matched);
    }, 840);
  };

  // Perform First Login Change Password
  const handleFirstLoginChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAlert('');
    setSuccessAlert('');

    if (!pendingChangePassAccount) {
      setErrorAlert('ไม่พบบัญชีผู้ใช้ที่กำลังดำเนินการ กรุณาลองล็อกอินอีกครั้ง');
      setMode('login');
      return;
    }

    const trimmedUser = newEmployeeUsername.trim();
    if (!trimmedUser || trimmedUser.length < 3) {
      setErrorAlert('ชื่อผู้ใช้งานใหม่ต้องมีความยาวอย่างน้อย 3 ตัวอักษร');
      return;
    }

    // Check if username is already taken by another user
    const userExists = accounts.some(
      acc => 
        acc.email.toLowerCase() !== pendingChangePassAccount.email.toLowerCase() &&
        acc.username && 
        acc.username.toLowerCase() === trimmedUser.toLowerCase()
    );
    if (userExists) {
      setErrorAlert('ชื่อผู้ใช้งานนี้ถูกใช้งานแล้วในระบบ กรุณาเลือกชื่อผู้ใช้งานอื่น');
      return;
    }

    const trimmedPass = newEmployeePassword.trim();
    if (!trimmedPass || trimmedPass.length < 4) {
      setErrorAlert('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษรเพื่อความปลอดภัย');
      return;
    }

    if (newEmployeePassword !== confirmNewEmployeePassword) {
      setErrorAlert('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    if (newEmployeePassword === pendingChangePassAccount.password && trimmedUser === (pendingChangePassAccount.username || '')) {
      setErrorAlert('กรุณาตั้งชื่อผู้ใช้งานหรือรหัสผ่านใหม่ที่ไม่ซ้ำกับของเดิม');
      return;
    }

    // Call callback to update in storage
    onUpdateAccountPassword(pendingChangePassAccount.email, newEmployeePassword, true, trimmedUser);

    setSuccessAlert('บันทึกชื่อผู้ใช้งานและรหัสผ่านใหม่ของท่านเสร็จสมบูรณ์เรียบร้อย! กำลังนำเข้าสู่ระบบ...');
    
    // Success Authentication and transition
    setTimeout(() => {
      onLoginSuccess({
        ...pendingChangePassAccount,
        username: trimmedUser,
        password: newEmployeePassword,
        requiresPasswordChange: false
      });
      setPendingChangePassAccount(null);
    }, 1200);
  };

  // Perform Register
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAlert('');
    setSuccessAlert('');

    if (!regFirstName || !regLastName || !regEmail || !regPassword) {
      setErrorAlert('กรุณากรอกข้อมูลส่วนตัวในช่องที่มีเครื่องหมายดอกจัน (*) ให้ครบถ้วน');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorAlert('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    if (regPassword.length < 6) {
      setErrorAlert('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษรเพื่อความปลอดภัย');
      return;
    }

    // Check duplicate email in accounts
    const emailExists = accounts.some(
      acc => acc.email.toLowerCase() === regEmail.toLowerCase().trim()
    );
    if (emailExists) {
      setErrorAlert('อีเมลนี้ถูกใช้งานแล้วในระบบ กรุณาใช้อีเมลอื่นสมัครสมาชิก');
      return;
    }

    // Generate random but professional Employee ID like EMP-00X
    const maxEmpNum = employees.reduce((max, emp) => {
      const match = emp.employeeId.match(/EMP-(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        return num > max ? num : max;
      }
      return max;
    }, 5);
    const newEmpId = `EMP-${String(maxEmpNum + 1).padStart(3, '0')}`;

    const newEmployeeData: Omit<Employee, 'id'> = {
      employeeId: newEmpId,
      firstName: regFirstName,
      lastName: regLastName,
      position: regPosition,
      department: regDepartment,
      email: regEmail,
      phone: regPhone,
      startDate: new Date().toISOString().split('T')[0],
      status: 'active',
      avatar: regFirstName.slice(0, 2).toUpperCase(),
      personalId: '1-0012-' + Math.floor(10000 + Math.random() * 90000) + '-00-0',
      birthDate: '1995-01-01',
      address: 'กรุงเทพมหานคร ประเทศไทย',
      emergencyContact: {
        name: 'บุคคลใกล้ชิด',
        relationship: 'ผู้ปกครอง/ญาติ',
        phone: '081-000-0000'
      }
    };

    const newAccountData: UserAccount = {
      email: regEmail,
      password: regPassword,
      role: 'employee',
      employeeId: newEmpId,
      name: `${regFirstName} ${regLastName}`
    };

    // Callback to trigger states rewrite in App.tsx
    onRegisterCustomEmployee(newEmployeeData, newAccountData);

    setSuccessAlert(`ลงทะเบียนสำเร็จแล้ว! รหัสพนักงานของคุณคือ ${newEmpId}`);
    setTimeout(() => {
      // Auto fill in login
      setLoginEmail(regEmail);
      setLoginPassword(regPassword);
      setMode('login');
      setSuccessAlert('ลงทะเบียนเรียบร้อย ระบบสลับกลับไปหน้าเข้าสู่ระบบอัตโนมัติ');
    }, 1500);
  };

  // Perform Lookup / Reset Password keys
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAlert('');
    setRecoverySuccessMessage('');
    setRecoveryAccount(null);

    if (!forgotEmail) {
      setErrorAlert('กรุณากรอกอีเมลที่ลงทะเบียนไว้');
      return;
    }

    const matched = accounts.find(
      acc => acc.email.toLowerCase() === forgotEmail.toLowerCase().trim()
    );

    if (!matched) {
      setErrorAlert('ไม่พบชื่อผู้ใช้งานหรืออีเมลนี้ในสารบบ ข้อมูลไม่ถูกต้อง');
      return;
    }

    // Found account
    setRecoveryAccount(matched);
    setNewPasswordVal(matched.password || 'password123');
  };

  const handleUpdatePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryAccount) return;
    if (newPasswordVal.length < 6) {
      setErrorAlert('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    onUpdateAccountPassword(recoveryAccount.email, newPasswordVal);
    setRecoverySuccessMessage('รีเซ็ตรหัสผ่านและแก้ไขฐานข้อมูลเรียบร้อย! กรุณาใช้รหัสผ่านใหม่เข้าสู่ระบบ');
    setSuccessAlert('อัปเดตรหัสผ่านใหม่สำเร็จแล้ว');
    
    setTimeout(() => {
      setLoginEmail(recoveryAccount.email);
      setLoginPassword(newPasswordVal);
      setMode('login');
      // Reset forget state
      setForgotEmail('');
      setRecoveryAccount(null);
      setRecoverySuccessMessage('');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden" id="auth-main-container">
      {/* Dynamic abstract grid background for visual identity */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] opacity-70"></div>
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl z-0"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl z-0"></div>

      <div className="w-full max-w-md relative z-10" id="auth-card-wrapper">
        
        {/* Brand logo/header */}
        <div className="text-center mb-8">
          {settings?.loginLogoUrl ? (
            (!settings.loginLogoUrl.startsWith('http') && !settings.loginLogoUrl.startsWith('data:image')) ? (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 text-white border border-slate-750 shadow-xl mb-3 text-3xl" id="brand-auth-icon">
                {settings.loginLogoUrl}
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white p-2 border border-slate-700 shadow-xl mb-3 overflow-hidden animate-fadeIn" id="brand-auth-icon">
                <img 
                  src={settings.loginLogoUrl} 
                  alt="Company Logo" 
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            )
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-xl shadow-blue-950/40 mb-3" id="brand-auth-icon">
              <Building2 className="w-7 h-7" />
            </div>
          )}
          <h2 className="text-2xl font-bold text-white tracking-tight font-sans">
            {settings?.loginTitle || 'ระบบจัดการสำนักงานส่วนกลาง'}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {settings?.loginSubtitle || 'Office Information HR Management & Supply Resource Suite'}
          </p>
        </div>

        {/* Info alerts */}
        {errorAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -8 }} 
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 bg-rose-950/60 border border-rose-800/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-rose-200 shadow-md"
            id="auth-error-alert"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorAlert}</span>
          </motion.div>
        )}

        {successAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -8 }} 
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 bg-emerald-950/60 border border-emerald-800/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-200 shadow-md"
            id="auth-success-alert"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successAlert}</span>
          </motion.div>
        )}

        {/* AUTHENTICATION TAB BOX */}
        <div className="bg-slate-800/90 border border-slate-700/60 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden" id="auth-main-card">
          
          <div className="p-6 md:p-8">
            {/* LOGIN MODE */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4" id="form-login-auth">
                <div className="text-center mb-4">
                  <span className="bg-blue-950/60 text-blue-400 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-blue-900/60 inline-flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    ลงชื่อเข้าใช้งาน
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 block font-medium">ชื่อผู้ใช้งาน หรือ อีเมล</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="ชื่อผู้ใช้งาน หรือ อีเมล"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      id="login-input-email"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-300 block font-medium">รหัสผ่าน</label>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-blue-400 hover:text-blue-300 transition"
                      id="btn-goto-forgot"
                    >
                      ลืมรหัสผ่านใช่ไหม?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      id="login-input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl text-sm shadow-lg shadow-blue-900/40 transition cursor-pointer"
                  id="btn-login-submit"
                >
                  เข้าสู่ระบบ
                  <ArrowRight className="w-4 h-4" />
                </button>



                <div className="text-center pt-2">
                  <p className="text-slate-300 text-xs">
                    พนักงานสาขาใหม่ที่ไม่มีบัญชี?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setErrorAlert('');
                      }}
                      className="font-bold text-gradient-to-r from-blue-400 to-indigo-400 text-blue-400 hover:underline transition"
                      id="btn-goto-register"
                    >
                      สมัครสมาชิกร่วมงาน
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* REGISTER MODE */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4" id="form-register-auth">
                <div className="text-center mb-2">
                  <span className="bg-slate-700 text-slate-200 text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full border border-slate-600">
                    CREATE NEW EMPLOYEE ACCOUNT
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 block font-medium">ชื่อจริง *</label>
                    <input
                      type="text"
                      required
                      placeholder="สมรัก"
                      value={regFirstName}
                      onChange={(e) => setRegFirstName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                      id="register-input-firstname"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 block font-medium">นามสกุล *</label>
                    <input
                      type="text"
                      required
                      placeholder="เกียรติยศ"
                      value={regLastName}
                      onChange={(e) => setRegLastName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                      id="register-input-lastname"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 block font-medium">อีเมลผู้ใช้งาน (Email) *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="somrak.g@office.co.th"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500"
                      id="register-input-email"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 block font-medium">ฝ่าย/แผนก</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-slate-500">
                        <Building2 className="w-3.5 h-3.5" />
                      </span>
                      <select
                        value={regDepartment}
                        onChange={(e) => setRegDepartment(e.target.value)}
                        className="w-full pl-7 pr-1.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-[11px] text-white focus:outline-none focus:ring-1.5 focus:ring-blue-500"
                        id="register-select-dept"
                      >
                        {departments.length === 0 ? (
                          <option value="">-- ไม่พบแผนกงาน --</option>
                        ) : (
                          departments.map((dept, idx) => (
                            <option key={idx} value={dept}>{dept}</option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 block font-medium">ตำแหน่งงาน</label>
                    <div className="relative bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500">
                        <Briefcase className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="นักจัดการทั่วไป"
                        value={regPosition}
                        onChange={(e) => setRegPosition(e.target.value)}
                        className="w-full pl-7 pr-2 py-2 bg-transparent text-[11px] text-white focus:outline-none"
                        id="register-input-position"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 block font-medium">รหัสผ่านใหม่ *</label>
                    <input
                      type="password"
                      required
                      placeholder="ไม่ต่ำกว่า 6 ตัวอักษร"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                      id="register-input-password"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 block font-medium">ยืนยันรหัสผ่าน *</label>
                    <input
                      type="password"
                      required
                      placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                      id="register-input-confirmpass"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300 block font-medium">เบอร์โทรศัพท์ติดต่อ</label>
                  <input
                    type="text"
                    placeholder="08X-XXX-XXXX"
                    value={regPhone}
                    onChange={(e) => setRegPhone(formatPhoneNumber(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    id="register-input-phone"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-2.5 rounded-xl text-xs shadow transition cursor-pointer"
                  id="btn-register-submit"
                >
                  <UserPlus className="w-4 h-4" />
                  ยืนยันการสมัครสมาชิกพนักงานใหม่
                </button>

                <div className="text-center pt-2 border-t border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorAlert('');
                    }}
                    className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5 mx-auto"
                    id="btn-register-back"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" />
                    มีบัญชีอยู่แล้ว? ย้อนกลับไปหน้าเข้าสู่ระบบ
                  </button>
                </div>
              </form>
            )}

            {/* FORGOT PASSWORD MODE */}
            {mode === 'forgot' && (
              <div className="space-y-5" id="form-forgot-auth">
                <div className="text-center">
                  <span className="bg-slate-700 text-slate-200 text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full border border-slate-600">
                    PASSWORD RECOVERY & CLIENT RESET
                  </span>
                  <p className="text-xs text-slate-400 mt-2">
                    กรอกอีเมลที่ใช้งานจริง ระบบจะค้นหาและอนุญาตให้แก้ไขรหัสผ่านใหม่ลงฐานข้อมูลทันที
                  </p>
                </div>

                {!recoveryAccount ? (
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300 block font-medium">ระบุอีเมลบัญชีผู้ใช้</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                          <Mail className="w-4 h-4" />
                        </span>
                        <input
                          type="email"
                          required
                          placeholder="somchai.j@office.co.th"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500"
                          id="forgot-input-email"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 rounded-xl text-sm transition cursor-pointer"
                      id="btn-forgot-lookup"
                    >
                      ตรวจสอบข้อมูลบัญชี
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4">
                    <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-2 text-xs text-slate-300">
                      <div className="flex justify-between border-b border-slate-800 pb-1.5">
                        <span className="text-slate-400">พบบัญชีของ:</span>
                        <span className="font-bold text-white">{recoveryAccount.name}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-1.5">
                        <span className="text-slate-400">บทบาท:</span>
                        <span className="font-bold text-blue-400 uppercase text-[10px]">{recoveryAccount.role} ({recoveryAccount.employeeId || 'N/A'})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold text-emerald-400">รหัสผ่านปัจจุบัน (พบในระบบ):</span>
                        <span className="font-mono text-emerald-400 font-bold bg-slate-800 px-1.5 rounded">{recoveryAccount.password || 'password123'}</span>
                      </div>
                    </div>

                    {recoverySuccessMessage && (
                      <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-200 text-xs">
                        {recoverySuccessMessage}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-355 block font-semibold">กู้คืน: ตั้งค่ารหัสผ่านใหม่ (Reset Password)</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-550">
                          <Lock className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="ระบุรหัสผ่านใหม่ของคุณ"
                          value={newPasswordVal}
                          onChange={(e) => setNewPasswordVal(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-yellow-300 font-mono"
                          id="forgot-input-new-password"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRecoveryAccount(null);
                        }}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs py-2 px-3 rounded-xl transition cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 px-3 rounded-xl font-bold transition cursor-pointer"
                        id="btn-save-new-password"
                      >
                        บันทึกรหัสผ่านใหม่
                      </button>
                    </div>
                  </form>
                )}

                <div className="text-center pt-2 border-t border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setForgotEmail('');
                      setRecoveryAccount(null);
                      setRecoverySuccessMessage('');
                      setErrorAlert('');
                    }}
                    className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5 mx-auto"
                    id="btn-forgot-back"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" />
                    ย้อนกลับไปหน้าเข้าสู่ระบบ
                  </button>
                </div>
              </div>
            )}

            {/* FIRST LOGIN CHANGE PASSWORD MODE */}
            {mode === 'first-login-change-password' && pendingChangePassAccount && (
              <form onSubmit={handleFirstLoginChangePasswordSubmit} className="space-y-4" id="form-first-login-change-password">
                <div className="text-center">
                  <span className="bg-amber-950/60 text-amber-400 text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full border border-amber-900/60 inline-flex items-center gap-1">
                    ⚠️ กำหนดชื่อผู้ใช้และรหัสผ่านใหม่
                  </span>
                  <p className="text-xs text-slate-400 mt-2">
                    บัญชีนี้ถูกสร้างโดยผู้ดูแลระบบเป็นครั้งแรก เพื่อสิทธิ์และความปลอดภัยสูงสุด กรุณากำหนดชื่อผู้ใช้งาน (User) และรหัสผ่านใหม่ด้วยตัวท่านเอง
                  </p>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-700/60 rounded-xl space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">บัญชีของคุณ:</span>
                    <span className="font-bold text-white">{pendingChangePassAccount.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">อีเมลตั้งต้น:</span>
                    <span className="font-mono font-semibold text-slate-200">{pendingChangePassAccount.email}</span>
                  </div>
                </div>

                {/* Username Input */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 block font-medium">ชื่อผู้ใช้งานใหม่ (Username)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                      <Users className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="กำหนดชื่อผู้ใช้งาน (เช่น somchai_j)"
                      value={newEmployeeUsername}
                      onChange={(e) => setNewEmployeeUsername(e.target.value.replace(/\s+/g, ''))}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 block font-medium">รหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      placeholder="ป้อนรหัสผ่านใหม่ที่ต้องการ"
                      value={newEmployeePassword}
                      onChange={(e) => setNewEmployeePassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 block font-medium">ยืนยันรหัสผ่านใหม่อีกครั้ง</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง"
                      value={confirmNewEmployeePassword}
                      onChange={(e) => setConfirmNewEmployeePassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-xl text-sm shadow-md shadow-blue-950/40 transition cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  บันทึกข้อมูลและเริ่มเข้าสู่ระบบ
                </button>

                <div className="text-center pt-2 border-t border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setPendingChangePassAccount(null);
                      setNewEmployeePassword('');
                      setConfirmNewEmployeePassword('');
                      setErrorAlert('');
                      setSuccessAlert('');
                    }}
                    className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5 mx-auto"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" />
                    ยกเลิกและย้อนกลับหน้าเข้าสู่ระบบ
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* System parameters indicator */}
        <div className="text-center mt-6 text-slate-500 text-[10px] space-y-1">
          <p>ระบบรักษาความปลอดภัยจำลอง • ข้อมูลถูกจัดรูปแบบและบันทึกภายใน Storage นอกเครือข่าย</p>
          <p>Office Administrator Core v1.2</p>
        </div>
      </div>
    </div>
  );
}
