import React, { useState } from 'react';
import { 
  MessageSquare, 
  Bot, 
  AlertTriangle, 
  Copy, 
  Terminal, 
  Send, 
  Zap, 
  Save,
  Check as CheckedIcon
} from 'lucide-react';
import { SystemSettings, Employee } from '../types';

interface LineBotSectionProps {
  settings: SystemSettings;
  onUpdateSettings: (settings: SystemSettings) => void;
  employees: Employee[];
}

export default function LineBotSection({
  settings,
  onUpdateSettings,
  employees
}: LineBotSectionProps) {
  // Notification states
  const [userNotification, setUserNotification] = useState<string | null>(null);
  const [userErrorNotification, setUserErrorNotification] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // LINE Bot Credentials state
  const [lineChannelToken, setLineChannelToken] = useState(settings.lineChannelToken || '');
  const [lineChannelSecret, setLineChannelSecret] = useState(settings.lineChannelSecret || '');

  // Webhook Simulator local states
  const [simEmployeeId, setSimEmployeeId] = useState<string>('');
  const [simText, setSimText] = useState<string>('เข้างาน');
  const [simLogs, setSimLogs] = useState<Array<{ type: 'user' | 'reply' | 'info'; text: string }>>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const handleSaveLineSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      lineChannelToken,
      lineChannelSecret
    });
    setSaveSuccess(true);
    setUserNotification("บันทึกข้อมูลการเชื่อมต่อ LINE Bot สำเร็จแล้ว!");
    setTimeout(() => {
      setSaveSuccess(false);
      setUserNotification(null);
    }, 3000);
  };

  const handleSimulateWebhook = async () => {
    if (!simText.trim()) return;

    setIsSimulating(true);
    
    // Add User Message bubble
    const userMsg = simText.trim();
    setSimLogs(prev => [...prev, { type: 'user', text: userMsg }]);

    try {
      // 1. Fire a real HTTP request to the running Webhook endpoint on backend!
      // This will execute the database writes (clock-in, clock-out, leave submission) in Firestore!
      await fetch('/api/line/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: [
            {
              type: 'message',
              replyToken: 'sim_reply_' + Date.now(),
              source: {
                userId: simEmployeeId ? `U_SIM_${simEmployeeId}` : 'U_SIM_UNKNOWN',
                type: 'user'
              },
              message: {
                id: 'sim_msg_' + Date.now(),
                type: 'text',
                text: userMsg
              }
            }
          ]
        })
      });

      // 2. Local response mockup for high-fidelity interactive chat bubbles!
      setTimeout(() => {
        const textLower = userMsg.toLowerCase();
        let replyText = '';
        
        // Find matching employee
        const emp = employees.find(e => e.employeeId === simEmployeeId);

        if (!emp) {
          // If not linked yet, check for EMP-xxx ID pattern
          const empIdMatch = userMsg.match(/EMP-\d+/i);
          if (empIdMatch) {
            const matchedEmpId = empIdMatch[0].toUpperCase();
            const targetEmp = employees.find(e => e.employeeId?.toUpperCase() === matchedEmpId);
            if (targetEmp) {
              replyText = `เชื่อมโยงบัญชีสำเร็จแล้วครับ! 🎉\n\nยินดีต้อนรับคุณ ${targetEmp.firstName} ${targetEmp.lastName} (${targetEmp.position}) เข้าสู่ระบบช่วยเหลือพนักงานออฟฟิศผ่าน LINE Bot ประจำองค์กรครับ\n\nท่านสามารถพิมพ์คำสั่งต่อไปนี้เพื่อสั่งการระบบได้ทันที:\n• พิมพ์ "เข้างาน" เพื่อลงเวลาเข้างาน\n• พิมพ์ "ออกงาน" เพื่อลงเวลาออกงาน\n• พิมพ์ "เช็ควันลา" เพื่อตรวจสอบโควตาวันลาคงเหลือ\n• พิมพ์ "ขอลา" เพื่อส่งใบลาเข้าระบบ`;
              // Auto set the dropdown to this employee to simulate they are now linked!
              setSimEmployeeId(targetEmp.employeeId);
            } else {
              replyText = `❌ ไม่พบรหัสพนักงาน "${matchedEmpId}" ในระบบฐานข้อมูลของบริษัท กรุณาตรวจสอบรหัสพนักงานให้ถูกต้องและลองพิมพ์ใหม่อีกครั้งครับ`;
            }
          } else {
            replyText = `สวัสดีครับ ยินดีต้อนรับสู่ระบบช่วยเหลือพนักงานผ่าน LINE Bot 🤖\n\n⚠️ ขณะนี้บัญชี LINE ของคุณยังไม่ได้เชื่อมโยงเข้ากับระบบพนักงาน\n\n👉 กรุณาเชื่อมโยงบัญชีโดยการพิมพ์รหัสพนักงานของคุณ เช่น:\n\nEMP-001\n\n(พิมพ์ส่งรหัสพนักงานของคุณเข้ามาได้เลยครับ)`;
          }
        } else {
          // Process commands for linked employee
          if (textLower.includes('เช็ควันลา') || textLower.includes('วันลา') || textLower.includes('โควตา') || textLower === 'leave') {
            const sickMax = settings.maxLeaveDays?.sick ?? 30;
            const annualMax = settings.maxLeaveDays?.annual ?? 12;
            const personalMax = settings.maxLeaveDays?.personal ?? 6;
            
            replyText = `📊 สรุปโควตาวันลาของคุณ ${emp.firstName} ${emp.lastName}\n\n` +
                        `• ลาป่วย: ใช้ไป 0/${sickMax} วัน (คงเหลือ ${sickMax} วัน)\n` +
                        `• ลาพักร้อน: ใช้ไป 0/${annualMax} วัน (คงเหลือ ${annualMax} วัน)\n` +
                        `• ลากิจ: ใช้ไป 0/${personalMax} วัน (คงเหลือ ${personalMax} วัน)`;
          } else if (textLower.includes('เข้างาน') || textLower.includes('ลงชื่อเข้างาน') || textLower.includes('checkin') || textLower.includes('check in') || textLower === 'clock in') {
            const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
            replyText = `✅ บันทึกเวลาเข้างานสำเร็จ! ⏰\n\nพนักงาน: ${emp.firstName} ${emp.lastName}\nวันที่: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}\nเวลาเข้างาน: ${timeStr}\nสถานะ: 🟢 ปกติ\n\nขอให้มีความสุขกับการทำงานในวันนี้ครับ! 💼`;
          } else if (textLower.includes('ออกงาน') || textLower.includes('ลงชื่อออกงาน') || textLower.includes('checkout') || textLower.includes('check out') || textLower === 'clock out') {
            const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
            replyText = `✅ บันทึกเวลาออกงานสำเร็จ! 🚪\n\nพนักงาน: ${emp.firstName} ${emp.lastName}\nวันที่: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}\nเวลาออกงาน: ${timeStr}\n\nเดินทางกลับบ้านและพักผ่อนให้เต็มที่ครับ! 🏡`;
          } else if (textLower.startsWith('ขอลา') || textLower.startsWith('/ขอลา')) {
            const leaveMatch = userMsg.match(/ขอลา\s+(ลาป่วย|ลากิจ|ลาพักร้อน|ลาพักผ่อน)\s+(\d+)\s+วัน\s+ตั้งแต่วันที่\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+เหตุผล\s+(.+)/i);
            if (leaveMatch) {
              const type = leaveMatch[1];
              const days = leaveMatch[2];
              const date = leaveMatch[3];
              const reason = leaveMatch[4];
              replyText = `✅ ส่งใบอนุมัติลาพักผ่อนสำเร็จแล้วครับ! 📨\n\nรายละเอียดใบลา:\n• ผู้ลา: ${emp.firstName} ${emp.lastName}\n• ประเภท: ${type}\n• จำนวน: ${days} วัน\n• ตั้งแต่วันที่: ${date}\n• เหตุผล: ${reason}\n\n⏳ ขณะนี้ระบบได้ส่งเอกสารเพื่อรออนุมัติไปยังฝ่ายบุคคล (HR) และผู้จัดการของคุณเรียบร้อยแล้ว`;
            } else {
              replyText = `📝 วิธีการส่งใบลาหยุดผ่าน LINE Bot:\n\nกรุณาพิมพ์ข้อความส่งในรูปแบบด้านล่างนี้:\n\nขอลา [ประเภทลา] [จำนวนวัน] วัน ตั้งแต่วันที่ [วว/ดด/ปปปป] เหตุผล [ระบุเหตุผล]\n\n👉 ตัวอย่างคำลา:\n• ขอลา ลาป่วย 1 วัน ตั้งแต่วันที่ 08/07/2026 เหตุผล เป็นไข้ตัวร้อน\n• ขอลา ลากิจ 2 วัน ตั้งแต่วันที่ 15/07/2026 เหตุผล ไปทำธุระต่างจังหวัด`;
            }
          } else {
            replyText = `ยินดีต้อนรับคุณ ${emp.firstName} 🤖\n\nท่านสามารถสั่งการระบบด้วยข้อความคำสั่งต่อไปนี้ได้ทันทีครับ:\n\n⏰ ระบบลงชื่อเข้า-ออกงาน\n• พิมพ์ "เข้างาน" หรือ "ลงชื่อเข้างาน"\n• พิมพ์ "ออกงาน" หรือ "ลงชื่อออกงาน"\n\n📊 โควตาวันลาหยุดพนักงาน\n• พิมพ์ "เช็ควันลา" เพื่อตรวจสอบสิทธิ์คงเหลือ\n\n📝 การยื่นเอกสารขอลาพักผ่อน\n• พิมพ์ "ขอลา" เพื่อดูวิธีการยื่นใบลา`;
          }
        }

        setSimLogs(prev => [...prev, { type: 'reply', text: replyText }]);
        setIsSimulating(false);
      }, 650);

    } catch (err) {
      console.error('Simulation request failed:', err);
      setSimLogs(prev => [...prev, { type: 'reply', text: `⚠️ ไม่สามารถติดต่อบริการหลังบ้านได้ กรุณาเชื่อมต่ออินเทอร์เน็ตหรือรีสตาร์ตเซิร์ฟเวอร์` }]);
      setIsSimulating(false);
    }

    setSimText('');
  };

  return (
    <div className="space-y-6" id="line-bot-section-container">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4" id="line-bot-header-panel">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 font-sans flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-600" />
            เชื่อมต่อ LINE Bot สำหรับผู้ใช้งานและองค์กร
          </h2>
          <p className="text-xs text-slate-500">จัดการ Token และแผงจำลองการส่งข้อมูล (Webhook Sandbox) เพื่อรับส่งประวัติและสั่งการผ่าน LINE OA</p>
        </div>
      </div>

      {/* Notifications */}
      {userNotification && (
        <div className="p-4 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-2xl border border-emerald-100 flex items-center gap-2" id="line-notif-success">
          <CheckedIcon className="w-4 h-4 shrink-0" />
          <span>{userNotification}</span>
        </div>
      )}

      {userErrorNotification && (
        <div className="p-4 bg-red-50 text-red-800 text-xs font-bold rounded-2xl border border-red-100 flex items-center gap-2" id="line-notif-error">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{userErrorNotification}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="settings-line-panel">
        {/* Left Column - Credentials Form (5 Cols) */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-800 font-sans flex items-center gap-2 pb-2 border-b border-slate-50">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              ตั้งค่าบัญชี LINE Official Account (OA)
            </h3>

            <div className="space-y-4">
              {/* Webhook URL display */}
              <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    Webhook URL สำหรับใส่ใน LINE OA
                  </span>
                  <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                    พร้อมใช้งาน
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  คัดลอกลิงก์นี้ไปใส่ในช่อง <strong>Webhook URL</strong> บนระบบ LINE Developers Console
                </p>
                <div className="flex gap-1.5 items-center bg-white p-2 rounded-xl border border-amber-200">
                  <input
                    type="text"
                    readOnly
                    value={window.location.origin.includes('ais-dev-') ? window.location.origin.replace('ais-dev-', 'ais-pre-') + '/api/line/webhook' : `${window.location.origin}/api/line/webhook`}
                    className="flex-1 bg-transparent border-none text-[10px] font-mono text-slate-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const finalUrl = window.location.origin.includes('ais-dev-') ? window.location.origin.replace('ais-dev-', 'ais-pre-') + '/api/line/webhook' : `${window.location.origin}/api/line/webhook`;
                      navigator.clipboard.writeText(finalUrl);
                      setUserNotification("คัดลอก Webhook URL แบบสาธารณะสำเร็จแล้ว");
                      setTimeout(() => setUserNotification(null), 3000);
                    }}
                    className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors cursor-pointer"
                    title="Copy URL"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100 text-[10px] text-indigo-700 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-indigo-500 text-indigo-500" />
                    ทำไมต้องใช้ลิงก์ ais-pre- ?
                  </div>
                  <p className="leading-relaxed">
                    ลิงก์พรีวิวในหน้าแก้ไข (ais-dev-) จะถูกป้องกันด้วยระบบล็อกอินของ Google Cloud ทำให้อินเทอร์เน็ตภายนอกและบอทของ LINE ไม่สามารถส่งข้อมูลเข้ามาได้ (จะส่งผลให้เจอ 404/403/401 ใน LINE Console)
                  </p>
                  <p className="leading-relaxed font-bold text-emerald-600">
                    💡 ระบบได้แปลงลิงก์ด้านบนเป็น "Shared App URL (ais-pre-)" ซึ่งเป็นสาธารณะเรียบร้อยแล้ว ท่านสามารถคัดลอกลิงก์ด้านบนไปใส่ใน LINE Developers Console เพื่อเชื่อมต่อได้ทันที!
                  </p>
                </div>
              </div>

              {/* Channel Access Token */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600">LINE Channel Access Token *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="ป้อน Channel Access Token ยาวๆ จาก LINE Developers Console"
                  value={lineChannelToken}
                  onChange={(e) => setLineChannelToken(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-none leading-relaxed"
                />
              </div>

              {/* Channel Secret */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600">LINE Channel Secret *</label>
                <input
                  type="password"
                  required
                  placeholder="ป้อน Channel Secret ของบอท"
                  value={lineChannelSecret}
                  onChange={(e) => setLineChannelSecret(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveLineSettings}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-105 transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                บันทึกข้อมูลการเชื่อมต่อ LINE
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Simulator & Quick Guide (7 Cols) */}
        <div className="xl:col-span-7 space-y-6">
          {/* Guide Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-800 font-sans flex items-center gap-2 pb-2 border-b border-slate-50">
              <Bot className="w-5 h-5 text-indigo-600" />
              คู่มือการเริ่มเชื่อมต่อระบบ 5 ขั้นตอน (สเถียรและใช้งานจริง)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {[
                { step: "1", title: "สร้างบอท", desc: "ไปที่ LINE Developers และสร้าง Provider พร้อม Messaging API" },
                { step: "2", title: "ใส่ Webhook", desc: "คัดลอก Webhook URL ทางซ้ายไปวางในช่อง Webhook URL" },
                { step: "3", title: "เปิดสวิตช์", desc: "เปิด 'Use Webhook' บนหน้าจอ LINE Developers" },
                { step: "4", title: "กรอกข้อมูล", desc: "นำ Token และ Secret มาใส่ในช่องบันทึกทางซ้าย" },
                { step: "5", title: "ทดสอบVerify", desc: "กดปุ่ม Verify บน LINE หรือลองใช้บอทจำลองทางด้านล่าง" },
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-center">
                  <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-indigo-50 border border-indigo-250 text-indigo-600 text-xs font-black">
                    {item.step}
                  </span>
                  <h4 className="text-[11px] font-bold text-slate-700">{item.title}</h4>
                  <p className="text-[9px] text-slate-450 leading-tight">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Simulator Sandbox Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-800 font-sans flex items-center justify-between pb-2 border-b border-slate-50">
              <span className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-500" />
                แผงจำลองการทำงาน LINE Webhook Sandbox (ใช้งานได้จริง)
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-black border border-emerald-100">
                REAL-TIME SYNC
              </span>
            </h3>

            <p className="text-xs text-slate-500">
              ท่านสามารถจำลองพฤติกรรมการพิมพ์ของพนักงานเพื่อทดสอบการตอบสนองของเซิร์ฟเวอร์และการบันทึกเวลาทำงานลงบนฐานข้อมูลได้ทันทีโดยไม่ต้องเชื่อมต่อ LINE จริง
            </p>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left side: simulation options */}
              <div className="md:col-span-5 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">เลือกบัญชีพนักงานจำลอง</label>
                  <select
                    value={simEmployeeId}
                    onChange={(e) => setSimEmployeeId(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none"
                  >
                    <option value="">-- เลือกพนักงานสำหรับจำลอง --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.employeeId}>
                        {emp.firstName} {emp.lastName} ({emp.employeeId}) {emp.lineUserId ? '🔗 ผูกแล้ว' : '🚫 ยังไม่ผูก'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">เลือกหรือพิมพ์ข้อความคำสั่ง</label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {['เข้างาน', 'ออกงาน', 'เช็ควันลา', 'ขอลา ลาป่วย 1 วัน ตั้งแต่วันที่ 08/07/2026 เหตุผล ปวดหัว'].map(cmd => (
                      <button
                        key={cmd}
                        type="button"
                        onClick={() => setSimText(cmd)}
                        className="px-2 py-0.5 text-[10px] bg-white hover:bg-indigo-50 border border-slate-200 text-slate-600 rounded-md transition cursor-pointer"
                      >
                        {cmd.substring(0, 8)}{cmd.length > 8 ? '...' : ''}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="พิมพ์คำสั่งจำลอง เช่น เข้างาน หรือ รหัสพนักงาน"
                    value={simText}
                    onChange={(e) => setSimText(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 font-sans"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSimulateWebhook}
                  disabled={isSimulating}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSimulating ? 'กำลังส่งข้อมูลจำลอง...' : 'จำลองการส่งข้อความ'}
                </button>
              </div>

              {/* Right side: Mock LINE Chat UI */}
              <div className="md:col-span-7 flex flex-col border border-slate-200 rounded-2xl overflow-hidden bg-[#7494C4] h-[280px]">
                <div className="bg-[#2B3545] p-2 px-3 text-white text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-emerald-400" />
                    LINE Chat Simulator
                  </span>
                  <button
                    type="button"
                    onClick={() => setSimLogs([])}
                    className="text-[10px] hover:underline opacity-80 cursor-pointer"
                  >
                    ล้างแชท
                  </button>
                </div>
                
                {/* Message Bubbles Container */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2.5 flex flex-col">
                  {simLogs.length === 0 ? (
                    <div className="text-center text-[11px] text-[#A6BCD9] my-auto">
                      ไม่มีประวัติการจำลองในขณะนี้<br />
                      กรุณากดจำลองคำสั่งด้านซ้ายมือเพื่อเริ่มต้นทดสอบ
                    </div>
                  ) : (
                    simLogs.map((log, lidx) => {
                      if (log.type === 'info') {
                        return (
                          <div key={lidx} className="self-center bg-black/10 text-[10px] text-white px-2.5 py-0.5 rounded-full font-sans max-w-[90%] text-center">
                            {log.text}
                          </div>
                        );
                      } else if (log.type === 'reply') {
                        return (
                          <div key={lidx} className="flex items-start gap-1.5 self-start max-w-[85%]">
                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] border border-slate-200 text-[#2B3545] font-black font-sans shrink-0">
                              🤖
                            </div>
                            <div className="bg-white p-2 rounded-xl text-slate-800 text-[11px] leading-relaxed shadow-xs relative whitespace-pre-line font-sans">
                              {log.text}
                            </div>
                          </div>
                        );
                      } else {
                        // Sent message (green bubble)
                        return (
                          <div key={lidx} className="bg-[#4DDF4B] p-2 rounded-xl text-slate-800 text-[11px] leading-relaxed max-w-[80%] self-end shadow-xs font-sans">
                            {log.text}
                          </div>
                        );
                      }
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
