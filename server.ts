import express from 'express';
import path from 'path';
import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  addDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';

const PORT = 3000;

// Initialize Express
const app = express();
app.use(express.json());

// Initialize Firebase Client SDK for server-side use
let db: any = null;
try {
  let configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    configPath = path.join(__dirname, '../firebase-applet-config.json');
  }
  if (!fs.existsSync(configPath)) {
    configPath = path.join(__dirname, 'firebase-applet-config.json');
  }
  if (!fs.existsSync(configPath)) {
    configPath = path.join(__dirname, '../../firebase-applet-config.json');
  }

  let firebaseConfig: any = null;
  let databaseId = '(default)';

  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    firebaseConfig = {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId
    };
    databaseId = config.firestoreDatabaseId || '(default)';
    console.log('Firebase config loaded from firebase-applet-config.json');
  } else if (process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY) {
    // Fallback to environment variables (useful for Vercel/production deployment)
    firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID
    };
    databaseId = process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || '(default)';
    console.log('Firebase config loaded from Environment Variables');
  }

  if (firebaseConfig) {
    const firebaseApp = initializeApp(firebaseConfig);
    db = initializeFirestore(firebaseApp, {}, databaseId);
    console.log('Backend server connected to Firestore:', databaseId);
  } else {
    console.warn('Neither firebase-applet-config.json nor Firebase environment variables were found. Database features in backend may be offline.');
  }
} catch (error) {
  console.error('Error initializing Firebase in server:', error);
}

// ---------------------------------------------------------
// Helper: Send LINE Bot Reply Message
// ---------------------------------------------------------
const globalSimReplies = new Map<string, any[]>();

async function sendLineReply(replyToken: string, channelToken: string, messages: any[]) {
  if (replyToken && replyToken.startsWith('sim_reply_')) {
    console.log('Simulation reply captured for token:', replyToken);
    globalSimReplies.set(replyToken, messages);
    return;
  }
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
// Helper: Send LINE Notification for Leave Status Updates
// ---------------------------------------------------------
async function sendLeaveStatusNotification(db: any, leaveRequest: any) {
  if (!db) {
    console.warn('Database is offline, cannot send leave status notification.');
    return;
  }
  try {
    const settingsDocRef = doc(db, 'settings', 'system');
    const settingsSnap = await getDoc(settingsDocRef);
    if (!settingsSnap.exists()) return;

    const s = settingsSnap.data();
    const lineManagerUserId = s.lineManagerUserId || '';
    const lineChannelToken = s.lineChannelToken || s.lineChannelAccessToken || '';
    const enableLineNotification = s.enableLineNotification !== false;

    if (!enableLineNotification) {
      console.log('LINE notifications for leave requests are disabled in settings.');
      return;
    }

    const leaveTypeNameMap: Record<string, string> = {
      sick: 'ลาป่วย 🤒',
      annual: 'ลาพักร้อน 🏖️',
      personal: 'ลากิจส่วนตัว 🚗',
      maternity: 'ลาเพื่อคลอดบุตร 👶',
      swap: 'สลับวันหยุด 🔁',
      other: 'ลาประเภทอื่น ๆ 📝'
    };
    const thaiType = leaveTypeNameMap[leaveRequest.leaveType] || leaveRequest.leaveType;

    const formatDateStr = (dStr: string) => {
      if (!dStr) return '';
      const pts = dStr.split('-');
      if (pts.length !== 3) return dStr;
      return `${pts[2]}/${pts[1]}/${parseInt(pts[0], 10) + 543}`;
    };

    const periodText = leaveRequest.leaveType === 'swap'
      ? `สลับจากวันหยุดเดิม ${formatDateStr(leaveRequest.swapFromDate)} เพื่อไปหยุดในวันที่ ${formatDateStr(leaveRequest.swapToDate)}`
      : `${formatDateStr(leaveRequest.startDate)} ถึง ${formatDateStr(leaveRequest.endDate)} (${leaveRequest.days} วันทำการ)`;

    // 1. Fetch employee's registered LINE User ID from Firestore to send a direct message
    let employeeLineUserId = '';
    try {
      const employeesCol = collection(db, 'employees');
      const employeesSnap = await getDocs(employeesCol);
      employeesSnap.forEach(docSnap => {
        const emp = docSnap.data();
        if (emp.employeeId === leaveRequest.employeeId && emp.lineUserId) {
          employeeLineUserId = emp.lineUserId;
        }
      });
    } catch (err) {
      console.error('Error fetching employee lineUserId:', err);
    }

    // Build beautiful, descriptive notifications
    let approverMessage = '';
    let employeeMessage = '';

    if (leaveRequest.status === 'pending') {
      approverMessage = 
        `📄 *ใบขอลาหยุดงานใหม่ (รอตรวจสอบโดย HR)*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👤 *พนักงาน:* ${leaveRequest.employeeName} (${leaveRequest.employeeId})\n` +
        `📋 *ประเภท:* ${thaiType}\n` +
        `📅 *วันที่ลา:* ${periodText}\n` +
        `💬 *เหตุผล:* ${leaveRequest.reason || 'ไม่ได้ระบุ'}\n` +
        `⏳ *สถานะ:* รออนุมัติขั้นที่ 1 (HR Verification)\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👉 กรุณาเข้าสู่หน้าแชทหรือระบบหลังบ้านเพื่อกดพิจารณาอนุมัติ`;
    } 
    else if (leaveRequest.status === 'pending_manager') {
      approverMessage = 
        `✅ *คำขอลาผ่านการตรวจสอบแล้ว (รอผู้จัดการอนุมัติสุดท้าย)*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👤 *พนักงาน:* ${leaveRequest.employeeName} (${leaveRequest.employeeId})\n` +
        `📋 *ประเภท:* ${thaiType}\n` +
        `📅 *วันที่ลา:* ${periodText}\n` +
        `💬 *เหตุผล:* ${leaveRequest.reason || 'ไม่ได้ระบุ'}\n\n` +
        `🔍 *ตรวจสอบโดย HR:* ${leaveRequest.hrApprovedBy || 'ฝ่ายบุคคล'}\n` +
        `⏳ *สถานะ:* รอการอนุมัติขั้นสุดท้ายจากผู้จัดการ (Manager Approval)\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👉 กรุณาเข้าระบบหลังบ้านเพื่ออนุมัติใบลาให้เสร็จสิ้น`;
    } 
    else if (leaveRequest.status === 'approved') {
      approverMessage = 
        `🟢 *ใบลาได้รับการอนุมัติสมบูรณ์แล้ว (Approved)*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👤 *พนักงาน:* ${leaveRequest.employeeName} (${leaveRequest.employeeId})\n` +
        `📋 *ประเภท:* ${thaiType}\n` +
        `📅 *วันที่ลา:* ${periodText}\n\n` +
        `🔍 *ผู้ตรวจสอบ (HR):* ${leaveRequest.hrApprovedBy || 'ฝ่ายบุคคล'}\n` +
        `👑 *ผู้อนุมัติ (ผู้จัดการ):* ${leaveRequest.managerApprovedBy || 'ผู้จัดการ'}\n` +
        `📂 *ผลลัพธ์:* บันทึกใบอนุมัติลงประวัติพนักงานและปรับสถานะพนักงานเป็น "ลาพักผ่อน" เรียบร้อยแล้ว`;

      employeeMessage = 
        `🎉 *ข่าวดี! ใบขอลาหยุดงานได้รับการอนุมัติแล้ว*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `เรียนคุณ ${leaveRequest.employeeName},\n\n` +
        `ใบลาของท่านได้รับการพิจารณาอนุมัติเรียบร้อย:\n` +
        `📋 *ประเภท:* ${thaiType}\n` +
        `📅 *วันที่ลา:* ${periodText}\n` +
        `💬 *เหตุผล:* ${leaveRequest.reason || 'ไม่ได้ระบุ'}\n\n` +
        `🔍 *ผู้รับรอง (HR):* ${leaveRequest.hrApprovedBy || 'ฝ่ายบุคคล'}\n` +
        `👑 *ผู้อนุมัติ (ผู้จัดการ):* ${leaveRequest.managerApprovedBy || 'ผู้จัดการ'}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `✨ ขอให้ท่านวางแผนทริป พักผ่อนให้เต็มที่ และเดินทางโดยสวัสดิภาพครับ!`;
    } 
    else if (leaveRequest.status === 'rejected') {
      approverMessage = 
        `🔴 *คำขอลาหยุดงานถูกปฏิเสธ (Rejected)*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `👤 *พนักงาน:* ${leaveRequest.employeeName} (${leaveRequest.employeeId})\n` +
        `📋 *ประเภท:* ${thaiType}\n` +
        `📅 *วันที่ลา:* ${periodText}\n` +
        `❌ *ดำเนินการโดย:* ${leaveRequest.reviewedBy || 'ฝ่ายบุคคล/ผู้จัดการ'}\n` +
        `⏳ *สถานะ:* ถูกปฏิเสธ (Rejected)`;

      employeeMessage = 
        `⚠️ *แจ้งเตือน: ผลการพิจารณาใบขอลาหยุดงาน*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `เรียนคุณ ${leaveRequest.employeeName},\n\n` +
        `คำขอลาหยุดงานของท่านได้รับการปฏิเสธ:\n` +
        `📋 *ประเภท:* ${thaiType}\n` +
        `📅 *วันที่ลา:* ${periodText}\n` +
        `❌ *ดำเนินการโดย:* ${leaveRequest.reviewedBy || 'ฝ่ายบุคคล/ผู้จัดการ'}\n\n` +
        `💡 ท่านสามารถสอบถามรายละเอียดเพิ่มเติมหรือแก้ไขยื่นใหม่ได้โดยติดต่อฝ่ายบุคคลหรือผู้จัดการของท่านโดยตรงครับ`;
    }

    // Helper to check for a valid LINE User/Group/Room ID format
    const isValidLineId = (id: string) => {
      return /^(U|C|R)[0-9a-fA-F]{32}$/.test(id);
    };

    // 2. Send status notification to Approvers/Managers (Group or User ID)
    if (lineChannelToken && lineManagerUserId && approverMessage) {
      const recipients = lineManagerUserId
        .split(/[,;\s]+/)
        .map(id => id.trim())
        .filter(id => id.length > 0);

      for (const recipientId of recipients) {
        if (!isValidLineId(recipientId)) {
          console.warn(`[LINE Sim Mode] Skipping actual LINE API call for recipient '${recipientId}' because it is not a valid LINE ID format (should start with U, C, or R followed by 32 hex characters). Simulated in Web UI instead.`);
          continue;
        }
        try {
          const payload = {
            to: recipientId,
            messages: [{ type: 'text', text: approverMessage }]
          };

          const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${lineChannelToken}`
            },
            body: JSON.stringify(payload)
          });
          if (response.ok) {
            console.log(`Sent leave status notification to approver: ${recipientId}`);
          } else {
            console.error(`Failed to send LINE Bot status notification to ${recipientId}:`, response.status, await response.text());
          }
        } catch (err) {
          console.error(`Error sending status push to ${recipientId}:`, err);
        }
      }
    }

    // 3. Send direct update to the requesting employee if they have a registered lineUserId
    if (lineChannelToken && employeeLineUserId && employeeMessage) {
      if (!isValidLineId(employeeLineUserId)) {
        console.warn(`[LINE Sim Mode] Skipping actual LINE API call for employee recipient '${employeeLineUserId}' because it is not a valid LINE ID format. Simulated in Web UI instead.`);
      } else {
        try {
          const payload = {
            to: employeeLineUserId,
            messages: [{ type: 'text', text: employeeMessage }]
          };

          const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${lineChannelToken}`
            },
            body: JSON.stringify(payload)
          });
          if (response.ok) {
            console.log(`Sent direct status update to employee: ${employeeLineUserId}`);
          } else {
            console.error(`Failed to send LINE Bot status notification to employee ${employeeLineUserId}:`, response.status, await response.text());
          }
        } catch (err) {
          console.error(`Error sending direct status push to employee:`, err);
        }
      }
    }

    // Save to Firestore 'lineNotifications' for real-time simulation on the Web UI
    try {
      if (approverMessage) {
        await addDoc(collection(db, 'lineNotifications'), {
          id: `notif-${Date.now()}-approver`,
          to: 'approver',
          toName: 'ผู้จัดการ / ฝ่ายบุคคล (Approver)',
          type: 'approver',
          message: approverMessage,
          status: 'unread',
          createdAt: new Date().toISOString()
        });
      }
      if (employeeMessage) {
        await addDoc(collection(db, 'lineNotifications'), {
          id: `notif-${Date.now()}-employee`,
          to: leaveRequest.employeeId,
          toName: `${leaveRequest.employeeName} (Employee)`,
          type: 'employee',
          message: employeeMessage,
          status: 'unread',
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Error saving simulated LINE notification:', err);
    }

  } catch (err) {
    console.error('Error in sendLeaveStatusNotification helper:', err);
  }
}

// ---------------------------------------------------------
// API: LINE Developer Webhook Endpoint
// ---------------------------------------------------------
app.get('/api/line/webhook', (req, res) => {
  res.status(200).json({ 
    status: 'online', 
    message: 'LINE Bot Webhook is active and ready. Please use POST method for Webhook messages.',
    database: db ? 'connected' : 'offline'
  });
});

app.post('/api/line/webhook', async (req, res) => {
  console.log('Received webhook event from LINE.');
  
  const { events } = req.body;
  if (!events || events.length === 0) {
    console.log('Webhook verification call or empty events verified.');
    return res.status(200).json({ status: 'ok' });
  }

  const isSimulation = !!(events[0]?.replyToken && events[0].replyToken.startsWith('sim_reply_'));

  // 1. Immediately return 200 OK as required by LINE Platform (unless it is a simulation)
  if (!isSimulation) {
    res.status(200).json({ status: 'ok' });
  }

  if (!db) {
    console.error('Firestore is not initialized.');
    if (isSimulation) {
      return res.status(200).json({
        status: 'ok',
        simulationReplies: [{
          type: 'text',
          text: '⚠️ ระบบฐานข้อมูล (Firestore) กำลังอยู่ในสถานะ Offline ไม่สามารถจำลองการลงเวลาหรือระบบตอบกลับอัตโนมัติได้ในขณะนี้'
        }]
      });
    }
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

      // 4. Find employee matching lineUserId or simulated employeeId
      const employeesCol = collection(db, 'employees');
      const employeesSnap = await getDocs(employeesCol);
      let matchedEmployee: any = null;
      let matchedEmployeeDocId = '';

      employeesSnap.forEach((docSnap) => {
        const emp = docSnap.data();
        if (emp.lineUserId === userId) {
          matchedEmployee = emp;
          matchedEmployeeDocId = docSnap.id;
        } else if (isSimulation && userId.startsWith('U_SIM_') && userId !== 'U_SIM_UNKNOWN' && emp.employeeId === userId.replace('U_SIM_', '')) {
          matchedEmployee = emp;
          matchedEmployeeDocId = docSnap.id;
        }
      });

      // If matched via simulation but not yet linked in database, link them now automatically!
      if (matchedEmployee && !matchedEmployee.lineUserId) {
        await updateDoc(doc(db, 'employees', matchedEmployeeDocId), {
          lineUserId: userId,
          verificationStatus: 'verified'
        });
        matchedEmployee.lineUserId = userId;
        matchedEmployee.verificationStatus = 'verified';
      }

      // Define Quick Reply options for compact and convenient use
      const linkedQuickReplies = {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: '⏰ เข้างาน',
              text: 'เข้างาน'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '🚪 ออกงาน',
              text: 'ออกงาน'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📊 เช็ควันลา',
              text: 'เช็ควันลา'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '📝 ขอลาหยุด',
              text: 'ขอลา'
            }
          }
        ]
      };

      const unlinkedQuickReplies = {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: '👤 ยืนยัน AWA-001',
              text: 'AWA-001'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '👤 ยืนยัน "ผู้ใช้งาน"',
              text: 'ผู้ใช้งาน'
            }
          }
        ]
      };

      // CASE A: User is not linked yet
      if (!matchedEmployee) {
        const normalizedInput = text.toLowerCase().trim();
        let empToLink: any = null;
        let empToLinkDocIdUsed = '';
        
        let exactMatchEmp: any = null;
        let exactMatchDocId = '';
        let partialMatchEmp: any = null;
        let partialMatchDocId = '';

        employeesSnap.forEach((docSnap) => {
          const emp = docSnap.data();
          const empId = (emp.employeeId || '').toLowerCase().trim();
          const firstName = (emp.firstName || '').toLowerCase().trim();
          const lastName = (emp.lastName || '').toLowerCase().trim();
          const fullName = `${firstName} ${lastName}`;
          const fullNameNoSpace = `${firstName}${lastName}`;

          // Check if input exactly matches ID, first name, last name, or full name
          if (
            normalizedInput === empId ||
            normalizedInput === firstName ||
            normalizedInput === lastName ||
            normalizedInput === fullName ||
            normalizedInput === fullNameNoSpace
          ) {
            exactMatchEmp = emp;
            exactMatchDocId = docSnap.id;
          }
          // Partial match (min 2 characters)
          else if (normalizedInput.length >= 2 && (
            fullName.includes(normalizedInput) ||
            empId.includes(normalizedInput)
          )) {
            partialMatchEmp = emp;
            partialMatchDocId = docSnap.id;
          }
        });

        empToLink = exactMatchEmp || partialMatchEmp;
        empToLinkDocIdUsed = exactMatchDocId || partialMatchDocId;

        if (empToLink) {
          // Update Firestore with the LINE userId and status
          await updateDoc(doc(db, 'employees', empToLinkDocIdUsed), {
            lineUserId: userId,
            verificationStatus: 'verified'
          });

          await sendLineReply(replyToken, channelToken, [
            {
              type: 'text',
              text: `เชื่อมโยงบัญชีสำเร็จแล้วครับ! 🎉\n\nยินดีต้อนรับคุณ ${empToLink.firstName} ${empToLink.lastName} (${empToLink.position}) เข้าสู่ระบบช่วยเหลือพนักงานออฟฟิศผ่าน LINE Bot ประจำองค์กรครับ\n\nท่านสามารถพิมพ์คำสั่งต่อไปนี้เพื่อสั่งการระบบได้ทันที:\n• พิมพ์ "เข้างาน" เพื่อลงเวลาเข้างาน\n• พิมพ์ "ออกงาน" เพื่อลงเวลาออกงาน\n• พิมพ์ "เช็ควันลา" เพื่อตรวจสอบโควตาวันลาคงเหลือ\n• พิมพ์ "ขอลา" เพื่อส่งใบลาเข้าระบบ`,
              quickReply: linkedQuickReplies
            }
          ]);
        } else {
          await sendLineReply(replyToken, channelToken, [
            {
              type: 'text',
              text: `สวัสดีครับ ยินดีต้อนรับสู่ระบบช่วยเหลือพนักงานผ่าน LINE Bot 🤖\n\n⚠️ ขณะนี้บัญชี LINE ของคุณยังไม่ได้เชื่อมโยงเข้ากับระบบพนักงาน\n\n👉 กรุณาเชื่อมโยงบัญชีโดยการพิมพ์ชื่อพนักงาน หรือรหัสพนักงานของคุณ เช่น:\n\n• ผู้ใช้งาน (ชื่อพนักงาน)\n• AWA-001 (รหัสพนักงาน)\n\n(พิมพ์ส่งชื่อหรือรหัสพนักงานเพื่อยืนยันตัวตนเข้ามาได้เลยครับ)`,
              quickReply: unlinkedQuickReplies
            }
          ]);
        }
      } 
      // CASE B: User is already linked, process standard commands or multi-step session
      else {
        const textLower = text.toLowerCase();
        const activeSession = matchedEmployee.lineChatSession;

        const isPrimaryCommand = textLower.includes('เช็ควันลา') || textLower.includes('วันลา') || textLower.includes('โควตา') || textLower === 'leave' ||
                                 textLower.includes('เข้างาน') || textLower.includes('ลงชื่อเข้างาน') || textLower.includes('checkin') || textLower.includes('check in') || textLower === 'clock in' ||
                                 textLower.includes('ออกงาน') || textLower.includes('ลงชื่อออกงาน') || textLower.includes('checkout') || textLower.includes('check out') || textLower === 'clock out';

        if (isPrimaryCommand && activeSession) {
          await updateDoc(doc(db, 'employees', matchedEmployeeDocId), {
            lineChatSession: null
          });
        }

        if (textLower === 'ยกเลิก' || textLower === 'ยกเลิกการลา' || textLower === 'cancel') {
          if (activeSession) {
            await updateDoc(doc(db, 'employees', matchedEmployeeDocId), {
              lineChatSession: null
            });
            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `🚫 ยกเลิกการทำรายการขอลาเรียบร้อยแล้วครับ`,
              quickReply: linkedQuickReplies
            }]);
          } else {
            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `ไม่มีรายการที่กำลังดำเนินการอยู่ครับ`,
              quickReply: linkedQuickReplies
            }]);
          }
        }
        else if (activeSession && !isPrimaryCommand) {
          // Process active session steps
          if (activeSession.step === 'awaiting_reason') {
            const reason = text;
            const updatedSession = {
              ...activeSession,
              step: 'awaiting_days',
              reason
            };
            await updateDoc(doc(db, 'employees', matchedEmployeeDocId), {
              lineChatSession: updatedSession
            });
            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `ขอลากี่วัน`,
              quickReply: {
                items: [
                  { type: 'action', action: { type: 'message', label: '1 วัน', text: '1 วัน' } },
                  { type: 'action', action: { type: 'message', label: '2 วัน', text: '2 วัน' } },
                  { type: 'action', action: { type: 'message', label: '3 วัน', text: '3 วัน' } },
                  { type: 'action', action: { type: 'message', label: 'ยกเลิก', text: 'ยกเลิก' } }
                ]
              }
            }]);
          }
          else if (activeSession.step === 'awaiting_days') {
            const matches = text.match(/\d+/);
            const daysCount = matches ? parseInt(matches[0], 10) : 1;
            const updatedSession = {
              ...activeSession,
              step: 'awaiting_date',
              days: daysCount
            };
            await updateDoc(doc(db, 'employees', matchedEmployeeDocId), {
              lineChatSession: updatedSession
            });
            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `โปรดแจ้งวันที่ต้องการดำเนินการลา`,
              quickReply: {
                items: [
                  { type: 'action', action: { type: 'message', label: 'วันนี้', text: 'วันนี้' } },
                  { type: 'action', action: { type: 'message', label: 'พรุ่งนี้', text: 'พรุ่งนี้' } },
                  { type: 'action', action: { type: 'message', label: 'ยกเลิก', text: 'ยกเลิก' } }
                ]
              }
            }]);
          }
          else if (activeSession.step === 'awaiting_date') {
            const dateInput = text.trim();
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const thailandTime = new Date(utc + (3600000 * 7));
            const todayStr = thailandTime.toISOString().split('T')[0];

            let startDate = todayStr;
            if (dateInput.includes('พรุ่งนี้') || dateInput.includes('พรุ่ง')) {
              const tomorrowTime = new Date(thailandTime.getTime() + (24 * 60 * 60 * 1000));
              startDate = tomorrowTime.toISOString().split('T')[0];
            } else if (dateInput.includes('วันนี้')) {
              startDate = todayStr;
            } else {
              const dateParts = dateInput.split('/');
              if (dateParts.length === 3) {
                const day = dateParts[0].padStart(2, '0');
                const month = dateParts[1].padStart(2, '0');
                const year = dateParts[2];
                let yearNum = parseInt(year, 10);
                if (yearNum > 2400) yearNum -= 543;
                startDate = `${yearNum}-${month}-${day}`;
              } else {
                const tomorrowTime = new Date(thailandTime.getTime() + (24 * 60 * 60 * 1000));
                startDate = tomorrowTime.toISOString().split('T')[0];
              }
            }

            const daysCount = activeSession.days || 1;
            const sDate = new Date(startDate);
            const eDate = new Date(sDate.getTime() + ((daysCount - 1) * 24 * 60 * 60 * 1000));
            const endDate = eDate.toISOString().split('T')[0];

            const newLeave = {
              id: `leave-${Date.now()}`,
              employeeId: matchedEmployee.employeeId,
              employeeName: `${matchedEmployee.firstName} ${matchedEmployee.lastName}`,
              leaveType: activeSession.leaveType,
              startDate,
              endDate,
              days: daysCount,
              reason: activeSession.reason || 'ไม่ได้ระบุเหตุผล',
              status: 'pending',
              createdAt: todayStr
            };

            await setDoc(doc(db, 'leaveRequests', newLeave.id), newLeave);
            
            // Fire-and-forget approver notification
            sendLeaveStatusNotification(db, newLeave).catch(err => {
              console.error('Failed to send approver notification:', err);
            });

            await updateDoc(doc(db, 'employees', matchedEmployeeDocId), {
              lineChatSession: null
            });

            const formatThaiD = (dStr: string) => {
              const pts = dStr.split('-');
              if (pts.length !== 3) return dStr;
              return `${pts[2]}/${pts[1]}/${parseInt(pts[0], 10) + 543}`;
            };

            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `✅ ส่งใบอนุมัติ${activeSession.thaiType}สำเร็จแล้วครับ! 📨\n\nรายละเอียดใบลา:\n• ผู้ลา: ${matchedEmployee.firstName} ${matchedEmployee.lastName}\n• ประเภท: ${activeSession.thaiType}\n• จำนวน: ${daysCount} วัน\n• ตั้งแต่วันที่: ${formatThaiD(startDate)} ถึง ${formatThaiD(endDate)}\n• เหตุผล: ${activeSession.reason}\n\n⏳ ขณะนี้ระบบได้ส่งเอกสารเพื่อรออนุมัติไปยังฝ่ายบุคคล (HR) และผู้จัดการของคุณเรียบร้อยแล้ว`,
              quickReply: linkedQuickReplies
            }]);
          }
        }
        else {
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

            await sendLineReply(replyToken, channelToken, [{ 
              type: 'text', 
              text: responseText,
              quickReply: linkedQuickReplies
            }]);
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
                text: `⏰ คุณได้บันทึกเวลาเข้างานของวันนี้เรียบร้อยแล้วครับ!\nเวลาเข้างาน: ${todayRecord.time} น. / สถานะ: ${todayRecord.type === 'late' ? 'สาย' : 'ปกติ'}`,
                quickReply: linkedQuickReplies
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

              await setDoc(doc(db, 'attendanceRecords', newRecord.id), newRecord);

              await sendLineReply(replyToken, channelToken, [{
                type: 'text',
                text: `✅ บันทึกเวลาเข้างานสำเร็จ! ⏰\n\nพนักงาน: ${matchedEmployee.firstName} ${matchedEmployee.lastName}\nวันที่: ${dateStr}\nเวลาเข้างาน: ${timeStr.substring(0, 5)} น.\nสถานะ: ${isLate ? '🔴 เข้างานสาย' : '🟢 ปกติ'}\n\nขอให้มีความสุขกับการทำงานในวันนี้ครับ! 💼`,
                quickReply: linkedQuickReplies
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
                text: `⏰ คุณได้บันทึกเวลาออกงานของวันนี้เรียบร้อยแล้วครับ!\nเวลาออกงาน: ${todayRecord.time.substring(0, 5)} น.`,
                quickReply: linkedQuickReplies
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

              await setDoc(doc(db, 'attendanceRecords', newRecord.id), newRecord);

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
                    await setDoc(doc(db, 'attendanceRecords', otRecord.id), otRecord);
                    otText = `\n🔥 บันทึกค่าล่วงเวลา (OT) อัตโนมัติ: ${computedOt} ชั่วโมง`;
                  }
                }
              }

              await sendLineReply(replyToken, channelToken, [{
                type: 'text',
                text: `✅ บันทึกเวลาออกงานสำเร็จ! 🚪\n\nพนักงาน: ${matchedEmployee.firstName} ${matchedEmployee.lastName}\nวันที่: ${dateStr}\nเวลาออกงาน: ${timeStr.substring(0, 5)} น.${otText}\n\nเดินทางกลับบ้านและพักผ่อนให้เต็มที่ครับ! 🏡`,
                quickReply: linkedQuickReplies
              }]);
            }
          } 
          // COMMAND: "ขอลา [ประเภทลา] [จำนวนวัน] วัน ตั้งแต่วันที่ [วว/ดด/ปปปป] เหตุผล [เหตุผล]" (One-Shot Flow)
          else if (textLower.startsWith('ขอลา') || textLower.startsWith('/ขอลา')) {
            const leaveMatch = text.match(/ขอลา\s+(ลาป่วย|ลากิจ|ลาพักร้อน|ลาพักผ่อน)\s+(\d+)\s+วัน\s+ตั้งแต่วันที่\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+เหตุผล\s+(.+)/i);
            
            if (leaveMatch) {
              const thaiType = leaveMatch[1];
              const daysCount = parseInt(leaveMatch[2], 10);
              const dateInput = leaveMatch[3]; // DD/MM/YYYY
              const reasonInput = leaveMatch[4];

              let leaveType: any = 'sick';
              if (thaiType === 'ลากิจ') leaveType = 'personal';
              else if (thaiType === 'ลาพักร้อน' || thaiType === 'ลาพักผ่อน') leaveType = 'annual';

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

              await setDoc(doc(db, 'leaveRequests', newLeave.id), newLeave);

              // Fire-and-forget approver notification
              sendLeaveStatusNotification(db, newLeave).catch(err => {
                console.error('Failed to send approver notification:', err);
              });

              const formatThaiD = (dStr: string) => {
                const pts = dStr.split('-');
                if (pts.length !== 3) return dStr;
                return `${pts[2]}/${pts[1]}/${parseInt(pts[0], 10) + 543}`;
              };

              await sendLineReply(replyToken, channelToken, [{
                type: 'text',
                text: `✅ ส่งใบอนุมัติลาพักผ่อนสำเร็จแล้วครับ! 📨\n\nรายละเอียดใบลา:\n• ผู้ลา: ${matchedEmployee.firstName} ${matchedEmployee.lastName}\n• ประเภท: ${thaiType}\n• จำนวน: ${daysCount} วัน\n• ตั้งแต่วันที่: ${formatThaiD(startDate)} ถึง ${formatThaiD(endDate)}\n• เหตุผล: ${reasonInput}\n\n⏳ ขณะนี้ระบบได้ส่งเอกสารเพื่อรออนุมัติไปยังฝ่ายบุคคล (HR) และผู้จัดการของคุณเรียบร้อยแล้ว`,
                quickReply: linkedQuickReplies
              }]);
            } else {
              await sendLineReply(replyToken, channelToken, [{
                type: 'text',
                text: `📝 วิธีการส่งใบลาหยุดผ่าน LINE Bot:\n\nกรุณาพิมพ์ข้อความส่งในรูปแบบด้านล่างนี้:\n\nขอลา [ประเภทลา] [จำนวนวัน] วัน ตั้งแต่วันที่ [วว/ดด/ปปปป] เหตุผล [ระบุเหตุผล]\n\n👉 ตัวอย่างคำลา:\n• ขอลา ลาป่วย 1 วัน ตั้งแต่วันที่ 08/07/2026 เหตุผล เป็นไข้ตัวร้อน\n• ขอลา ลากิจ 2 วัน ตั้งแต่วันที่ 15/07/2026 เหตุผล ไปทำธุระต่างจังหวัด\n• ขอลา ลาพักร้อน 3 วัน ตั้งแต่วันที่ 20/07/2026 เหตุผล ไปพักผ่อนครอบครัว`,
                quickReply: {
                  items: [
                    ...linkedQuickReplies.items,
                    {
                      type: 'action',
                      action: {
                        type: 'message',
                        label: '🤒 ลาป่วย 1 วัน',
                        text: 'ขอลา ลาป่วย 1 วัน ตั้งแต่วันที่ 08/07/2026 เหตุผล เป็นไข้ตัวร้อน'
                      }
                    },
                    {
                      type: 'action',
                      action: {
                        type: 'message',
                        label: '🚗 ลากิจ 2 วัน',
                        text: 'ขอลา ลากิจ 2 วัน ตั้งแต่วันที่ 15/07/2026 เหตุผล ไปทำธุระต่างจังหวัด'
                      }
                    }
                  ]
                }
              }]);
            }
          }
          // COMMAND: Step-by-Step Leave Initiation (ลาป่วย / ขอลาป่วย)
          else if (textLower.includes('ลาป่วย') || textLower === 'ขอลาป่วย') {
            const updatedSession = {
              step: 'awaiting_reason',
              leaveType: 'sick',
              thaiType: 'ลาป่วย'
            };
            await updateDoc(doc(db, 'employees', matchedEmployeeDocId), {
              lineChatSession: updatedSession
            });
            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `เหตุผลลาป่วย`,
              quickReply: {
                items: [
                  { type: 'action', action: { type: 'message', label: 'ปวดหัวรุนแรง', text: 'ปวดหัวรุนแรง' } },
                  { type: 'action', action: { type: 'message', label: 'เป็นไข้ตัวร้อน', text: 'เป็นไข้ตัวร้อน' } },
                  { type: 'action', action: { type: 'message', label: 'ยกเลิก', text: 'ยกเลิก' } }
                ]
              }
            }]);
          }
          // COMMAND: Step-by-Step Leave Initiation (ลากิจ / ขอลากิจ)
          else if (textLower.includes('ลากิจ') || textLower === 'ขอลากิจ') {
            const updatedSession = {
              step: 'awaiting_reason',
              leaveType: 'personal',
              thaiType: 'ลากิจ'
            };
            await updateDoc(doc(db, 'employees', matchedEmployeeDocId), {
              lineChatSession: updatedSession
            });
            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `เหตุผลลากิจ`,
              quickReply: {
                items: [
                  { type: 'action', action: { type: 'message', label: 'ทำธุระครอบครัว', text: 'ทำธุระครอบครัว' } },
                  { type: 'action', action: { type: 'message', label: 'ติดต่อราชการ', text: 'ติดต่อราชการ' } },
                  { type: 'action', action: { type: 'message', label: 'ยกเลิก', text: 'ยกเลิก' } }
                ]
              }
            }]);
          }
          // COMMAND: Step-by-Step Leave Initiation (ลาพักร้อน / ขอลาพักร้อน / ลาพักผ่อน / ขอลาพักผ่อน)
          else if (textLower.includes('พักร้อน') || textLower.includes('พักผ่อน') || textLower === 'ขอลาพักร้อน') {
            const updatedSession = {
              step: 'awaiting_reason',
              leaveType: 'annual',
              thaiType: 'ลาพักร้อน'
            };
            await updateDoc(doc(db, 'employees', matchedEmployeeDocId), {
              lineChatSession: updatedSession
            });
            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `เหตุผลลาพักร้อน`,
              quickReply: {
                items: [
                  { type: 'action', action: { type: 'message', label: 'ไปท่องเที่ยวต่างจังหวัด', text: 'ไปท่องเที่ยวต่างจังหวัด' } },
                  { type: 'action', action: { type: 'message', label: 'พักผ่อนประจำปี', text: 'พักผ่อนประจำปี' } },
                  { type: 'action', action: { type: 'message', label: 'ยกเลิก', text: 'ยกเลิก' } }
                ]
              }
            }]);
          }
          // COMMAND: General Leave Menu (ขอลา)
          else if (textLower === 'ขอลา' || textLower === 'ลา') {
            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `📝 เลือกประเภทการลาที่ต้องการ:\n\n• ลาป่วย\n• ลากิจ\n• ลาพักร้อน\n\n(หรือพิมพ์เช่น "ขอลาป่วย" เพื่อทำรายการได้ทันทีครับ)`,
              quickReply: {
                items: [
                  { type: 'action', action: { type: 'message', label: '🤒 ขอลาป่วย', text: 'ขอลาป่วย' } },
                  { type: 'action', action: { type: 'message', label: '🚗 ขอลากิจ', text: 'ขอลากิจ' } },
                  { type: 'action', action: { type: 'message', label: '🏖️ ขอลาพักร้อน', text: 'ขอลาพักร้อน' } }
                ]
              }
            }]);
          }
          // COMMAND: HELP / INFO / GREETINGS
          else {
            await sendLineReply(replyToken, channelToken, [{
              type: 'text',
              text: `ยินดีต้อนรับคุณ ${matchedEmployee.firstName} 🤖\n\nท่านสามารถสั่งการระบบด้วยข้อความคำสั่งต่อไปนี้ได้ทันทีครับ:\n\n⏰ ระบบลงชื่อเข้า-ออกงาน\n• พิมพ์ "เข้างาน" หรือ "ลงชื่อเข้างาน"\n• พิมพ์ "ออกงาน" หรือ "ลงชื่อออกงาน"\n\n📊 โควตาวันลาหยุดพนักงาน\n• พิมพ์ "เช็ควันลา" เพื่อตรวจสอบสิทธิ์คงเหลือ\n\n📝 การยื่นเอกสารขอลาพักผ่อน\n• พิมพ์ "ขอลา" เพื่อดูวิธีการยื่นใบลา`,
              quickReply: linkedQuickReplies
            }]);
          }
        }
      }
    }
    if (isSimulation) {
      const simReplyToken = events[0]?.replyToken;
      const replies = globalSimReplies.get(simReplyToken) || [];
      globalSimReplies.delete(simReplyToken);
      return res.status(200).json({ status: 'ok', simulationReplies: replies });
    }
  } catch (err) {
    console.error('Error handling webhook events:', err);
    if (isSimulation) {
      return res.status(500).json({
        status: 'error',
        message: 'Internal Error during simulation',
        simulationReplies: [{ type: 'text', text: `⚠️ เกิดข้อผิดพลาดของเซิร์ฟเวอร์ในการรันระบบจำลอง: ${String(err)}` }]
      });
    }
  }
});

// ---------------------------------------------------------
// API: Status
// ---------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', database: db ? 'online' : 'offline' });
});

// ---------------------------------------------------------
// API: LINE Approver Notification
// ---------------------------------------------------------
app.post('/api/line/notify-approver', async (req, res) => {
  const { leaveRequest } = req.body;
  if (!leaveRequest) {
    return res.status(400).json({ error: 'Missing leaveRequest payload' });
  }

  if (!db) {
    console.warn('Cannot notify because database is offline.');
    return res.status(200).json({ success: false, reason: 'Database offline' });
  }

  try {
    await sendLeaveStatusNotification(db, leaveRequest);
    return res.status(200).json({ success: true, message: 'Leave notification sent successfully.' });
  } catch (err) {
    console.error('Error handling notify-approver endpoint:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ---------------------------------------------------------
// Helper: Seed Firestore from Backend
// ---------------------------------------------------------
async function seedBackendFirestore() {
  if (!db) {
    console.log('Skipping backend seeding because Firestore is not initialized.');
    return;
  }
  try {
    // 1. Check & seed settings/system
    const settingsDoc = doc(db, 'settings', 'system');
    const settingsSnap = await getDoc(settingsDoc);
    if (!settingsSnap.exists()) {
      await setDoc(settingsDoc, {
        companyName: 'บริษัท อินโนเวทีฟ ออฟฟิศ โซลูชั่นส์ จำกัด',
        companyAddress: 'อาคารเอไอทาวเวอร์ ชั้น 18, ถ.สุขุมวิท 21 แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพฯ 10110',
        workDays: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'],
        workHoursStart: '08:30',
        workHoursEnd: '17:30',
        maxLeaveDays: { sick: 30, annual: 12, personal: 6 },
        hasOvertime: true,
        otStartTime: '18:00',
        otRate: 1.5,
        lateThresholdMins: 15,
        departments: [
          'เทคโนโลยีสารสนเทศ (IT)',
          'ทรัพยากรบุคคล (HR)',
          'ฝ่ายขายและการตลาด',
          'บัญชีและการเงิน',
          'ฝ่ายบริหารองค์กร'
        ],
        lineChannelToken: 'eyJhY2Nlc3NUb2tlbiI6ImxpbmUtYm90LWNoYW5uZWwtYWNjZXNzLXRva2VuLXNpbXVsYXRlZC0yMDI2In0=',
        lineChannelSecret: '8f92a4e5100fbd451833aa3b34ff60b3',
        lineWebhookUrl: 'https://ais-dev-bmco3xexmw2r26vzq6bz4v-713032521366.asia-southeast1.run.app/api/line/webhook'
      });
      console.log('Seeded system settings from backend.');
    }

    // 2. Check & seed accounts
    const accountsCol = collection(db, 'accounts');
    const accountsSnap = await getDocs(accountsCol);
    if (accountsSnap.empty) {
      const initialAccounts = [
        {
          email: 'admin@office.com',
          username: 'modify',
          password: '1234',
          role: 'admin',
          name: 'ผู้ดูแลระบบ (Admin)'
        }
      ];
      for (const acc of initialAccounts) {
        const docId = acc.email.toLowerCase().trim().replace(/[\.\#\$\[\]]/g, '_');
        await setDoc(doc(db, 'accounts', docId), acc);
      }
      console.log('Seeded user accounts from backend.');
    }

    // 3. Check & seed employees
    const employeesCol = collection(db, 'employees');
    const employeesSnap = await getDocs(employeesCol);
    if (employeesSnap.empty) {
      const initialEmployees = [
        {
          id: 'emp-004',
          employeeId: 'AWA-001',
          firstName: 'ผู้ใช้งาน',
          lastName: 'ทดสอบ (AWA)',
          position: 'เจ้าหน้าที่ทดสอบระบบ',
          department: 'เทคโนโลยีสารสนเทศ (IT)',
          email: 'test.awa@office.co.th',
          phone: '089-999-9999',
          startDate: '2026-07-08',
          status: 'active',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
          personalId: '1100400567890',
          birthDate: '1995-12-12',
          address: 'กรุงเทพมหานคร',
          emergencyContact: {
            name: 'ผู้ติดต่อฉุกเฉิน',
            relationship: 'เพื่อน',
            phone: '089-999-9999'
          },
          verificationStatus: 'pending'
        }
      ];
      for (const emp of initialEmployees) {
        await setDoc(doc(db, 'employees', emp.id), emp);
      }
      console.log('Seeded initial employees from backend.');
    }

    // 4. Clean up old mock documents if they exist in Firestore
    try {
      await deleteDoc(doc(db, 'employees', 'emp-001'));
      await deleteDoc(doc(db, 'employees', 'emp-002'));
      await deleteDoc(doc(db, 'employees', 'emp-003'));
      await deleteDoc(doc(db, 'accounts', 'somchai_j_office_co_th'));
      console.log('Cleaned up old mock documents from Firestore successfully.');
    } catch (err) {
      console.warn('Could not delete old mock documents (might not exist):', err);
    }

    // Always ensure AWA-001 exists
    const awaDocRef = doc(db, 'employees', 'emp-004');
    const awaSnap = await getDoc(awaDocRef);
    if (!awaSnap.exists()) {
      await setDoc(awaDocRef, {
        id: 'emp-004',
        employeeId: 'AWA-001',
        firstName: 'ผู้ใช้งาน',
        lastName: 'ทดสอบ (AWA)',
        position: 'เจ้าหน้าที่ทดสอบระบบ',
        department: 'เทคโนโลยีสารสนเทศ (IT)',
        email: 'test.awa@office.co.th',
        phone: '089-999-9999',
        startDate: '2026-07-08',
        status: 'active',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        personalId: '1100400567890',
        birthDate: '1995-12-12',
        address: 'กรุงเทพมหานคร',
        emergencyContact: {
          name: 'ผู้ติดต่อฉุกเฉิน',
          relationship: 'เพื่อน',
          phone: '089-999-9999'
        },
        verificationStatus: 'pending'
      });
      console.log('Successfully seeded employee AWA-001.');
    }
  } catch (error) {
    console.error('Error during backend seeding:', error);
  }
}

// ---------------------------------------------------------
// Vite Server / Static Files Hosting
// ---------------------------------------------------------
async function startServer() {
  await seedBackendFirestore();

  if (process.env.NODE_ENV !== 'production') {
    console.log('Running server in DEVELOPMENT mode with Vite Middleware.');
    const { createServer: createViteServer } = await import('vite');
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
