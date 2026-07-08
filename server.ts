import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  addDoc 
} from 'firebase/firestore';

const PORT = 3000;

// Initialize Express
const app = express();
app.use(express.json());

// Initialize Firebase Client SDK for server-side use
let db: any = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const firebaseConfig = {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId
    };
    const firebaseApp = initializeApp(firebaseConfig);
    db = initializeFirestore(firebaseApp, {}, config.firestoreDatabaseId || '(default)');
    console.log('Backend server connected to Firestore:', config.firestoreDatabaseId || '(default)');
  } else {
    console.warn('firebase-applet-config.json not found. Database features in backend may be offline.');
  }
} catch (error) {
  console.error('Error initializing Firebase in server:', error);
}

// ---------------------------------------------------------
// Helper: Send LINE Bot Reply Message
// ---------------------------------------------------------
async function sendLineReply(replyToken: string, channelToken: string, messages: any[]) {
  if (!channelToken) {
    console.error('LINE Channel Access Token is missing.');
    return;
  }
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channelToken}`
      },
      body: JSON.stringify({
        replyToken,
        messages
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error('Failed to send LINE reply:', response.status, errText);
    } else {
      console.log('Successfully sent LINE reply.');
    }
  } catch (err) {
    console.error('Error sending reply via LINE API:', err);
  }
}

// ---------------------------------------------------------
// API: LINE Developer Webhook Endpoint
// ---------------------------------------------------------
app.post('/api/line/webhook', async (req, res) => {
  console.log('Received webhook event from LINE.');
  
  // 1. Immediately return 200 OK as required by LINE Platform
  res.status(200).json({ status: 'ok' });

  const { events } = req.body;
  if (!events || events.length === 0) {
    console.log('Webhook verification call or empty events verified.');
    return;
  }

  if (!db) {
    console.error('Firestore is not initialized.');
    return;
  }

  try {
    // 2. Fetch current settings
    const settingsDocRef = doc(db, 'settings', 'system');
    const settingsSnap = await getDoc(settingsDocRef);
    
    let channelToken = '';
    let workHoursStart = '08:30';
    let workHoursEnd = '17:30';
    let lateThresholdMins = 15;
    let hasOvertime = false;
    let otStartTime = '18:00';
    let limits = { sick: 30, annual: 12, personal: 6 };

    if (settingsSnap.exists()) {
      const s = settingsSnap.data();
      channelToken = s.lineChannelToken || '';
      workHoursStart = s.workHoursStart || '08:30';
      workHoursEnd = s.workHoursEnd || '17:30';
      lateThresholdMins = s.lateThresholdMins !== undefined ? s.lateThresholdMins : 15;
      hasOvertime = s.hasOvertime || false;
      otStartTime = s.otStartTime || '18:00';
      if (s.maxLeaveDays) {
        limits = { ...limits, ...s.maxLeaveDays };
      }
    }

    // Fallback token for local testing / unconfigured settings
    if (!channelToken) {
      channelToken = 'eyJhY2Nlc3NUb2tlbiI6ImxpbmUtYm90LWNoYW5uZWwtYWNjZXNzLXRva2VuLXNpbXVsYXRlZC0yMDI2In0=';
    }

    // 3. Process each event
    for (const event of events) {
      if (event.type !== 'message' || event.message.type !== 'text') {
        continue;
      }

      const replyToken = event.replyToken;
      const userId = event.source?.userId;
      const text = (event.message?.text || '').trim();

      if (!replyToken || !userId) continue;

      console.log(`Processing message from User [${userId}]: "${text}"`);

      // 4. Find employee matching lineUserId
      const employeesCol = collection(db, 'employees');
      const employeesSnap = await getDocs(employeesCol);
      let matchedEmployee: any = null;
      let matchedEmployeeDocId = '';

      employeesSnap.forEach((docSnap) => {
        const emp = docSnap.data();
        if (emp.lineUserId === userId) {
          matchedEmployee = emp;
          matchedEmployeeDocId = docSnap.id;
        }
      });

      // CASE A: User is not linked yet
      if (!matchedEmployee) {
        // Try to match employee ID pattern (e.g. EMP-001 or link EMP-001 or เชื่อมต่อ EMP-001)
        const empIdMatch = text.match(/EMP-\d+/i);
        
        if (empIdMatch) {
          const empIdInput = empIdMatch[0].toUpperCase();
          let empToLink: any = null;
          let empToLinkDocId = '';

          employeesSnap.forEach((docSnap) => {
            const emp = docSnap.data();
            if (emp.employeeId?.toUpperCase() === empIdInput) {
              empToLink = emp;
              empToLinkDocId = docSnap.id;
            }
          });

          if (empToLink) {
            // Update Firestore with the LINE userId and status
            await updateDoc(doc(db, 'employees', empToLinkDocId), {
              lineUserId: userId,
              verificationStatus: 'verified'
            });

            await sendLineReply(replyToken, channelToken, [
              {
                type: 'text',
                text: `เชื่อมโยงบัญชีสำเร็จแล้วครับ! 🎉\n\nยินดีต้อนรับคุณ ${empToLink.firstName} ${empToLink.lastName} (${empToLink.position}) เข้าสู่ระบบช่วยเหลือพนักงานออฟฟิศผ่าน LINE Bot ประจำองค์กรครับ\n\nท่านสามารถพิมพ์คำสั่งต่อไปนี้เพื่อสั่งการระบบได้ทันที:\n• พิมพ์ "เข้างาน" เพื่อลงเวลาเข้างาน\n• พิมพ์ "ออกงาน" เพื่อลงเวลาออกงาน\n• พิมพ์ "เช็ควันลา" เพื่อตรวจสอบโควตาวันลาคงเหลือ\n• พิมพ์ "ขอลา" เพื่อส่งใบลาเข้าระบบ`
              }
            ]);
          } else {
            await sendLineReply(replyToken, channelToken, [
              {
                type: 'text',
                text: `❌ ไม่พบรหัสพนักงาน "${empIdInput}" ในระบบฐานข้อมูลของบริษัท กรุณาตรวจสอบรหัสพนักงานให้ถูกต้องและลองพิมพ์ใหม่อีกครั้งครับ`
              }
            ]);
          }
        } else {
          // Send linking instructions
          await sendLineReply(replyToken, channelToken, [
            {
              type: 'text',
              text: `สวัสดีครับ ยินดีต้อนรับสู่ระบบช่วยเหลือพนักงานผ่าน LINE Bot 🤖\n\n⚠️ ขณะนี้บัญชี LINE ของคุณยังไม่ได้เชื่อมโยงเข้ากับระบบพนักงาน\n\n👉 กรุณาเชื่อมโยงบัญชีโดยการพิมพ์รหัสพนักงานของคุณ เช่น:\n\nEMP-001\n\n(พิมพ์ส่งรหัสพนักงานของคุณเข้ามาได้เลยครับ)`
            }
          ]);
        }
      } 
      // CASE B: User is already linked, process standard commands
      else {
        const textLower = text.toLowerCase();

        // COMMAND: "เช็ควันลา" / "วันลา" / "โควตา"
        if (textLower.includes('เช็ควันลา') || textLower.includes('วันลา') || textLower.includes('โควตา') || textLower === 'leave') {
          const leavesCol = collection(db, 'leaveRequests');
          const leavesSnap = await getDocs(leavesCol);
          
          let sickUsed = 0;
          let annualUsed = 0;
          let personalUsed = 0;

          leavesSnap.forEach((docSnap) => {
            const leave = docSnap.data();
            if (leave.employeeId === matchedEmployee.employeeId && leave.status === 'approved') {
              const days = Number(leave.days) || 0;
              if (leave.leaveType === 'sick') sickUsed += days;
              else if (leave.leaveType === 'annual') annualUsed += days;
              else if (leave.leaveType === 'personal') personalUsed += days;
            }
          });

          const responseText = `📊 สรุปโควตาวันลาของคุณ ${matchedEmployee.firstName} ${matchedEmployee.lastName}\n\n` +
                               `• ลาป่วย: ใช้ไป ${sickUsed}/${limits.sick} วัน (คงเหลือ ${limits.sick - sickUsed} วัน)\n` +
                               `• ลาพักร้อน: ใช้ไป ${annualUsed}/${limits.annual} วัน (คงเหลือ ${limits.annual - annualUsed} วัน)\n` +
                               `• ลากิจ: ใช้ไป ${personalUsed}/${limits.personal} วัน (คงเหลือ ${limits.personal - personalUsed} วัน)`;

          await sendLineReply(replyToken, channelToken, [{ type: 'text', text: responseText }]);
        } 
        // COMMAND: "เข้างาน" / "ลงชื่อเข้างาน" / "เช็คอิน" / "check in"
        else if (textLower.includes('เข้างาน') || textLower.includes('ลงชื่อเข้างาน') || textLower.includes('checkin') || textLower.includes('check in') || textLower === 'clock in') {
          // Bangkok Time calculation (UTC+7)
          const now = new Date();
          const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
          const thailandTime = new Date(utc + (3600000 * 7));
          
          const dateStr = thailandTime.toISOString().split('T')[0]; // YYYY-MM-DD
          const timeStr = thailandTime.toTimeString().split(' ')[0]; // HH:mm:ss

          // Check if already checked in today
          const attCol = collection(db, 'attendanceRecords');
          const attSnap = await getDocs(attCol);
          let todayRecord: any = null;

          attSnap.forEach((docSnap) => {
            const r = docSnap.data();
            if (r.employeeId === matchedEmployee.employeeId && r.date === dateStr && (r.type === 'clock_in' || r.type === 'late')) {
              todayRecord = r;
            }
          });

          if (todayRecord) {
            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `⏰ คุณได้บันทึกเวลาเข้างานของวันนี้เรียบร้อยแล้วครับ!\nเวลาเข้างาน: ${todayRecord.time} น. / สถานะ: ${todayRecord.type === 'late' ? 'สาย' : 'ปกติ'}`
            }]);
          } else {
            // Determine lateness
            let isLate = false;
            const [startH, startM] = workHoursStart.split(':').map(Number);
            const [checkH, checkM] = timeStr.split(':').map(Number);
            const startTotal = (startH * 60) + startM + lateThresholdMins;
            const checkTotal = (checkH * 60) + checkM;

            if (checkTotal > startTotal) {
              isLate = true;
            }

            const newRecord = {
              id: 'att-' + Date.now(),
              employeeId: matchedEmployee.employeeId,
              employeeName: `${matchedEmployee.firstName} ${matchedEmployee.lastName}`,
              date: dateStr,
              time: timeStr,
              type: isLate ? 'late' : 'clock_in',
              notes: 'ลงเวลาผ่าน LINE Bot (ระบบอัตโนมัติ)',
              recordedBy: 'LINE Bot'
            };

            await addDoc(collection(db, 'attendanceRecords'), newRecord);

            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `✅ บันทึกเวลาเข้างานสำเร็จ! ⏰\n\nพนักงาน: ${matchedEmployee.firstName} ${matchedEmployee.lastName}\nวันที่: ${dateStr}\nเวลาเข้างาน: ${timeStr.substring(0, 5)} น.\nสถานะ: ${isLate ? '🔴 เข้างานสาย' : '🟢 ปกติ'}\n\nขอให้มีความสุขกับการทำงานในวันนี้ครับ! 💼`
            }]);
          }
        } 
        // COMMAND: "ออกงาน" / "ลงชื่อออกงาน" / "เช็คเอาท์" / "check out"
        else if (textLower.includes('ออกงาน') || textLower.includes('ลงชื่อออกงาน') || textLower.includes('checkout') || textLower.includes('check out') || textLower === 'clock out') {
          // Bangkok Time calculation (UTC+7)
          const now = new Date();
          const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
          const thailandTime = new Date(utc + (3600000 * 7));
          
          const dateStr = thailandTime.toISOString().split('T')[0]; // YYYY-MM-DD
          const timeStr = thailandTime.toTimeString().split(' ')[0]; // HH:mm:ss

          const attCol = collection(db, 'attendanceRecords');
          const attSnap = await getDocs(attCol);
          let todayRecord: any = null;

          attSnap.forEach((docSnap) => {
            const r = docSnap.data();
            if (r.employeeId === matchedEmployee.employeeId && r.date === dateStr && r.type === 'clock_out') {
              todayRecord = r;
            }
          });

          if (todayRecord) {
            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `⏰ คุณได้บันทึกเวลาออกงานของวันนี้เรียบร้อยแล้วครับ!\nเวลาออกงาน: ${todayRecord.time.substring(0, 5)} น.`
            }]);
          } else {
            const newRecord = {
              id: 'att-' + Date.now(),
              employeeId: matchedEmployee.employeeId,
              employeeName: `${matchedEmployee.firstName} ${matchedEmployee.lastName}`,
              date: dateStr,
              time: timeStr,
              type: 'clock_out',
              notes: 'ลงเวลาออกงานผ่าน LINE Bot (ระบบอัตโนมัติ)',
              recordedBy: 'LINE Bot'
            };

            await addDoc(collection(db, 'attendanceRecords'), newRecord);

            // Auto overtime calculation
            let otText = '';
            if (hasOvertime) {
              const [otH, otM] = otStartTime.split(':').map(Number);
              const [checkH, checkM] = timeStr.split(':').map(Number);
              const otTotal = (otH * 60) + otM;
              const checkTotal = (checkH * 60) + checkM;
              
              if (checkTotal > otTotal) {
                const diffMins = checkTotal - otTotal;
                const computedOt = Math.round((diffMins / 60) * 2) / 2; // round to nearest 0.5 hours
                
                if (computedOt > 0) {
                  const otRecord = {
                    id: 'att-ot-' + (Date.now() + 1),
                    employeeId: matchedEmployee.employeeId,
                    employeeName: `${matchedEmployee.firstName} ${matchedEmployee.lastName}`,
                    date: dateStr,
                    time: timeStr,
                    type: 'overtime',
                    notes: 'บันทึก OT อัตโนมัติจากการออกงานผ่าน LINE Bot',
                    otHours: computedOt,
                    recordedBy: 'LINE Bot'
                  };
                  await addDoc(collection(db, 'attendanceRecords'), otRecord);
                  otText = `\n🔥 บันทึกค่าล่วงเวลา (OT) อัตโนมัติ: ${computedOt} ชั่วโมง`;
                }
              }
            }

            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `✅ บันทึกเวลาออกงานสำเร็จ! 🚪\n\nพนักงาน: ${matchedEmployee.firstName} ${matchedEmployee.lastName}\nวันที่: ${dateStr}\nเวลาออกงาน: ${timeStr.substring(0, 5)} น.${otText}\n\nเดินทางกลับบ้านและพักผ่อนให้เต็มที่ครับ! 🏡`
            }]);
          }
        } 
        // COMMAND: "ขอลา [ประเภทลา] [จำนวนวัน] วัน ตั้งแต่วันที่ [วว/ดด/ปปปป] เหตุผล [เหตุผล]"
        else if (textLower.startsWith('ขอลา') || textLower.startsWith('/ขอลา')) {
          const leaveMatch = text.match(/ขอลา\s+(ลาป่วย|ลากิจ|ลาพักร้อน|ลาพักผ่อน)\s+(\d+)\s+วัน\s+ตั้งแต่วันที่\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+เหตุผล\s+(.+)/i);
          
          if (leaveMatch) {
            const thaiType = leaveMatch[1];
            const daysCount = parseInt(leaveMatch[2], 10);
            const dateInput = leaveMatch[3]; // DD/MM/YYYY
            const reasonInput = leaveMatch[4];

            // Map Thai types to English LeaveType
            let leaveType: any = 'sick';
            if (thaiType === 'ลากิจ') leaveType = 'personal';
            else if (thaiType === 'ลาพักร้อน' || thaiType === 'ลาพักผ่อน') leaveType = 'annual';

            // Parse DD/MM/YYYY to YYYY-MM-DD
            const dateParts = dateInput.split('/');
            let startDate = '';
            if (dateParts.length === 3) {
              const day = dateParts[0].padStart(2, '0');
              const month = dateParts[1].padStart(2, '0');
              const year = dateParts[2];
              let yearNum = parseInt(year, 10);
              if (yearNum > 2400) yearNum -= 543; // Handle Thai BE years gracefully
              startDate = `${yearNum}-${month}-${day}`;
            } else {
              const now = new Date();
              const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
              const thailandTime = new Date(utc + (3600000 * 7));
              startDate = thailandTime.toISOString().split('T')[0];
            }

            // Calculate endDate (add days-1)
            const sDate = new Date(startDate);
            const eDate = new Date(sDate.getTime() + ((daysCount - 1) * 24 * 60 * 60 * 1000));
            const endDate = eDate.toISOString().split('T')[0];

            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const thailandTime = new Date(utc + (3600000 * 7));
            const todayStr = thailandTime.toISOString().split('T')[0];

            const newLeave = {
              id: `leave-${Date.now()}`,
              employeeId: matchedEmployee.employeeId,
              employeeName: `${matchedEmployee.firstName} ${matchedEmployee.lastName}`,
              leaveType,
              startDate,
              endDate,
              days: daysCount,
              reason: reasonInput,
              status: 'pending',
              createdAt: todayStr
            };

            await addDoc(collection(db, 'leaveRequests'), newLeave);

            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `✅ ส่งใบอนุมัติลาพักผ่อนสำเร็จแล้วครับ! 📨\n\nรายละเอียดใบลา:\n• ผู้ลา: ${matchedEmployee.firstName} ${matchedEmployee.lastName}\n• ประเภท: ${thaiType}\n• จำนวน: ${daysCount} วัน\n• ตั้งแต่วันที่: ${startDate} ถึง ${endDate}\n• เหตุผล: ${reasonInput}\n\n⏳ ขณะนี้ระบบได้ส่งเอกสารเพื่อรออนุมัติไปยังฝ่ายบุคคล (HR) และผู้จัดการของคุณเรียบร้อยแล้ว`
            }]);
          } else {
            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `📝 วิธีการส่งใบลาหยุดผ่าน LINE Bot:\n\nกรุณาพิมพ์ข้อความส่งในรูปแบบด้านล่างนี้:\n\nขอลา [ประเภทลา] [จำนวนวัน] วัน ตั้งแต่วันที่ [วว/ดด/ปปปป] เหตุผล [ระบุเหตุผล]\n\n👉 ตัวอย่างคำลา:\n• ขอลา ลาป่วย 1 วัน ตั้งแต่วันที่ 08/07/2026 เหตุผล เป็นไข้ตัวร้อน\n• ขอลา ลากิจ 2 วัน ตั้งแต่วันที่ 15/07/2026 เหตุผล ไปทำธุระต่างจังหวัด\n• ขอลา ลาพักร้อน 3 วัน ตั้งแต่วันที่ 20/07/2026 เหตุผล ไปพักผ่อนครอบครัว`
            }]);
          }
        }
        // COMMAND: HELP / INFO / GREETINGS
        else {
          await sendLineReply(replyToken, channelToken, [{
            type: 'text',
            text: `ยินดีต้อนรับคุณ ${matchedEmployee.firstName} 🤖\n\nท่านสามารถสั่งการระบบด้วยข้อความคำสั่งต่อไปนี้ได้ทันทีครับ:\n\n⏰ ระบบลงชื่อเข้า-ออกงาน\n• พิมพ์ "เข้างาน" หรือ "ลงชื่อเข้างาน"\n• พิมพ์ "ออกงาน" หรือ "ลงชื่อออกงาน"\n\n📊 โควตาวันลาหยุดพนักงาน\n• พิมพ์ "เช็ควันลา" เพื่อตรวจสอบสิทธิ์คงเหลือ\n\n📝 การยื่นเอกสารขอลาพักผ่อน\n• พิมพ์ "ขอลา" เพื่อดูวิธีการยื่นใบลา`
          }]);
        }
      }
    }
  } catch (err) {
    console.error('Error handling webhook events:', err);
  }
});

// ---------------------------------------------------------
// API: Status
// ---------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', database: db ? 'online' : 'offline' });
});

// ---------------------------------------------------------
// Vite Server / Static Files Hosting
// ---------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Running server in DEVELOPMENT mode with Vite Middleware.');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Running server in PRODUCTION mode with compiled assets.');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OfficeConnect Full-Stack Server running on port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
