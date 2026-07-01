import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  Clock, 
  User, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Search, 
  Filter, 
  RefreshCw, 
  CalendarDays, 
  Check, 
  Plus, 
  Trash2, 
  Hourglass, 
  Star, 
  Building2,
  FileText,
  Upload,
  ArrowRight,
  Info
} from 'lucide-react';
import { Employee, UserAccount, AttendanceRecord, AttendanceType, SystemSettings } from '../types';

interface AttendanceSectionProps {
  attendanceRecords: AttendanceRecord[];
  employees: Employee[];
  onAddAttendance: (record: AttendanceRecord) => void;
  onAddAttendanceBatch?: (records: AttendanceRecord[]) => void;
  onDeleteAttendance?: (id: string) => void; // Help admin manage mistakes
  currentUser?: UserAccount | null;
  settings: SystemSettings;
}

interface ParsedAttendanceItem {
  tempId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  time: string;
  type: AttendanceType;
  otHours?: number;
  notes?: string;
  isValid: boolean;
  errorMsg?: string;
}

export default function AttendanceSection({
  attendanceRecords,
  employees,
  onAddAttendance,
  onAddAttendanceBatch,
  onDeleteAttendance,
  currentUser,
  settings
}: AttendanceSectionProps) {
  const isEmployee = currentUser?.role === 'employee';
  
  // Real-time ticking clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sub-Tab Switcher State ('record' = manual record, 'import' = Excel/CSV Import)
  const [activeSubTab, setActiveSubTab] = useState<'record' | 'import'>('record');

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('All');

  // Input states for clocking in/out (manual)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(() => {
    if (isEmployee && currentUser?.employeeId) {
      return currentUser.employeeId;
    }
    return employees[0]?.employeeId || '';
  });
  const [attendanceNotes, setAttendanceNotes] = useState('');
  const [otHours, setOtHours] = useState<number>(1);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // States for importing Excel/CSV
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedImportRows, setParsedImportRows] = useState<ParsedAttendanceItem[]>([]);
  const [importEmployeeFilter, setImportEmployeeFilter] = useState<string>('All');
  const [isDragging, setIsDragging] = useState(false);
  const [importNotification, setImportNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync selected employee ID if user session changes
  useEffect(() => {
    if (isEmployee && currentUser?.employeeId) {
      setSelectedEmployeeId(currentUser.employeeId);
    }
  }, [currentUser, isEmployee]);

  const activeEmployee = employees.find(emp => emp.employeeId === selectedEmployeeId);

  // Helper to format today's date in Thai/local format
  const getThaiDateString = (dateObj: Date) => {
    return dateObj.toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getThaiTimeString = (dateObj: Date) => {
    return dateObj.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + ' น.';
  };

  // Record attendance action
  const handleRecordAttendance = (type: AttendanceType) => {
    if (!selectedEmployeeId) {
      setNotification({ type: 'error', message: 'กรุณาเลือกชื่อพนักงานก่อนบันทึกเวลา' });
      return;
    }

    const emp = employees.find(e => e.employeeId === selectedEmployeeId);
    if (!emp) {
      setNotification({ type: 'error', message: 'ไม่พบข้อมูลพนักงานในระบบ' });
      return;
    }

    const todayDateStr = currentTime.toISOString().split('T')[0];
    const timeStr = currentTime.toTimeString().split(' ')[0];

    // Check duplicate check-ins of same type today (unless OT, which can be logged multiple times)
    if (type !== 'overtime') {
      const isDuplicate = attendanceRecords.some(
        rec => rec.employeeId === selectedEmployeeId && rec.date === todayDateStr && rec.type === type
      );
      if (isDuplicate) {
        const typeLabel = type === 'clock_in' ? 'เข้างาน' : type === 'clock_out' ? 'ออกงาน' : 'เข้าสาย';
        setNotification({ 
          type: 'error', 
          message: `พนักงานคนนี้ได้รับการบันทึกเวลา "${typeLabel}" สำหรับวันนี้แล้ว` 
        });
        return;
      }
    }

    const newRecord: AttendanceRecord = {
      id: 'att-' + Date.now(),
      employeeId: emp.employeeId,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      date: todayDateStr,
      time: timeStr,
      type,
      notes: attendanceNotes.trim() || undefined,
      otHours: type === 'overtime' ? otHours : undefined,
      recordedBy: currentUser?.email || 'system'
    };

    onAddAttendance(newRecord);
    setAttendanceNotes('');
    setNotification({ 
      type: 'success', 
      message: `บันทึกข้อมูล "${getAttendanceTypeLabel(type)}" สำหรับคุณ ${emp.firstName} สำเร็จเรียบร้อย!` 
    });

    // Auto-clear notification after 4 seconds
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Excel/CSV parsing logic with dynamic column mapping and auto-lateness evaluation
  const handleFileUpload = (file: File) => {
    setImportFile(file);
    setImportNotification(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('ไม่สามารถอ่านข้อมูลในไฟล์ได้');
        
        let workbook;
        if (file.name.endsWith('.csv')) {
          // If CSV, read it as array and decode using TextDecoder to support Thai language perfectly
          const arr = new Uint8Array(data as ArrayBuffer);
          let text = '';
          try {
            // Tries Thai TIS-620 if utf-8 fails, or default to windows-874 / utf-8
            text = new TextDecoder('utf-8').decode(arr);
            if (text.includes('')) {
              text = new TextDecoder('tis-620').decode(arr);
            }
          } catch {
            text = new TextDecoder('windows-874').decode(arr);
          }
          workbook = XLSX.read(text, { type: 'string' });
        } else {
          const arr = new Uint8Array(data as ArrayBuffer);
          workbook = XLSX.read(arr, { type: 'array' });
        }
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });
        
        if (!jsonRows || jsonRows.length === 0) {
          setImportNotification({ type: 'error', message: 'ไม่พบข้อมูลหรือแผ่นงานว่างเปล่าในไฟล์' });
          return;
        }
        
        // Map excel data structure dynamically
        const parsedItems: ParsedAttendanceItem[] = jsonRows.map((row, index) => {
          let employeeId = '';
          let dateStr = '';
          let timeStr = '';
          let typeVal = '';
          let otHrs = 0;
          let notesVal = '';
          
          Object.entries(row).forEach(([key, val]) => {
            const normalizedKey = key.trim().toLowerCase();
            const stringVal = String(val).trim();
            
            if (normalizedKey.includes('รหัส') || normalizedKey.includes('id') || normalizedKey.includes('emp')) {
              employeeId = stringVal;
            } else if (normalizedKey.includes('วัน') || normalizedKey.includes('date')) {
              dateStr = stringVal;
            } else if (normalizedKey.includes('เวลา') || normalizedKey.includes('time')) {
              timeStr = stringVal;
            } else if (normalizedKey.includes('ประเภท') || normalizedKey.includes('type')) {
              typeVal = stringVal;
            } else if (normalizedKey.includes('ot') || normalizedKey.includes('ชั่วโมง') || normalizedKey.includes('ล่วงเวลา')) {
              otHrs = parseFloat(stringVal) || 0;
            } else if (normalizedKey.includes('หมายเหตุ') || normalizedKey.includes('note')) {
              notesVal = stringVal;
            }
          });
          
          // 1. Process Date
          // Excel date serial number handling (e.g. 46115)
          if (/^\d{5}(\.\d+)?$/.test(dateStr)) {
            const serial = parseFloat(dateStr);
            const utc_days  = Math.floor(serial - 25569);
            const utc_value = utc_days * 86400;                                        
            const date_info = new Date(utc_value * 1000);
            dateStr = date_info.toISOString().split('T')[0];
          } else if (dateStr) {
            // Clean custom date string separators: slash / or dash - or space
            const cleanDateStr = dateStr.replace(/\//g, '-');
            const parts = cleanDateStr.split('-');
            if (parts.length === 3) {
              // Check if in DD-MM-YYYY format
              if (parts[2].length === 4) {
                dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              } else if (parts[0].length === 4) { // YYYY-MM-DD
                dateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
              }
            }
          } else {
            // Default to today
            dateStr = new Date().toISOString().split('T')[0];
          }
          
          // 2. Process Time
          if (!timeStr) {
            timeStr = '08:00:00';
          } else {
            // Excel fractional day representation (e.g., 0.3541 -> 08:30:00)
            if (/^0\.\d+$/.test(timeStr)) {
              const decimalTime = parseFloat(timeStr) * 24;
              const hours = Math.floor(decimalTime);
              const minutes = Math.floor((decimalTime - hours) * 60);
              const seconds = Math.floor(((decimalTime - hours) * 60 - minutes) * 60);
              timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            } else {
              // Format HH:MM or HH:MM:SS
              const parts = timeStr.split(':');
              if (parts.length === 2) {
                timeStr = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
              } else if (parts.length === 3) {
                timeStr = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
              }
            }
          }

          // 3. Match Employee ID (case-insensitive)
          const emp = employees.find(e => e.employeeId.toUpperCase() === employeeId.toUpperCase());
          let empName = 'ไม่พบบัญชีพนักงานในระบบ';
          let isValid = !!emp;
          let errorMsg = emp ? undefined : 'ไม่พบรหัสพนักงานในฐานข้อมูล';
          
          if (emp) {
            empName = `${emp.firstName} ${emp.lastName}`;
          }
          
          if (!employeeId) {
            isValid = false;
            errorMsg = 'รหัสพนักงานว่างเปล่า';
          }
          
          // 4. Automatic Attendance Type Evaluation & Rules Processing
          let type: AttendanceType = 'clock_in';
          const normalizedTypeVal = typeVal.toLowerCase();
          
          if (normalizedTypeVal.includes('clock_in') || normalizedTypeVal.includes('เข้างานปกติ') || normalizedTypeVal.includes('เข้างาน')) {
            type = 'clock_in';
          } else if (normalizedTypeVal.includes('clock_out') || normalizedTypeVal.includes('ออกงานปกติ') || normalizedTypeVal.includes('ออกงาน') || normalizedTypeVal.includes('เลิกงาน')) {
            type = 'clock_out';
          } else if (normalizedTypeVal.includes('late') || normalizedTypeVal.includes('เข้าสาย') || normalizedTypeVal.includes('สาย')) {
            type = 'late';
          } else if (normalizedTypeVal.includes('overtime') || normalizedTypeVal.includes('ot') || normalizedTypeVal.includes('ล่วงเวลา') || otHrs > 0) {
            type = 'overtime';
          } else {
            // AUTO EVALUATE LATENESS!
            // Compare parsed record time with company rules start time (e.g. 08:30)
            const [startHour, startMin] = settings.workHoursStart.split(':').map(Number);
            const [itemHour, itemMin] = timeStr.split(':').map(Number);
            
            if (itemHour < 12) {
              // Morning session
              if (itemHour > startHour || (itemHour === startHour && itemMin > startMin)) {
                type = 'late'; // Late because time > company policy
              } else {
                type = 'clock_in';
              }
            } else if (itemHour >= 17) {
              // Late afternoon / evening session
              type = 'clock_out';
            } else {
              // Mid-day
              type = 'clock_out';
            }
          }

          return {
            tempId: 'temp-' + index + '-' + Date.now(),
            employeeId: emp ? emp.employeeId : employeeId,
            employeeName: empName,
            date: dateStr,
            time: timeStr,
            type,
            otHours: type === 'overtime' ? (otHrs || 1) : undefined,
            notes: notesVal || undefined,
            isValid,
            errorMsg
          };
        });
        
        setParsedImportRows(parsedItems);
        setImportEmployeeFilter('All');
        setImportNotification({ 
          type: 'success', 
          message: `วิเคราะห์ไฟล์ "${file.name}" สำเร็จ ตรวจพบข้อมูลทั้งหมด ${parsedItems.length} รายการ กรุณาตรวจสอบและกดบันทึกความถูกต้องก่อนยืนยันนำเข้า` 
        });
      } catch (err: any) {
        console.error(err);
        setImportNotification({ type: 'error', message: 'เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล: ' + err.message });
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Modify individual parsed item before final import
  const handleUpdateParsedRow = (tempId: string, updates: Partial<ParsedAttendanceItem>) => {
    setParsedImportRows(prev => prev.map(row => {
      if (row.tempId === tempId) {
        const updatedRow = { ...row, ...updates };
        // If type changed to overtime, ensure otHours is set
        if (updates.type === 'overtime' && !updatedRow.otHours) {
          updatedRow.otHours = 1;
        } else if (updates.type && updates.type !== 'overtime') {
          updatedRow.otHours = undefined;
        }
        return updatedRow;
      }
      return row;
    }));
  };

  const handleRemoveParsedRow = (tempId: string) => {
    setParsedImportRows(prev => prev.filter(row => row.tempId !== tempId));
  };

  // Submit parsed batch to main App state
  const handleConfirmImport = () => {
    const validRows = parsedImportRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setImportNotification({ type: 'error', message: 'ไม่พบรายการข้อมูลที่ถูกต้องสำหรับการนำเข้า' });
      return;
    }

    const recordsToSave: AttendanceRecord[] = validRows.map(row => ({
      id: 'att-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now(),
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      date: row.date,
      time: row.time,
      type: row.type,
      otHours: row.otHours,
      notes: row.notes,
      recordedBy: currentUser?.email || 'excel_import'
    }));

    if (onAddAttendanceBatch) {
      onAddAttendanceBatch(recordsToSave);
    } else {
      // Fallback to loop if batch is missing
      recordsToSave.forEach(onAddAttendance);
    }

    setImportNotification({ 
      type: 'success', 
      message: `นำเข้าข้อมูลจำนวน ${recordsToSave.length} รายการ เรียบร้อยแล้ว!` 
    });
    setParsedImportRows([]);
    setImportEmployeeFilter('All');
    setImportFile(null);
    
    // Auto-clear notification after delay
    setTimeout(() => {
      setImportNotification(null);
      setActiveSubTab('record'); // Switch back to history list
    }, 3000);
  };

  // Excel template generator for user download
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "รหัสพนักงาน (Employee ID)*": "EMP-001",
        "วันที่ (Date YYYY-MM-DD)*": "2026-06-30",
        "เวลาบันทึก (Time HH:MM:SS)*": "08:15:00",
        "ประเภทลงเวลา (Type: clock_in/clock_out/late/overtime)": "clock_in",
        "ชั่วโมง OT (OT Hours - สำหรับ OT เท่านั้น)": "",
        "หมายเหตุ (Notes)": "บันทึกเวลาปกติ"
      },
      {
        "รหัสพนักงาน (Employee ID)*": "EMP-001",
        "วันที่ (Date YYYY-MM-DD)*": "2026-06-30",
        "เวลาบันทึก (Time HH:MM:SS)*": "17:35:00",
        "ประเภทลงเวลา (Type: clock_in/clock_out/late/overtime)": "clock_out",
        "ชั่วโมง OT (OT Hours - สำหรับ OT เท่านั้น)": "",
        "หมายเหตุ (Notes)": ""
      },
      {
        "รหัสพนักงาน (Employee ID)*": "EMP-001",
        "วันที่ (Date YYYY-MM-DD)*": "2026-06-30",
        "เวลาบันทึก (Time HH:MM:SS)*": "19:30:00",
        "ประเภทลงเวลา (Type: clock_in/clock_out/late/overtime)": "overtime",
        "ชั่วโมง OT (OT Hours - สำหรับ OT เท่านั้น)": "2.5",
        "หมายเหตุ (Notes)": "ทำงานโปรเจกต์ด่วน"
      },
      {
        "รหัสพนักงาน (Employee ID)*": "EMP-002",
        "วันที่ (Date YYYY-MM-DD)*": "2026-06-30",
        "เวลาบันทึก (Time HH:MM:SS)*": "08:45:00",
        "ประเภทลงเวลา (Type: clock_in/clock_out/late/overtime)": "late",
        "ชั่วโมง OT (OT Hours - สำหรับ OT เท่านั้น)": "",
        "หมายเหตุ (Notes)": "เดินทางรถไฟฟ้าขัดข้อง"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Template");
    
    // Auto-fit column widths
    const max_len = 35;
    ws['!cols'] = [
      { wch: 25 },
      { wch: 22 },
      { wch: 22 },
      { wch: 35 },
      { wch: 25 },
      { wch: 25 }
    ];

    XLSX.writeFile(wb, "template_attendance_import.xlsx");
  };

  // Helper functions for translation and styling
  const getAttendanceTypeLabel = (type: AttendanceType) => {
    switch (type) {
      case 'clock_in': return 'เข้างานปกติ';
      case 'clock_out': return 'ออกงานปกติ';
      case 'late': return 'เข้าสาย';
      case 'overtime': return 'ทำงานล่วงเวลา (OT)';
      default: return type;
    }
  };

  const getAttendanceTypeBadgeStyle = (type: AttendanceType) => {
    switch (type) {
      case 'clock_in':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'clock_out':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'late':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'overtime':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  // Filtered attendance logs
  const filteredRecords = attendanceRecords.filter(rec => {
    const matchesSearch = rec.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          rec.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (rec.notes && rec.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = selectedTypeFilter === 'All' || rec.type === selectedTypeFilter;
    const matchesDate = !selectedDateFilter || rec.date === selectedDateFilter;
    const matchesEmployee = isEmployee 
      ? rec.employeeId === currentUser?.employeeId 
      : (selectedEmployeeFilter === 'All' || rec.employeeId === selectedEmployeeFilter);

    return matchesSearch && matchesType && matchesDate && matchesEmployee;
  });

  // Calculate statistics based on filtered data (or total data depending on user choice)
  const activeStatsEmployeeId = isEmployee ? currentUser?.employeeId : (selectedEmployeeFilter !== 'All' ? selectedEmployeeFilter : null);
  
  const statsRecords = activeStatsEmployeeId 
    ? attendanceRecords.filter(rec => rec.employeeId === activeStatsEmployeeId)
    : attendanceRecords;

  const totalWorkingDays = new Set(statsRecords.filter(r => r.type !== 'overtime').map(r => r.date)).size;
  const clockInCount = statsRecords.filter(r => r.type === 'clock_in').length;
  const clockOutCount = statsRecords.filter(r => r.type === 'clock_out').length;
  const lateCount = statsRecords.filter(r => r.type === 'late').length;
  const totalOtHours = statsRecords
    .filter(r => r.type === 'overtime' && r.otHours)
    .reduce((sum, r) => sum + (r.otHours || 0), 0);

  const lateRate = clockInCount + lateCount > 0 
    ? Math.round((lateCount / (clockInCount + lateCount)) * 100) 
    : 0;

  // Export CSV function (with BOM to ensure Thai characters look perfect in Microsoft Excel)
  const handleExportCSV = () => {
    let csvContent = "\uFEFF"; // UTF-8 BOM
    // Header
    csvContent += "วันที่,เวลา บันทึก,รหัสพนักงาน,ชื่อ-นามสกุล,ประเภทการบันทึก,ชั่วโมง OT,บันทึกข้อความ,ผู้บันทึก\n";
    
    // Rows
    filteredRecords.forEach(rec => {
      const notes = rec.notes ? rec.notes.replace(/"/g, '""') : '';
      const ot = rec.otHours ? rec.otHours.toString() : '-';
      const typeThai = getAttendanceTypeLabel(rec.type);
      csvContent += `"${rec.date}","${rec.time}","${rec.employeeId}","${rec.employeeName}","${typeThai}","${ot}","${notes}","${rec.recordedBy}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `รายงานลงเวลาทำงาน_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Excel XML/XLS format (beautiful formatting compatible with Excel)
  const handleExportExcel = () => {
    let excelContent = "\uFEFF"; // BOM
    // Standard Tab-separated XLS content
    excelContent += "วันที่\tเวลาบันทึก\tรหัสพนักงาน\tชื่อ-นามสกุล\tประเภทบันทึกเวลา\tชั่วโมง OT\tหมายเหตุ\tผู้ลงบันทึก\n";
    
    filteredRecords.forEach(rec => {
      const notes = rec.notes || '-';
      const ot = rec.otHours ? rec.otHours.toString() : '-';
      const typeThai = getAttendanceTypeLabel(rec.type);
      excelContent += `${rec.date}\t${rec.time}\t${rec.employeeId}\t${rec.employeeName}\t${typeThai}\t${ot}\t${notes}\t${rec.recordedBy}\n`;
    });

    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `รายงานลงเวลาทำงาน_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Memoized individual-level analysis from parsed spreadsheet rows
  const importAnalysis = React.useMemo(() => {
    if (parsedImportRows.length === 0) return [];

    const groups: Record<string, {
      employeeId: string;
      employeeName: string;
      totalRecords: number;
      clockInCount: number;
      clockOutCount: number;
      lateCount: number;
      otCount: number;
      totalOtHours: number;
      dates: Set<string>;
      isValid: boolean;
      errors: string[];
    }> = {};

    parsedImportRows.forEach(row => {
      const key = row.employeeId ? row.employeeId.toUpperCase() : row.employeeName;
      if (!groups[key]) {
        groups[key] = {
          employeeId: row.employeeId,
          employeeName: row.employeeName,
          totalRecords: 0,
          clockInCount: 0,
          clockOutCount: 0,
          lateCount: 0,
          otCount: 0,
          totalOtHours: 0,
          dates: new Set(),
          isValid: true,
          errors: []
        };
      }
      
      const g = groups[key];
      g.totalRecords += 1;
      if (row.date) g.dates.add(row.date);
      if (row.type === 'clock_in') g.clockInCount += 1;
      if (row.type === 'clock_out') g.clockOutCount += 1;
      if (row.type === 'late') g.lateCount += 1;
      if (row.type === 'overtime') {
        g.otCount += 1;
        g.totalOtHours += row.otHours || 0;
      }
      
      if (!row.isValid) {
        g.isValid = false;
        if (row.errorMsg && !g.errors.includes(row.errorMsg)) {
          g.errors.push(row.errorMsg);
        }
      }
    });

    return Object.values(groups);
  }, [parsedImportRows]);

  return (
    <div className="space-y-6" id="attendance-section-main">
      
      {/* SECTION TOP HEADER & LIVE CLOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Visual Clock Panel */}
        <div className="lg:col-span-2 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[180px] border border-indigo-900/40" id="live-clock-card">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Clock className="w-48 h-48 rotate-12" />
          </div>
          <div>
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full">
              ⏱️ ระบบรายงานตัว & ลงเวลาปฏิบัติงานเรียลไทม์
            </span>
            <h2 className="text-xl font-bold mt-3 text-slate-100 font-sans">
              ระบบบันทึกเวลาทำงานพนักงาน (Time Attendance System)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              ระบบตรวจสอบเวลาการเข้าทำงาน ออกงาน เข้าสาย และบันทึกการทำงานล่วงเวลา (OT) อย่างถูกต้องตามระเบียบ
            </p>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-4 mt-4 pt-4 border-t border-indigo-900/40">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-400" />
              <span className="text-sm font-semibold text-slate-200">
                {getThaiDateString(currentTime)}
              </span>
            </div>
            <div className="text-3xl font-extrabold text-blue-400 font-mono tracking-wider drop-shadow">
              {getThaiTimeString(currentTime)}
            </div>
          </div>
        </div>

        {/* Selected Employee Profile Preview */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md flex flex-col justify-between" id="active-profile-card">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 text-lg shadow-inner">
              {activeEmployee ? activeEmployee.firstName.slice(0, 2) : 'EM'}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {isEmployee ? 'ข้อมูลโปรไฟล์ของฉัน' : 'พนักงานที่เลือก'}
              </p>
              <h3 className="text-base font-bold text-slate-800 truncate">
                {activeEmployee ? `${activeEmployee.firstName} ${activeEmployee.lastName}` : 'ไม่ระบุ'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {activeEmployee ? `${activeEmployee.position} · ${activeEmployee.department}` : 'กรุณาเลือกพนักงานเพื่อจัดการ'}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase">รหัสพนักงาน</span>
            <span className="text-xs font-mono font-extrabold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
              {activeEmployee ? activeEmployee.employeeId : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* SUB-TAB NAVIGATOR */}
      {!isEmployee && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-md gap-3" id="attendance-sub-tabs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveSubTab('record')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition duration-150 flex items-center gap-2 shrink-0 cursor-pointer ${
                activeSubTab === 'record'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100'
              }`}
            >
              <Clock className="w-4 h-4" />
              ลงบันทึกเวลาทำงานรายบุคคล
            </button>
            
            <button
              onClick={() => setActiveSubTab('import')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition duration-150 flex items-center gap-2 shrink-0 cursor-pointer ${
                activeSubTab === 'import'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100'
              }`}
            >
              <Upload className="w-4 h-4" />
              นำเข้าตารางเวลาพนักงาน (Excel / CSV)
              {parsedImportRows.length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-extrabold animate-pulse">
                  {parsedImportRows.length}
                </span>
              )}
            </button>
          </div>
          
          <div className="hidden lg:flex items-center gap-1.5 text-slate-500 text-xs font-medium pr-2">
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>อัปโหลดไฟล์ Excel เพื่อสแกนวิเคราะห์ประเมินเวลาเข้าออกงาน & การมาสายรายคน</span>
          </div>
        </div>
      )}

      {/* ATTENDANCE CONTROL / RECORDER PANEL */}
      {activeSubTab === 'record' ? (
        isEmployee ? (
          /* Employee mode: show only statistics in a beautiful layout */
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md animate-fadeIn" id="employee-attendance-stats-only">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-blue-600" />
                  สรุปสถิติการลงเวลาทำงานของฉัน (My Attendance Stats)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  รายงานผลวิเคราะห์ข้อมูลวันเข้าทำงาน การมาสาย และชั่วโมงสะสมสำหรับการคำนวณเบี้ยขยันและโอที
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-blue-50/40 rounded-2xl border border-blue-100/50 flex flex-col justify-between shadow-xs">
                <div>
                  <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">วันปฏิบัติงานจริง</span>
                  <p className="text-2xl font-extrabold text-slate-800 font-mono mt-2">{totalWorkingDays} วัน</p>
                </div>
                <p className="text-[10px] text-slate-500 mt-3">จำนวนวันที่มีการสแกนเวลาเข้างานในระบบ</p>
              </div>

              <div className="p-5 bg-rose-50/40 rounded-2xl border border-rose-100/50 flex flex-col justify-between shadow-xs">
                <div>
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">จำนวนครั้งที่สาย</span>
                  <p className={`text-2xl font-extrabold font-mono mt-2 ${lateCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {lateCount} ครั้ง
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 mt-3">เข้างานหลังเวลาเริ่มปฏิบัติงานมาตรฐาน ({settings.workHoursStart} น.)</p>
              </div>

              <div className="p-5 bg-purple-50/40 rounded-2xl border border-purple-100/50 flex flex-col justify-between shadow-xs">
                <div>
                  <span className="text-xs font-bold text-purple-800 uppercase tracking-wide">ชั่วโมง OT สะสม</span>
                  <p className="text-2xl font-extrabold text-purple-600 font-mono mt-2">{totalOtHours} ชม.</p>
                </div>
                <p className="text-[10px] text-slate-500 mt-3">จำนวนชั่วโมงทำงานล่วงเวลาที่ได้รับการบันทึกและตรวจสอบ</p>
              </div>

              <div className="p-5 bg-amber-50/40 rounded-2xl border border-amber-100/50 flex flex-col justify-between shadow-xs">
                <div>
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">มาสายคิดเป็น (%)</span>
                  <p className="text-2xl font-extrabold text-amber-600 font-mono mt-2">{lateRate} %</p>
                </div>
                <p className="text-[10px] text-slate-500 mt-3">สัดส่วนการลงเวลาสายเมื่อเทียบกับวันปฏิบัติงานทั้งหมด</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-slate-50 border border-slate-150 rounded-xl">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                💡 คำชี้แจงเกี่ยวกับการลงเวลาทำงาน
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                สถิตินี้จะได้รับการคำนวณและดึงข้อมูลจากการเข้างานของท่านแบบเรียลไทม์ เวลาเริ่มปฏิบัติงานตามระเบียบคือ <strong>{settings.workHoursStart} น.</strong> และเวลาเลิกงานคือ <strong>{settings.workHoursEnd} น.</strong> หากพบข้อมูลไม่ถูกต้องกรุณาติดต่อฝ่ายบุคคล (HR) เพื่อทำการตรวจสอบและแก้ไขข้อมูลให้ถูกต้อง
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn" id="attendance-interaction-panels">
            
            {/* Record Panel Form */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-lg flex flex-col justify-between" id="attendance-record-form">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-blue-600" />
                    ลงบันทึกเวลาทำงานรายบุคคล
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    * เลือกชื่อพนักงานแล้วกดประเภทการบันทึก
                  </span>
                </div>

                {notification && (
                  <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                    notification.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`} id="record-action-alert">
                    {notification.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold">{notification.type === 'success' ? 'บันทึกสำเร็จ' : 'เกิดข้อผิดพลาดในการตรวจสอบ'}</p>
                      <p className="mt-0.5 font-medium leading-relaxed">{notification.message}</p>
                    </div>
                  </div>
                )}

                {/* Employee Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    ระบุหรือเลือกชื่อพนักงานเพื่อลงบันทึกเวลา
                  </label>
                  {isEmployee ? (
                    // Employee mode: Disabled dropdown pointing to themselves
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-700 font-semibold text-sm flex justify-between items-center">
                      <span>{currentUser?.name} ({currentUser?.employeeId})</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">บัญชีผู้ใช้จริงของคุณ</span>
                    </div>
                  ) : (
                    // Admin mode: Beautiful dropdown to select any employee
                    <div className="relative">
                      <select
                        value={selectedEmployeeId}
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 font-semibold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm cursor-pointer appearance-none"
                        id="employee-select-attendance-dropdown"
                      >
                        {employees.map(emp => (
                          <option key={emp.employeeId} value={emp.employeeId} className="font-semibold text-slate-800">
                            [{emp.employeeId}] - {emp.firstName} {emp.lastName} ({emp.department})
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 text-xs">
                        ▼
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    หมายเหตุเพิ่มเติม / ข้อความชี้แจง (ระบุหรือไม่ระบุก็ได้)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น เดินทางล่าช้าเนื่องจากฝนตกหนัก, ออกปฏิบัติงานนอกสถานที่, ทำงานด่วนช่วงเย็น"
                    value={attendanceNotes}
                    onChange={(e) => setAttendanceNotes(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                    id="attendance-note-input"
                  />
                </div>

                {/* Overtime Hours Configurator (only visible for Overtime logged in) */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-purple-800 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-purple-200" />
                      กำหนดชั่วโมงล่วงเวลาพิเศษ (OT)
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      ป้อนจำนวนชั่วโมงก่อนกดปุ่ม "บันทึกเวลา OT" ด้านขวา
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setOtHours(prev => Math.max(0.5, prev - 0.5))}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold flex items-center justify-center transition cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="12"
                      value={otHours}
                      onChange={(e) => setOtHours(Math.max(0.5, parseFloat(e.target.value) || 1))}
                      className="w-14 text-center bg-white border border-slate-200 rounded-lg py-1 text-sm font-bold text-slate-800"
                    />
                    <span className="text-xs font-bold text-slate-500">ชม.</span>
                    <button
                      type="button"
                      onClick={() => setOtHours(prev => Math.min(12, prev + 0.5))}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold flex items-center justify-center transition cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100" id="attendance-buttons-grid">
                <button
                  onClick={() => handleRecordAttendance('clock_in')}
                  className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition duration-150 shadow-md shadow-emerald-50 cursor-pointer text-center group"
                  id="btn-clock-in"
                >
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:scale-105 transition">
                    <Check className="w-5 h-5 font-bold" />
                  </div>
                  <span className="text-xs font-bold">เวลาเข้างาน</span>
                  <span className="text-[10px] text-emerald-150 font-normal">ลงบันทึกเข้างานปกติ</span>
                </button>

                <button
                  onClick={() => handleRecordAttendance('clock_out')}
                  className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition duration-150 shadow-md shadow-blue-50 cursor-pointer text-center group"
                  id="btn-clock-out"
                >
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:scale-105 transition">
                    <Check className="w-5 h-5 font-bold" />
                  </div>
                  <span className="text-xs font-bold">เวลาออกงาน</span>
                  <span className="text-[10px] text-blue-150 font-normal">ลงบันทึกเวลาเลิกงาน</span>
                </button>

                <button
                  onClick={() => handleRecordAttendance('late')}
                  className="bg-amber-500 hover:bg-amber-450 active:bg-amber-600 text-white p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition duration-150 shadow-md shadow-amber-50 cursor-pointer text-center group"
                  id="btn-clock-late"
                >
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:scale-105 transition">
                    <Hourglass className="w-4 h-4 font-bold" />
                  </div>
                  <span className="text-xs font-bold">บันทึกเข้าสาย</span>
                  <span className="text-[10px] text-amber-105 font-normal">เข้าปฏิบัติงานล่าช้า</span>
                </button>

                <button
                  onClick={() => handleRecordAttendance('overtime')}
                  className="bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition duration-150 shadow-md shadow-purple-50 cursor-pointer text-center group"
                  id="btn-clock-ot"
                >
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:scale-105 transition">
                    <Star className="w-4 h-4 font-bold" />
                  </div>
                  <span className="text-xs font-bold">บันทึกเวลา OT</span>
                  <span className="text-[10px] text-purple-150 font-normal">ทำงานล่วงเวลาสะสม</span>
                </button>
              </div>

            </div>

            {/* Attendance Summary Panel for selected user */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md flex flex-col justify-between" id="attendance-summary-stats-side">
              <div>
                <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  {activeStatsEmployeeId ? 'สรุปประวัติของพนักงานคนนี้' : 'ภาพรวมประวัติลงเวลาทั้งหมด'}
                </h4>
                <div className="mt-3 bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">พนักงานที่แสดงผล:</span>
                  <span className="text-xs font-extrabold text-blue-600 truncate max-w-[150px]" title={activeStatsEmployeeId ? (employees.find(e => e.employeeId === activeStatsEmployeeId)?.firstName || 'พนักงาน') : 'ทั้งหมด'}>
                    {activeStatsEmployeeId ? (employees.find(e => e.employeeId === activeStatsEmployeeId)?.firstName || 'พนักงาน') : 'พนักงานทุกคน'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">วันปฏิบัติงานจริง</span>
                    <p className="text-xl font-extrabold text-slate-800 font-mono mt-0.5">{totalWorkingDays} วัน</p>
                  </div>
                  <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">จำนวนครั้งที่สาย</span>
                    <p className={`text-xl font-extrabold font-mono mt-0.5 ${lateCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {lateCount} ครั้ง
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">ชั่วโมง OT สะสม</span>
                    <p className="text-xl font-extrabold text-purple-600 font-mono mt-0.5">{totalOtHours} ชม.</p>
                  </div>
                  <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">มาสายคิดเป็น (%)</span>
                    <p className="text-xl font-extrabold text-amber-600 font-mono mt-0.5">{lateRate} %</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                <p className="text-[10px] text-slate-400 leading-normal">
                  💡 **คำแนะนำ:** การมาตรงเวลาคือกุญแจสำคัญ อิงเกณฑ์ตั้งค่าบริษัท เวลาทำงานเริ่มต้นคือ **{settings.workHoursStart} น.** หากบันทึกเวลาหลังเวลานี้ แนะนำให้กดลงบันทึกเป็นประเภท **"เข้าสาย"** เพื่อช่วยให้ฝ่าย HR สรุปข้อมูลเงินเดือนได้ถูกต้อง
                </p>
              </div>
            </div>

          </div>
        )
      ) : (
        /* FILE EXCEL / CSV IMPORT WORKSPACE */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-lg animate-fadeIn space-y-6" id="excel-import-workspace">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                <Upload className="w-5 h-5 text-indigo-600" />
                เครื่องมือนำเข้าข้อมูลบันทึกเวลาทำงานผ่านไฟล์ Excel / CSV
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                ระบบจะวิเคราะห์ประเมิน "การมาสาย" และจับคู่บัญชีพนักงานให้โดยอัตโนมัติอ้างอิงจากรหัสพนักงานในไฟล์
              </p>
            </div>
            
            <button
              onClick={handleDownloadTemplate}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs py-2 px-4 rounded-xl transition duration-150 flex items-center gap-2 self-start border border-indigo-100 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              ดาวน์โหลดเทมเพลต Excel (.xlsx)
            </button>
          </div>

          {/* DRAG AND DROP UPLOAD ZONE */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[180px] ${
              isDragging 
                ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]' 
                : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/40'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && e.target.files[0] && handleFileUpload(e.target.files[0])}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            
            <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-3 shadow-inner">
              <Upload className="w-7 h-7" />
            </div>
            
            <p className="text-sm font-bold text-slate-800">
              ลากและวางไฟล์ลงที่นี่ หรือคลิกเพื่อเลือกไฟล์ในเครื่อง
            </p>
            <p className="text-xs text-slate-400 mt-1.5 max-w-md">
              รองรับนามสกุลไฟล์ <strong className="text-slate-600">.xlsx, .xls, .csv</strong> (กรุณาใช้รหัสพนักงาน เช่น EMP-001 ในการอ้างอิงข้อมูล)
            </p>
            
            {importFile && (
              <div className="mt-4 bg-emerald-50 text-emerald-800 border border-emerald-150 px-3.5 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                ไฟล์ปัจจุบัน: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          {/* IMPORT NOTIFICATION BAR */}
          {importNotification && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
              importNotification.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {importNotification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              )}
              <div>
                <p className="font-bold">{importNotification.type === 'success' ? 'ประมวลผลสำเร็จ' : 'พบข้อขัดข้อง'}</p>
                <p className="mt-0.5 leading-relaxed font-medium">{importNotification.message}</p>
              </div>
            </div>
          )}

          {/* PARSED DATA PREVIEW TABLE */}
          {parsedImportRows.length > 0 && (
            <div className="space-y-5 animate-fadeIn pt-2 border-t border-slate-100">
              
              {/* INDIVIDUAL EMPLOYEE SCHEDULE ANALYSIS PANEL */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-indigo-500 text-white"><User className="w-4 h-4" /></span>
                      สรุปรายงานตารางเวลาแยกรายชื่อพนักงาน (Employee Schedule Analysis)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      ระบบคัดแยกสถิติและสรุปสถิติตามรายชื่อพนักงานที่พบในไฟล์อัตโนมัติ <strong className="text-indigo-600">คลิกที่การ์ดเพื่อกรองข้อมูลในตาราง</strong>
                    </p>
                  </div>
                  {importEmployeeFilter !== 'All' && (
                    <button
                      onClick={() => setImportEmployeeFilter('All')}
                      className="bg-white hover:bg-slate-100 text-slate-700 font-extrabold text-xs py-1.5 px-3.5 rounded-lg border border-slate-200 transition duration-150 flex items-center gap-1.5 shadow-sm cursor-pointer self-start sm:self-auto"
                    >
                      <RefreshCw className="w-3 h-3 text-indigo-500" />
                      แสดงรายชื่อทุกคน ({parsedImportRows.length} แถว)
                    </button>
                  )}
                </div>

                {/* Grid of employee cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto pr-1">
                  {importAnalysis.map((item) => {
                    const isSelected = importEmployeeFilter.toUpperCase() === (item.employeeId || '').toUpperCase() || importEmployeeFilter === item.employeeName;
                    
                    return (
                      <div
                        key={item.employeeId || item.employeeName}
                        onClick={() => {
                          const filterVal = item.employeeId || item.employeeName;
                          setImportEmployeeFilter(prev => prev === filterVal ? 'All' : filterVal);
                        }}
                        className={`p-4 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/10'
                            : item.isValid 
                              ? 'bg-white hover:bg-slate-100/50 border-slate-200' 
                              : 'bg-rose-50/20 hover:bg-rose-50/30 border-rose-200/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 truncate">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              item.isValid ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {item.employeeName ? item.employeeName.substring(0, 2) : '??'}
                            </div>
                            <div className="truncate">
                              <h5 className="font-bold text-slate-800 text-xs truncate" title={item.employeeName}>
                                {item.employeeName}
                              </h5>
                              <p className="text-[10px] text-slate-400 font-mono font-medium truncate">
                                {item.employeeId || 'ไม่ระบุรหัส'}
                              </p>
                            </div>
                          </div>
                          
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                            item.isValid 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-rose-50 text-rose-700 border border-rose-150'
                          }`}>
                            {item.isValid ? 'ข้อมูลปกติ' : 'รหัสผิดพลาด'}
                          </span>
                        </div>

                        {/* Analysis Metrics Mini-Grid */}
                        <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-slate-100">
                          <div className="text-center">
                            <p className="text-[9px] text-slate-400 font-bold uppercase">ทำงาน</p>
                            <p className="text-xs font-extrabold text-slate-800 font-mono mt-0.5">
                              {item.dates.size} วัน
                            </p>
                          </div>
                          <div className="text-center border-x border-slate-100">
                            <p className="text-[9px] text-slate-400 font-bold uppercase">เข้าสาย</p>
                            <p className={`text-xs font-extrabold font-mono mt-0.5 ${item.lateCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                              {item.lateCount} ครั้ง
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] text-slate-400 font-bold uppercase">ชั่วโมง OT</p>
                            <p className="text-xs font-extrabold text-purple-600 font-mono mt-0.5">
                              {item.totalOtHours} ชม.
                            </p>
                          </div>
                        </div>

                        {/* Error warning list if invalid */}
                        {!item.isValid && item.errors.length > 0 && (
                          <div className="mt-2 text-[10px] text-rose-600 font-medium flex items-center gap-1 bg-rose-50/50 p-1.5 rounded-lg border border-rose-100/30">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span className="truncate">{item.errors[0]}</span>
                          </div>
                        )}
                        
                        {/* Selected overlay border helper */}
                        {isSelected && (
                          <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-indigo-700 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                            กำลังกรองข้อมูลของคนนี้
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-500" />
                    ตารางรายละเอียดบันทึกรายคน {importEmployeeFilter !== 'All' ? `(แสดงเฉพาะพนักงาน: ${importEmployeeFilter})` : `(${parsedImportRows.length} รายการ)`}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    คุณสามารถแก้ไขประเภทลงเวลา (เข้างาน / สาย / OT) หรือเขียนโน้ตชี้แจงก่อนกดยืนยันบันทึกได้รายบรรทัด
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setParsedImportRows([]);
                      setImportFile(null);
                      setImportEmployeeFilter('All');
                      setImportNotification(null);
                    }}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold text-xs py-2 px-3.5 rounded-xl transition cursor-pointer"
                  >
                    ล้างข้อมูลที่เลือก
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold text-xs py-2.5 px-5 rounded-xl transition duration-150 flex items-center gap-1.5 shadow-md shadow-indigo-100 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    ยืนยันนำเข้ารายการที่ถูกต้อง ({parsedImportRows.filter(r => r.isValid).length} แถว)
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                      <th className="py-3 px-4 w-[100px]">ตรวจสอบ</th>
                      <th className="py-3 px-3">รหัสพนักงาน</th>
                      <th className="py-3 px-3">พนักงาน</th>
                      <th className="py-3 px-3">วันที่บันทึก</th>
                      <th className="py-3 px-3">เวลา</th>
                      <th className="py-3 px-3 w-[160px]">ประเภทเวลา (แก้ไขได้)</th>
                      <th className="py-3 px-3 w-[120px]">ชั่วโมง OT</th>
                      <th className="py-3 px-3">หมายเหตุ / บันทึกชี้แจง</th>
                      <th className="py-3 px-4 text-center">ลบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {parsedImportRows.filter(row => {
                      if (importEmployeeFilter === 'All') return true;
                      return (row.employeeId || '').toUpperCase() === importEmployeeFilter.toUpperCase() || row.employeeName === importEmployeeFilter;
                    }).map((row) => (
                      <tr 
                        key={row.tempId} 
                        className={`hover:bg-slate-50/60 transition ${
                          !row.isValid ? 'bg-rose-50/40 hover:bg-rose-50/60' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-bold">
                              <Check className="w-3 h-3" /> ผ่านเกณฑ์
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full font-bold" title={row.errorMsg}>
                              <AlertCircle className="w-3 h-3" /> ล้มเหลว
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={row.employeeId}
                            onChange={(e) => {
                              const val = e.target.value.trim();
                              const matchedEmp = employees.find(emp => emp.employeeId.toUpperCase() === val.toUpperCase());
                              handleUpdateParsedRow(row.tempId, { 
                                employeeId: val,
                                employeeName: matchedEmp ? `${matchedEmp.firstName} ${matchedEmp.lastName}` : 'ไม่พบบัญชีพนักงานในฐานข้อมูล',
                                isValid: !!matchedEmp,
                                errorMsg: matchedEmp ? undefined : 'ไม่พบรหัสพนักงานในระบบ'
                              });
                            }}
                            className="bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 focus:outline-none w-20 font-mono font-semibold py-0.5 text-slate-800"
                            placeholder="EMP-XXX"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {row.employeeName}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <input
                            type="date"
                            value={row.date}
                            onChange={(e) => handleUpdateParsedRow(row.tempId, { date: e.target.value })}
                            className="bg-transparent border-none focus:outline-none py-0.5 font-semibold text-slate-700 font-mono text-[11px]"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <input
                            type="text"
                            value={row.time}
                            onChange={(e) => handleUpdateParsedRow(row.tempId, { time: e.target.value.trim() })}
                            className="bg-transparent border-none focus:outline-none py-0.5 font-bold text-slate-800 font-mono"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={row.type}
                            onChange={(e) => handleUpdateParsedRow(row.tempId, { type: e.target.value as AttendanceType })}
                            className="bg-white border border-slate-200 rounded-lg py-1 px-2 font-bold text-[11px] text-slate-700 cursor-pointer shadow-sm focus:outline-none"
                          >
                            <option value="clock_in">เข้างานปกติ</option>
                            <option value="clock_out">ออกงานปกติ</option>
                            <option value="late">เข้าสาย</option>
                            <option value="overtime">ทำงานล่วงเวลา (OT)</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          {row.type === 'overtime' ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0.5"
                                max="12"
                                step="0.5"
                                value={row.otHours || 1}
                                onChange={(e) => handleUpdateParsedRow(row.tempId, { otHours: parseFloat(e.target.value) || 1 })}
                                className="w-12 bg-white border border-slate-200 rounded px-1.5 py-0.5 font-bold font-mono text-center text-slate-700"
                              />
                              <span className="text-[10px] text-slate-400">ชม.</span>
                            </div>
                          ) : (
                            <span className="text-slate-350">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={row.notes || ''}
                            onChange={(e) => handleUpdateParsedRow(row.tempId, { notes: e.target.value })}
                            className="bg-transparent hover:bg-slate-50 focus:bg-white border-b border-dashed border-slate-200 focus:border-indigo-400 focus:outline-none w-full py-0.5 text-xs text-slate-600 placeholder-slate-350"
                            placeholder="โน้ตเพิ่มเติม..."
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => handleRemoveParsedRow(row.tempId)}
                            className="text-slate-400 hover:text-rose-500 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* FILTER & HISTORY LOG TABLE CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden" id="attendance-history-table-container">
        
        {/* Table Filters Toolbar */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                ตารางบันทึกเวลางานทั้งหมดในระบบ ({filteredRecords.length} รายการ)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                กรองข้อมูลตามพนักงาน วันที่ หรือประเภทลงเวลา แล้วสั่งส่งออกเป็นไฟล์รายงานได้ทันที
              </p>
            </div>
            
            {/* Export Actions Trigger */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-2 px-3 border border-slate-200 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                title="ส่งออกรายงานเป็นไฟล์ CSV"
              >
                <Download className="w-3.5 h-3.5" />
                ส่งออก CSV
              </button>
              <button
                onClick={handleExportExcel}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-emerald-50"
                title="ส่งออกรายงานเป็นไฟล์ Excel"
              >
                <Download className="w-3.5 h-3.5" />
                ส่งออก Excel
              </button>
            </div>
          </div>

          {/* Form Filter Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            
            {/* Name/ID search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="ค้นหาชื่อหรือรหัสพนักงาน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-700 placeholder-slate-450 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Filter Employee (Only available to Admins) */}
            <div>
              {isEmployee ? (
                <div className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 truncate font-semibold">
                  พนักงาน: {currentUser?.name}
                </div>
              ) : (
                <select
                  value={selectedEmployeeFilter}
                  onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 font-bold focus:outline-none"
                >
                  <option value="All">แสดงพนักงานทุกคน</option>
                  {employees.map(emp => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Attendance Type Filter */}
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 font-bold focus:outline-none"
            >
              <option value="All">ประเภทลงเวลาทั้งหมด</option>
              <option value="clock_in">เฉพาะเข้างานปกติ</option>
              <option value="clock_out">เฉพาะออกงานปกติ</option>
              <option value="late">เฉพาะผู้ที่มาสาย</option>
              <option value="overtime">เฉพาะชั่วโมงล่วงเวลา (OT)</option>
            </select>

            {/* Date filter */}
            <div className="relative">
              <input
                type="date"
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600 font-mono font-semibold focus:outline-none"
              />
              {selectedDateFilter && (
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-rose-500 hover:text-rose-700 text-xs font-bold"
                >
                  ล้างวันที่
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Interactive Log Table */}
        <div className="overflow-x-auto">
          {filteredRecords.length === 0 ? (
            <div className="py-12 text-center">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-slate-500 font-bold text-sm mt-3">ไม่พบรายการบันทึกเวลาตามตัวกรองปัจจุบัน</p>
              <p className="text-slate-400 text-xs mt-1">ลองเปลี่ยนเงื่อนไขค้นหา หรือลงเวลาทำงานใหม่เพื่อแสดงในตาราง</p>
              
              {(selectedDateFilter || selectedTypeFilter !== 'All' || selectedEmployeeFilter !== 'All' || searchTerm) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedTypeFilter('All');
                    setSelectedDateFilter('');
                    setSelectedEmployeeFilter('All');
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs text-blue-600 font-bold hover:underline"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> ล้างตัวกรองทั้งหมด
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse" id="attendance-logs-table">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/40">
                  <th className="py-3 px-5">วันที่บันทึก</th>
                  <th className="py-3 px-4">เวลาลงชื่อ</th>
                  <th className="py-3 px-4">รหัสพนักงาน</th>
                  <th className="py-3 px-4">พนักงาน</th>
                  <th className="py-3 px-4">ประเภทลงบันทึก</th>
                  <th className="py-3 px-4 text-center">ชั่วโมง OT</th>
                  <th className="py-3 px-4">หมายเหตุเพิ่มเติม</th>
                  <th className="py-3 px-4">บันทึกโดย</th>
                  {!isEmployee && onDeleteAttendance && <th className="py-3 px-5 text-center">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredRecords.map((rec) => {
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-5 font-mono font-semibold text-slate-600">
                        {rec.date}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {rec.time}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-500">
                        {rec.employeeId}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {rec.employeeName}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getAttendanceTypeBadgeStyle(rec.type)}`}>
                          {getAttendanceTypeLabel(rec.type)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold font-mono text-purple-700">
                        {rec.otHours ? `${rec.otHours} ชม.` : '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate" title={rec.notes}>
                        {rec.notes || '-'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400 truncate max-w-[120px]" title={rec.recordedBy}>
                        {rec.recordedBy.split('@')[0]}
                      </td>
                      {!isEmployee && onDeleteAttendance && (
                        <td className="py-3 px-5 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm(`คุณต้องการลบรายการบันทึกเวลาของ ${rec.employeeName} ในวันที่ ${rec.date} นี้ใช่หรือไม่?`)) {
                                onDeleteAttendance && onDeleteAttendance(rec.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="ลบข้อมูลบันทึกที่คลาดเคลื่อน"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

    </div>
  );
}
