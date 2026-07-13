import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  CalendarDays, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileText,
  User,
  Settings,
  Filter,
  Check,
  X,
  PlusCircle,
  Hash,
  ArrowLeftRight,
  Trash2
} from 'lucide-react';
import { LeaveRequest, LeaveType, LeaveStatus, Employee, UserAccount } from '../types';

export const THAI_PUBLIC_HOLIDAYS = [
  { date: '2026-01-01', name: 'วันขึ้นปีใหม่ (New Year\'s Day)', type: 'public' },
  { date: '2026-02-12', name: 'วันมาฆบูชา (Makha Bucha Day)', type: 'public' },
  { date: '2026-04-06', name: 'วันจักรี (Chakri Day)', type: 'public' },
  { date: '2026-04-13', name: 'วันสงกรานต์ (Songkran Festival)', type: 'public' },
  { date: '2026-04-14', name: 'วันสงกรานต์ (Songkran Festival)', type: 'public' },
  { date: '2026-04-15', name: 'วันสงกรานต์ (Songkran Festival)', type: 'public' },
  { date: '2026-05-01', name: 'วันแรงงานแห่งชาติ (National Labour Day)', type: 'company' },
  { date: '2026-05-04', name: 'วันฉัตรมงคล (Coronation Day)', type: 'public' },
  { date: '2026-06-01', name: 'วันวิสาขบูชา (Visakha Bucha Day)', type: 'public' },
  { date: '2026-06-03', name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี (HM Queen\'s Birthday)', type: 'public' },
  { date: '2026-07-28', name: 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว (HM King\'s Birthday)', type: 'public' },
  { date: '2026-07-29', name: 'วันอาสาฬหบูชา (Asahna Bucha Day)', type: 'public' },
  { date: '2026-07-30', name: 'วันเข้าพรรษา (Buddhist Lent Day)', type: 'public' },
  { date: '2026-08-12', name: 'วันแม่แห่งชาติ (HM Queen Sirikit\'s Birthday / Mother\'s Day)', type: 'public' },
  { date: '2026-10-13', name: 'วันนวมินทรมหาราช (King Bhumibol Memorial Day)', type: 'public' },
  { date: '2026-10-23', name: 'วันปิยมหาราช (Chulalongkorn Memorial Day)', type: 'public' },
  { date: '2026-12-05', name: 'วันพ่อแห่งชาติ (HM King Bhumibol\'s Birthday / Father\'s Day)', type: 'public' },
  { date: '2026-12-10', name: 'วันรัฐธรรมนูญ (Constitution Day)', type: 'public' },
  { date: '2026-12-31', name: 'วันสิ้นปี (New Year\'s Eve)', type: 'public' }
];

const formatThaiDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  const BEYear = year + 543;
  const padDay = day < 10 ? `0${day}` : `${day}`;
  const padMonth = month < 10 ? `0${month}` : `${month}`;
  
  return `${padDay}/${padMonth}/${BEYear}`;
};

interface LeaveSectionProps {
  leaveRequests: LeaveRequest[];
  employees: Employee[];
  onAddLeaveRequest: (req: Omit<LeaveRequest, 'id' | 'createdAt'>) => void;
  onApproveLeave: (id: string) => void;
  onRejectLeave: (id: string) => void;
  onClearAllLeaveRequests?: () => void;
  defaultAddOpen?: boolean;
  onClearDefaultAddOpen?: () => void;
  currentUser?: UserAccount | null;
}

export default function LeaveSection({
  leaveRequests,
  employees,
  onAddLeaveRequest,
  onApproveLeave,
  onRejectLeave,
  onClearAllLeaveRequests,
  defaultAddOpen,
  onClearDefaultAddOpen,
  currentUser
}: LeaveSectionProps) {
  const isEmployee = currentUser?.role === 'employee';
  const isAdmin = currentUser?.role === 'admin';
  const canHR = isAdmin || currentUser?.permissions?.canApproveLeaveHR || currentUser?.permissions?.canApproveLeave;
  const canManager = isAdmin || currentUser?.permissions?.canApproveLeaveManager;
  const isEmployeeOnly = isEmployee && !canHR && !canManager;
  const canClearHistory = isAdmin || currentUser?.permissions?.canClearLeaveHistory === true;

  // State variables
  const [activeSubTab, setActiveSubTab] = useState<'my_leaves' | 'public_holidays'>('my_leaves');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [actingLeaveReq, setActingLeaveReq] = useState<{ id: string; employeeName: string; action: 'approve' | 'reject' } | null>(null);

  // Leave Form states
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formLeaveType, setFormLeaveType] = useState<LeaveType>('annual');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formDays, setFormDays] = useState(1);
  const [formReason, setFormReason] = useState('');
  const [formSwapFromDate, setFormSwapFromDate] = useState('');
  const [formSwapToDate, setFormSwapToDate] = useState('');

  useEffect(() => {
    if (defaultAddOpen) {
      handleOpenRequestModal();
      if (onClearDefaultAddOpen) onClearDefaultAddOpen();
    }
  }, [defaultAddOpen]);

  // Handle open modal
  const handleOpenRequestModal = () => {
    const today = new Date().toISOString().split('T')[0];
    if (isEmployee && currentUser?.employeeId) {
      setFormEmployeeId(currentUser.employeeId);
    } else if (employees.length > 0) {
      setFormEmployeeId(employees[0].employeeId);
    } else {
      setFormEmployeeId('');
    }
    setFormLeaveType('annual');
    setFormStartDate(today);
    setFormEndDate(today);
    setFormDays(1);
    setFormReason('');
    setFormSwapFromDate(today);
    setFormSwapToDate(today);
    setIsRequestModalOpen(true);
  };

  // Safe calculation of working days based on dates
  const handleDateChange = (start: string, end: string) => {
    setFormStartDate(start);
    setFormEndDate(end);
    if (!start || !end) return;

    const sDate = new Date(start);
    const eDate = new Date(end);
    const diffTime = eDate.getTime() - sDate.getTime();
    if (diffTime < 0) {
      setFormDays(1);
      return;
    }
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    setFormDays(diffDays);
  };

  // Submit leave form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formEmployeeId) {
      alert('กรุณาเลือกพนักงานผู้ส่งคำขอ');
      return;
    }
    
    if (formLeaveType !== 'swap' && formDays <= 0) {
      alert('จำนวนวันลาต้องมากกว่า 0 วัน');
      return;
    }

    const matchedEmployee = employees.find(emp => emp.employeeId === formEmployeeId);
    if (!matchedEmployee) {
      alert('ไม่พบรหัสผู้ให้บริการในระบบ');
      return;
    }

    const payload = {
      employeeId: formEmployeeId,
      employeeName: `${matchedEmployee.firstName} ${matchedEmployee.lastName}`,
      leaveType: formLeaveType,
      startDate: formLeaveType === 'swap' ? formSwapToDate : formStartDate,
      endDate: formLeaveType === 'swap' ? formSwapToDate : formEndDate,
      days: formLeaveType === 'swap' ? 1 : formDays,
      reason: formReason,
      status: 'pending' as LeaveStatus,
      ...(formLeaveType === 'swap' ? {
        swapFromDate: formSwapFromDate,
        swapToDate: formSwapToDate
      } : {})
    };

    onAddLeaveRequest(payload);

    setIsRequestModalOpen(false);
  };

  // Helpers to translate and style categories
  const formatLeaveType = (type: LeaveType) => {
    switch (type) {
      case 'sick': return 'ลาป่วย';
      case 'annual': return 'ลาพักร้อน';
      case 'personal': return 'ลากิจส่วนตัว';
      case 'maternity': return 'ลาเพื่อการคลอดบุตร';
      case 'swap': return 'สลับวันหยุด';
      default: return 'ลาประเภทอื่น ๆ';
    }
  };

  const getLeaveTypeBadgeColor = (type: LeaveType) => {
    switch (type) {
      case 'sick': return 'bg-rose-50 text-rose-700 border border-rose-100';
      case 'annual': return 'bg-sky-50 text-sky-700 border border-sky-100';
      case 'personal': return 'bg-amber-50 text-amber-700 border border-amber-100';
      case 'maternity': return 'bg-purple-50 text-purple-700 border border-purple-100';
      case 'swap': return 'bg-indigo-50 text-indigo-700 border border-indigo-100';
      default: return 'bg-slate-50 text-slate-700 border border-slate-100';
    }
  };

  const handlePrintLeaveDoc = (req: LeaveRequest) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('กรุณาอนุญาตป๊อปอัพเพื่อแสดงหน้าสั่งพิมพ์');
      return;
    }

    const matchedEmployee = employees.find(emp => emp.employeeId === req.employeeId);
    const department = matchedEmployee ? matchedEmployee.department : 'ฝ่ายปฏิบัติการ';
    const position = matchedEmployee ? matchedEmployee.position : 'พนักงาน';

    const leaveTypeLabel = formatLeaveType(req.leaveType);
    const startDateFormatted = formatThaiDate(req.startDate);
    const endDateFormatted = formatThaiDate(req.endDate);

    printWindow.document.write(`
      <html>
        <head>
          <title>ใบคำขออนุมัติการลางาน - ${req.employeeName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap');
            body {
              font-family: 'Sarabun', sans-serif;
              padding: 40px;
              color: #1a1a1a;
              line-height: 1.6;
              font-size: 15px;
              background-color: #ffffff;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              border: 1px solid #ddd;
              padding: 50px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
              position: relative;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #334155;
              padding-bottom: 20px;
              margin-bottom: 25px;
            }
            .title {
              font-size: 22px;
              font-weight: 700;
              color: #1e293b;
              margin: 0;
              letter-spacing: 0.05em;
            }
            .subtitle {
              font-size: 13px;
              color: #64748b;
              margin-top: 5px;
              font-weight: 500;
            }
            .doc-meta {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              color: #475569;
              margin-bottom: 20px;
              background-color: #f8fafc;
              padding: 10px 15px;
              border-radius: 8px;
              border: 1px solid #f1f5f9;
            }
            .section-title {
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
              border-left: 4px solid #2563eb;
              padding-left: 10px;
              margin-top: 25px;
              margin-bottom: 15px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 20px;
            }
            .field {
              display: flex;
              align-items: baseline;
            }
            .label {
              font-weight: 600;
              color: #334155;
              min-width: 130px;
              flex-shrink: 0;
            }
            .value {
              flex-grow: 1;
              border-bottom: 1px dotted #cbd5e1;
              padding-left: 5px;
              color: #0f172a;
            }
            .reason-box {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 15px;
              font-style: italic;
              color: #334155;
              margin-bottom: 25px;
              white-space: pre-wrap;
              font-size: 14px;
            }
            .workflow {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-top: 30px;
            }
            .signature-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 20px;
              text-align: center;
              background-color: #fff;
              position: relative;
            }
            .signature-title {
              font-size: 13px;
              font-weight: 700;
              color: #475569;
              margin-bottom: 15px;
            }
            .signature-line {
              margin-top: 40px;
              border-bottom: 1px solid #94a3b8;
              width: 80%;
              margin-left: auto;
              margin-right: auto;
            }
            .signer-name {
              font-size: 13px;
              font-weight: 600;
              color: #1e293b;
              margin-top: 8px;
            }
            .sign-date {
              font-size: 11px;
              color: #64748b;
              margin-top: 2px;
            }
            .stamp-approved {
              position: absolute;
              top: 15px;
              right: 20px;
              border: 3px double #10b981;
              color: #10b981;
              font-size: 11px;
              font-weight: 800;
              padding: 4px 10px;
              transform: rotate(-10deg);
              border-radius: 4px;
              background-color: rgba(16, 185, 129, 0.05);
            }
            .stamp-checked {
              position: absolute;
              top: 15px;
              right: 20px;
              border: 3px double #3b82f6;
              color: #3b82f6;
              font-size: 11px;
              font-weight: 800;
              padding: 4px 10px;
              transform: rotate(-10deg);
              border-radius: 4px;
              background-color: rgba(59, 130, 246, 0.05);
            }
            .footer-info {
              margin-top: 40px;
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 15px;
            }
            @media print {
              body { padding: 0; background-color: #fff; }
              .container { border: none; box-shadow: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="title">ใบขออนุมัติการลางานอย่างเป็นทางการ</h1>
              <p class="subtitle">ระบบการจัดการและสารสนเทศงานบุคคล - OfficeConnect Platform</p>
            </div>

            <div class="doc-meta">
              <span><strong>เลขที่เอกสาร:</strong> LEAVE-${req.id.replace('leave-', '')}</span>
              <span><strong>วันที่ยื่นคำขอ:</strong> ${formatThaiDate(req.createdAt)}</span>
              <span><strong>สถานะเอกสาร:</strong> <span style="color: #10b981; font-weight: bold;">อนุมัติเรียบร้อยแล้ว</span></span>
            </div>

            <div class="section-title">ข้อมูลส่วนตัวพนักงานผู้ยื่นคำขอลา</div>
            <div class="grid">
              <div class="field">
                <span class="label">ชื่อ - นามสกุล:</span>
                <span class="value">${req.employeeName}</span>
              </div>
              <div class="field">
                <span class="label">รหัสพนักงาน:</span>
                <span class="value" style="font-family: monospace; font-weight: bold;">${req.employeeId}</span>
              </div>
              <div class="field">
                <span class="label">ตำแหน่งหน้าที่:</span>
                <span class="value">${position}</span>
              </div>
              <div class="field">
                <span class="label">แผนก / ฝ่าย:</span>
                <span class="value">${department}</span>
              </div>
            </div>

            <div class="section-title">รายละเอียดข้อมูลการลางาน</div>
            <div class="grid">
              <div class="field" style="grid-column: span 2;">
                <span class="label">ประเภทการลา:</span>
                <span class="value" style="font-weight: bold; color: #1e40af;">${leaveTypeLabel}</span>
              </div>
              
              ${req.leaveType === 'swap' ? `
                <div class="field" style="grid-column: span 2;">
                  <span class="label">สลับจากวันหยุดเดิม:</span>
                  <span class="value" style="font-weight: bold;">${formatThaiDate(req.swapFromDate || '')}</span>
                </div>
                <div class="field" style="grid-column: span 2;">
                  <span class="label">เพื่อสลับไปหยุดชดเชย:</span>
                  <span class="value" style="font-weight: bold; color: #16a34a;">${formatThaiDate(req.swapToDate || '')}</span>
                </div>
              ` : `
                <div class="field">
                  <span class="label">เริ่มหยุดงานตั้งแต่วันที่:</span>
                  <span class="value">${startDateFormatted}</span>
                </div>
                <div class="field">
                  <span class="label">ถึงวันที่หยุดงาน:</span>
                  <span class="value">${endDateFormatted}</span>
                </div>
                <div class="field" style="grid-column: span 2;">
                  <span class="label">รวมจำนวนวันทำการลา:</span>
                  <span class="value" style="font-weight: bold; color: #1e40af;">${req.days} วันทำการ</span>
                </div>
              `}
            </div>

            <div class="section-title">เหตุผลและความจำเป็นประกอบการพิจารณา</div>
            <div class="reason-box">"${req.reason}"</div>

            <div class="section-title">บันทึกขั้นตอนการพิจารณาและการอนุมัติ</div>
            <div class="workflow">
              <div class="signature-card">
                <div class="stamp-checked">CHECKED</div>
                <div class="signature-title">ผู้ตรวจสอบขั้นแรก (ฝ่ายบุคคล - HR)</div>
                <div class="signature-line"></div>
                <div class="signer-name">${req.hrApprovedBy || 'ฝ่ายทรัพยากรบุคคล (HR)'}</div>
                <div class="sign-date">ผู้พิจารณากลั่นกรองใบลา</div>
                <div class="sign-date" style="margin-top: 5px;"><strong>วันที่ตรวจสอบ:</strong> ${req.hrApprovedAt ? formatThaiDate(req.hrApprovedAt) : '-'}</div>
              </div>

              <div class="signature-card">
                <div class="stamp-approved">APPROVED</div>
                <div class="signature-title">ผู้อนุมัติขั้นสุดท้าย (ผู้จัดการ - Manager)</div>
                <div class="signature-line"></div>
                <div class="signer-name">${req.managerApprovedBy || 'ผู้จัดการ'}</div>
                <div class="sign-date">ผู้อนุมัติอนุญาตการลาหยุดงาน</div>
                <div class="sign-date" style="margin-top: 5px;"><strong>วันที่อนุมัติ:</strong> ${req.managerApprovedAt ? formatThaiDate(req.managerApprovedAt) : '-'}</div>
              </div>
            </div>

            <div class="footer-info">
              เอกสารนี้จัดทำและอนุมัติขึ้นโดยสมบูรณ์ผ่านระบบ OfficeConnect HQ OS • พิมพ์เมื่อวันที่ ${new Date().toLocaleDateString('th-TH')} • ความถูกต้องสามารถยืนยันได้จากฐานข้อมูลกลาง
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Statistics counters
  const myLeaves = isEmployeeOnly ? leaveRequests.filter(l => l.employeeId === currentUser?.employeeId) : leaveRequests;

  const totalApplied = myLeaves.length;
  const pendingCount = myLeaves.filter(l => l.status === 'pending' || l.status === 'pending_manager').length;
  const approvedCount = myLeaves.filter(l => l.status === 'approved').length;
  const rejectedCount = myLeaves.filter(l => l.status === 'rejected').length;

  // Filter requests
  const filteredRequests = myLeaves.filter(req => {
    const matchesSearch = 
      req.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'All' || req.leaveType === selectedType;
    const matchesStatus = selectedStatus === 'All' || req.status === selectedStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6" id="leave-section-container">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="leave-header-panel">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 font-sans flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-600" />
            {isEmployeeOnly ? 'ประวัติและการขอลางานส่วนตัว' : 'ระบบสิทธิและการขอลากิจพนักงาน (Leaves Tracking)'}
          </h2>
          <p className="text-sm text-slate-500">
            {isEmployeeOnly ? 'ยื่นใบคำขอลากิจส่วนบุคคล ตรวจสอบสิทธิวันหยุดคงเหลือ และประวัติย้อนหลัง' : 'ตรวจสอบโควตา อนุมัติวันหยุด และตรวจสอบตารางลางานของพนักงาน'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {canClearHistory && (
            <button
              onClick={() => setShowClearConfirmModal(true)}
              className="flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-650 hover:text-rose-850 font-bold px-4 py-2.5 rounded-xl text-sm shadow-xs transition cursor-pointer"
              id="btn-clear-leave-history"
            >
              <Trash2 className="w-4 h-4" />
              เคลียร์ประวัติรายการ
            </button>
          )}
          <button
            onClick={handleOpenRequestModal}
            disabled={employees.length === 0}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium px-4 py-2.5 rounded-xl text-sm shadow-md transition cursor-pointer"
            id="btn-add-leave-request"
          >
            <PlusCircle className="w-4 h-4" />
            {isEmployeeOnly ? 'สร้างใบคำขอลากิจใหม่' : 'เขียนใบลาพนักงานรายบุคคล'}
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-xl shadow-sm border max-w-md" id="leave-subtab-switcher">
        <button
          onClick={() => setActiveSubTab('my_leaves')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === 'my_leaves'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          {isEmployeeOnly ? 'วันลาและประวัติของฉัน' : 'ประวัติคำขอลาพนักงาน'}
        </button>
        <button
          onClick={() => setActiveSubTab('public_holidays')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === 'public_holidays'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          วันหยุดนักขัตฤกษ์ / วันหยุดบริษัท
        </button>
      </div>

      {activeSubTab === 'my_leaves' ? (
        <>
          {/* Grid statistics summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="leave-stats-row">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-2.5 bg-slate-50 border border-slate-100 text-slate-500 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400">ยื่นขอลารวม</p>
                <h4 className="text-xl font-bold text-slate-700">{totalApplied} ใบลา</h4>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-2.5 bg-amber-50 border border-amber-100 text-amber-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400">รอพิจารณา/รออนุมัติ</p>
                <h4 className="text-xl font-bold text-slate-700">{pendingCount} ใบลา</h4>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400">อนุมัติแล้ว</p>
                <h4 className="text-xl font-bold text-slate-700">{approvedCount} ใบลา</h4>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-500 rounded-lg">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400">ปฏิเสธคำขอลา</p>
                <h4 className="text-xl font-bold text-slate-700">{rejectedCount} ใบลา</h4>
              </div>
            </div>
          </div>

          {/* Control filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4" id="leave-filters-bar">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="ค้นหาชื่อพนักงาน หรือเหตุผลประกอบการลา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white"
                id="leave-search-input"
              />
            </div>

            {/* Leave Type Filter */}
            <div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                id="leave-type-filter"
              >
                <option value="All">ทุกประเภทการลา</option>
                <option value="sick">ลาป่วย</option>
                <option value="annual">ลาพักร้อน</option>
                <option value="personal">ลากิจส่วนตัว</option>
                <option value="maternity">ลาคลอด</option>
                <option value="swap">ขอสลับวันหยุด</option>
              </select>
            </div>

            {/* Leave Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                id="leave-status-filter"
              >
                <option value="All">ทุกสถานะการอนุมัติ</option>
                <option value="pending">⏳ รอการพิจารณาขั้นแรก (HR)</option>
                <option value="pending_manager">⏳ รออนุมัติสุดท้าย (ผู้จัดการ)</option>
                <option value="approved">✅ อนุมัติสำเร็จ</option>
                <option value="rejected">❌ ปฏิเสธการลา</option>
              </select>
            </div>
          </div>

          {/* Cards collection of leaves requests */}
          <div className="space-y-4" id="leaves-list-cards-flow">
            {filteredRequests.length > 0 ? (
              filteredRequests.map((req) => (
                <div 
                  key={req.id} 
                  className={`bg-white p-5 rounded-2xl shadow-xs border transition hover:shadow-sm ${
                    req.status === 'pending' 
                      ? 'border-l-4 border-l-amber-500 border-slate-100' 
                      : req.status === 'pending_manager'
                      ? 'border-l-4 border-l-indigo-500 border-slate-100'
                      : req.status === 'approved'
                      ? 'border-l-4 border-l-emerald-500 border-slate-100'
                      : 'border-l-4 border-l-rose-500 border-slate-100'
                  }`}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    {/* Employee / Type / Duration info */}
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200/50 flex items-center justify-center font-bold text-slate-600 flex-shrink-0">
                        <User className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800">{req.employeeName}</span>
                          <span className="text-xs font-mono font-medium text-slate-400">({req.employeeId})</span>
                          <span className={`text-xs px-2 py-0.5 rounded-md ${getLeaveTypeBadgeColor(req.leaveType)}`}>
                            {formatLeaveType(req.leaveType)}
                          </span>
                        </div>
                        {/* Date segment */}
                        {req.leaveType === 'swap' ? (
                          <div className="text-xs md:text-sm font-semibold text-slate-500 flex flex-col gap-1">
                            <p className="flex items-center gap-1 text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-xl w-fit">
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                              <span>ขอลดวันหยุดเดิมสลับไปทำงาน และพักชดเชยทดแทน</span>
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap text-slate-700 font-mono">
                              <span className="bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded">
                                📅 สลับมาทำงาน: <strong className="text-indigo-600">{formatThaiDate(req.swapFromDate || '')}</strong>
                              </span>
                              <span className="text-slate-400">⇆</span>
                              <span className="bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded">
                                🏖️ เปลี่ยนไปหยุดชดเชย: <strong className="text-emerald-600">{formatThaiDate(req.swapToDate || '')}</strong>
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs md:text-sm font-semibold text-slate-500 flex items-center gap-1.5 flex-wrap">
                            <span>ระยะเวลา: </span>
                            <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{formatThaiDate(req.startDate)}</span>
                            <span>ถึง</span>
                            <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{formatThaiDate(req.endDate)}</span>
                            <span className="text-blue-600 bg-blue-50 border border-blue-100 px-2 rounded-full font-bold">
                              รวม {req.days} วันทำการ
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Date created & status and fast action */}
                    <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-3 w-full md:w-auto md:self-stretch justify-between">
                      {/* Status Indicator */}
                      <div className="flex flex-col items-start sm:items-center md:items-end gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-mono">ส่งเมื่อ: {formatThaiDate(req.createdAt)}</span>
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${
                            req.status === 'approved' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : req.status === 'pending_manager'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              : req.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {req.status === 'pending' && <AlertCircle className="w-3.5 h-3.5" />}
                            {req.status === 'pending_manager' && <Clock className="w-3.5 h-3.5" />}
                            {req.status === 'approved' && <CheckCircle className="w-3.5 h-3.5" />}
                            {req.status === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                            {req.status === 'approved' 
                              ? 'อนุมัติสำเร็จ' 
                              : req.status === 'pending_manager'
                              ? 'รออนุมัติสุดท้าย (ผู้จัดการ)' 
                              : req.status === 'pending' 
                              ? 'รอพิจารณาขั้นแรก (HR)' 
                              : 'ไม่อนุมัติ'}
                          </span>
                        </div>

                        {/* Logs of approval step-by-step */}
                        {(req.hrApprovedBy || req.managerApprovedBy || req.reviewedBy) && (
                          <div className="text-[10px] text-slate-400 mt-1 space-y-0.5 text-left md:text-right font-medium">
                            {req.hrApprovedBy && (
                              <p className="text-amber-600">
                                ✓ ผ่านขั้นแรกโดย HR: <strong className="font-semibold">{req.hrApprovedBy}</strong> {req.hrApprovedAt && `(${formatThaiDate(req.hrApprovedAt)})`}
                              </p>
                            )}
                            {req.managerApprovedBy && (
                              <p className="text-emerald-600">
                                ✓ อนุมัติสุดท้ายโดยผู้จัดการ: <strong className="font-semibold">{req.managerApprovedBy}</strong> {req.managerApprovedAt && `(${formatThaiDate(req.managerApprovedAt)})`}
                              </p>
                            )}
                            {req.status === 'rejected' && req.reviewedBy && (
                              <p className="text-rose-600 font-bold">
                                ✗ ปฏิเสธโดย: {req.reviewedBy} {req.reviewedAt && `(${formatThaiDate(req.reviewedAt)})`}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Print Approved Leave Button */}
                      {req.status === 'approved' && (
                        <div className="flex flex-col gap-1.5 w-full sm:w-auto" id={`leave-print-${req.id}`}>
                          <button
                            onClick={() => handlePrintLeaveDoc(req)}
                            className="flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 hover:text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer shadow-xs"
                            title="พิมพ์เอกสารขออนุมัติการลางาน"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>พิมพ์ใบอนุมัติการลา (Print)</span>
                          </button>
                        </div>
                      )}

                      {/* Actions buttons */}
                      {!isEmployeeOnly && (
                        <div className="flex flex-col gap-1.5 w-full sm:w-auto" id={`leave-actions-${req.id}`}>
                          {req.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              {canHR ? (
                                <>
                                  <button
                                    onClick={() => setActingLeaveReq({ id: req.id, employeeName: req.employeeName, action: 'approve' })}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition border border-amber-500 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    ผ่านการกรอง (HR)
                                  </button>
                                  <button
                                    onClick={() => setActingLeaveReq({ id: req.id, employeeName: req.employeeName, action: 'reject' })}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-white hover:bg-slate-50 text-rose-600 border border-rose-200 text-xs font-medium px-3 py-1.5 rounded-lg transition cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    ปฏิเสธ
                                  </button>
                                </>
                              ) : (
                                <span className="text-[11px] text-amber-500 bg-amber-50/60 px-2.5 py-1 rounded-lg border border-amber-100 font-medium">
                                  ⏳ รอฝ่ายบุคคล (HR) พิจารณาขั้นแรก
                                </span>
                              )}
                            </div>
                          )}

                          {req.status === 'pending_manager' && (
                            <div className="flex items-center gap-2">
                              {canManager ? (
                                <>
                                  <button
                                    onClick={() => setActingLeaveReq({ id: req.id, employeeName: req.employeeName, action: 'approve' })}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition border border-emerald-600 cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    อนุมัติสุดท้าย (ผู้จัดการ)
                                  </button>
                                  <button
                                    onClick={() => setActingLeaveReq({ id: req.id, employeeName: req.employeeName, action: 'reject' })}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-white hover:bg-slate-50 text-rose-600 border border-rose-200 text-xs font-medium px-3 py-1.5 rounded-lg transition cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    ปฏิเสธ
                                  </button>
                                </>
                              ) : (
                                <span className="text-[11px] text-indigo-500 bg-indigo-50/60 px-2.5 py-1 rounded-lg border border-indigo-100 font-medium">
                                  ⏳ ผ่าน HR แล้ว รอผู้จัดการอนุมัติสุดท้าย
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reason segment */}
                  <div className="mt-3.5 pt-3.5 border-t border-slate-100/70 text-xs md:text-sm text-slate-500 leading-relaxed italic pr-4">
                    <span className="font-bold text-slate-600 not-italic block md:inline md:mr-1">เหตุผลการขอหยุุดงาน:</span>
                    "{req.reason}"
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-12 text-center text-slate-400 rounded-xl border border-slate-100">
                <CalendarDays className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                ไม่พบคำขอการลาที่ตรงตามเงื่อนไขการค้นหาในสัญญาสารสนเทศนี้
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn" id="public-holidays-panel">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
              🗓️ ตารางวันหยุดนักขัตฤกษ์และวันหยุดบริษัท ประจำปี 2569 (2026)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              อ้างอิงประกาศวันหยุดราชการและข้อกำหนดวันหยุดประเพณีของบริษัท
            </p>
          </div>
          {/* Public Holidays (Tablet & Desktop) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase bg-slate-50/40">
                  <th className="py-3 px-5 w-40">วันที่วันหยุด</th>
                  <th className="py-3 px-4">ชื่อวันหยุดประเพณี / วันหยุดราชการ</th>
                  <th className="py-3 px-4 text-center w-40">ประเภทวันหยุด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {THAI_PUBLIC_HOLIDAYS.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-semibold text-slate-600">
                      {new Date(h.date).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {h.name}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        h.type === 'public'
                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                      }`}>
                        {h.type === 'public' ? 'วันหยุดนักขัตฤกษ์' : 'วันหยุดบริษัท'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Public Holidays (Mobile Devices) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {THAI_PUBLIC_HOLIDAYS.map((h, i) => (
              <div key={i} className="p-4 bg-white flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-mono font-semibold text-slate-500">
                    {new Date(h.date).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                    h.type === 'public'
                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                  }`}>
                    {h.type === 'public' ? 'นักขัตฤกษ์' : 'วันหยุดบริษัท'}
                  </span>
                </div>
                <h4 className="font-bold text-slate-800 text-xs leading-snug">{h.name}</h4>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REQUEST LEAVE MODAL */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="leave-request-form-modal">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 font-sans flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                กรอกใบคำขอลากิจพนักงานส่วนบุคคล
              </h3>
              <button 
                onClick={() => setIsRequestModalOpen(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Employee selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">เลือกชื่อพนักงานผู้ส่งคำขอลา *</label>
                <select
                  required
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  disabled={isEmployee}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1.5 focus:ring-blue-500 disabled:opacity-60 disabled:bg-slate-50"
                  id="form-leave-employee-selector"
                >
                  <option value="" disabled>-- กรุณาเลือกบุคลากร --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.employeeId}>
                      {emp.firstName} {emp.lastName} ({emp.employeeId} - {emp.position})
                    </option>
                  ))}
                </select>
                {isEmployee && (
                  <p className="text-[11px] text-slate-400 mt-1">ยื่นขอลากิจในนามบัญชีส่วนบุคคลของคุณที่ล็อกอินในปัจจุบัน</p>
                )}
              </div>

              {/* Leave Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ประเภทสาระสำคัญการลา *</label>
                <select
                  value={formLeaveType}
                  onChange={(e) => setFormLeaveType(e.target.value as LeaveType)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1.5 focus:ring-blue-500"
                >
                  <option value="annual">ลาพักร้อนประจำปี</option>
                  <option value="sick">ลาป่วยทางการแพทย์</option>
                  <option value="personal">ลากิจส่วนตัว</option>
                  <option value="maternity">ลาคลอดบุตร</option>
                  <option value="swap">ขอสลับวันหยุดประจำสัปดาห์ / วันหยุดชดเชย</option>
                  <option value="other">ลาอื่นๆ</option>
                </select>
              </div>

              {/* Start Date, End date OR Swap Dates */}
              {formLeaveType !== 'swap' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">ตั้งแต่วันที่ *</label>
                    <input
                      type="date"
                      required
                      value={formStartDate}
                      onChange={(e) => handleDateChange(e.target.value, formEndDate)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">ถึงวันที่ *</label>
                    <input
                      type="date"
                      required
                      value={formEndDate}
                      onChange={(e) => handleDateChange(formStartDate, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                  <div>
                    <label className="block text-xs font-bold text-indigo-700 mb-1">วันหยุดเดิมที่สลับมาทำงาน *</label>
                    <input
                      type="date"
                      required
                      value={formSwapFromDate}
                      onChange={(e) => setFormSwapFromDate(e.target.value)}
                      className="w-full px-3 py-2 border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">วันที่ต้องการปฏิบัติงานแทน</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-indigo-700 mb-1">วันทำงานเดิมที่สลับไปหยุด *</label>
                    <input
                      type="date"
                      required
                      value={formSwapToDate}
                      onChange={(e) => setFormSwapToDate(e.target.value)}
                      className="w-full px-3 py-2 border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">วันที่ขอสลับเป็นวันหยุดพักผ่อน</p>
                  </div>
                </div>
              )}

              {/* Computed Days display */}
              {formLeaveType !== 'swap' ? (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between text-xs md:text-sm">
                  <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                    <Hash className="w-4 h-4 text-blue-500" />
                    จำนวนวันลาคำนวณอัตโนมัติ:
                  </span>
                  <span className="text-lg font-bold text-blue-700">
                    {formDays} วัน
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between text-xs md:text-sm">
                  <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                    <ArrowLeftRight className="w-4 h-4 text-indigo-500" />
                    จำนวนวันสลับวันหยุด:
                  </span>
                  <span className="text-lg font-bold text-indigo-700">
                    1 วัน
                  </span>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">เหตุผลและความจำเป็นในการยื่นขอลา *</label>
                <textarea
                  required
                  rows={3}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="เช่น ปวดศีรษะ ตัวร้อนจัด แพทย์สั่งพักสองวัน หรือกลับบ้านต่างจังหวัด"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs md:text-sm px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs md:text-sm px-5 py-2 rounded-xl transition cursor-pointer"
                >
                  ยื่นใบคำขอลา
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Custom Approve/Reject Leave Modal */}
      {actingLeaveReq && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" id="leave-confirm-popup">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden"
            id="leave-confirm-box"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${actingLeaveReq.action === 'approve' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-sans">
                  {actingLeaveReq.action === 'approve' ? 'อนุมัติคำขออนุมัติการลา' : 'ปฏิเสธคำขออนุมัติการลา'}
                </h3>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed font-sans font-medium">
                คุณต้องการ <strong className={actingLeaveReq.action === 'approve' ? 'text-emerald-600' : 'text-rose-650'}>
                  {actingLeaveReq.action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}
                </strong> ใบคำขอลาของ <strong>{actingLeaveReq.employeeName}</strong> ใช่หรือไม่?
              </p>
              
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActingLeaveReq(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                  id="leave-modal-cancel"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (actingLeaveReq.action === 'approve') {
                      onApproveLeave(actingLeaveReq.id);
                    } else {
                      onRejectLeave(actingLeaveReq.id);
                    }
                    setActingLeaveReq(null);
                  }}
                  className={`px-5 py-2 text-white text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer ${
                    actingLeaveReq.action === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-200'
                      : 'bg-rose-650 hover:bg-rose-550 shadow-rose-200'
                  }`}
                  id="leave-modal-ok"
                >
                  {actingLeaveReq.action === 'approve' ? 'ใช่, อนุมัติการลา' : 'ใช่, ปฏิเสธการลา'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Clear All Leave History Confirm Modal */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" id="leave-clear-confirm-popup">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden"
            id="leave-clear-confirm-box"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-sans">
                  เคลียร์ประวัติคำขอลากิจทั้งหมด
                </h3>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed font-sans font-medium">
                คุณแน่ใจหรือไม่ที่จะ<strong>ลบประวัติและคำขอลากิจของพนักงานทั้งหมด</strong>ออกจากระบบ? การดำเนินการนี้จะลบข้อมูลออกจากระบบ Cloud และไม่สามารถกู้คืนได้
              </p>
              
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirmModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                  id="leave-clear-modal-cancel"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onClearAllLeaveRequests) {
                      onClearAllLeaveRequests();
                    }
                    setShowClearConfirmModal(false);
                  }}
                  className="px-5 py-2 text-white text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer bg-rose-600 hover:bg-rose-500 shadow-rose-200"
                  id="leave-clear-modal-ok"
                >
                  ใช่, ลบทั้งหมด
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
