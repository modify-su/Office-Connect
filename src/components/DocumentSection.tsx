import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FolderClosed, 
  FileText, 
  Upload, 
  Download, 
  Plus, 
  Trash2, 
  Search, 
  PenTool, 
  Check, 
  X, 
  Printer, 
  Clock, 
  Sparkles, 
  Eye, 
  BookOpen,
  Filter,
  CheckCircle,
  FileDown,
  FileSpreadsheet,
  AlertCircle,
  CornerDownRight,
  User,
  ShieldAlert,
  Send
} from 'lucide-react';
import { Employee, UserAccount } from '../types';

export interface OfficeDocument {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  fileSize: string;
  fileType: 'PDF' | 'DOCX' | 'XLSX' | 'PNG' | 'JPG';
  uploadedBy: string;
  uploadedAt: string;
  downloadUrl: string; // Base64 data URL or fake download trigger
  isTemplate: boolean;
  downloads: number;
}

export interface WrittenRequest {
  id: string;
  formType: 'general' | 'supply' | 'shift';
  subject: string;
  attentionTo: string;
  writerName: string;
  writerEmpId: string;
  department: string;
  details: string;
  urgency: 'normal' | 'urgent' | 'immediate';
  signatureName: string;
  createdAt: string;
  status: 'pending' | 'reviewed';
}

interface DocumentSectionProps {
  currentUser: UserAccount | null;
  employees: Employee[];
}

const INITIAL_DOCUMENTS: OfficeDocument[] = [];

export default function DocumentSection({ currentUser, employees }: DocumentSectionProps) {
  const isAdmin = currentUser?.role === 'admin';
  const isEmployee = currentUser?.role === 'employee';

  // State
  const [subTab, setSubTab] = useState<'files' | 'writer' | 'writtenList'>('files');
  const [documents, setDocuments] = useState<OfficeDocument[]>([]);
  const [writtenRequests, setWrittenRequests] = useState<WrittenRequest[]>([]);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // New File Upload Modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('ทรัพยากรบุคคล (HR)');
  const [newDocDesc, setNewDocDesc] = useState('');
  const [uploadedBase64, setUploadedBase64] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState('');

  // Interactive Form Writer State
  const [writerFormType, setWriterFormType] = useState<'general' | 'supply' | 'shift'>('general');
  const [subject, setSubject] = useState('');
  const [attentionTo, setAttentionTo] = useState('');
  const [writerName, setWriterName] = useState('');
  const [writerEmpId, setWriterEmpId] = useState('');
  const [department, setDepartment] = useState('');
  const [details, setDetails] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'urgent' | 'immediate'>('normal');
  const [signatureName, setSignatureName] = useState('');
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const [viewingWrittenRequest, setViewingWrittenRequest] = useState<WrittenRequest | null>(null);

  // Categories list
  const categories = ['All', 'ทรัพยากรบุคคล (HR)', 'พัสดุและคลังสินค้า', 'บัญชีและการเงิน', 'คำร้องทั่วไป'];

  // Initialize data from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedDocs = localStorage.getItem('office_documents');
      if (storedDocs) {
        try {
          const parsed = JSON.parse(storedDocs);
          // Purge mock template items to completely clear the document list
          const filtered = parsed.filter((doc: any) => doc && !doc.id.startsWith('doc-template-'));
          setDocuments(filtered);
          localStorage.setItem('office_documents', JSON.stringify(filtered));
        } catch (e) {
          setDocuments([]);
          localStorage.setItem('office_documents', JSON.stringify([]));
        }
      } else {
        setDocuments([]);
        localStorage.setItem('office_documents', JSON.stringify([]));
      }

      const storedWritten = localStorage.getItem('office_written_requests');
      if (storedWritten) {
        try {
          setWrittenRequests(JSON.parse(storedWritten));
        } catch (e) {
          setWrittenRequests([]);
        }
      }
    }
  }, []);

  // Autofill Writer details based on current user
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'employee' && currentUser.employeeId) {
        const emp = employees.find(e => e.employeeId === currentUser.employeeId);
        if (emp) {
          setWriterName(`${emp.firstName} ${emp.lastName}`);
          setWriterEmpId(emp.employeeId);
          setDepartment(emp.department);
          setSignatureName(`${emp.firstName} ${emp.lastName}`);
        } else {
          setWriterName(currentUser.name || '');
          setWriterEmpId(currentUser.employeeId);
          setSignatureName(currentUser.name || '');
        }
      } else {
        setWriterName('ผู้ดูแลระบบ (Admin)');
        setWriterEmpId('ADMIN-01');
        setDepartment('ส่วนกลางบริหารงาน');
        setSignatureName('ผู้ดูแลระบบ (Admin)');
      }
    }
  }, [currentUser, employees, subTab]);

  // Helper to clear form
  const clearForm = () => {
    setSubject('');
    setAttentionTo('');
    setDetails('');
  };

  // Helper to load example templates
  const loadExampleTemplate = (type: 'general' | 'supply' | 'shift' = writerFormType) => {
    if (type === 'general') {
      setSubject('ขอเสนอพิจารณาปรับปรุงสิ่งอำนวยความสะดวกในส่วนกลาง');
      setAttentionTo('ผู้จัดการฝ่ายทั่วไป / ฝ่ายบุคคล');
      setDetails('เนื่องด้วยพนักงานแผนกของข้าพเจ้า มีความประสงค์อยากจะขออนุญาตปรับปรุงเก้าอี้และระบบแสงสว่างในพื้นที่นั่งทำงานร่วมกัน (Co-working space) เพื่อลดความเมื่อยล้าและเพิ่มประสิทธิภาพในการทำงาน จึงขอความอนุเคราะห์พิจารณาจัดซื้อหรือทดแทนมา ณ ที่นี้');
    } else if (type === 'supply') {
      setSubject('ขอเบิกอุปกรณ์พัสดุพิเศษนอกคลังประจำไตรมาส');
      setAttentionTo('หัวหน้าฝ่ายบริหารจัดซื้อและพัสดุ');
      setDetails('เนื่องจากแผนกไอทีมีการขยายส่วนงานพัฒนาและเพิ่มจำนวนวิศวกรซอฟต์แวร์ใหม่ ทำให้เกิดความจำเป็นต้องเบิกจอภาพเสริม (Monitor 27") จำนวน 3 ชุด และพอร์ตเชื่อมต่อ Type-C Hub จำนวน 3 ชิ้น ซึ่งวัสดุดังกล่าวไม่พบในสต็อกอุปกรณ์สำนักงานทั่วไป จึงขอเขียนคำร้องยื่นความจำนงเพื่อสั่งซื้อพิเศษ');
    } else if (type === 'shift') {
      setSubject('ขอเปลี่ยนวันปฏิบัติงานและสลับคิวเวรรับหน้าที่ส่วนกลาง');
      setAttentionTo('ผู้จัดคิวปฏิบัติหน้าที่และหัวหน้าแผนก');
      setDetails('ข้าพเจ้ามีความประสงค์อยากจะขอเปลี่ยนวันปฏิบัติหน้าที่เวรประสานงาน จากเดิม วันพฤหัสบดีที่ 25 มิถุนายน 2569 สลับเป็น วันศุกร์ที่ 26 มิถุนายน 2569 แทน โดยได้ตกลงและประสานสลับเวรการทำงานกับ คุณวิภา รักดี (แผนกบุคคล) เป็นที่เรียบร้อยและลงตัวแล้ว');
    }
  };

  // Clear fields when form type changes to keep the sheet entirely clear and clean for writing
  useEffect(() => {
    clearForm();
  }, [writerFormType]);

  // Handle document upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 2MB');
      return;
    }

    setUploadedFileName(file.name);
    // Calc size
    const kb = Math.round(file.size / 1024);
    setUploadedFileSize(kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedBase64(event.target?.result as string || '');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName) {
      alert('กรุณากรอกชื่อแผ่นฟอร์มเอกสาร');
      return;
    }

    const fileTypeMap: Record<string, 'PDF' | 'DOCX' | 'XLSX' | 'PNG' | 'JPG'> = {
      pdf: 'PDF',
      doc: 'DOCX',
      docx: 'DOCX',
      xls: 'XLSX',
      xlsx: 'XLSX',
      png: 'PNG',
      jpg: 'JPG',
      jpeg: 'JPG'
    };

    const ext = uploadedFileName.split('.').pop()?.toLowerCase() || 'pdf';
    const finalType = fileTypeMap[ext] || 'PDF';

    const maxCode = documents.reduce((max, doc) => {
      const num = parseInt(doc.code.replace(/[^\d]/g, ''));
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    const newCode = `DOC-NEW-${String(maxCode + 1).padStart(3, '0')}`;

    const newDoc: OfficeDocument = {
      id: `doc-${Date.now()}`,
      code: newCode,
      name: newDocName,
      category: newDocCategory,
      description: newDocDesc || 'ไม่ได้ระบุคำอธิบายเพิ่มเติม',
      fileSize: uploadedFileSize || '120 KB',
      fileType: finalType,
      uploadedBy: currentUser?.name || 'Admin',
      uploadedAt: new Date().toISOString().split('T')[0],
      downloadUrl: uploadedBase64 || 'data:text/plain;base64,U2FtcGxl',
      isTemplate: false,
      downloads: 0
    };

    const updated = [newDoc, ...documents];
    setDocuments(updated);
    localStorage.setItem('office_documents', JSON.stringify(updated));

    // Reset Form
    setNewDocName('');
    setNewDocDesc('');
    setUploadedBase64('');
    setUploadedFileName('');
    setUploadedFileSize('');
    setIsUploadOpen(false);
  };

  const handleDeleteDoc = (id: string) => {
    if (confirm('คุณต้องการลบแฟ้มฟอร์มเอกสารนี้ใช่หรือไม่?')) {
      const updated = documents.filter(d => d.id !== id);
      setDocuments(updated);
      localStorage.setItem('office_documents', JSON.stringify(updated));
    }
  };

  // Trigger browser download
  const handleDownloadFile = (doc: OfficeDocument) => {
    // Increase download counter
    const updated = documents.map(d => d.id === doc.id ? { ...d, downloads: d.downloads + 1 } : d);
    setDocuments(updated);
    localStorage.setItem('office_documents', JSON.stringify(updated));

    // Create anchor trigger
    const link = document.createElement('a');
    link.href = doc.downloadUrl;
    link.download = `${doc.name}.${doc.fileType.toLowerCase()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save Interactive online request
  const handleFormWriterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !details || !signatureName) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วนก่อนบันทึกคำร้อง');
      return;
    }

    const newRequest: WrittenRequest = {
      id: `written-${Date.now()}`,
      formType: writerFormType,
      subject,
      attentionTo,
      writerName,
      writerEmpId,
      department,
      details,
      urgency,
      signatureName,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'pending'
    };

    const updated = [newRequest, ...writtenRequests];
    setWrittenRequests(updated);
    localStorage.setItem('office_written_requests', JSON.stringify(updated));

    setIsSubmitSuccess(true);
    setTimeout(() => {
      setIsSubmitSuccess(false);
      setSubTab('writtenList'); // Redirect to log history
    }, 2000);
  };

  const handleDeleteWrittenRequest = (id: string) => {
    if (confirm('คุณต้องการลบประวัติการยื่นคำร้องใบนี้ออกถาวรหรือไม่?')) {
      const updated = writtenRequests.filter(r => r.id !== id);
      setWrittenRequests(updated);
      localStorage.setItem('office_written_requests', JSON.stringify(updated));
    }
  };

  const handleMarkAsReviewed = (id: string) => {
    const updated = writtenRequests.map(r => r.id === id ? { ...r, status: 'reviewed' as const } : r);
    setWrittenRequests(updated);
    localStorage.setItem('office_written_requests', JSON.stringify(updated));
  };

  // Filter Templates List
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Print single request helper
  const handlePrintRequest = (req: WrittenRequest) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('กรุณาเปิดรับการทำงานป๊อปอัปเพื่อแสดงผลสั่งพิมพ์');
      return;
    }

    const urgencyLabel = req.urgency === 'immediate' ? 'ด่วนที่สุด' : req.urgency === 'urgent' ? 'ด่วน' : 'ปกติ';

    printWindow.document.write(`
      <html>
        <head>
          <title>บันทึกข้อความ - ${req.subject}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&display=swap');
            body {
              font-family: 'Sarabun', sans-serif;
              padding: 40px;
              color: #1a1a1a;
              line-height: 1.8;
              font-size: 16px;
              background-color: #ffffff;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              border: 1px solid #ddd;
              padding: 50px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            }
            .header-box {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
              margin-bottom: 30px;
            }
            .emblem {
              font-size: 28px;
              font-weight: 800;
              text-align: center;
              letter-spacing: 0.1em;
            }
            .logo-text {
              font-size: 14px;
              color: #555;
              text-align: right;
            }
            .main-title {
              font-size: 24px;
              font-weight: 700;
              text-align: center;
              margin-bottom: 30px;
              text-decoration: underline;
            }
            .meta-grid {
              margin-bottom: 30px;
            }
            .meta-row {
              display: flex;
              margin-bottom: 12px;
            }
            .meta-label {
              font-weight: 700;
              min-width: 120px;
            }
            .meta-value {
              flex-1;
              border-bottom: 1px dotted #888;
              padding-left: 10px;
            }
            .body-content {
              text-indent: 50px;
              text-align: justify;
              margin-bottom: 50px;
              white-space: pre-wrap;
              min-height: 200px;
            }
            .closing {
              text-align: center;
              margin-left: 50%;
              margin-top: 50px;
            }
            .signature-box {
              margin-top: 40px;
              border-top: 1px dashed #999;
              padding-top: 8px;
              font-weight: 600;
              display: inline-block;
              min-width: 220px;
            }
            .footer-info {
              margin-top: 60px;
              text-align: center;
              font-size: 11px;
              color: #777;
              border-top: 1px solid #eee;
              padding-top: 10px;
            }
            @media print {
              body { padding: 0; }
              .container { border: none; box-shadow: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header-box">
              <div class="emblem">บันทึกข้อความ</div>
              <div class="logo-text">
                <strong>หน่วยงาน:</strong> สำนักงานส่วนกลางระบบการบริหารจัดการ<br/>
                <strong>ความเร่งด่วน:</strong> ${urgencyLabel}
              </div>
            </div>
            
            <div class="main-title">หนังสือยื่นคำร้องคำขอออนไลน์</div>
            
            <div class="meta-grid">
              <div class="meta-row">
                <div class="meta-label">เรื่อง:</div>
                <div class="meta-value" style="font-weight:bold;">${req.subject}</div>
              </div>
              <div class="meta-row">
                <div class="meta-label">เรียน:</div>
                <div class="meta-value">${req.attentionTo}</div>
              </div>
              <div class="meta-row">
                <div class="meta-label">ผู้ยื่นคำร้อง:</div>
                <div class="meta-value">${req.writerName} (${req.writerEmpId})</div>
              </div>
              <div class="meta-row">
                <div class="meta-label">สังกัดแผนก:</div>
                <div class="meta-value">${req.department}</div>
              </div>
              <div class="meta-row">
                <div class="meta-label">วันที่เขียน:</div>
                <div class="meta-value">${req.createdAt}</div>
              </div>
            </div>

            <div class="body-content">${req.details}</div>

            <div style="text-indent: 50px; margin-bottom: 40px;">
              จึงเรียนชี้แจงชี้แจงรายละเอียดมา ณ ที่นี้ เพื่อโปรดพิจารณาและดำเนินการอนุมัติต่อไป
            </div>

            <div class="closing">
              ขอแสดงความนับถืออย่างสูง
              <br/>
              <br/>
              <br/>
              <div class="signature-box">
                ( ลงชื่อ: ${req.signatureName} )
                <br/>
                <span style="font-size:13px; font-weight:normal; color:#555;">ผู้เขียนและยื่นคำขอร้อง</span>
              </div>
            </div>

            <div class="footer-info">
              จัดทำโดยระบบคำร้องออนไลน์ OfficeConnect • พิมพ์จากเซสชันของ ${currentUser?.name || 'ผู้ใช้ระบบ'} เมื่อวันที่ 25 มิถุนายน 2569
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6" id="documents-section-wrapper">
      
      {/* ================= SECTION TITLE BAR ================= */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-sans flex items-center gap-2">
            <FolderClosed className="w-5.5 h-5.5 text-blue-600" />
            แฟ้มเอกสาร & ระบบเขียนคำร้องออนไลน์
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            ศุนย์กลางจัดเก็บแบบฟอร์มเอกสารของฝ่ายบริหารบุคคล แผนกพัสดุ แผนกการเงิน และเครื่องมือสำหรับเขียนคำขอร้องใบยื่นออนไลน์
          </p>
        </div>
        
        {/* Sub-tab selection */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-center">
          <button
            onClick={() => setSubTab('files')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'files'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderClosed className="w-3.5 h-3.5" />
            ดาวน์โหลดแบบฟอร์ม
          </button>
          <button
            onClick={() => setSubTab('writer')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'writer'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <PenTool className="w-3.5 h-3.5 text-blue-600" />
            เขียนคำร้องออนไลน์
          </button>
          <button
            onClick={() => setSubTab('writtenList')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'writtenList'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            ประวัติการเขียน ({writtenRequests.length})
          </button>
        </div>
      </div>

      {/* ================= TAB CONTENT VIEW 1: TEMPLATES / FILE EXPLORER ================= */}
      {subTab === 'files' && (
        <div className="space-y-4">
          
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="ค้นหารหัสแบบฟอร์ม ชื่อเอกสาร คำชี้แจง..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1.5 focus:ring-blue-500 font-sans"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Group */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 font-sans">
                <Filter className="w-3.5 h-3.5" /> หมวดหมู่:
              </span>
              <div className="flex flex-wrap gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    {cat === 'All' ? 'ทั้งหมด' : cat}
                  </button>
                ))}
              </div>

              {/* Add New Template Button (HR Admin only) */}
              {isAdmin && (
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer ml-auto md:ml-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  อัปโหลดแบบฟอร์มใหม่
                </button>
              )}
            </div>
          </div>

          {/* Documents Table / Grid */}
          {filteredDocs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => {
                const isPdf = doc.fileType === 'PDF';
                const isExcel = doc.fileType === 'XLSX';
                
                return (
                  <motion.div
                    key={doc.id}
                    layoutId={doc.id}
                    className="bg-white rounded-2xl border border-slate-150 p-5 hover:shadow-md hover:border-blue-200 transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Top status */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono font-bold bg-slate-100 px-2.5 py-0.5 rounded text-slate-500 uppercase">
                          {doc.code}
                        </span>
                        
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          isPdf 
                            ? 'bg-red-50 text-red-600 border border-red-100' 
                            : isExcel 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : 'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}>
                          {doc.fileType} • {doc.fileSize}
                        </span>
                      </div>

                      {/* Title & description */}
                      <h4 className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight font-sans">
                        {doc.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed font-sans">
                        {doc.description}
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap justify-between text-[10px] text-slate-400 gap-y-1">
                        <span>หมวดหมู่: <strong className="text-slate-600 font-sans">{doc.category}</strong></span>
                        <span>ดาวน์โหลดแล้ว: <strong className="text-slate-600 font-mono">{doc.downloads} ครั้ง</strong></span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-2 pt-2 border-t border-slate-50">
                      <button
                        onClick={() => handleDownloadFile(doc)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold border border-blue-200/40 transition cursor-pointer"
                        title="ดาวน์โหลดไฟล์แบบฟอร์มไปเขียน"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>ดาวน์โหลดใบกรอก</span>
                      </button>

                      {/* Writable action shortcut */}
                      <button
                        onClick={() => {
                          // Change tab and select appropriate form
                          setSubTab('writer');
                          if (doc.code.includes('HR')) {
                            setWriterFormType('general');
                          } else if (doc.code.includes('SUP')) {
                            setWriterFormType('supply');
                          } else {
                            setWriterFormType('general');
                          }
                        }}
                        className="py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                        title="คลิกเพื่อเริ่มเขียนบนระบบออนไลน์ทันที"
                      >
                        <PenTool className="w-3.5 h-3.5 text-blue-500" />
                        <span>เขียนออนไลน์</span>
                      </button>

                      {isAdmin && !doc.isTemplate && (
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="p-2 rounded-xl bg-white hover:bg-rose-50 text-rose-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition cursor-pointer"
                          title="ลบเอกสารอัปโหลดนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
              <FolderClosed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h5 className="font-bold text-slate-700 text-sm">ยังไม่มีแบบฟอร์มเอกสารในระบบ</h5>
              <p className="text-xs text-slate-400 mt-1">
                {isAdmin 
                  ? 'คุณสามารถกดปุ่ม "อัปโหลดแบบฟอร์มใหม่" ด้านบน เพื่อเพิ่มแบบฟอร์ม PDF/Word จริงให้บุคลากรดาวน์โหลดได้ทันที' 
                  : 'ยังไม่มีไฟล์แบบฟอร์มเอกสารทางการที่ผู้ดูแลระบบอัปโหลดไว้ คุณสามารถเขียนใบคำร้องผ่านระบบออนไลน์ในเมนูถัดไปได้ทันที'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB CONTENT VIEW 2: INTERACTIVE FORM WRITER ================= */}
      {subTab === 'writer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Column 1: Fill Fields Form (Left - 5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-150 space-y-4 shadow-xs">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                  <PenTool className="w-4 h-4 text-blue-600 animate-pulse" />
                  เลือกแบบฟอร์มคำขอที่ต้องการเขียน
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">ระบบจะจำลองหนังสือคำร้อง และเตรียมรูปแบบกระดาษทางการให้โดยอัตโนมัติ</p>
              </div>

              {/* Form Category Selector */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setWriterFormType('general')}
                  className={`py-2 px-1 text-[10px] font-bold rounded-lg transition text-center truncate ${
                    writerFormType === 'general'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📝 ใบคำร้องทั่วไป
                </button>
                <button
                  type="button"
                  onClick={() => setWriterFormType('supply')}
                  className={`py-2 px-1 text-[10px] font-bold rounded-lg transition text-center truncate ${
                    writerFormType === 'supply'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📦 เบิกพัสดุพิเศษ
                </button>
                <button
                  type="button"
                  onClick={() => setWriterFormType('shift')}
                  className={`py-2 px-1 text-[10px] font-bold rounded-lg transition text-center truncate ${
                    writerFormType === 'shift'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📅 ขอสลับเวร/เวลา
                </button>
              </div>

              {/* Input details form */}
              <form onSubmit={handleFormWriterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 font-sans">ระบุชื่อหัวข้อเรื่อง (Subject) *</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1.5 focus:ring-blue-500 font-sans font-semibold text-slate-800"
                    placeholder={
                      writerFormType === 'general'
                        ? "เช่น ขอเสนอพิจารณาปรับปรุงสิ่งอำนวยความสะดวกในส่วนกลาง"
                        : writerFormType === 'supply'
                          ? "เช่น ขอเบิกอุปกรณ์พัสดุพิเศษนอกคลังประจำไตรมาส"
                          : "เช่น ขอเปลี่ยนวันปฏิบัติงานและสลับคิวเวรรับหน้าที่ส่วนกลาง"
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 font-sans">เรียนผู้รับการพิจารณา (To) *</label>
                    <input
                      type="text"
                      required
                      value={attentionTo}
                      onChange={(e) => setAttentionTo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1.5 focus:ring-blue-500 font-sans"
                      placeholder={
                        writerFormType === 'general'
                          ? "เช่น ผู้จัดการฝ่ายทั่วไป / ฝ่ายบุคคล"
                          : writerFormType === 'supply'
                            ? "เช่น หัวหน้าฝ่ายบริหารจัดซื้อและพัสดุ"
                            : "เช่น ผู้จัดคิวปฏิบัติหน้าที่และหัวหน้าแผนก"
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 font-sans">ระดับความเร่งด่วน *</label>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1.5 focus:ring-blue-500 font-sans"
                    >
                      <option value="normal">🟢 ปกติ (Normal)</option>
                      <option value="urgent">🟡 ด่วน (Urgent)</option>
                      <option value="immediate">🔴 ด่วนที่สุด (Immediate)</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 my-2 space-y-3.5">
                  <span className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider">ข้อมูลผู้เขียนคำร้อง (อัตโนมัติ)</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1 font-sans">ชื่อ-นามสกุล ผู้ยื่น</label>
                      <input
                        type="text"
                        disabled
                        value={writerName}
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-sans font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1 font-sans">รหัสพนักงานผู้ยื่น</label>
                      <input
                        type="text"
                        disabled
                        value={writerEmpId}
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-mono font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1 font-sans">สังกัดฝ่าย/แผนก</label>
                    <input
                      type="text"
                      disabled
                      value={department}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-sans font-medium"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 font-sans">เขียนรายละเอียดความต้องการ (Body Text) *</label>
                  <textarea
                    required
                    rows={6}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1.5 focus:ring-blue-500 font-sans leading-relaxed"
                    placeholder={
                      writerFormType === 'general'
                        ? "ระบุรายละเอียดเรื่องร้องเรียน เช่น ความต้องการเก้าอี้และระบบแสงสว่างในพื้นที่ทำงานร่วมกัน..."
                        : writerFormType === 'supply'
                          ? "ระบุรายละเอียดอุปกรณ์และจำนวน เช่น ความจำเป็นต้องการจอภาพเสริม (Monitor 27\") จำนวน 3 ชุด..."
                          : "ระบุข้อตกลงในการเปลี่ยนเวร เช่น ข้าพเจ้ามีความประสงค์อยากจะขอเปลี่ยนวันเวรปฏิบัติงานและสลับเวรกับ..."
                    }
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 font-sans">ลงชื่อกำกับผู้เขียน (Digital Signature) *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-serif italic text-xs">
                      ✍️
                    </span>
                    <input
                      type="text"
                      required
                      value={signatureName}
                      onChange={(e) => setSignatureName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1.5 focus:ring-blue-500 font-sans font-semibold text-blue-600 placeholder-slate-400"
                      placeholder="เขียนชื่อจริง-นามสกุล เป็นลายเซ็นกำกับ"
                    />
                  </div>
                </div>

                {/* Clear and Load Actions Bar */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => loadExampleTemplate()}
                    className="flex-1 flex items-center justify-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-bold py-2 px-2 rounded-xl transition cursor-pointer"
                    title="โหลดเนื้อหาตัวอย่างจำลองสำหรับศึกษาโครงร่าง"
                  >
                    ✨ โหลดตัวอย่างเขียน
                  </button>
                  <button
                    type="button"
                    onClick={clearForm}
                    className="flex-1 flex items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold py-2 px-2 rounded-xl transition cursor-pointer"
                    title="ล้างข้อมูลทั้งหมดในกระดาษเพื่อให้เป็นหน้าว่าง"
                  >
                    🧹 ล้างหน้ากระดาษ
                  </button>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl shadow-md shadow-blue-100 hover:shadow-lg transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ยื่นเสนอใบคำร้องนี้เข้าระบบ</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Column 2: Live Formal Preview (Right - 7 cols) */}
          <div className="lg:col-span-7">
            <div className="bg-slate-200 p-4 rounded-3xl border border-slate-300 shadow-inner flex flex-col items-center">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                แผ่นแสดงตัวอย่างเอกสารทางการ (Document Live Preview)
              </span>

              {/* Form Paper Container */}
              <div 
                className="w-full max-w-[550px] bg-white border border-slate-300 shadow-xl rounded-2xl p-8 md:p-12 space-y-6 text-slate-800 select-none relative overflow-hidden" 
                id="interactive-printed-paper"
              >
                {/* Draft Badge watermark */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[35deg] border-4 border-dashed border-slate-200/50 rounded-2xl px-6 py-3 pointer-events-none select-none z-0">
                  <span className="text-3xl font-mono font-bold text-slate-200/50 tracking-widest uppercase">OfficeConnect</span>
                </div>

                {/* Corporate Official Header */}
                <div className="relative z-10 border-b-2 border-slate-800 pb-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-extrabold tracking-tight text-slate-900 font-sans">บันทึกข้อความ</h3>
                    <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">Administrative Petition System</p>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-[10px] block font-semibold text-slate-600 font-sans">ส่วนราชการ/หน่วยงานกลาง</span>
                    <span className="text-[11px] block text-blue-600 font-bold font-sans">บริษัทออฟฟิศคอนเนคจำกัด</span>
                  </div>
                </div>

                {/* Meta details Block */}
                <div className="relative z-10 space-y-2 text-xs border-b border-dashed border-slate-200 pb-4 font-sans">
                  <div className="flex">
                    <span className="w-16 font-bold text-slate-600">เรื่อง:</span>
                    <span className="flex-1 font-bold text-slate-900 font-sans border-b border-slate-100 pl-2">
                      {subject || '(ยังไม่ระบุหัวเรื่อง)'}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-16 font-bold text-slate-600">เรียน:</span>
                    <span className="flex-1 text-slate-800 pl-2 border-b border-slate-100">
                      {attentionTo || '(ระบุผู้พิจารณา)'}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-16 font-bold text-slate-600">ผู้ยื่นคำขอ:</span>
                    <span className="flex-1 text-slate-800 pl-2 border-b border-slate-100 font-medium">
                      {writerName} ({writerEmpId || 'N/A'})
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-16 font-bold text-slate-600">สังกัดฝ่าย:</span>
                    <span className="flex-1 text-slate-800 pl-2 border-b border-slate-100">
                      {department || 'ไม่ระบุแผนก'}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-16 font-bold text-slate-600">วันที่เสนอ:</span>
                    <span className="flex-1 text-slate-800 pl-2 border-b border-slate-100 font-mono">
                      25 มิถุนายน 2569
                    </span>
                  </div>
                </div>

                {/* Form Message Body */}
                <div className="relative z-10 text-xs min-h-[160px] leading-relaxed text-slate-700 whitespace-pre-wrap pl-6 border-l-2 border-slate-100 font-sans">
                  {details || 'ยังไม่ได้เขียนข้อมูลรายละเอียดความจำเป็นลงไป... คาดหวังการป้อนข้อมูลเพื่อแสดงจำลองตัวหนังสือประกอบแบบฟอร์มอย่างสวยงามที่นี่'}
                </div>

                {/* Signature Block */}
                <div className="relative z-10 pt-6 flex flex-col items-end text-center pr-6 font-sans">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">จึงเรียนชี้แจงเพื่อพิจารณาดำเนินการ</p>
                    <p className="text-xs font-bold text-slate-800 mt-2">ขอแสดงความนับถือ</p>
                    <p className="text-sm font-serif italic text-blue-600 font-bold border-b border-slate-100 py-1.5 inline-block min-w-[150px] tracking-wide">
                      {signatureName || '...........................................'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-sans">( {signatureName || 'ลงชื่อผู้เขียน'} )</p>
                    <p className="text-[9px] text-slate-400 font-mono">วันที่ยื่น: 25 มิ.ย. 2569</p>
                  </div>
                </div>

                {/* Alert Notification Success banner inside paper */}
                <AnimatePresence>
                  {isSubmitSuccess && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center text-center p-8 z-20"
                    >
                      <CheckCircle className="w-16 h-16 text-emerald-600 mb-3 animate-bounce" />
                      <h4 className="text-lg font-bold text-slate-800">ยื่นคำร้องสำเร็จเรียบร้อย!</h4>
                      <p className="text-xs text-slate-400 mt-1.5">คำขอของคุณถูกประทับดิจิทัลและจัดเก็บในระบบเรียบร้อยแล้ว</p>
                      <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-full mt-3">ระบบกำลังสลับไปหน้าประวัติบันทึก...</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Utility toolbar */}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const tempReq: WrittenRequest = {
                      id: 'temp',
                      formType: writerFormType,
                      subject,
                      attentionTo,
                      writerName,
                      writerEmpId,
                      department,
                      details,
                      urgency,
                      signatureName,
                      createdAt: new Date().toISOString().split('T')[0],
                      status: 'pending'
                    };
                    handlePrintRequest(tempReq);
                  }}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  สั่งพิมพ์เอกสารออก (Print / Save PDF)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB CONTENT VIEW 3: WRITTEN REQUEST LOGS HISTORY ================= */}
      {subTab === 'writtenList' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 font-sans">สมุดจัดเก็บแฟ้มคำร้องออนไลน์และคำสั่งขอเบิกพัสดุพิเศษ</h4>
              <p className="text-xs text-slate-400 font-sans">
                {isAdmin ? 'คุณล็อกอินในฐานะผู้ดูแลระบบ (Admin) สามารถดู ตรวจทาน และพิมพ์แบบฟอร์มคำร้องออนไลน์ของพนักงานทุกคนได้' : 'ข้อมูลประวัติรายการเขียนและยื่นใบคำร้องต่างๆ ที่คุณบันทึกไว้ในเซสชันคอมพิวเตอร์เครื่องนี้'}
              </p>
            </div>
          </div>

          {writtenRequests.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {writtenRequests
                .filter(req => isAdmin || req.writerEmpId === currentUser?.employeeId)
                .map((req) => {
                  const isGeneral = req.formType === 'general';
                  const isSupply = req.formType === 'supply';
                  const isShift = req.formType === 'shift';

                  return (
                    <div 
                      key={req.id}
                      className="bg-white rounded-2xl border border-slate-150 p-4 hover:shadow-xs hover:border-slate-300 transition flex flex-col md:flex-row justify-between md:items-center gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center text-center font-sans ${
                          isGeneral 
                            ? 'bg-blue-50 text-blue-600' 
                            : isSupply 
                              ? 'bg-amber-50 text-amber-600' 
                              : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          <span className="text-base">
                            {isGeneral ? '📝' : isSupply ? '📦' : '📅'}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase font-mono">
                              {req.formType === 'general' ? 'ทั่วไป' : req.formType === 'supply' ? 'พัสดุพิเศษ' : 'เปลี่ยนเวร'}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              req.urgency === 'immediate'
                                ? 'bg-red-50 text-red-600 border border-red-100'
                                : req.urgency === 'urgent'
                                  ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                  : 'bg-slate-50 text-slate-500 border border-slate-150'
                            }`}>
                              ความเร่งด่วน: {req.urgency === 'immediate' ? 'ด่วนที่สุด' : req.urgency === 'urgent' ? 'ด่วน' : 'ปกติ'}
                            </span>

                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              req.status === 'reviewed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-orange-50 text-orange-700 border border-orange-100'
                            }`}>
                              {req.status === 'reviewed' ? '🟢 ตรวจรับแล้ว' : '🟡 รอตรวจสอบ'}
                            </span>
                          </div>

                          <h5 className="text-sm font-bold text-slate-800 font-sans mt-1">{req.subject}</h5>
                          <div className="flex items-center gap-2 text-xs text-slate-400 font-sans">
                            <span>ผู้ยื่น: <strong className="text-slate-600">{req.writerName} ({req.writerEmpId})</strong></span>
                            <span>•</span>
                            <span>แผนก: {req.department}</span>
                            <span>•</span>
                            <span className="font-mono text-[10px]">{req.createdAt}</span>
                          </div>
                        </div>
                      </div>

                      {/* Operations */}
                      <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 justify-end">
                        <button
                          onClick={() => setViewingWrittenRequest(req)}
                          className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs px-3 py-2 rounded-xl transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-500" />
                          <span>ดูเนื้อหา</span>
                        </button>
                        
                        <button
                          onClick={() => handlePrintRequest(req)}
                          className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 text-xs px-3 py-2 rounded-xl transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>พิมพ์เอกสาร</span>
                        </button>

                        {isAdmin && req.status === 'pending' && (
                          <button
                            onClick={() => handleMarkAsReviewed(req.id)}
                            className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 text-xs px-3 py-2 rounded-xl transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>ยอมรับตรวจทาน</span>
                          </button>
                        )}

                        {(isAdmin || req.writerEmpId === currentUser?.employeeId) && (
                          <button
                            onClick={() => handleDeleteWrittenRequest(req.id)}
                            className="p-2 rounded-xl bg-white hover:bg-rose-50 text-rose-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition cursor-pointer"
                            title="ลบเอกสารเขียนนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
              <FolderClosed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h5 className="font-bold text-slate-700 text-sm">ไม่พบประวัติแบบฟอร์มที่กรอกใบคำร้อง</h5>
              <p className="text-xs text-slate-400 mt-1">คุณสามารถยื่นคำร้องคำขอออนไลน์ใบแรกได้จากเมนูย่อย "เขียนคำร้องออนไลน์"</p>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: FILE UPLOAD (Admin only) ================= */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" id="upload-doc-modal">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" />
                อัปโหลดเอกสารแบบฟอร์มใหม่เข้าระบบ
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsUploadOpen(false);
                  setUploadedBase64('');
                  setUploadedFileName('');
                }}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleSaveUpload}>
              <div className="p-6 space-y-4 font-sans">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อแผ่นแบบฟอร์มเอกสาร (Name) *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น แบบฟอร์มขอรับเครื่องเขียนประจำไตรมาส"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1.5 focus:ring-blue-500 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">หมวดหมู่เอกสาร *</label>
                    <select
                      value={newDocCategory}
                      onChange={(e) => setNewDocCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1.5 focus:ring-blue-500"
                    >
                      <option value="ทรัพยากรบุคคล (HR)">ทรัพยากรบุคคล (HR)</option>
                      <option value="พัสดุและคลังสินค้า">พัสดุและคลังสินค้า</option>
                      <option value="บัญชีและการเงิน">บัญชีและการเงิน</option>
                      <option value="คำร้องทั่วไป">คำร้องทั่วไป</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">จำกัดขนาดไฟล์</label>
                    <input
                      type="text"
                      disabled
                      value="ไม่เกิน 2MB"
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">คำชี้แจง / คำอธิบายแบบฟอร์ม</label>
                  <input
                    type="text"
                    placeholder="ระบุจุดประสงค์ ข้อชี้แนะ หรือผู้มีสิทธิ์ยื่น"
                    value={newDocDesc}
                    onChange={(e) => setNewDocDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1.5 focus:ring-blue-500 font-sans"
                  />
                </div>

                {/* File input drag and click */}
                <div className="space-y-1">
                  <span className="block text-xs font-bold text-slate-600">เลือกไฟล์แบบฟอร์มเอกสารจากเครื่อง *</span>
                  <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 bg-slate-50/50 flex flex-col items-center justify-center text-center cursor-pointer transition">
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg"
                      onChange={handleFileChange}
                      className="hidden"
                      id="upload-file-picker"
                      required
                    />
                    <label htmlFor="upload-file-picker" className="cursor-pointer w-full flex flex-col items-center">
                      <Plus className="w-8 h-8 text-slate-400 mb-2" />
                      {uploadedFileName ? (
                        <div className="space-y-1">
                          <span className="block text-xs font-bold text-emerald-600">{uploadedFileName}</span>
                          <span className="block text-[10px] text-slate-400">ขนาด: {uploadedFileSize} (คลิกเพื่อสลับเปลี่ยนไฟล์อื่น)</span>
                        </div>
                      ) : (
                        <div>
                          <span className="block text-xs font-bold text-slate-600">คลิกที่นี่เพื่อแนบไฟล์เอกสาร</span>
                          <span className="block text-[10px] text-slate-400 mt-1">รองรับนามสกุล PDF, DOCX, XLSX, PNG (จำกัดไม่เกิน 2MB)</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadOpen(false);
                    setUploadedBase64('');
                    setUploadedFileName('');
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl transition cursor-pointer font-sans"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!uploadedBase64}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer font-sans"
                >
                  บันทึกแบบฟอร์มเข้าระบบ
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ================= MODAL: DETAIL DIALOG FOR WRITTEN REQUESTS ================= */}
      <AnimatePresence>
        {viewingWrittenRequest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" id="view-written-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  ชี้แจงเอกสารบันทึกข้อความออนไลน์
                </h3>
                <button
                  type="button"
                  onClick={() => setViewingWrittenRequest(null)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Document Box inside modal */}
              <div className="p-6 max-h-[450px] overflow-y-auto space-y-4">
                <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50 space-y-4 font-sans text-xs">
                  <div className="flex justify-between items-center border-b pb-3 border-slate-200">
                    <span className="font-bold text-slate-800 text-sm">เรื่อง: {viewingWrittenRequest.subject}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      viewingWrittenRequest.urgency === 'immediate'
                        ? 'bg-red-100 text-red-700'
                        : viewingWrittenRequest.urgency === 'urgent'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-200 text-slate-700'
                    }`}>
                      {viewingWrittenRequest.urgency === 'immediate' ? 'ด่วนที่สุด' : viewingWrittenRequest.urgency === 'urgent' ? 'ด่วน' : 'ปกติ'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 text-slate-600">
                    <div><strong>เรียนพิจารณา:</strong> {viewingWrittenRequest.attentionTo}</div>
                    <div><strong>วันที่บันทึกยื่น:</strong> {viewingWrittenRequest.createdAt}</div>
                    <div><strong>ผู้เขียนคำขอ:</strong> {viewingWrittenRequest.writerName} ({viewingWrittenRequest.writerEmpId})</div>
                    <div><strong>สังกัดหน่วยงาน:</strong> {viewingWrittenRequest.department}</div>
                  </div>

                  <div className="border-t pt-3 mt-2 border-slate-200 leading-relaxed text-slate-700 whitespace-pre-wrap bg-white p-3 rounded-xl min-h-[100px]">
                    {viewingWrittenRequest.details}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-[11px] text-slate-400">
                    <span>ผู้ตรวจสอบ/ฝ่ายบุคคล: <strong>{viewingWrittenRequest.status === 'reviewed' ? 'คุณวิภา (ฝ่ายบุคคล) • อนุมัติแล้ว' : 'อยู่ระหว่างดำเนินการประสานงาน'}</strong></span>
                    <div className="text-right">
                      <span className="block text-[10px]">ลายเซ็นดิจิทัล:</span>
                      <strong className="text-blue-600 font-serif italic">{viewingWrittenRequest.signatureName}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[10px] text-slate-400">ID: {viewingWrittenRequest.id}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintRequest(viewingWrittenRequest)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition cursor-pointer font-sans flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    พิมพ์ / PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingWrittenRequest(null)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl transition cursor-pointer font-sans"
                  >
                    ปิดหน้าต่าง
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
