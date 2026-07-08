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
    console.log('Webhook test connection or empty events array verified.');
    return;
  }

  if (!db) {
    console.error('Firestore is not initialized.');
    return;
  }

  try {
    // 2. Fetch current Line channel secret and token from SystemSettings
    const settingsDocRef = doc(db, 'settings', 'system');
    const settingsSnap = await getDoc(settingsDocRef);
    let channelToken = 'eyJhY2Nlc3NUb2tlbiI6ImxpbmUtYm90LWNoYW5uZWwtYWNjZXNzLXRva2VuLXNpbXVsYXRlZC0yMDI2In0=';
    
    if (settingsSnap.exists()) {
      const s = settingsSnap.data();
      if (s.lineChannelToken) {
        channelToken = s.lineChannelToken;
      }
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
        // Try to match "link EMP-XXX" or "เชื่อมต่อ EMP-XXX"
        const linkMatch = text.match(/link\s+(EMP-\d+)/i) || text.match(/เชื่อมต่อ\s+(EMP-\d+)/i);
        
        if (linkMatch) {
          const empIdInput = linkMatch[1].toUpperCase();
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
                text: `เชื่อมโยงบัญชีสำเร็จแล้วครับ! 🎉\n\nยินดีต้อนรับคุณ ${empToLink.firstName} ${empToLink.lastName} (${empToLink.position}) เข้าสู่ระบบช่วยเหลือพนักงานออฟฟิศผ่าน LINE Bot ประจำองค์กรครับ\n\nท่านสามารถพิมพ์คำสั่งต่อไปนี้เพื่อสั่งการระบบได้ทันที:\n• พิมพ์ "เข้างาน" หรือ "ออกงาน" เพื่อลงเวลา\n• พิมพ์ "เช็ควันลา" เพื่อตรวจสอบโควตาวันลา\n• พิมพ์ "ขอลา" เพื่อส่งใบลาเข้าระบบ`
              }
            ]);
          } else {
            await sendLineReply(replyToken, channelToken, [
              {
                type: 'text',
                text: `❌ ไม่พบรหัสพนักงาน "${empIdInput}" ในฐานข้อมูลระบบของบริษัท กรุณาตรวจสอบรหัสพนักงานให้ถูกต้องและลองพิมพ์ใหม่อีกครั้งครับ`
              }
            ]);
          }
        } else {
          // Send linking guidance
          await sendLineReply(replyToken, channelToken, [
            {
              type: 'text',
              text: `สวัสดีครับ ยินดีต้อนรับสู่ระบบช่วยเหลือพนักงานผ่าน LINE Bot 🤖\n\n⚠️ ขณะนี้บัญชี LINE ของคุณยังไม่ได้รับการเชื่อมโยงเข้ากับระบบพนักงาน\n\n👉 กรุณาเชื่อมโยงบัญชีของคุณโดยการพิมพ์รหัสพนักงานของคุณในรูปแบบดังนี้:\n\nlink รหัสพนักงาน\n\nเช่น พิมพ์: link EMP-001\n(เปลี่ยน EMP-001 เป็นรหัสของคุณ)`
            }
          ]);
        }
      } 
      // CASE B: User is already linked, process standard commands
      else {
        const textLower = text.toLowerCase();

        // COMMAND: "เช็ควันลา" / "วันลา"
        if (textLower.includes('เช็ควันลา') || textLower.includes('วันลา') || textLower.includes('โควตา')) {
          const leavesCol = collection(db, 'leave_requests');
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

          // System Limits
          let limits = { sick: 30, annual: 12, personal: 6 };
          if (settingsSnap.exists()) {
            const s = settingsSnap.data();
            if (s.maxLeaveDays) {
              limits = { ...limits, ...s.maxLeaveDays };
            }
          }

          const responseText = `📊 สรุปโควตาวันลาของคุณ ${matchedEmployee.firstName} ${matchedEmployee.lastName}\n\n` +
                               `• ลาป่วย: ใช้ไป ${sickUsed}/${limits.sick} วัน (คงเหลือ ${limits.sick - sickUsed} วัน)\n` +
                               `• ลาพักร้อน: ใช้ไป ${annualUsed}/${limits.annual} วัน (คงเหลือ ${limits.annual - annualUsed} วัน)\n` +
                               `• ลากิจ: ใช้ไป ${personalUsed}/${limits.personal} วัน (คงเหลือ ${limits.personal - personalUsed} วัน)`;

          await sendLineReply(replyToken, channelToken, [{ type: 'text', text: responseText }]);
        } 
        // COMMAND: "ลงชื่อเข้างาน" / "เข้างาน"
        else if (textLower.includes('เข้างาน') || textLower.includes('ลงชื่อเข้างาน') || textLower.includes('checkin') || textLower.includes('check in')) {
          const now = new Date();
          // Thailand Local Time adjustments (Offset +7)
          const localTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
          const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
          const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm

          // Check if already checked in today
          const attCol = collection(db, 'attendance_records');
          const attSnap = await getDocs(attCol);
          let todayRecord: any = null;
          let todayRecordDocId = '';

          attSnap.forEach((docSnap) => {
            const r = docSnap.data();
            if (r.employeeId === matchedEmployee.employeeId && r.date === dateStr) {
              todayRecord = r;
              todayRecordDocId = docSnap.id;
            }
          });

          if (todayRecord && todayRecord.checkIn) {
            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `⏰ คุณได้บันทึกเวลาเข้างานของวันนี้เรียบร้อยแล้วครับ!\nเวลาเข้างาน: ${todayRecord.checkIn} น. / สถานะ: ${todayRecord.status === 'late' ? 'สาย' : 'ปกติ'}`
            }]);
          } else {
            // Determine Status
            let status = 'normal';
            let threshold = 15; // 15 mins
            let workHoursStart = '08:30';

            if (settingsSnap.exists()) {
              const s = settingsSnap.data();
              if (s.workHoursStart) workHoursStart = s.workHoursStart;
              if (s.lateThresholdMins !== undefined) threshold = s.lateThresholdMins;
            }

            const [startH, startM] = workHoursStart.split(':').map(Number);
            const [checkH, checkM] = timeStr.split(':').map(Number);
            const startTotal = (startH * 60) + startM + threshold;
            const checkTotal = (checkH * 60) + checkM;

            if (checkTotal > startTotal) {
              status = 'late';
            }

            const newRecord = {
              employeeId: matchedEmployee.employeeId,
              employeeName: `${matchedEmployee.firstName} ${matchedEmployee.lastName}`,
              date: dateStr,
              checkIn: timeStr,
              checkOut: '',
              status,
              overtimeMins: 0,
              location: 'LINE Bot API',
              device: 'LINE Mobile App',
              notes: 'ลงเวลาผ่าน LINE Official Account'
            };

            await addDoc(collection(db, 'attendance_records'), newRecord);

            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `✅ บันทึกเวลาเข้างานสำเร็จ! ⏰\n\nพนักงาน: ${matchedEmployee.firstName} ${matchedEmployee.lastName}\nวันที่: ${dateStr}\nเวลาเข้างาน: ${timeStr} น.\nสถานะ: ${status === 'late' ? '🔴 เข้างานสาย' : '🟢 ปกติ'}\n\nขอให้มีความสุขกับการทำงานในวันนี้ครับ! 💼`
            }]);
          }
        } 
        // COMMAND: "ลงชื่อออกงาน" / "ออกงาน"
        else if (textLower.includes('ออกงาน') || textLower.includes('ลงชื่อออกงาน') || textLower.includes('checkout') || textLower.includes('check out')) {
          const now = new Date();
          const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
          const timeStr = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm

          const attCol = collection(db, 'attendance_records');
          const attSnap = await getDocs(attCol);
          let todayRecord: any = null;
          let todayRecordDocId = '';

          attSnap.forEach((docSnap) => {
            const r = docSnap.data();
            if (r.employeeId === matchedEmployee.employeeId && r.date === dateStr) {
              todayRecord = r;
              todayRecordDocId = docSnap.id;
            }
          });

          if (todayRecord) {
            await updateDoc(doc(db, 'attendance_records', todayRecordDocId), {
              checkOut: timeStr
            });

            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `✅ บันทึกเวลาออกงานสำเร็จ! 🚪\n\nพนักงาน: ${matchedEmployee.firstName} ${matchedEmployee.lastName}\nวันที่: ${dateStr}\nเวลาออกงาน: ${timeStr} น.\n\nพักผ่อนให้เต็มที่และเดินทางกลับบ้านด้วยความปลอดภัยครับ! 🏡`
            }]);
          } else {
            // Create a checkout record even if no checkin existed
            const newRecord = {
              employeeId: matchedEmployee.employeeId,
              employeeName: `${matchedEmployee.firstName} ${matchedEmployee.lastName}`,
              date: dateStr,
              checkIn: '',
              checkOut: timeStr,
              status: 'normal',
              overtimeMins: 0,
              location: 'LINE Bot API',
              device: 'LINE Mobile App',
              notes: 'ลงเวลาออกงานโดยไม่มีการลงเข้างานผ่าน LINE Bot'
            };

            await addDoc(collection(db, 'attendance_records'), newRecord);

            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `✅ บันทึกเวลาออกงานสำเร็จ! (ไม่มีบันทึกการเข้างาน) 🚪\n\nวันที่: ${dateStr}\nเวลาออกงาน: ${timeStr} น.\n\nเดินทางกลับปลอดภัยครับ!`
            }]);
          }
        } 
        // COMMAND: "ขอลา" / "ลาป่วย" / "ลากิจ" / "ลาพักร้อน" / "ยื่นใบลา"
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
              startDate = `${year}-${month}-${day}`;
            } else {
              startDate = new Date().toISOString().split('T')[0];
            }

            // Calculate endDate (add days-1)
            const sDate = new Date(startDate);
            const eDate = new Date(sDate.getTime() + ((daysCount - 1) * 24 * 60 * 60 * 1000));
            const endDate = eDate.toISOString().split('T')[0];

            const newLeave = {
              employeeId: matchedEmployee.employeeId,
              employeeName: `${matchedEmployee.firstName} ${matchedEmployee.lastName}`,
              leaveType,
              startDate,
              endDate,
              days: daysCount,
              reason: reasonInput,
              status: 'pending',
              createdAt: new Date().toISOString().split('T')[0]
            };

            await addDoc(collection(db, 'leave_requests'), newLeave);

            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `✅ ส่งใบอนุมัติลาพักผ่อนสำเร็จแล้วครับ! 📨\n\nรายละเอียดใบลา:\n• ผู้ลา: ${matchedEmployee.firstName} ${matchedEmployee.lastName}\n• ประเภท: ${thaiType}\n• จำนวน: ${daysCount} วัน\n• ตั้งแต่วันที่: ${startDate} ถึง ${endDate}\n• เหตุผล: ${reasonInput}\n\n⏳ ขณะนี้ระบบได้ส่งเอกสารเสนอเพื่อรออนุมัติไปยังฝ่ายบุคคล (HR) และหัวหน้างานของคุณเรียบร้อยแล้ว`
            }]);
          } else {
            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `📝 วิธีการส่งใบลาหยุดผ่าน LINE Bot:\n\nกรุณาพิมพ์ข้อความส่งในรูปแบบด้านล่างนี้:\n\nขอลา [ประเภทลา] [จำนวนวัน] วัน ตั้งแต่วันที่ [วว/ดด/ปปปป] เหตุผล [ระบุเหตุผล]\n\n👉 ตัวอย่างคำลา:\nขอลา ลาป่วย 1 วัน ตั้งแต่วันที่ 08/07/2026 เหตุผล เป็นไข้ตัวร้อน\nขอลา ลากิจ 2 วัน ตั้งแต่วันที่ 15/07/2026 เหตุผล ไปทำธุระต่างจังหวัด\nขอลา ลาพักร้อน 3 วัน ตั้งแต่วันที่ 20/07/2026 เหตุผล ไปพักผ่อนครอบครัว`
            }]);
          }
        }
        // COMMAND: HELP / INFO / GREETINGS
        else {
          await sendLineReply(replyToken, channelToken, [{
            type: 'text',
            text: `ยินดีต้อนรับคุณ ${matchedEmployee.firstName} 🤖\n\nท่านสามารถสั่งการระบบด้วยข้อความคำสั่งต่อไปนี้ได้ทันทีครับ:\n\n⏰ ระบบลงชื่อเข้า-ออกงาน\n• พิมพ์ "เข้างาน" หรือ "ลงชื่อเข้างาน"\n• พิมพ์ "ออกงาน" หรือ "ลงชื่อออกงาน"\n\n📊 โควตาวันลาหยุดพนักงาน\n• พิมพ์ "เช็ควันลา" เพื่อตรวจสอบโควตา\n\n📝 การยื่นเอกสารขอลาพักผ่อน\n• พิมพ์ "ขอลา" เพื่อส่งใบลาอัตโนมัติ`
          }]);
        }
      }
    }
  } catch (err) {
    console.error('Error handling webhook events:', err);
  }
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

startServer();
