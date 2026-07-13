import React, { useState, useEffect } from 'react';
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
import { collection, onSnapshot, query, orderBy, limit, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

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

  // LINE Notification configuration
  const [lineManagerUserId, setLineManagerUserId] = useState(settings.lineManagerUserId || '');
  const [enableLineNotification, setEnableLineNotification] = useState(settings.enableLineNotification !== false);
  const [isTestingNotify, setIsTestingNotify] = useState<boolean>(false);

  // Webhook Simulator local states
  const [simEmployeeId, setSimEmployeeId] = useState<string>('');
  const [simText, setSimText] = useState<string>('เข้างาน');
  const [simLogs, setSimLogs] = useState<Array<{ type: 'user' | 'reply' | 'info'; text: string; quickReplies?: Array<{ label: string; text: string }> }>>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // LINE Live push notification log tab states
  const [activeSimTab, setActiveSimTab] = useState<'chat' | 'push_logs'>('chat');
  const [lineNotifs, setLineNotifs] = useState<Array<{ id: string; to: string; toName: string; type: string; message: string; createdAt: string }>>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'lineNotifications'),
      orderBy('createdAt', 'desc'),
      limit(25)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: any[] = [];
      snapshot.forEach((docSnap) => {
        notifs.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      setLineNotifs(notifs);
    }, (error) => {
      console.error('Error listening to lineNotifications:', error);
    });
    return () => unsubscribe();
  }, []);

  const handleClearNotifs = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'lineNotifications'));
      const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    } catch (err) {
      console.error('Error clearing lineNotifications:', err);
    }
  };

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

  const handleSaveNotificationSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      lineManagerUserId,
      enableLineNotification
    });
    setUserNotification("บันทึกการตั้งค่าระบบแจ้งเตือนผู้อนุมัติทาง LINE เรียบร้อยแล้ว!");
    setTimeout(() => {
      setUserNotification(null);
    }, 3000);
  };

  const handleTestNotification = async () => {
    setIsTestingNotify(true);
    setUserNotification(null);
    setUserErrorNotification(null);
    
    const mockLeaveRequest = {
      employeeId: 'TEST-999',
      employeeName: 'พนักงานทดสอบ ระบบแจ้งเตือน',
      leaveType: 'annual',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      days: 1,
      reason: 'ทดสอบส่งข้อความแจ้งเตือนผู้อนุมัติผ่านปุ่ม Test Connection',
      status: 'pending'
    };

    try {
      // First save to ensure server has latest keys if user edited them
      onUpdateSettings({
        ...settings,
        lineManagerUserId,
        enableLineNotification
      });

      const response = await fetch('/api/line/notify-approver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveRequest: mockLeaveRequest })
      });

      const data = await response.json();
      if (data.success) {
        setUserNotification("ส่งข้อความทดสอบไปยัง LINE สำเร็จ! กรุณาตรวจสอบโทรศัพท์หรือหน้าต่างแชท LINE OA");
      } else {
        setUserErrorNotification(`ไม่สามารถส่งข้อความทดสอบได้: ${data.reason || 'กรุณาตรวจสอบการตั้งค่า'}`);
      }
    } catch (err) {
      console.error('Error during testing notification:', err);
      setUserErrorNotification("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsTestingNotify(false);
      setTimeout(() => {
        setUserNotification(null);
        setUserErrorNotification(null);
      }, 5000);
    }
  };

  const handleSimulateWebhook = async (overrideText?: any) => {
    const textToSimulate = (typeof overrideText === 'string') ? overrideText : simText;
    if (!textToSimulate || typeof textToSimulate !== 'string' || !textToSimulate.trim()) return;

    setIsSimulating(true);
    
    // Add User Message bubble
    const userMsg = textToSimulate.trim();
    setSimLogs(prev => [...prev, { type: 'user', text: userMsg }]);

    try {
      // 1. Fire a real HTTP request to the running Webhook endpoint on backend!
      // This will execute the database writes (clock-in, clock-out, leave submission) in Firestore!
      const response = await fetch('/api/line/webhook', {
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

      const data = await response.json();
      const simReplies = data?.simulationReplies || [];

      // 2. Display the actual responses generated by the state machine and logic on the server!
      setTimeout(() => {
        if (simReplies && simReplies.length > 0) {
          simReplies.forEach((reply: any) => {
            const replyText = reply.text || '';
            let replyQuickReplies: Array<{ label: string; text: string }> | undefined = undefined;

            if (reply.quickReply && reply.quickReply.items) {
              replyQuickReplies = reply.quickReply.items.map((item: any) => ({
                action: {
                  label: item.action?.label || '',
                  text: item.action?.text || ''
                }
              })).map((item: any) => ({
                label: item.action.label,
                text: item.action.text
              }));
            }

            setSimLogs(prev => [...prev, { type: 'reply', text: replyText, quickReplies: replyQuickReplies }]);
          });
        } else {
          setSimLogs(prev => [...prev, { 
            type: 'reply', 
            text: `⚠️ ระบบได้รับข้อความแล้ว แต่ไม่มีข้อความตอบกลับจากระบบอัตโนมัติ` 
          }]);
        }
        setIsSimulating(false);
      }, 650);

    } catch (err) {
      console.error('Simulation request failed:', err);
      setSimLogs(prev => [...prev, { type: 'reply', text: `⚠️ ไม่สามารถติดต่อบริการหลังบ้านได้ กรุณาเชื่อมต่ออินเทอร์เน็ตหรือรีสตาร์ตเซิร์ฟเวอร์` }]);
      setIsSimulating(false);
    }

    if (typeof overrideText !== 'string') {
      setSimText('');
    }
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

          {/* Approver Alerts Settings Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-800 font-sans flex items-center gap-2 pb-2 border-b border-slate-50">
              <Zap className="w-5 h-5 text-indigo-600 fill-indigo-100" />
              แจ้งเตือนผู้อนุมัติผ่าน LINE (Approver Alerts)
            </h3>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              เมื่อพนักงานส่งคำขอลาหยุดงาน ระบบสามารถส่งแจ้งเตือนรายละเอียดใบลาไปยังผู้จัดการหรือฝ่ายบุคคลทางแอปพลิเคชัน LINE ได้แบบเรียลไทม์
            </p>

            <form onSubmit={handleSaveNotificationSettings} className="space-y-4">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-700">เปิดใช้งานระบบส่งแจ้งเตือนทาง LINE</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={enableLineNotification}
                    onChange={(e) => setEnableLineNotification(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* LINE Bot Push Notification Target */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-650 flex items-center justify-between">
                  <span>LINE User ID / Group ID ของผู้อนุมัติ</span>
                  <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded">
                    LINE Messaging API 🟢
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="ป้อน LINE User ID (เช่น U123456...) หรือ Group ID (ขึ้นต้นด้วย C...)"
                  value={lineManagerUserId}
                  onChange={(e) => setLineManagerUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 leading-tight space-y-1 pt-1">
                  <span>📢 <strong>คำอธิบาย:</strong> เนื่องจากระบบ LINE Notify ได้ปิดตัวลงอย่างเป็นทางการ ทางระบบจึงเปลี่ยนมาใช้ <strong>LINE Messaging API (LINE Bot Push)</strong> ซึ่งมีความปลอดภัยและเป็นสากลกว่า</span>
                  <br />
                  <span>💡 ท่านสามารถระบุได้มากกว่า 1 รายการโดยแยกด้วย <strong>เครื่องหมายจุลภาค (,)</strong> เช่น <code>U12345..., U67890..., C98765...</code> เพื่อส่งข้อมูลให้ผู้อนุมัติหรือผู้จัดการหลายท่านพร้อมกัน</span>
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  บันทึกตั้งค่าแจ้งเตือน
                </button>
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={isTestingNotify || !lineManagerUserId}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-750 font-bold rounded-xl text-xs transition disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-slate-500" />
                  {isTestingNotify ? 'กำลังทดสอบ...' : 'ทดสอบส่งข้อความ'}
                </button>
              </div>
            </form>
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

            <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 text-xs text-slate-600 leading-relaxed space-y-1">
              <span className="font-bold text-indigo-800 flex items-center gap-1">
                💡 คำแนะนำการจำลอง (Webhook Simulator Guide)
              </span>
              <p>
                เลือกบัญชีพนักงานที่ต้องการจำลองทางด้านล่าง (ระบบจะเชื่อมโยง LINE ID จำลองให้อัตโนมัติ) จากนั้นเลือกคำสั่งด่วนหรือพิมพ์ข้อความ เช่น <code>เข้างาน</code>, <code>ออกงาน</code> หรือ <code>เช็ควันลา</code> แล้วกดปุ่มจำลองส่งข้อความเพื่อดูการทำงานและผลลัพธ์ในฐานข้อมูลเสมือนใช้งานจริงได้ทันที!
              </p>
            </div>

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

              {/* Right side: Mock LINE Chat UI & Push Notification Feed */}
              <div className="md:col-span-7 flex flex-col border border-slate-200 rounded-2xl overflow-hidden bg-[#7494C4] h-[280px]">
                <div className="bg-[#2B3545] p-1.5 px-3 text-white text-xs font-bold flex items-center justify-between font-sans">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveSimTab('chat')}
                      className={`px-2 py-0.5 rounded text-[10px] font-sans transition ${activeSimTab === 'chat' ? 'bg-[#4DDF4B] text-slate-900 font-bold' : 'text-slate-350 hover:text-white'}`}
                    >
                      💬 LINE Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSimTab('push_logs')}
                      className={`px-2 py-0.5 rounded text-[10px] font-sans transition flex items-center gap-1 ${activeSimTab === 'push_logs' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-350 hover:text-white'}`}
                    >
                      🔔 LINE Push Logs
                      {lineNotifs.length > 0 && (
                        <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[8px] font-black leading-none text-white bg-rose-600 rounded-full animate-pulse">
                          {lineNotifs.length}
                        </span>
                      )}
                    </button>
                  </div>
                  
                  {activeSimTab === 'chat' ? (
                    <button
                      type="button"
                      onClick={() => setSimLogs([])}
                      className="text-[10px] hover:underline opacity-80 cursor-pointer"
                    >
                      ล้างแชท
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleClearNotifs}
                      className="text-[10px] hover:underline text-rose-300 hover:text-rose-200 cursor-pointer"
                    >
                      ล้างประวัติแจ้งเตือน
                    </button>
                  )}
                </div>
                
                {activeSimTab === 'chat' ? (
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
                            <div key={lidx} className="flex flex-col gap-1 items-start self-start max-w-[90%]">
                              <div className="flex items-start gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] border border-slate-200 text-[#2B3545] font-black font-sans shrink-0">
                                  🤖
                                </div>
                                <div className="bg-white p-2 rounded-xl text-slate-800 text-[11px] leading-relaxed shadow-xs relative whitespace-pre-line font-sans">
                                  {log.text}
                                </div>
                              </div>
                              {log.quickReplies && log.quickReplies.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1 pl-[30px] max-w-full">
                                  {log.quickReplies.map((qr, qridx) => (
                                    <button
                                      key={qridx}
                                      type="button"
                                      onClick={() => handleSimulateWebhook(qr.text)}
                                      className="px-2 py-1 text-[9px] bg-white/90 hover:bg-white text-indigo-700 hover:text-indigo-800 border border-slate-200 rounded-full font-semibold transition shadow-xs cursor-pointer inline-flex items-center"
                                    >
                                      {qr.label}
                                    </button>
                                  ))}
                                </div>
                              )}
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
                ) : (
                  <div className="flex-1 p-3 overflow-y-auto space-y-2 flex flex-col bg-slate-900 text-slate-100">
                    {lineNotifs.length === 0 ? (
                      <div className="text-center text-[11px] text-slate-400 my-auto">
                        ไม่มีประวัติการส่งข้อความแจ้งเตือน (LINE Push) ในขณะนี้<br />
                        ระบบจะบันทึกและแสดงที่นี่เมื่อมีการเพิ่มคำขอลา หรือทำการอนุมัติคำขอลา
                      </div>
                    ) : (
                      lineNotifs.map((notif) => (
                        <div key={notif.id} className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 text-left space-y-1 transition hover:bg-slate-750">
                          <div className="flex items-center justify-between">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-wide uppercase ${notif.type === 'approver' ? 'bg-indigo-950 text-indigo-300 border border-indigo-900' : 'bg-emerald-950 text-emerald-300 border border-emerald-900'}`}>
                              📬 {notif.toName}
                            </span>
                            <span className="text-[8px] text-slate-400 font-mono">
                              {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString('th-TH') : ''}
                            </span>
                          </div>
                          <p className="text-[9.5px] font-mono leading-normal whitespace-pre-line text-slate-200 border-l border-indigo-500/50 pl-2">
                            {notif.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
