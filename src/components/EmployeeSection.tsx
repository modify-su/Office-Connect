import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Search, 
  Plus, 
  Eye, 
  Edit2, 
  Trash2, 
  Briefcase, 
  Mail, 
  Phone, 
  Calendar, 
  UserPlus, 
  ShieldAlert,
  Info,
  MapPin,
  Heart,
  UserCheck,
  X,
  CreditCard,
  User,
  Camera,
  Upload,
  Building2
} from 'lucide-react';
import { Employee, EmployeeStatus, EmergencyContact, UserAccount } from '../types';

export const EmployeeAvatar = ({ avatar, className = "w-10 h-10 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm overflow-hidden" }: { avatar: string; className?: string }) => {
  if (avatar && (avatar.startsWith('data:image') || avatar.startsWith('http') || avatar.startsWith('/'))) {
    return (
      <div className={className}>
        <img src={avatar} className="w-full h-full object-cover" alt="Avatar" referrerPolicy="no-referrer" />
      </div>
    );
  }
  return (
    <div className={className}>
      {avatar}
    </div>
  );
};

interface EmployeeSectionProps {
  employees: Employee[];
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onEditEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  defaultAddOpen?: boolean;
  onClearDefaultAddOpen?: () => void;
  currentUser?: UserAccount | null;
  departments: string[];
  onUpdateDepartments: (departments: string[]) => void;
}

const formatPhoneNumber = (value: string): string => {
  const clean = value.replace(/\D/g, '');
  const trimmed = clean.slice(0, 10);
  const parts = [];
  if (trimmed.length > 0) parts.push(trimmed.substring(0, 3));
  if (trimmed.length > 3) parts.push(trimmed.substring(3, 6));
  if (trimmed.length > 6) parts.push(trimmed.substring(6, 10));
  return parts.join('-');
};

const formatCitizenId = (value: string): string => {
  const clean = value.replace(/\D/g, '');
  const trimmed = clean.slice(0, 13);
  const parts = [];
  if (trimmed.length > 0) parts.push(trimmed.substring(0, 1));
  if (trimmed.length > 1) parts.push(trimmed.substring(1, 5));
  if (trimmed.length > 5) parts.push(trimmed.substring(5, 10));
  if (trimmed.length > 10) parts.push(trimmed.substring(10, 12));
  if (trimmed.length > 12) parts.push(trimmed.substring(12, 13));
  return parts.join('-');
};

const formatThaiDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  const BEYear = year > 2400 ? year : year + 543;
  const padDay = day < 10 ? `0${day}` : `${day}`;
  const padMonth = month < 10 ? `0${month}` : `${month}`;
  
  return `${padDay}/${padMonth}/${BEYear}`;
};

export default function EmployeeSection({
  employees,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  defaultAddOpen,
  onClearDefaultAddOpen,
  currentUser,
  departments = [],
  onUpdateDepartments
}: EmployeeSectionProps) {
  const isEmployee = currentUser?.role === 'employee';

  // State variables
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  
  // Modals status
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteConfirmEmp, setDeleteConfirmEmp] = useState<Employee | null>(null);

  // Department management state
  const [newDeptName, setNewDeptName] = useState('');
  const [editingDeptIndex, setEditingDeptIndex] = useState<number | null>(null);
  const [editingDeptValue, setEditingDeptValue] = useState('');
  const [deleteDeptConfirmIndex, setDeleteDeptConfirmIndex] = useState<number | null>(null);

  // Form states for adding/editing
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formDepartment, setFormDepartment] = useState(departments[0] || '');

  // Keep formDepartment updated if departments load late
  useEffect(() => {
    if (!formDepartment && departments && departments.length > 0) {
      setFormDepartment(departments[0]);
    }
  }, [departments]);
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formStatus, setFormStatus] = useState<EmployeeStatus>('active');
  const [formPersonalId, setFormPersonalId] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formEmergencyName, setFormEmergencyName] = useState('');
  const [formEmergencyRelationship, setFormEmergencyRelationship] = useState('');
  const [formEmergencyPhone, setFormEmergencyPhone] = useState('');
  const [formAvatar, setFormAvatar] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('ขนาดรูปภาพใหญ่เกินไป กรุณาเลือกไฟล์ขนาดไม่เกิน 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFormAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };


  useEffect(() => {
    if (defaultAddOpen) {
      handleOpenAddModal();
      if (onClearDefaultAddOpen) onClearDefaultAddOpen();
    }
  }, [defaultAddOpen]);

  // Handle open add modal (Only admin can call this)
  const handleOpenAddModal = () => {
    // get current date as start date by default
    const today = new Date().toISOString().split('T')[0];
    setFormEmployeeId('');
    setFormFirstName('');
    setFormLastName('');
    setFormPosition('');
    setFormDepartment(departments[0] || '');
    setFormEmail('');
    setFormPhone('');
    setFormStartDate(today);
    setFormStatus('active');
    setFormPersonalId('');
    setFormBirthDate('1995-01-01');
    setFormAddress('');
    setFormEmergencyName('');
    setFormEmergencyRelationship('');
    setFormEmergencyPhone('');
    setFormAvatar('');
    
    setEditingEmployee(null);
    setIsAddModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEditModal = (emp: Employee) => {
    setFormEmployeeId(emp.employeeId || '');
    setFormFirstName(emp.firstName);
    setFormLastName(emp.lastName);
    setFormPosition(emp.position);
    setFormDepartment(emp.department);
    setFormEmail(emp.email);
    setFormPhone(emp.phone);
    setFormStartDate(emp.startDate);
    setFormStatus(emp.status);
    setFormPersonalId(emp.personalId);
    setFormBirthDate(emp.birthDate);
    setFormAddress(emp.address);
    setFormEmergencyName(emp.emergencyContact?.name || '');
    setFormEmergencyRelationship(emp.emergencyContact?.relationship || '');
    setFormEmergencyPhone(emp.emergencyContact?.phone || '');
    setFormAvatar(emp.avatar || '');
    
    setEditingEmployee(emp);
    setIsAddModalOpen(true);
  };

  // Save changes (Add / Edit) before submitting
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formFirstName || !formLastName || (isEmployee ? false : !formPosition)) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ชื่อ, นามสกุล)');
      return;
    }

    const cleanedEmpId = formEmployeeId.trim();
    if (cleanedEmpId) {
      const isDuplicate = employees.some(emp => 
        emp.employeeId.toLowerCase() === cleanedEmpId.toLowerCase() && 
        (!editingEmployee || emp.id !== editingEmployee.id)
      );
      if (isDuplicate) {
        alert(`รหัสพนักงาน "${cleanedEmpId}" ซ้ำกับพนักงานคนอื่นในระบบ กรุณาตรวจสอบและกรอกรหัสพนักงานใหม่`);
        return;
      }
    }

    const employeeIdPrefix = 'EMP-';
    // Generate new employee code number if it's new
    let generatedId = '';
    if (!editingEmployee) {
      if (cleanedEmpId) {
        generatedId = cleanedEmpId;
      } else {
        const maxNum = employees.reduce((max, emp) => {
          const numPart = parseInt(emp.employeeId.replace(employeeIdPrefix, ''));
          return isNaN(numPart) ? max : Math.max(max, numPart);
        }, 0);
        const nextNum = maxNum + 1;
        generatedId = `${employeeIdPrefix}${String(nextNum).padStart(3, '0')}`;
      }
    } else {
      generatedId = cleanedEmpId || editingEmployee.employeeId;
    }

    const commonData = {
      employeeId: generatedId,
      firstName: formFirstName,
      lastName: formLastName,
      position: editingEmployee && isEmployee ? editingEmployee.position : formPosition,
      department: editingEmployee && isEmployee ? editingEmployee.department : formDepartment,
      email: formEmail || '-',
      phone: formPhone || '-',
      startDate: editingEmployee && isEmployee ? editingEmployee.startDate : formStartDate,
      status: editingEmployee && isEmployee ? editingEmployee.status : formStatus,
      avatar: formAvatar || (formFirstName[0] || '') + (formLastName[0] || ''),
      personalId: formPersonalId || '-',
      birthDate: formBirthDate,
      address: formAddress || '-',
      emergencyContact: {
        name: formEmergencyName || '-',
        relationship: formEmergencyRelationship || '-',
        phone: formEmergencyPhone || '-'
      },
      verificationStatus: isEmployee ? 'pending' as const : (editingEmployee ? editingEmployee.verificationStatus : 'verified' as const)
    };

    if (editingEmployee) {
      onEditEmployee({
        ...editingEmployee,
        ...commonData
      });
      alert(isEmployee ? 'อัปเดตคำขอแก้ไขประวัติสำเร็จ! รอฝ่ายบุคคลตรวจสอบความถูกต้องของการกรอกข้อมูล' : 'บันทึกการปรับปรุงประวัติเสร็จสิ้น');
    } else {
      onAddEmployee(commonData);
    }
    setIsAddModalOpen(false);
  };

  // List of unique departments for filter
  const filterDepartments = ['All', ...departments];

  // Filter and search logic
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = selectedDepartment === 'All' || emp.department === selectedDepartment;
    const matchesStatus = selectedStatus === 'All' || emp.status === selectedStatus;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const myEmployee = isEmployee ? employees.find(emp => emp.employeeId === currentUser?.employeeId) : null;

  if (isEmployee && !myEmployee) {
    return (
      <div className="bg-white p-12 text-center rounded-2xl shadow-sm border border-slate-100 max-w-xl mx-auto space-y-4" id="employee-not-found">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800">ไม่พบทะเบียนประวัติของคุณในระบบ</h3>
        <p className="text-slate-500 text-sm">
          เกิดข้อผิดพลาดในการเชื่อมโยงรหัสพนักงาน <span className="font-mono font-bold text-slate-700">{currentUser?.employeeId}</span> เข้ากับระบบประวัติกลาง กรุณาติดต่อ ฝ่ายทรัพยากรบุคคล (HR) เพื่อแก้ไขปัญหานี้
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="employees-section-container">
      {isEmployee && myEmployee ? (
        <div className="space-y-6" id="my-employee-profile-view">
          {/* Header Block */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="my-profile-header-panel">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-800 font-sans flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                ทะเบียนประวัติพนักงานส่วนบุคคล
              </h2>
              <p className="text-sm text-slate-500">ตรวจสอบและปรับปรุงประมวลข้อมูลทะเบียนประวัติของคุณให้ถูกต้องและเป็นปัจจุบัน</p>
            </div>
            <button
              onClick={() => handleOpenEditModal(myEmployee)}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-md transition cursor-pointer self-start sm:self-center"
              id="btn-edit-my-profile"
            >
              <Edit2 className="w-4 h-4" />
              ปรับปรุงประวัติของฉัน
            </button>
          </div>

          {/* Verification Status Banner */}
          {myEmployee.verificationStatus === 'pending' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-sm text-amber-800 items-start shadow-inner" id="status-banner-pending">
              <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <p className="font-bold">อยู่ระหว่างรอดำเนินการตรวจสอบโดยผู้ดูแลระบบ (HR)</p>
                <p className="text-amber-700 text-xs">
                  ท่านได้ปรับปรุงข้อมูลประวัติแล้ว ข้อมูลดังกล่าวจะแสดงผลในสถานะรอตรวจสอบจนกว่าฝ่ายบุคคลจะตรวจสอบความถูกต้องและอนุมัติคำขอประวัติพนักงานส่วนกลางของคุณ
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-3 text-sm text-emerald-800 items-start shadow-inner" id="status-banner-verified">
              <UserCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">ได้รับการตรวจสอบและอนุมัติข้อมูลประวัติสำเร็จ</p>
                <p className="text-emerald-700 text-xs">
                  ข้อมูลแฟ้มประวัติส่วนตัวของคุณตรงกับแฟ้มทะเบียนราษฎร์หลักและโครงสร้างของหน่วยงานเรียบร้อยแล้ว
                </p>
              </div>
            </div>
          )}

          {/* Detailed read-only personal details layout */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden" id="my-profile-detailed-grid">
            {/* Top general block */}
            <div className="p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6">
              <EmployeeAvatar avatar={myEmployee.avatar} className="w-24 h-24 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-3xl shadow-inner overflow-hidden" />
              <div className="text-center sm:text-left space-y-2">
                <h3 className="text-2xl font-bold text-slate-800">{myEmployee.firstName} {myEmployee.lastName}</h3>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  <span className="text-xs font-semibold bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-wider">{myEmployee.position}</span>
                  <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{myEmployee.department}</span>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    myEmployee.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>{myEmployee.status === 'active' ? 'ปฏิบัติงานปกติ' : 'ลางาน/พักสัญญา'}</span>
                </div>
                <p className="text-xs text-slate-400 font-mono">รหัสพนักงาน: <span className="font-bold text-slate-700">{myEmployee.employeeId}</span> | วันเวลาเริ่มสัญญาจ้างตัวจริง: {formatThaiDisplayDate(myEmployee.startDate)}</p>
              </div>
            </div>

            {/* Form details section */}
            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-5">
                <h4 className="font-bold text-slate-800 text-sm border-l-2 border-blue-500 pl-2">ข้อมูลประวัติบุคลากร</h4>
                <div className="space-y-3.5 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-400">เลขบัตรประจำตัวประชาชน:</span>
                    <span className="font-semibold text-slate-700 font-mono">{myEmployee.personalId}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-400">วันเดือนปีเกิด:</span>
                    <span className="font-semibold text-slate-700">{formatThaiDisplayDate(myEmployee.birthDate)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-400">ความยาวอายุงาน / วันที่เริ่มงาน:</span>
                    <span className="font-semibold text-slate-700">{formatThaiDisplayDate(myEmployee.startDate)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <h4 className="font-bold text-slate-800 text-sm border-l-2 border-blue-500 pl-2">สารสนเทศช่องทางการติดต่อ</h4>
                <div className="space-y-3.5 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-400">อีเมลทางการองค์กร:</span>
                    <span className="font-semibold text-slate-700 font-mono">{myEmployee.email}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-400">เบอร์โทรศัพท์ติดต่อได้:</span>
                    <span className="font-semibold text-slate-700 font-mono">{myEmployee.phone}</span>
                  </div>
                  <div className="py-1">
                    <span className="text-slate-400 block mb-1">ที่อยู่ตามทะเบียนบ้าน:</span>
                    <span className="text-slate-600 block bg-slate-50 p-3 rounded-xl text-xs leading-relaxed border border-slate-100">
                      <MapPin className="w-3.5 h-3.5 inline text-slate-400 mr-1" />
                      {myEmployee.address}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contact Block */}
            <div className="p-6 md:p-8 bg-slate-50">
              <h4 className="font-bold text-rose-800 text-sm flex items-center gap-1.5 mb-4">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                กรณีติดต่อฉุกเฉิน (Emergency Contact)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-white p-4 rounded-xl border border-slate-100 text-sm">
                <div>
                  <span className="text-slate-400 block text-xs">ชื่อ-นามสกุลหรือชื่อเล่น ผู้ติดต่อฉุกเฉิน:</span>
                  <span className="font-bold text-slate-700 mt-0.5 block">{myEmployee.emergencyContact?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">ความสัมพันธ์ส่วนตัว:</span>
                  <span className="font-medium text-slate-600 mt-0.5 block">{myEmployee.emergencyContact?.relationship || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">เบอร์ติดต่อฉุกเฉิน:</span>
                  <span className="font-bold text-rose-700 font-mono mt-0.5 block">{myEmployee.emergencyContact?.phone || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="employee-header-panel">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 font-sans flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            ระบบจัดการแฟ้มประวัติพนักงาน
          </h2>
          <p className="text-sm text-slate-500">บันทึก ค้นหา พนักงานและประวัติการทำงานส่วนบุคคลของพนักงาน</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setIsDeptModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-medium px-4 py-2.5 rounded-xl text-sm border border-slate-200 shadow-xs transition cursor-pointer self-start sm:self-center"
              id="btn-manage-departments"
            >
              <Building2 className="w-4 h-4 text-slate-500" />
              จัดการแผนกงาน
            </button>
          )}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-xl text-sm shadow-md transition cursor-pointer self-start sm:self-center"
            id="btn-add-new-employee"
          >
            <UserPlus className="w-4 h-4" />
            ขึ้นทะเบียนพนักงานใหม่
          </button>
        </div>
      </div>

      {/* Control filters dashboard */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4" id="employee-filters-bar">
        {/* Search bar */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, รหัสพนักงาน, แผนก, ตำแหน่ง..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white"
            id="employee-search-input"
          />
        </div>

        {/* Department Filter */}
        <div>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            id="employee-dept-filter"
          >
            {filterDepartments.map((dept, i) => (
              <option key={i} value={dept}>
                {dept === 'All' ? 'ทุกแผนกงาน' : dept}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            id="employee-status-filter"
          >
            <option value="All">ทุกสถานะการจ้างงาน</option>
            <option value="active">Active (ปฏิบัติการปกติ)</option>
            <option value="leave">On Leave (อยู่ระหว่างลา)</option>
            <option value="suspended">Suspended (ระงับชั่วคราว)</option>
          </select>
        </div>
      </div>

      {/* Grid container: Table of employee layout (Tablet & Desktop) */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden" id="employee-display-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="employee-data-table">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">รหัส & ข้อมูลพนักงาน</th>
                <th className="px-6 py-4">ตำแหน่ง / ฝ่ายงาน</th>
                <th className="px-6 py-4">ข้อมูลการติดต่อ</th>
                <th className="px-6 py-4">วันเริ่มงาน</th>
                <th className="px-6 py-4">สถานะ</th>
                <th className="px-6 py-4 text-right">เครื่องมือ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/75 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar avatar={emp.avatar} className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm overflow-hidden" />
                        <div>
                          <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                            {emp.firstName} {emp.lastName}
                            {emp.verificationStatus === 'pending' && (
                              <span className="bg-amber-500/15 text-amber-700 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/25 font-sans animate-pulse font-medium">
                                รอตรวจ
                              </span>
                            )}
                          </p>
                          <p className="text-xs font-mono font-medium text-slate-400">{emp.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <div>
                          <p className="font-medium text-xs md:text-sm">{emp.position}</p>
                          <p className="text-[10px] md:text-xs text-slate-400">{emp.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5 text-slate-500 text-xs">
                        <p className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {emp.email}</p>
                        <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {emp.phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-mono text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatThaiDisplayDate(emp.startDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        emp.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : emp.status === 'leave'
                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {emp.status === 'active' ? '● ทำงานปกติ' : emp.status === 'leave' ? '● พักร้อน/ลา' : '● พักงาน'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <div className="flex items-center justify-end gap-2">
                        {/* View file metadata details */}
                        <button
                          onClick={() => setViewingEmployee(emp)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="ดูแกลเลอรีประวัติแบบเต็ม"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {/* Edit profile */}
                        <button
                          onClick={() => handleOpenEditModal(emp)}
                          className="p-1.5 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition"
                          title="แก้ไขข้อมูลพนักงาน"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {/* Terminate employee */}
                        <button
                          onClick={() => setDeleteConfirmEmp(emp)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition mt-0.5 cursor-pointer"
                          title="ลบออกจากระบบสารสนเทศ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Info className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    ไม่พบข้อมูลผู้ถูกค้นหาและประวัติการทำงานในเงื่อนไขการกรองนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid container: Cards Layout for Mobile Screen Devices */}
      <div className="block md:hidden space-y-4" id="employee-display-cards-container">
        {filteredEmployees.length > 0 ? (
          filteredEmployees.map((emp) => (
            <div key={emp.id} className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 space-y-4 hover:shadow-md transition">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <EmployeeAvatar avatar={emp.avatar} className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-base overflow-hidden" />
                  <div>
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap leading-tight">
                      {emp.firstName} {emp.lastName}
                      {emp.verificationStatus === 'pending' && (
                        <span className="bg-amber-500/15 text-amber-700 text-[9px] px-2 py-0.5 rounded-full border border-amber-500/25 font-sans animate-pulse font-medium">
                          รอตรวจ
                        </span>
                      )}
                    </h4>
                    <p className="text-xs font-mono text-slate-400">{emp.employeeId}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium border ${
                  emp.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : emp.status === 'leave'
                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                    : 'bg-rose-50 text-rose-700 border-rose-100'
                }`}>
                  {emp.status === 'active' ? 'ทำงานปกติ' : emp.status === 'leave' ? 'พักร้อน/ลา' : 'พักงาน'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50 text-xs text-slate-600">
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">ตำแหน่ง / แผนก</p>
                  <p className="font-bold text-slate-800">{emp.position}</p>
                  <p className="text-slate-500">{emp.department}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">วันเริ่มทำงาน</p>
                  <p className="font-mono text-slate-700 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatThaiDisplayDate(emp.startDate)}
                  </p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">การติดต่อ</p>
                  <p className="flex items-center gap-1.5 text-slate-600 truncate"><Mail className="w-3.5 h-3.5 text-slate-400" /> {emp.email}</p>
                  <p className="flex items-center gap-1.5 text-slate-600"><Phone className="w-3.5 h-3.5 text-slate-400" /> {emp.phone}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-50">
                <button
                  onClick={() => setViewingEmployee(emp)}
                  className="flex items-center gap-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-xl transition text-xs font-semibold"
                >
                  <Eye className="w-4 h-4" />
                  <span>ดูประวัติ</span>
                </button>
                <button
                  onClick={() => handleOpenEditModal(emp)}
                  className="flex items-center gap-1 text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 px-3 py-2 rounded-xl transition text-xs font-semibold"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>แก้ไข</span>
                </button>
                <button
                  onClick={() => setDeleteConfirmEmp(emp)}
                  className="flex items-center gap-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-xl transition text-xs font-semibold"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ลบ</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-8 rounded-2xl text-center text-slate-400 border border-slate-100 shadow-xs">
            <Info className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            ไม่พบข้อมูลผู้ถูกค้นหาและประวัติการทำงานในเงื่อนไขการกรองนี้
          </div>
        )}
      </div>
        </>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="employee-detail-modal">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-800 font-sans flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                แฟ้มทะเบียนประวัติส่วนบุคคล
              </h3>
              <button 
                onClick={() => setViewingEmployee(null)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 md:p-8 space-y-6">
              {/* Profile Top Banner */}
              <div className="flex flex-col md:flex-row items-center gap-4 pb-6 border-b border-slate-100">
                <EmployeeAvatar avatar={viewingEmployee.avatar} className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-2xl shadow-inner overflow-hidden" />
                <div className="text-center md:text-left space-y-1">
                  <h4 className="text-xl font-bold text-slate-800">
                    {viewingEmployee.firstName} {viewingEmployee.lastName}
                  </h4>
                  <p className="text-sm font-medium text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full inline-block">
                    {viewingEmployee.position}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    รหัสพนักงาน: <span className="font-bold text-slate-600">{viewingEmployee.employeeId}</span> | แผนก: {viewingEmployee.department}
                  </p>
                </div>
              </div>

              {/* Grid content split columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* General Personal Information */}
                <div className="space-y-4">
                  <h5 className="font-bold text-slate-800 text-sm border-l-2 border-blue-500 pl-2">ข้อมูลประวัติบุคลากร</h5>
                  
                  <div className="space-y-3 text-xs md:text-sm">
                    <div className="flex justify-between py-1.5 border-b border-dashed border-slate-100">
                      <span className="text-slate-400">เลขบัตรประชาชน:</span>
                      <span className="font-semibold text-slate-700 font-mono">{viewingEmployee.personalId}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-dashed border-slate-100">
                      <span className="text-slate-400">วันเดือนปีเกิด:</span>
                      <span className="font-semibold text-slate-700">{formatThaiDisplayDate(viewingEmployee.birthDate)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-dashed border-slate-100">
                      <span className="text-slate-400">วันที่เริ่มต้นสัญญาจ้าง:</span>
                      <span className="font-semibold text-slate-700">{formatThaiDisplayDate(viewingEmployee.startDate)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-dashed border-slate-100">
                      <span className="text-slate-400">สถานะจ้างงาน:</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        viewingEmployee.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {viewingEmployee.status === 'active' ? 'ปฏิบัติหน้าที่ปกติ' : 'ลางาน/พักงาน'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact information */}
                <div className="space-y-4">
                  <h5 className="font-bold text-slate-800 text-sm border-l-2 border-blue-500 pl-2">ช่องทางการติดต่อสื่อสาร</h5>

                  <div className="space-y-3 text-xs md:text-sm">
                    <div className="flex justify-between py-1.5 border-b border-dashed border-slate-100">
                      <span className="text-slate-400">อีเมลองค์กร:</span>
                      <span className="font-semibold text-slate-700 font-mono text-xs">{viewingEmployee.email}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-dashed border-slate-100">
                      <span className="text-slate-400">เบอร์โทรศัพท์มือถือ:</span>
                      <span className="font-semibold text-slate-700 font-mono">{viewingEmployee.phone}</span>
                    </div>
                    <div className="py-1.5">
                      <span className="text-slate-400 block mb-1">ที่อยู่ตามทะเบียนบ้าน:</span>
                      <span className="text-slate-600 block bg-slate-50 p-2.5 rounded-xl text-xs leading-relaxed border border-slate-100">
                        <MapPin className="w-3.5 h-3.5 inline text-slate-400 mr-1 -mt-0.5" />
                        {viewingEmployee.address}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-rose-50/50 border border-rose-100/60 p-4 rounded-2xl" id="emergency-contact-box">
                <h5 className="font-bold text-rose-800 text-sm flex items-center gap-1.5 mb-3">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                  กรณีติดต่อฉุกเฉิน (Emergency Contact)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs md:text-sm">
                  <div>
                    <span className="text-slate-400 block text-xs">ชื่อ-นามสกุลหรือชื่อเล่น ผู้ติดต่อฉุกเฉิน:</span>
                    <span className="font-bold text-slate-700">{viewingEmployee.emergencyContact?.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">ความสัมพันธ์ส่วนตัว:</span>
                    <span className="font-medium text-slate-600">{viewingEmployee.emergencyContact?.relationship || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">เบอร์ติดต่อฉุกเฉิน:</span>
                    <span className="font-bold text-rose-700 font-mono">{viewingEmployee.emergencyContact?.phone || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-b-2xl">
              <div className="flex gap-2">
                {viewingEmployee.verificationStatus === 'pending' && (
                  <button
                    onClick={() => {
                      onEditEmployee({
                        ...viewingEmployee,
                        verificationStatus: 'verified'
                      });
                      setViewingEmployee(null);
                      alert(`อนุมัติการอัปเดตประวัติของ ${viewingEmployee.firstName} ${viewingEmployee.lastName} เรียบร้อยแล้ว!`);
                    }}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs md:text-sm px-4 py-2 rounded-xl transition cursor-pointer"
                    id="btn-verify-employee"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    อนุมัติประวัติพนักงาน
                  </button>
                )}
                <button
                  onClick={() => {
                    const emp = viewingEmployee;
                    setViewingEmployee(null);
                    handleOpenEditModal(emp);
                  }}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs md:text-sm px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  โอนย้าย/เปลี่ยนประวัติ
                </button>
              </div>
              <button 
                onClick={() => setViewingEmployee(null)}
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs md:text-sm px-4 py-2 rounded-xl transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ADD / EDIT EMPLOYEE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="employee-form-modal">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-800 font-sans flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                {editingEmployee ? `แก้ไขทะเบียนประวัติพนักงาน (${editingEmployee.employeeId})` : 'ขึ้นทะเบียนพนักงานใหม่'}
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="divide-y divide-slate-100">
              {/* Form Content - Section Profile */}
              <div className="p-6 md:p-8 space-y-5">
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-50">
                  <User className="w-3.5 h-3.5" />
                  ข้อมูลสารสนเทศเบื้องต้นพนักงาน
                </h4>

                {/* Employee Photo Upload Section */}
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="relative group w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden shadow-sm hover:border-blue-400 transition">
                    {formAvatar ? (
                      <>
                        <img src={formAvatar} className="w-full h-full object-cover" alt="Preview" />
                        {!isEmployee && (
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <Camera className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-2">
                        <Camera className="w-6 h-6 mb-1 text-slate-300" />
                        <span className="text-[10px] font-semibold text-center leading-none">ไม่มีรูปภาพ</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-1.5 text-center sm:text-left">
                    <span className="block text-xs font-bold text-slate-700">รูปภาพประจำตัวพนักงาน (Employee Photo)</span>
                    <p className="text-xs text-slate-400">รองรับไฟล์ภาพ JPG, JPEG, PNG ขนาดไม่เกิน 2MB (รูปจะใช้แสดงในบัตรรหัสและประวัติพนักงาน)</p>
                    {!isEmployee ? (
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                        <label className="flex items-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs px-3 py-2 rounded-xl border border-blue-200/50 transition cursor-pointer">
                          <Upload className="w-3.5 h-3.5" />
                          <span>อัปโหลดรูปถ่าย</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileChange} 
                            className="hidden" 
                          />
                        </label>
                        
                        {formAvatar && (
                          <button
                            type="button"
                            onClick={() => setFormAvatar('')}
                            className="bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 text-xs px-3 py-2 rounded-xl transition cursor-pointer"
                          >
                            ลบรูปถ่ายออก
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 font-medium bg-slate-100/80 px-3 py-1.5 rounded-lg inline-block border border-slate-200">
                        เฉพาะฝ่ายบุคคล (HR) เท่านั้นที่สามารถอัปโหลดหรือเปลี่ยนรูปถ่ายประจำตัวได้
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">รหัสพนักงาน (ID) {isEmployee ? "" : "(เว้นว่างเพื่อรันออโต้)"}</label>
                    <input
                      type="text"
                      value={formEmployeeId}
                      onChange={(e) => setFormEmployeeId(e.target.value)}
                      disabled={isEmployee}
                      placeholder="เช่น EMP-001"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:bg-slate-50 uppercase font-mono font-bold text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">ชื่อจริง *</label>
                    <input
                      type="text"
                      required
                      value={formFirstName}
                      onChange={(e) => setFormFirstName(e.target.value)}
                      placeholder="เช่น สมศักดิ์"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">นามสกุลจริง *</label>
                    <input
                      type="text"
                      required
                      value={formLastName}
                      onChange={(e) => setFormLastName(e.target.value)}
                      placeholder="เช่น ขยันดี"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">แผนก / ฝ่ายงานหลัก *</label>
                    <select
                      value={formDepartment}
                      onChange={(e) => setFormDepartment(e.target.value)}
                      disabled={isEmployee}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1.5 focus:ring-blue-500 disabled:opacity-60 disabled:bg-slate-50"
                    >
                      {departments.length === 0 ? (
                        <option value="">-- กรุณาเพิ่มแผนกงานในเมนูตั้งค่าก่อน --</option>
                      ) : (
                        departments.map((dept, idx) => (
                          <option key={idx} value={dept}>{dept}</option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">ตำแหน่งงานปัจจุบัน *</label>
                    <input
                      type="text"
                      required={!isEmployee}
                      value={formPosition}
                      onChange={(e) => setFormPosition(e.target.value)}
                      disabled={isEmployee}
                      placeholder="เช่น ผู้จัดการอาวุโส / Developer"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:bg-slate-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">เบอร์โทรศัพท์มือถือ</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(formatPhoneNumber(e.target.value))}
                      placeholder="เช่น 081-XXX-XXXX"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">อีเมลองค์กร</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="username@office.co.th"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">สถานะปฏิบัตงาน</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as EmployeeStatus)}
                      disabled={isEmployee}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1.5 focus:ring-blue-500 disabled:opacity-60 disabled:bg-slate-50"
                    >
                      <option value="active">Active (ทำงานอยู่)</option>
                      <option value="leave">On Leave (ลาป่วย/ลาพักร้อน)</option>
                      <option value="suspended">Suspended (ระงับชั่วคราว)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Content - Section Identity & ID Card */}
              <div className="p-6 md:p-8 space-y-5 bg-slate-50/50">
                <h4 className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-amber-100/50">
                  <CreditCard className="w-3.5 h-3.5" />
                  ข้อมูลส่วนตัวและทะเบียนบ้าน
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">เลขประจำตัวประชาชน (13 หลัก)</label>
                    <input
                      type="text"
                      value={formPersonalId}
                      onChange={(e) => setFormPersonalId(formatCitizenId(e.target.value))}
                      placeholder="X-XXXX-XXXXX-XX-X"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">วันเดือนปีเกิด</label>
                    <input
                      type="date"
                      value={formBirthDate}
                      onChange={(e) => setFormBirthDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">ที่อยู่ตามทะเบียนบ้าน</label>
                    <input
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="หมู่บ้าน, ซอย, ถนน, อำเภอ, จังหวัด"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">วันรายงานตัวเข้างาน</label>
                    <input
                      type="date"
                      required={!isEmployee}
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      disabled={isEmployee}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              {/* Form Content - Emergency Contacts */}
              <div className="p-6 md:p-8 space-y-4">
                <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-rose-100">
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                  กรณีติดต่อฉุกเฉิน
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">ชื่อ-นามสกุลหรือชื่อเล่น ผู้ติดต่อฉุกเฉิน</label>
                    <input
                      type="text"
                      value={formEmergencyName}
                      onChange={(e) => setFormEmergencyName(e.target.value)}
                      placeholder="เช่น สมฤดี รักครอบครัว"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">ความสัมพันธ์ส่วนตัว</label>
                    <input
                      type="text"
                      value={formEmergencyRelationship}
                      onChange={(e) => setFormEmergencyRelationship(e.target.value)}
                      placeholder="เช่น บิดา, มารดา, พี่น้อง, คู่สมรส"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">เบอร์ติดต่อฉุกเฉิน</label>
                    <input
                      type="text"
                      value={formEmergencyPhone}
                      onChange={(e) => setFormEmergencyPhone(formatPhoneNumber(e.target.value))}
                      placeholder="เช่น 089-XXX-XXXX"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 font-semibold text-xs md:text-sm px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  ยกเลิกคำปรึกษา
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs md:text-sm px-5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  {editingEmployee ? 'บันทึกการเปลี่ยนแปลง' : 'ยืนยันลงทะเบียนทะเบียน'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmEmp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" id="delete-confirm-popup">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden"
            id="delete-confirm-box"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-650 rounded-xl">
                  <Trash2 className="w-6 h-6 text-rose-600" />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-sans">ลบข้อมูลพนักงาน</h3>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed font-sans font-medium">
                คุณต้องการลบข้อมูลพนักงานท่านนี้จริงหรือไม่? ({deleteConfirmEmp.firstName} {deleteConfirmEmp.lastName}) บันทึกข้อมูลพนักงานรวมถึงสัญญาทั้งหมดจะถูกตัดออกจากระบบ
              </p>
              
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmEmp(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                  id="delete-modal-cancel"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteEmployee(deleteConfirmEmp.id);
                    setDeleteConfirmEmp(null);
                  }}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer shadow-red-200"
                  id="delete-modal-ok"
                >
                  ใช่, ยืนยันลบข้อมูล
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Manage Departments Modal */}
      {isDeptModalOpen && currentUser?.role === 'admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" id="dept-manage-modal">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-base font-bold text-slate-900 font-sans flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                จัดการแผนก / ฝ่ายงานหลัก
              </h3>
              <button 
                onClick={() => {
                  setIsDeptModalOpen(false);
                  setEditingDeptIndex(null);
                  setDeleteDeptConfirmIndex(null);
                }}
                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Form to Add New Department */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = newDeptName.trim();
                  if (!trimmed) return;
                  if (departments.includes(trimmed)) {
                    alert('แผนกนี้มีอยู่ในระบบแล้ว');
                    return;
                  }
                  const updated = [...departments, trimmed];
                  onUpdateDepartments(updated);
                  setNewDeptName('');
                }}
                className="space-y-2"
              >
                <label className="block text-xs font-semibold text-slate-500">เพิ่มแผนก / ฝ่ายงานใหม่</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="เช่น ฝ่ายปฏิบัติการคลัง / ฝ่ายจัดซื้อ"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    เพิ่มแผนก
                  </button>
                </div>
              </form>

              {/* Departments List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">รายชื่อแผนกงานทั้งหมด ({departments.length})</h4>
                {departments.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-xs">
                    ไม่มีแผนกงานในระบบ กรุณาเพิ่มแผนกแรกของคุณ
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-150 rounded-xl overflow-hidden bg-slate-50/50">
                    {departments.map((dept, idx) => {
                      const isEditing = editingDeptIndex === idx;
                      const isDeleting = deleteDeptConfirmIndex === idx;

                      return (
                        <div key={idx} className="p-3 flex items-center justify-between gap-4 bg-white hover:bg-slate-50/80 transition">
                          {isEditing ? (
                            <div className="flex items-center gap-2 w-full">
                              <input
                                type="text"
                                value={editingDeptValue}
                                onChange={(e) => setEditingDeptValue(e.target.value)}
                                className="flex-1 px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1.5 focus:ring-blue-500"
                                autoFocus
                              />
                              <button
                                onClick={() => {
                                  const trimmed = editingDeptValue.trim();
                                  if (!trimmed) return;
                                  if (departments.some((d, dIdx) => d === trimmed && dIdx !== idx)) {
                                    alert('แผนกนี้มีอยู่ในระบบแล้ว');
                                    return;
                                  }
                                  const updated = [...departments];
                                  const oldName = updated[idx];
                                  updated[idx] = trimmed;
                                  
                                  // Update any employees in this department
                                  employees.forEach(emp => {
                                    if (emp.department === oldName) {
                                      onEditEmployee({ ...emp, department: trimmed });
                                    }
                                  });

                                  onUpdateDepartments(updated);
                                  setEditingDeptIndex(null);
                                }}
                                className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition"
                                title="บันทึก"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingDeptIndex(null)}
                                className="p-1.5 bg-slate-50 text-slate-550 hover:bg-slate-100 rounded-lg transition"
                                title="ยกเลิก"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : isDeleting ? (
                            <div className="flex items-center justify-between w-full bg-rose-50/80 p-1.5 rounded-lg border border-rose-100 animate-fadeIn">
                              <span className="text-xs text-rose-800 font-sans font-semibold pl-1">คุณแน่ใจหรือไม่ที่จะลบแผนก "{dept}"?</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => {
                                    const updated = departments.filter((_, dIdx) => dIdx !== idx);
                                    
                                    // Update employees in this department to '-'
                                    employees.forEach(emp => {
                                      if (emp.department === dept) {
                                        onEditEmployee({ ...emp, department: '-' });
                                      }
                                    });

                                    onUpdateDepartments(updated);
                                    setDeleteDeptConfirmIndex(null);
                                    if (formDepartment === dept) {
                                      setFormDepartment(updated[0] || '');
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-rose-600 text-white rounded-md text-[11px] font-bold hover:bg-rose-500 transition"
                                >
                                  ลบเลย
                                </button>
                                <button
                                  onClick={() => setDeleteDeptConfirmIndex(null)}
                                  className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-[11px] font-bold hover:bg-slate-200 transition"
                                >
                                  ยกเลิก
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm text-slate-700 font-medium font-sans">{dept}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => {
                                    setEditingDeptIndex(idx);
                                    setEditingDeptValue(dept);
                                    setDeleteDeptConfirmIndex(null);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                  title="แก้ไข"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteDeptConfirmIndex(idx);
                                    setEditingDeptIndex(null);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="ลบ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end sticky bottom-0 bg-white z-10">
              <button
                type="button"
                onClick={() => {
                  setIsDeptModalOpen(false);
                  setEditingDeptIndex(null);
                  setDeleteDeptConfirmIndex(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
