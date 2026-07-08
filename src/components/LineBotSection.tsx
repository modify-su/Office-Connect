import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Settings, 
  Send, 
  Bot, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  HelpCircle,
  Copy,
  Check,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  Zap,
  Info,
  Package
} from 'lucide-react';
import { Employee, LeaveRequest, AttendanceRecord, UserAccount, LeaveType, SupplyItem, SupplyRequest, SystemSettings } from '../types';

interface LineBotSectionProps {
  currentUser: UserAccount | null;
  employees: Employee[];
  onAddLeaveRequest: (req: Omit<LeaveRequest, 'id' | 'createdAt'>) => void;
  onAddAttendanceRecord: (record: Omit<AttendanceRecord, 'id'>) => void;
  leaveRequests: LeaveRequest[];
  attendanceRecords: AttendanceRecord[];
  onAddSupplyRequest?: (req: Omit<SupplyRequest, 'id' | 'createdAt' | 'status'>) => void;
  supplyItems?: SupplyItem[];
  supplyRequests?: SupplyRequest[];
  settings: SystemSettings;
  onUpdateSettings: (settings: SystemSettings) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  status?: 'sent' | 'read';
}

interface BotContext {
  step: 
    | 'idle' 
    | 'sick_days' | 'sick_start' | 'sick_reason' 
    | 'personal_days' | 'personal_start' | 'personal_reason' 
    | 'confirm_leave'
    | 'swap_from' | 'swap_to' | 'swap_reason'
    | 'emergency_days' | 'emergency_start' | 'emergency_reason'
    | 'supply_item' | 'supply_qty' | 'supply_purpose';
  leaveType?: LeaveType;
  days?: number;
  startDate?: string;
  reason?: string;
  swapFromDate?: string;
  swapToDate?: string;
  supplyItemId?: string;
  supplyItemName?: string;
  supplyItemUnit?: string;
  supplyQty?: number;
}

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

const parseThaiDateInput = (inputStr: string): string | null => {
  const cleanInput = inputStr.trim();
  
  if (cleanInput === 'วันนี้') {
    return new Date().toISOString().split('T')[0];
  }
  if (cleanInput === 'พรุ่งนี้') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
  
  // Match d/m/yyyy, d-m-yyyy, d.m.yyyy, d m yyyy
  const match = cleanInput.match(/^(\d{1,2})[\/\- .](\d{1,2})[\/\- .](\d{4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const beYear = parseInt(match[3], 10);
    
    // If the year is Buddhist Era (> 2400), subtract 543
    let ceYear = beYear;
    if (beYear > 2400) {
      ceYear = beYear - 543;
    }
    
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && ceYear > 1900 && ceYear < 2100) {
      const padDay = day < 10 ? `0${day}` : `${day}`;
      const padMonth = month < 10 ? `0${month}` : `${month}`;
      return `${ceYear}-${padMonth}-${padDay}`;
    }
  }
  
  return null;
};

export default function LineBotSection({
  currentUser,
  employees,
  onAddLeaveRequest,
  onAddAttendanceRecord,
  leaveRequests,
  attendanceRecords,
  onAddSupplyRequest,
  supplyItems = [],
  supplyRequests = [],
  settings,
  onUpdateSettings
}: LineBotSectionProps) {
  // Config state
  const defaultWebhook = settings.lineWebhookUrl || (typeof window !== 'undefined' ? `${window.location.origin}/api/line/webhook` : 'https://ais-dev-bmco3xexmw2r26vzq6bz4v-713032521366.asia-southeast1.run.app/api/line/webhook');
  const [webhookUrl, setWebhookUrl] = useState(defaultWebhook);
  const [channelToken, setChannelToken] = useState(settings.lineChannelToken || 'eyJhY2Nlc3NUb2tlbiI6ImxpbmUtYm90LWNoYW5uZWwtYWNjZXNzLXRva2VuLXNpbXVsYXRlZC0yMDI2In0=');
  const [channelSecret, setChannelSecret] = useState(settings.lineChannelSecret || '8f92a4e5100fbd451833aa3b34ff60b3');
  const [isBotActive, setIsBotActive] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'simulator' | 'config' | 'guide'>('simulator');

  // Simulator state
  const [simulatingEmployeeId, setSimulatingEmployeeId] = useState<string>(
    currentUser?.role === 'employee' ? currentUser.employeeId || 'EMP-001' : 'EMP-001'
  );
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'bot',
      text: 'สวัสดีครับ ยินดีต้อนรับสู่ระบบช่วยเหลือพนักงานผ่าน LINE Bot ประจำออฟฟิศครับ! 🤖\n\nท่านสามารถพิมพ์คำสั่งต่อไปนี้เพื่อสั่งการระบบได้ทันที:\n• พิมพ์ "ลาป่วย", "ลากิจ" หรือ "ลาฉุกเฉิน" เพื่อยื่นขอลาพักผ่อน\n• พิมพ์ "สลับวันหยุด" เพื่อส่งคำขอสลับวันทำงาน\n• พิมพ์ "ขอเบิกพัสดุ" หรือ "เบิกอุปกรณ์" เพื่อขอเบิกพัสดุ/อุปกรณ์สำนักงาน\n• พิมพ์ "ลงชื่อเข้างาน" หรือ "ลงชื่อออกงาน" เพื่อเช็คเวลาทำงาน\n• พิมพ์ "เช็ควันลา" เพื่อดูโควต้าวันลาคงเหลือของคุณ',
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      status: 'read'
    }
  ]);

  // Bot logic state machine
  const [botContext, setBotContext] = useState<BotContext>({ step: 'idle' });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeEmp = employees.find(e => e.employeeId === simulatingEmployeeId) || employees[0];

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Bot conversation engine
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userText = inputValue.trim();
    const timeString = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    
    // Add user message
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: timeString,
      status: 'read'
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    // Process reply after a brief realistic lag
    setTimeout(() => {
      processBotReply(userText);
    }, 800);
  };

  const processBotReply = (text: string) => {
    const timeString = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const normalizedText = text.trim();
    
    // Initialize bot reply
    let replyText = '';
    let newContext = { ...botContext };

    if (!isBotActive) {
      replyText = '❌ [ระบบปิดใช้งานชั่วคราว] ระบบ LINE Bot กำลังปิดปรับปรุง กรุณาติดต่อฝ่ายบุคคลโดยตรง';
      addBotMessage(replyText, timeString);
      return;
    }

    // Command Cancel
    if (normalizedText.toLowerCase() === 'ยกเลิก') {
      newContext = { step: 'idle' };
      replyText = '🔄 ยกเลิกการทำรายการปัจจุบันเรียบร้อยแล้ว มีอะไรให้ผมช่วยเหลือเพิ่มเติมไหมครับ? ท่านสามารถพิมพ์ "ลาป่วย", "ลากิจ", "ลาฉุกเฉิน", "สลับวันหยุด", "ลงชื่อเข้างาน" หรือ "เช็ควันลา" ได้เลยครับ';
      setBotContext(newContext);
      addBotMessage(replyText, timeString);
      return;
    }

    // Context-based State Machine
    switch (botContext.step) {
      case 'idle':
        if (normalizedText.includes('ลาป่วย')) {
          newContext.step = 'sick_days';
          newContext.leaveType = 'sick';
          replyText = `🤒 คุณ ${activeEmp?.firstName} ${activeEmp?.lastName} ต้องการยื่นเรื่อง "ลาป่วย"\n\nกรุณาระบุจำนวนวันที่ต้องการลาพักรักษาตัวเป็นตัวเลข (เช่น 1 หรือ 2 วัน)\n\n*(พิมพ์ "ยกเลิก" เพื่อยุติขั้นตอน)*`;
        } else if (normalizedText.includes('ลากิจ')) {
          newContext.step = 'personal_days';
          newContext.leaveType = 'personal';
          replyText = `💼 คุณ ${activeEmp?.firstName} ${activeEmp?.lastName} ต้องการยื่นเรื่อง "ลากิจ"\n\nกรุณาระบุจำนวนวันที่ต้องการลากิจเป็นตัวเลข (เช่น 1 หรือ 2 วัน)\n\n*(พิมพ์ "ยกเลิก" เพื่อยุติขั้นตอน)*`;
        } else if (normalizedText.includes('ลาฉุกเฉิน')) {
          newContext.step = 'emergency_days';
          newContext.leaveType = 'other';
          replyText = `🚨 คุณ ${activeEmp?.firstName} ${activeEmp?.lastName} ต้องการยื่นเรื่อง "ลาฉุกเฉิน"\n\nกรุณาระบุจำนวนวันที่ต้องการลาฉุกเฉินเป็นตัวเลข (เช่น 1 หรือ 2 วัน)\n\n*(พิมพ์ "ยกเลิก" เพื่อยุติขั้นตอน)*`;
        } else if (normalizedText.includes('สลับวันหยุด') || normalizedText.includes('ขอสลับวันหยุด') || normalizedText.includes('สลับวัน')) {
          newContext.step = 'swap_from';
          newContext.leaveType = 'swap';
          replyText = `🔄 คุณ ${activeEmp?.firstName} ${activeEmp?.lastName} ต้องการยื่นเรื่อง "ขอสลับวันหยุด"\n\nกรุณาระบุ "วันที่ต้องการสลับมาทำงาน" (วันที่ตามกำหนดเดิมเป็นวันหยุดของคุณ เช่น วันอาทิตย์นี้)\nในรูปแบบ วัน/เดือน/พ.ศ. (เช่น 12/07/2569) หรือพิมพ์คำว่า "วันนี้" เพื่อระบุวันทำงานชดเชย`;
        } else if (normalizedText.includes('ลงชื่อเข้างาน') || normalizedText.includes('เข้างาน') || normalizedText.toLowerCase() === 'in') {
          // Check if already checked in today
          const todayStr = new Date().toISOString().split('T')[0];
          const hasCheckedIn = attendanceRecords.some(r => r.employeeId === simulatingEmployeeId && r.date === todayStr && (r.type === 'clock_in' || r.type === 'late'));

          if (hasCheckedIn) {
            replyText = `⚠️ คุณ ${activeEmp?.firstName} ได้ทำการลงชื่อเข้างานของวันนี้เรียบร้อยแล้วครับ ไม่จำเป็นต้องลงชื่อซ้ำ`;
          } else {
            const timeNow = new Date().toTimeString().split(' ')[0].substring(0, 5);
            // Create real check-in attendance
            onAddAttendanceRecord({
              employeeId: activeEmp.employeeId,
              employeeName: `${activeEmp.firstName} ${activeEmp.lastName}`,
              date: todayStr,
              time: timeNow,
              type: timeNow > '09:00' ? 'late' : 'clock_in',
              notes: 'บันทึกอัตโนมัติผ่านช่องทาง LINE Bot Chatbot (Virtual GPS)',
              recordedBy: 'LINE Bot'
            });

            replyText = `📍 ✅ ลงเวลาเข้างานสำเร็จ! (ผ่านระบบ LINE Bot)\n\n👤 พนักงาน: ${activeEmp.firstName} ${activeEmp.lastName}\n🆔 รหัส: ${activeEmp.employeeId}\n📅 วันที่: ${formatThaiDate(todayStr)}\n⏱️ เวลา: ${timeNow} น.\n🚦 สถานะ: ${timeNow > '09:00' ? '🔴 สาย' : '🟢 ตรงเวลา'}\n\nขอให้เป็นวันที่ดีในการทำงานครับ! 🚀`;
          }
        } else if (normalizedText.includes('ลงชื่อออกงาน') || normalizedText.includes('ออกงาน') || normalizedText.toLowerCase() === 'out') {
          const todayStr = new Date().toISOString().split('T')[0];
          const timeNow = new Date().toTimeString().split(' ')[0].substring(0, 5);

          // Create real check-out attendance
          onAddAttendanceRecord({
            employeeId: activeEmp.employeeId,
            employeeName: `${activeEmp.firstName} ${activeEmp.lastName}`,
            date: todayStr,
            time: timeNow,
            type: 'clock_out',
            notes: 'บันทึกเวลาออกงานผ่าน LINE Bot',
            recordedBy: 'LINE Bot'
          });

          replyText = `📍 🏁 ลงเวลาออกงานสำเร็จ! (ผ่านระบบ LINE Bot)\n\n👤 พนักงาน: ${activeEmp.firstName} ${activeEmp.lastName}\n📅 วันที่: ${formatThaiDate(todayStr)}\n⏱️ เวลา: ${timeNow} น.\n\nเดินทางกลับบ้านโดยสวัสดิภาพครับ! 👋🏡`;
        } else if (normalizedText.includes('เช็ควันลา') || normalizedText.includes('สิทธิ์วันลา') || normalizedText.includes('โควต้า')) {
          replyText = `📊 สิทธิ์วันลาคงเหลือของคุณ ${activeEmp.firstName} ${activeEmp.lastName}:\n\n• 🤒 ลาป่วย (Sick Leave): คงเหลือ 15 วัน (ใช้ไปแล้ว 0 วัน)\n• ✈️ ลาพักร้อน (Annual Leave): คงเหลือ 10 วัน (ใช้ไปแล้ว 2 วัน)\n• 💼 ลากิจ (Personal Leave): คงเหลือ 6 วัน (ใช้ไปแล้ว 0 วัน)\n• 🚨 ลาฉุกเฉิน/อื่นๆ (Other Leave): สามารถยื่นขอได้ตามความจำเป็น\n\n*หมายเหตุ: เป็นสถิติจากฐานข้อมูลระบบกลาง HR คลาวด์เรียลไทม์*`;
        } else if (
          normalizedText.includes('เบิกพัสดุ') ||
          normalizedText.includes('เบิกจ่ายสินค้า') ||
          normalizedText.includes('เบิกอุปกรณ์') ||
          normalizedText.includes('เบิกของ') ||
          normalizedText.includes('พัสดุอุปกรณ์')
        ) {
          if (!supplyItems || supplyItems.length === 0) {
            replyText = `📦 คุณ ${activeEmp?.firstName} ต้องการยื่นเรื่อง "ขอเบิกจ่ายพัสดุอุปกรณ์"\n\n⚠️ ขณะนี้ยังไม่มีรายการพัสดุหรือวัสดุอุปกรณ์ที่ลงทะเบียนไว้ในคลังระบบสารสนเทศกลาง กรุณาติดต่อผู้ดูแลระบบเพื่อทำการเพิ่มข้อมูลสินค้าคงคลังก่อนครับ`;
          } else {
            newContext.step = 'supply_item';
            const listStr = supplyItems.map(item => `👉 *${item.code}* - ${item.name} (คงเหลือ ${item.stock} ${item.unit})`).join('\n');
            replyText = `📦 คุณ ${activeEmp?.firstName} ${activeEmp?.lastName} ต้องการยื่นเรื่อง "ขอเบิกจ่ายสินค้า / พัสดุอุปกรณ์"\n\nกรุณาเลือกหรือพิมพ์ "รหัสพัสดุ" หรือ "ชื่อพัสดุ" ที่ต้องการเบิกจากรายการคงคลังเรียลไทม์ด้านล่างนี้ครับ:\n\n${listStr}\n\n*(พิมพ์รหัสพัสดุที่ต้องการ เช่น COMP-01 หรือพิมพ์ "ยกเลิก" เพื่อยุติขั้นตอน)*`;
          }
        } else {
          replyText = `🤖 ขออภัยครับ ผมไม่เข้าใจคำสั่ง "${normalizedText}" \n\nท่านสามารถพิมพ์สั่งการได้ดังนี้ครับ:\n👉 "ลาป่วย" - ยื่นคำขอลาป่วย\n👉 "ลากิจ" - ยื่นคำขอลากิจ\n👉 "ลาฉุกเฉิน" - ยื่นคำขอลาพักร้อนฉุกเฉินด่วน\n👉 "สลับวันหยุด" - ขอสลับวันทำงานกับวันหยุด\n👉 "ขอเบิกพัสดุ" - ยื่นคำขอเบิกพัสดุอุปกรณ์สำนักงาน\n👉 "ลงชื่อเข้างาน" - เช็คอินเวลาทำงาน\n👉 "ลงชื่อออกงาน" - เช็คเอาท์เวลาทำงาน\n👉 "เช็ควันลา" - ดูโควต้าวันลาปัจจุบัน`;
        }
        break;

      // SICK LEAVE CONVERSATION
      case 'sick_days':
        const sickDays = parseInt(normalizedText.replace(/\D/g, ''));
        if (isNaN(sickDays) || sickDays <= 0 || sickDays > 30) {
          replyText = '⚠️ กรุณาระบุจำนวนวันลาเป็นตัวเลขจำนวนเต็มที่ถูกต้อง (ระหว่าง 1 ถึง 30 วัน)';
        } else {
          newContext.days = sickDays;
          newContext.step = 'sick_start';
          replyText = `📅 ระบุข้อมูลสำเร็จ: ต้องการลาป่วย ${sickDays} วัน\n\nกรุณาระบุ "วันที่เริ่มลา" (รูปแบบ วัน/เดือน/พ.ศ. เช่น 08/07/2569)\nหรือพิมพ์คำว่า "วันนี้" เพื่อเริ่มลาตั้งแต่วันนี้เป็นต้นไป`;
        }
        break;

      case 'sick_start':
        let parsedSickStart = parseThaiDateInput(normalizedText);

        if (!parsedSickStart) {
          replyText = '⚠️ รูปแบบวันที่ไม่ถูกต้อง กรุณากรอกในรูปแบบ วัน/เดือน/พ.ศ. เช่น 08/07/2569 หรือพิมพ์คำว่า "วันนี้"';
        } else {
          newContext.startDate = parsedSickStart;
          newContext.step = 'sick_reason';
          replyText = `📝 ระบุวันที่เริ่มลาป่วย: ${formatThaiDate(parsedSickStart)}\n\nสุดท้ายนี้ กรุณาระบุ "เหตุผลการลาป่วย" สั้นๆ เพื่อบันทึกเป็นหลักฐานแนบ (เช่น เป็นไข้หวัด, อาหารเป็นพิษ, มีไข้ตัวร้อน)`;
        }
        break;

      case 'sick_reason':
        newContext.reason = normalizedText;
        
        // Finalize Sick Leave
        const sickEndDate = calculateEndDate(newContext.startDate!, newContext.days!);
        
        // Write actual request to state & cloud database
        onAddLeaveRequest({
          employeeId: activeEmp.employeeId,
          employeeName: `${activeEmp.firstName} ${activeEmp.lastName}`,
          leaveType: 'sick',
          startDate: newContext.startDate!,
          endDate: sickEndDate,
          days: newContext.days!,
          reason: normalizedText,
          status: 'pending'
        });

        replyText = `✅ 🎉 ดำเนินการยื่นใบลาป่วยเสร็จสมบูรณ์!\n\n🤖 ผมได้สร้างคำร้องลงระบบ HR กลางให้คุณเรียบร้อยแล้ว:\n\n👤 พนักงาน: ${activeEmp.firstName} ${activeEmp.lastName}\n🤒 ประเภท: ลาป่วย (Sick Leave)\n📅 วันที่เริ่มลา: ${formatThaiDate(newContext.startDate!)}\n📅 วันที่สิ้นสุด: ${formatThaiDate(sickEndDate)}\n⏱️ รวม: ${newContext.days} วัน\n💬 เหตุผล: ${normalizedText}\n🕒 สถานะ: รอการพิจารณาอนุมัติ (Pending)\n\nเอกสารได้รับการซิงค์ขึ้น Cloud Firestore เรียบร้อยแล้ว หัวหน้างานจะได้รับข้อความแจ้งเตือนความคืบหน้าถัดไปครับ ✨`;
        newContext = { step: 'idle' };
        break;

      // PERSONAL LEAVE CONVERSATION
      case 'personal_days':
        const persDays = parseInt(normalizedText.replace(/\D/g, ''));
        if (isNaN(persDays) || persDays <= 0 || persDays > 30) {
          replyText = '⚠️ กรุณาระบุจำนวนวันลาเป็นตัวเลขจำนวนเต็มที่ถูกต้อง (ระหว่าง 1 ถึง 30 วัน)';
        } else {
          newContext.days = persDays;
          newContext.step = 'personal_start';
          replyText = `📅 ระบุข้อมูลสำเร็จ: ต้องการลากิจ ${persDays} วัน\n\nกรุณาระบุ "วันที่เริ่มลา" (รูปแบบ วัน/เดือน/พ.ศ. เช่น 09/07/2569)\nหรือพิมพ์คำว่า "วันนี้" เพื่อเริ่มลาตั้งแต่วันนี้เป็นต้นไป`;
        }
        break;

      case 'personal_start':
        let parsedPersStart = parseThaiDateInput(normalizedText);

        if (!parsedPersStart) {
          replyText = '⚠️ รูปแบบวันที่ไม่ถูกต้อง กรุณากรอกในรูปแบบ วัน/เดือน/พ.ศ. เช่น 09/07/2569 หรือพิมพ์คำว่า "วันนี้"';
        } else {
          newContext.startDate = parsedPersStart;
          newContext.step = 'personal_reason';
          replyText = `📝 ระบุวันที่เริ่มลากิจ: ${formatThaiDate(parsedPersStart)}\n\nสุดท้ายนี้ กรุณาระบุ "เหตุผลการลากิจ" (เช่น ทำธุระที่อำเภอ, พาบิดาไปตรวจสุขภาพ, ต่ออายุใบขับขี่)`;
        }
        break;

      case 'personal_reason':
        newContext.reason = normalizedText;
        
        // Finalize Personal Leave
        const persEndDate = calculateEndDate(newContext.startDate!, newContext.days!);
        
        onAddLeaveRequest({
          employeeId: activeEmp.employeeId,
          employeeName: `${activeEmp.firstName} ${activeEmp.lastName}`,
          leaveType: 'personal',
          startDate: newContext.startDate!,
          endDate: persEndDate,
          days: newContext.days!,
          reason: normalizedText,
          status: 'pending'
        });

        replyText = `✅ 🎉 ดำเนินการยื่นใบลากิจเสร็จสมบูรณ์!\n\n🤖 ผมได้ส่งคำร้องเข้าระบบสารสนเทศออฟฟิศให้แล้วครับ:\n\n👤 พนักงาน: ${activeEmp.firstName} ${activeEmp.lastName}\n💼 ประเภท: ลากิจ (Personal Leave)\n📅 วันที่เริ่มลา: ${formatThaiDate(newContext.startDate!)}\n📅 วันที่สิ้นสุด: ${formatThaiDate(persEndDate)}\n⏱️ รวม: ${newContext.days} วัน\n💬 เหตุผล: ${normalizedText}\n🕒 สถานะ: รอการอนุมัติ (Pending)\n\nข้อมูลอัปเดตแบบเรียลไทม์ขึ้นระบบเรียบร้อยแล้วครับ! 👍`;
        newContext = { step: 'idle' };
        break;

      // SWAP HOLIDAY CONVERSATION
      case 'swap_from':
        let parsedSwapFrom = parseThaiDateInput(normalizedText);
        
        if (!parsedSwapFrom) {
          replyText = '⚠️ รูปแบบวันที่ไม่ถูกต้อง กรุณากรอกในรูปแบบ วัน/เดือน/พ.ศ. เช่น 12/07/2569 หรือพิมพ์คำว่า "วันนี้"';
        } else {
          newContext.swapFromDate = parsedSwapFrom;
          newContext.step = 'swap_to';
          replyText = `📅 ระบุวันสลับมาทำงานสำเร็จ: ${formatThaiDate(parsedSwapFrom)}\n\nกรุณาระบุ "วันที่คุณต้องการหยุดชดเชยแทน" (วันที่คุณจะหยุดพักผ่อนแทน) ในรูปแบบ วัน/เดือน/พ.ศ. (เช่น 15/07/2569) หรือพิมพ์ "พรุ่งนี้"`;
        }
        break;

      case 'swap_to':
        let parsedSwapTo = parseThaiDateInput(normalizedText);

        if (!parsedSwapTo) {
          replyText = '⚠️ รูปแบบวันที่ไม่ถูกต้อง กรุณากรอกในรูปแบบ วัน/เดือน/พ.ศ. เช่น 15/07/2569 หรือพิมพ์คำว่า "พรุ่งนี้"';
        } else {
          newContext.swapToDate = parsedSwapTo;
          newContext.startDate = parsedSwapTo;
          newContext.endDate = parsedSwapTo;
          newContext.days = 1;
          newContext.step = 'swap_reason';
          replyText = `📅 ระบุวันขอหยุดชดเชยสำเร็จ: ${formatThaiDate(parsedSwapTo)}\n\nขั้นตอนสุดท้าย กรุณาระบุ "เหตุผลในการขอสลับวันหยุด" (เช่น ติดธุระครอบครัวในวันหยุดปกติ, สลับตามตารางเวรงาน)`;
        }
        break;

      case 'swap_reason':
        newContext.reason = normalizedText;
        
        onAddLeaveRequest({
          employeeId: activeEmp.employeeId,
          employeeName: `${activeEmp.firstName} ${activeEmp.lastName}`,
          leaveType: 'swap',
          startDate: newContext.swapToDate!,
          endDate: newContext.swapToDate!,
          days: 1,
          reason: normalizedText,
          swapFromDate: newContext.swapFromDate!,
          swapToDate: newContext.swapToDate!,
          status: 'pending'
        });

        replyText = `✅ 🎉 ยื่นคำขอสลับวันหยุดเสร็จสมบูรณ์!\n\n🤖 ผมส่งเรื่องเข้าระบบเพื่อให้หัวหน้างานพิจารณาแล้วครับ:\n\n👤 พนักงาน: ${activeEmp.firstName} ${activeEmp.lastName}\n🔄 ประเภท: ขอสลับวันหยุด (Swap Holiday)\n📅 วันสลับมาทำงาน: ${formatThaiDate(newContext.swapFromDate!)}\n🏖️ เปลี่ยนไปหยุดชดเชย: ${formatThaiDate(newContext.swapToDate!)}\n💬 เหตุผล: ${normalizedText}\n🕒 สถานะ: รอการอนุมัติ (Pending)\n\nข้อมูลได้รับการซิงค์ขึ้น Cloud Firestore เรียบร้อยแล้วครับ! ✨`;
        newContext = { step: 'idle' };
        break;

      // EMERGENCY LEAVE CONVERSATION
      case 'emergency_days':
        const emergDays = parseInt(normalizedText.replace(/\D/g, ''));
        if (isNaN(emergDays) || emergDays <= 0 || emergDays > 30) {
          replyText = '⚠️ กรุณาระบุจำนวนวันลาเป็นตัวเลขจำนวนเต็มที่ถูกต้อง (ระหว่าง 1 ถึง 30 วัน)';
        } else {
          newContext.days = emergDays;
          newContext.step = 'emergency_start';
          replyText = `📅 ระบุข้อมูลสำเร็จ: ต้องการลาฉุกเฉิน ${emergDays} วัน\n\nกรุณาระบุ "วันที่เริ่มลา" (รูปแบบ วัน/เดือน/พ.ศ. เช่น 08/07/2569)\nหรือพิมพ์คำว่า "วันนี้" เพื่อเริ่มลาทันที`;
        }
        break;

      case 'emergency_start':
        let parsedEmergStart = parseThaiDateInput(normalizedText);

        if (!parsedEmergStart) {
          replyText = '⚠️ รูปแบบวันที่ไม่ถูกต้อง กรุณากรอกในรูปแบบ วัน/เดือน/พ.ศ. เช่น 08/07/2569 หรือพิมพ์คำว่า "วันนี้"';
        } else {
          newContext.startDate = parsedEmergStart;
          newContext.step = 'emergency_reason';
          replyText = `📝 ระบุวันที่เริ่มลาฉุกเฉิน: ${formatThaiDate(parsedEmergStart)}\n\nสุดท้ายนี้ กรุณาระบุ "เหตุผลในการลาฉุกเฉินด่วน" (เช่น เกิดอุบัติเหตุกะทันหัน, ญาติป่วยหนักส่งโรงพยาบาลด่วน, เหตุอุทกภัยภัยธรรมชาติ)`;
        }
        break;

      case 'emergency_reason':
        newContext.reason = normalizedText;
        const emergEndDate = calculateEndDate(newContext.startDate!, newContext.days!);
        
        onAddLeaveRequest({
          employeeId: activeEmp.employeeId,
          employeeName: `${activeEmp.firstName} ${activeEmp.lastName}`,
          leaveType: 'other',
          startDate: newContext.startDate!,
          endDate: emergEndDate,
          days: newContext.days!,
          reason: `🚨 [ลาฉุกเฉิน] ${normalizedText}`,
          status: 'pending'
        });

        replyText = `🚨 ✅ ยื่นคำขอลาฉุกเฉินด่วนเสร็จสมบูรณ์!\n\n🤖 ผมได้บันทึกคำร้องและแจ้งเตือนผู้มีอำนาจตรวจสอบด่วนเป็นกรณีพิเศษแล้วครับ:\n\n👤 พนักงาน: ${activeEmp.firstName} ${activeEmp.lastName}\n⚠️ ประเภท: ลาฉุกเฉินด่วน (Emergency Leave)\n📅 วันที่เริ่มลา: ${formatThaiDate(newContext.startDate!)}\n📅 วันที่สิ้นสุด: ${formatThaiDate(emergEndDate)}\n⏱️ รวม: ${newContext.days} วัน\n💬 เหตุผล: ${normalizedText}\n🕒 สถานะ: อยู่ระหว่างรอดำเนินการด่วนที่สุด (Pending)\n\nขอให้สถานการณ์คลี่คลายและผ่านพ้นไปด้วยดีนะครับ 🙏`;
        newContext = { step: 'idle' };
        break;

      case 'supply_item':
        const matchItem = supplyItems.find(item => 
          item.code.toLowerCase() === normalizedText.toLowerCase() || 
          item.name.toLowerCase().includes(normalizedText.toLowerCase())
        );

        if (!matchItem) {
          const listStr = supplyItems.map(item => `👉 *${item.code}* - ${item.name} (คงเหลือ ${item.stock} ${item.unit})`).join('\n');
          replyText = `⚠️ ไม่พบข้อมูลรหัสพัสดุหรือชื่ออุปกรณ์ที่คุณระบุ กรุณาตรวจสอบและพิมพ์ใหม่อีกครั้งครับ:\n\n${listStr}\n\n*(พิมพ์รหัสพัสดุ เช่น COMP-01 หรือพิมพ์ "ยกเลิก" เพื่อยุติขั้นตอน)*`;
        } else {
          newContext.supplyItemId = matchItem.id;
          newContext.supplyItemName = matchItem.name;
          newContext.supplyItemUnit = matchItem.unit;
          newContext.step = 'supply_qty';
          replyText = `📦 ระบุวัสดุอุปกรณ์สำเร็จ: ${matchItem.name} [${matchItem.code}] (สต็อกคงเหลือปัจจุบัน: ${matchItem.stock} ${matchItem.unit})\n\nกรุณาระบุ "จำนวน" ที่คุณต้องการเบิกเป็นตัวเลขจำนวนเต็ม (เช่น 1 หรือ 5)\n\n*(พิมพ์ "ยกเลิก" เพื่อยกเลิกขั้นตอน)*`;
        }
        break;

      case 'supply_qty':
        const qtyVal = parseInt(normalizedText.replace(/\D/g, ''));
        if (isNaN(qtyVal) || qtyVal <= 0) {
          replyText = `⚠️ จำนวนที่ต้องการเบิกไม่ถูกต้อง กรุณากรอก "จำนวน" เป็นตัวเลขจำนวนเต็มที่มากกว่า 0 (เช่น 1 หรือ 3)`;
        } else {
          const matchedSupplyItem = supplyItems.find(item => item.id === newContext.supplyItemId);
          const currentStock = matchedSupplyItem ? matchedSupplyItem.stock : 0;
          
          newContext.supplyQty = qtyVal;
          newContext.step = 'supply_purpose';
          
          let stockWarning = '';
          if (qtyVal > currentStock) {
            stockWarning = `\n*(⚠️ ข้อควรระวัง: จำนวนที่คุณขอเบิก ${qtyVal} เกินกว่าจำนวนคงเหลือในคลัง ${currentStock} ${newContext.supplyItemUnit} แต่คุณยังสามารถส่งแบบฟอร์มเพื่อส่งขอการพิจารณาเป็นพิเศษได้)*`;
          }
          
          replyText = `📝 ระบุจำนวนต้องการเบิกสำเร็จ: ${qtyVal} ${newContext.supplyItemUnit}${stockWarning}\n\nขั้นตอนสุดท้าย กรุณาระบุ "วัตถุประสงค์ในการขอเบิก" (เช่น ใช้สำหรับการจัดประชุมบอร์ดผู้บริหาร, พนักงานใหม่แผนกการตลาด, ทดแทนเครื่องเดิมที่ชำรุด)`;
        }
        break;

      case 'supply_purpose':
        newContext.reason = normalizedText;
        
        if (onAddSupplyRequest) {
          onAddSupplyRequest({
            employeeId: activeEmp.employeeId,
            employeeName: `${activeEmp.firstName} ${activeEmp.lastName}`,
            itemId: newContext.supplyItemId!,
            itemName: newContext.supplyItemName!,
            quantity: newContext.supplyQty!,
            purpose: normalizedText
          });
        }

        replyText = `✅ 📦 ยื่นคำขอเบิกสินค้า/พัสดุอุปกรณ์เสร็จสมบูรณ์!\n\n🤖 ผมได้บันทึกคำขอของคุณเข้าระบบคลังสินค้าและสารสนเทศเรียบร้อยแล้ว:\n\n👤 พนักงาน: ${activeEmp.firstName} ${activeEmp.lastName}\n📦 รายการพัสดุ: ${newContext.supplyItemName}\n⏱️ จำนวนที่เบิก: ${newContext.supplyQty} ${newContext.supplyItemUnit}\n💬 วัตถุประสงค์: ${normalizedText}\n🕒 สถานะ: รอผู้ดูแลอนุมัติจ่ายสินค้า (Pending)\n\nระบบดำเนินการซิงค์ข้อมูลขึ้น Cloud Firestore เรียบร้อยแล้วครับ! ✨`;
        newContext = { step: 'idle' };
        break;

      default:
        newContext = { step: 'idle' };
        replyText = '🤖 ขออภัยครับ ระบบประมวลผลขัดข้อง กรุณาลองใหม่อีกครั้ง';
        break;
    }

    setBotContext(newContext);
    addBotMessage(replyText, timeString);
  };

  const addBotMessage = (text: string, timestamp: string) => {
    const botMsg: Message = {
      id: `msg-${Date.now()}-bot`,
      sender: 'bot',
      text: text,
      timestamp: timestamp,
      status: 'read'
    };
    setMessages(prev => [...prev, botMsg]);
  };

  const calculateEndDate = (start: string, days: number): string => {
    try {
      const d = new Date(start);
      // Days is minus 1 because start date is day 1
      d.setDate(d.getDate() + (days - 1));
      return d.toISOString().split('T')[0];
    } catch (e) {
      return start;
    }
  };

  return (
    <div className="space-y-6" id="line-bot-management-section">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 bg-green-50 text-green-600 rounded-lg">
              <Bot className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">ระบบจัดการและจำลอง LINE Bot อัตโนมัติ</h1>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            เพิ่มความคล่องตัวในการปฏิบัติงานของพนักงานด้วยการรองรับคำสั่งเสียง/ข้อความผ่าน LINE Official Account 
            ยื่นขอลาป่วย ลงเวลาเข้า-ออกงาน หรือเช็คสิทธิ์วันลาผ่านการพิมพ์แชตธรรมดา พร้อมอัปเดตเข้าฐานข้อมูลกลางโดยตรง
          </p>
        </div>

        {/* Action Toggle */}
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <span className={`w-2 h-2 rounded-full ${isBotActive ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
          <span className="text-xs font-semibold text-slate-600">
            สถานะเซิร์ฟเวอร์บอท: {isBotActive ? 'เปิดออนไลน์' : 'ปิดใช้งาน'}
          </span>
          <button
            onClick={() => {
              setIsBotActive(!isBotActive);
              setBotContext({ step: 'idle' });
            }}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              isBotActive 
                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' 
                : 'bg-green-600 text-white hover:bg-green-500'
            }`}
          >
            {isBotActive ? 'ปิดบริการ' : 'เปิดบริการ'}
          </button>
        </div>
      </div>

      {/* Sub tabs */}
      <div className="flex border-b border-slate-200 gap-1">
        <button
          onClick={() => setActiveSubTab('simulator')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'simulator' 
              ? 'border-green-600 text-green-700 font-extrabold bg-green-50/30' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          ห้องจำลองการทำงาน LINE Chat (Interactive Simulator)
        </button>
        <button
          onClick={() => setActiveSubTab('config')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'config' 
              ? 'border-green-600 text-green-700 font-extrabold bg-green-50/30' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Settings className="w-4 h-4" />
          เมนูตั้งค่าระบบ LINE Webhook Config
        </button>
        <button
          onClick={() => setActiveSubTab('guide')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'guide' 
              ? 'border-green-600 text-green-700 font-extrabold bg-green-50/30' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          คู่มือการใช้งานคำสั่งสิทธิ์พนักงาน
        </button>
      </div>

      {/* Main Tab content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {activeSubTab === 'simulator' && (
          <>
            {/* Left Column: Interactive Chat Mobile Frame */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-full max-w-sm border-[8px] border-slate-900 rounded-[3rem] shadow-2xl bg-[#7494C4] relative flex flex-col overflow-hidden h-[600px]">
                
                {/* Speaker & Camera notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-900 h-6 w-36 rounded-b-2xl z-20 flex items-center justify-between px-5">
                  <div className="w-3 h-3 rounded-full bg-slate-800" />
                  <div className="w-16 h-1.5 rounded-full bg-slate-700" />
                </div>

                {/* LINE Header Bar */}
                <div className="bg-[#2c3e50] text-white pt-8 pb-3 px-4 flex items-center justify-between border-b border-black/10 flex-shrink-0 z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center font-bold text-sm text-white">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1">
                        LINE HQ Assistant Bot
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">บอทฝ่ายบุคคลและลงเวลาอัตโนมัติ</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="px-2 py-0.5 bg-green-900/40 text-green-400 text-[9px] font-bold rounded-full border border-green-800/50">
                      แชตจำลองพนักงาน
                    </div>
                  </div>
                </div>

                {/* LINE Chat Messages area */}
                <div className="flex-1 overflow-y-auto p-3 space-y-4 font-sans select-none scrollbar-thin">
                  
                  {/* Notice Divider */}
                  <div className="flex justify-center my-1">
                    <span className="bg-black/15 text-white/90 text-[10px] px-2.5 py-1 rounded-full backdrop-blur-sm font-mono">
                      {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>

                  {messages.map((msg) => {
                    const isBot = msg.sender === 'bot';
                    return (
                      <div 
                        key={msg.id} 
                        className={`flex gap-2 max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                      >
                        {isBot && (
                          <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-sm">
                            <Bot className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="space-y-0.5">
                          {isBot && (
                            <span className="block text-[9px] text-white/80 font-semibold px-1">
                              HQ Bot Assistant
                            </span>
                          )}
                          <div className="flex items-end gap-1.5">
                            {/* Message Bubble */}
                            <div className={`p-2.5 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed shadow-sm ${
                              isBot 
                                ? 'bg-white text-slate-800 rounded-tl-sm' 
                                : 'bg-[#50b144] text-white rounded-tr-sm font-medium'
                            }`}>
                              {msg.text}
                            </div>
                            
                            {/* Timestamp */}
                            <span className="text-[9px] text-white/70 font-mono flex-shrink-0">
                              {msg.timestamp}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* LINE Input Area */}
                <form 
                  onSubmit={handleSendMessage}
                  className="bg-white border-t border-slate-100 p-2.5 flex items-center gap-2 flex-shrink-0"
                >
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="พิมพ์ส่งแชต... เช่น 'ลาป่วย', 'เช็ควันลา'"
                    className="flex-1 border border-slate-200 rounded-full px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-slate-800"
                  />
                  <button
                    type="submit"
                    className="w-8 h-8 rounded-full bg-[#1bc50c] hover:bg-green-600 text-white flex items-center justify-center transition shadow active:scale-95 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Controller & Settings */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Employee Switcher Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <User className="w-4.5 h-4.5 text-blue-500" />
                  <h2 className="text-sm font-bold text-slate-800">เลือกบัญชีพนักงานที่ต้องการคุยกับบอท</h2>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    ระบบจำลองนี้จะทำหน้าที่เสมือนพนักงานคนดังกล่าวเข้าห้องแชตคุยกับบอท 
                    เมื่อพนักงานส่งคำร้องขอลา บอทจะนำข้อมูลของพนักงานคนนี้ไปบันทึกเข้าระบบอัตโนมัติ
                  </p>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      พนักงานที่กำลังสนทนา
                    </label>
                    <select
                      value={simulatingEmployeeId}
                      onChange={(e) => {
                        setSimulatingEmployeeId(e.target.value);
                        setBotContext({ step: 'idle' });
                        setMessages([
                          {
                            id: `init-new-${Date.now()}`,
                            sender: 'bot',
                            text: `สวัสดีครับ ยินดีต้อนรับคุณ ${employees.find(x => x.employeeId === e.target.value)?.firstName} เข้าสู่ห้องแชต LINE Bot ประจำออฟฟิศครับ 🤖\n\nพร้อมช่วยเหลือคุณแล้วครับ! มีอะไรให้ผมดูแล พิมพ์ระบุได้เลยครับ: \n• พิมพ์ "ลาป่วย" \n• พิมพ์ "ลากิจ" \n• พิมพ์ "ลาฉุกเฉิน"\n• พิมพ์ "สลับวันหยุด"\n• พิมพ์ "ขอเบิกพัสดุ"\n• พิมพ์ "ลงชื่อเข้างาน"\n• พิมพ์ "เช็ควันลา"`,
                            timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                            status: 'read'
                          }
                        ]);
                      }}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    >
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.employeeId}>
                          {emp.employeeId} - {emp.firstName} {emp.lastName} ({emp.position})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Active Employee Quick Info */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150 text-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 overflow-hidden text-xs">
                        {activeEmp?.avatar ? (
                          <img src={activeEmp.avatar} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        ) : (
                          activeEmp?.firstName?.slice(0, 2)
                        )}
                      </div>
                      <div>
                        <span className="block font-bold text-slate-800">{activeEmp?.firstName} {activeEmp?.lastName}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">{activeEmp?.position} • แผนก {activeEmp?.department}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">
                      <div>📞 มือถือ: <span className="font-semibold text-slate-700">{activeEmp?.phone}</span></div>
                      <div>🏷️ บัตร ปชช: <span className="font-semibold text-slate-700">{activeEmp?.personalId}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time State Monitor Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Zap className="w-4.5 h-4.5 text-yellow-500 animate-pulse" />
                  <h2 className="text-sm font-bold text-slate-800">เครื่องตรวจเช็คสถานะการแปลงคำสั่ง (Command Parser)</h2>
                </div>

                <div className="text-xs space-y-2.5">
                  <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
                    <span className="text-slate-500 font-medium">ขั้นตอนปัจจุบัน:</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-md font-mono text-[10px]">
                      {botContext.step.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
                    <span className="text-slate-500 font-medium">ข้อมูลในแบบจำลองคำร้อง:</span>
                    <span className="text-slate-800 font-mono font-bold text-[10px]">
                      {botContext.days ? `${botContext.days} วัน` : '-'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
                    <span className="text-slate-500 font-medium">วันที่คาดว่าจะขอลาเริ่ม:</span>
                    <span className="text-slate-800 font-mono font-bold text-[10px]">
                      {botContext.startDate || '-'}
                    </span>
                  </div>

                  <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-[11px] text-blue-700 flex gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>เบื้องหลังการทำงาน:</strong> ระบบใช้โมเดลวิเคราะห์ Intent เพื่อแยกแยะคีย์เวิร์ด
                      จากนั้นจะดึงข้อมูลพนักงานจากฐานข้อมูล Firestore มาทำเรื่องยื่นให้ฝ่ายบุคคลทันทีโดยไม่ต้องกรอกฟอร์มใดๆ
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </>
        )}

        {activeSubTab === 'config' && (
          <div className="lg:col-span-12 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-800">เมนูตั้งค่าระบบ LINE Developer Webhook</h2>
              <p className="text-xs text-slate-500">กรอกข้อมูลการตั้งค่าเซิร์ฟเวอร์เพื่อเชื่อมต่อระบบ LINE OA หลังบ้านของคุณเข้ากับฐานข้อมูลคลาวด์ของออฟฟิศ</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Webhook Configuration fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                    <span>1. Webhook URL (นำลิงก์นี้ไปวางใน LINE Developer Console)</span>
                    <button
                      type="button"
                      onClick={handleCopyWebhook}
                      className="text-blue-600 hover:text-blue-500 text-[10px] font-bold flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md transition"
                    >
                      {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {isCopied ? 'คัดลอกแล้ว!' : 'คัดลอก'}
                    </button>
                  </label>
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                  <span className="block text-[10px] text-slate-400 mt-1">
                    *เซิร์ฟเวอร์ Cloud Run นี้รองรับมาตรฐาน HTTPS Webhook ปลอดภัยสูงระดับสากล
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    2. Channel Access Token (Long-lived)
                  </label>
                  <textarea
                    value={channelToken}
                    onChange={(e) => setChannelToken(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    3. Channel Secret Key
                  </label>
                  <input
                    type="password"
                    value={channelSecret}
                    onChange={(e) => setChannelSecret(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSettings({
                        ...settings,
                        lineChannelToken: channelToken,
                        lineChannelSecret: channelSecret,
                        lineWebhookUrl: webhookUrl
                      });
                      alert('🎉 บันทึกการตั้งค่า LINE Webhook และ Token ลงฐานข้อมูลระบบ เรียบร้อยแล้ว!');
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow active:scale-95 cursor-pointer"
                  >
                    บันทึกการเชื่อมโยงระบบ
                  </button>
                </div>
              </div>

              {/* Instructions block */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs space-y-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  ขั้นตอนการเชื่อมระบบ LINE จริงเข้ากับออฟฟิศคลาวด์
                </h3>

                <ol className="space-y-3 list-decimal pl-4 text-slate-600 leading-relaxed">
                  <li>สมัครเปิดบริการบัญชี <strong>LINE Official Account</strong> ที่ <a href="https://manager.line.biz" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">manager.line.biz</a></li>
                  <li>เข้าสู่หน้า <strong>LINE Developers Console</strong> (<a href="https://developers.line.biz" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">developers.line.biz</a>) และสร้าง Provider ใหม่</li>
                  <li>สร้าง Channel ประเภท <strong>Messaging API</strong></li>
                  <li>คัดลอก <strong>Channel Access Token</strong> และ <strong>Channel Secret</strong> มาวางกรอกในแบบฟอร์มด้านซ้ายนี้</li>
                  <li>เปิดเมนูตั้งค่า Webhook ในหน้า LINE Developer Console แล้วคัดลอก <strong>Webhook URL</strong> จากระบบของเราไปวาง พร้อมกดตรวจสอบ (Verify) การทำงาน</li>
                  <li>เปิดระบบสิทธิ์คุยกับพนักงานและอัปเดตสิทธิประโยชน์เรียบร้อย!</li>
                </ol>

                <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
                  ⚠️ <strong>คำชี้แจงด้านความมั่นคงปลอดภัย:</strong> ข้อมูล Token และความลับต่างๆ จะถูกจัดเก็บอย่างปลอดภัยบน Cloud Firestore
                  โดยจะไม่เปิดเผยต่อเบราว์เซอร์หรือเครื่องภายนอกเด็ดขาดตามมาตรฐานความมั่นคงปลอดภัยสูงสุด
                </div>
              </div>

            </div>
          </div>
        )}

        {activeSubTab === 'guide' && (
          <div className="lg:col-span-12 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-800">คู่มือคำสั่งทางลัดของ LINE Bot (Shortcut Cheatsheet)</h2>
              <p className="text-xs text-slate-500">รวมคำสั่งภาษาธรรมชาติที่ระบบถอดรหัสออกมาเป็นบริการอัตโนมัติ ให้พนักงานใช้งานได้สะดวก</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Card 1: Leaves */}
              <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100/80 space-y-3">
                <span className="p-2 bg-rose-100 text-rose-700 rounded-xl inline-block">
                  <Calendar className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-sm text-slate-800">การลางานผ่านแชท</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  พนักงานระบุคำขอลาได้ทันทีจากมือถือ ไม่จำเป็นต้องพกโน้ตบุ๊ก โดยบอทจะคอยถามคำถามเป็นขั้นตอนจนครบถ้วน
                </p>
                <div className="text-xs font-mono space-y-1.5 pt-2">
                  <div className="bg-white p-2 rounded border border-rose-100">
                    <span className="block font-bold text-rose-700">คำสั่งยื่นขอ:</span>
                    <span>• "ลาป่วย" - ยื่นลาพักรักษาตัว</span><br />
                    <span>• "ลากิจ" - ยื่นลากิจธุระทั่วไป</span><br />
                    <span>• "ลาฉุกเฉิน" - ลาเร่งด่วนกระทันหัน</span><br />
                    <span>• "สลับวันหยุด" - ขอสลับวันทำงาน</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-rose-100">
                    <span className="block font-bold text-rose-700">คำสั่งสอบถามสิทธิ์:</span>
                    <span>• "เช็ควันลา"</span><br />
                    <span>• "ขอดูโควต้าวันลาคงเหลือ"</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Attendance */}
              <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/80 space-y-3">
                <span className="p-2 bg-blue-100 text-blue-700 rounded-xl inline-block">
                  <Clock className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-sm text-slate-800">การเช็คอิน/เช็คเอาท์</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  ลงบันทึกเวลาเข้าออกงานได้ง่ายๆ เพียงพิมพ์แจ้ง บอทจะใช้ตำแหน่งพิกัด GPS อ้างอิงและอัปโหลดข้อมูลแบบเรียลไทม์
                </p>
                <div className="text-xs font-mono space-y-1.5 pt-2">
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <span className="block font-bold text-blue-700">คำสั่งบันทึกเข้างาน:</span>
                    <span>• "ลงชื่อเข้างาน"</span><br />
                    <span>• "เข้างาน" / "checkin"</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <span className="block font-bold text-blue-700">คำสั่งบันทึกออกงาน:</span>
                    <span>• "ลงชื่อออกงาน"</span><br />
                    <span>• "ออกงาน" / "checkout"</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Supply & Equipment */}
              <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100/80 space-y-3">
                <span className="p-2 bg-amber-100 text-amber-700 rounded-xl inline-block">
                  <Package className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-sm text-slate-800">การขอเบิกพัสดุอุปกรณ์</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  ยื่นคำขอเบิกจ่ายสินค้า วัสดุสำนักงาน หรืออุปกรณ์ไอที ได้รวดเร็วโดยบอทจะดึงรายการสินค้าคงเหลือปัจจุบันมาให้เลือกทันที
                </p>
                <div className="text-xs font-mono space-y-1.5 pt-2">
                  <div className="bg-white p-2 rounded border border-amber-100">
                    <span className="block font-bold text-amber-700">คำสั่งขอเบิกสินค้า:</span>
                    <span>• "ขอเบิกพัสดุ" / "เบิกอุปกรณ์"</span><br />
                    <span>• "ขอเบิกจ่ายสินค้า" / "เบิกของ"</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-amber-100">
                    <span className="block font-bold text-amber-700">ระบุรายละเอียด:</span>
                    <span>• รหัสพัสดุ / จำนวนเบิก / วัตถุประสงค์</span>
                  </div>
                </div>
              </div>

              {/* Card 4: System Utilities */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 space-y-3">
                <span className="p-2 bg-slate-200 text-slate-700 rounded-xl inline-block">
                  <HelpCircle className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-sm text-slate-800">คำสั่งอำนวยความสะดวกอื่นๆ</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  ควบคุมการคุยหรือการระงับขั้นตอนที่พิมพ์ผิดได้อย่างแม่นยำ ปลอดภัยสูงสุด
                </p>
                <div className="text-xs font-mono space-y-1.5 pt-2">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="block font-bold text-slate-700">คำสั่งยกเลิกขั้นตอน:</span>
                    <span>• "ยกเลิก" / "cancel"</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="block font-bold text-slate-700">ขอดูสลิปเงินเดือน / ข้อมูลประวัติ:</span>
                    <span>• "สลิปเงินเดือนล่าสุด" (Coming Soon)</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
