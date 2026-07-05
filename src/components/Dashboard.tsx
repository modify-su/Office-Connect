import { motion } from 'motion/react';
import { 
  Users, 
  CalendarDays, 
  Package, 
  CheckSquare, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Activity,
  Plus,
  ArrowUpRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { Employee, LeaveRequest, SupplyItem, SupplyRequest, UserAccount } from '../types';

interface DashboardProps {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  supplyItems: SupplyItem[];
  supplyRequests: SupplyRequest[];
  setActiveTab: (tab: string) => void;
  openAddEmployeeModal: () => void;
  openRequestLeaveModal: () => void;
  openRequestSupplyModal: () => void;
  currentUser?: UserAccount | null;
}

export default function Dashboard({
  employees,
  leaveRequests,
  supplyItems,
  supplyRequests,
  setActiveTab,
  openAddEmployeeModal,
  openRequestLeaveModal,
  openRequestSupplyModal,
  currentUser
}: DashboardProps) {
  
  const isEmployee = currentUser?.role === 'employee';
  const targetEmployee = isEmployee ? employees.find(e => e.employeeId === currentUser.employeeId) : null;

  // Calculate statistics (Admin)
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const pendingLeaves = leaveRequests.filter(l => l.status === 'pending').length;
  const lowStockItems = supplyItems.filter(s => s.stock <= s.minStock).length;
  const pendingSupplies = supplyRequests.filter(s => s.status === 'pending').length;

  // Calculate statistics (Employee)
  const myLeaves = leaveRequests.filter(l => l.employeeId === currentUser?.employeeId);
  const myPendingLeaves = myLeaves.filter(l => l.status === 'pending').length;
  const mySupplies = supplyRequests.filter(s => s.employeeId === currentUser?.employeeId);
  const myPendingSupplies = mySupplies.filter(s => s.status === 'pending').length;

  // Process data for Department chart
  const deptCounts: { [key: string]: number } = {};
  employees.forEach(emp => {
    const dept = emp.department.split(' ')[0] || emp.department;
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });
  const deptData = Object.keys(deptCounts).map(name => ({
    name,
    พนักงาน: deptCounts[name]
  }));

  // Process data for Inventory category pie chart
  const catStock: { [key: string]: number } = {};
  supplyItems.forEach(item => {
    catStock[item.category] = (catStock[item.category] || 0) + item.stock;
  });
  const pieColors = ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
  const catData = Object.keys(catStock).map((name, i) => ({
    name,
    value: catStock[name],
    color: pieColors[i % pieColors.length]
  }));

  // Combined Activities list (sorted by simulated date)
  // If employee role, filter activities list to only their own items
  const baseLeaves = isEmployee ? myLeaves : leaveRequests;
  const baseSupplies = isEmployee ? mySupplies : supplyRequests;
  
  const activities = [
    ...baseLeaves.map(l => ({
      id: l.id,
      type: 'leave',
      title: `ยื่นคำขอลา (${l.leaveType === 'sick' ? 'ลาป่วย' : l.leaveType === 'annual' ? 'ลาพักร้อน' : l.leaveType === 'swap' ? 'ขอสลับวันหยุด' : 'ลากิจ'})`,
      user: l.employeeName || 'ไม่ระบุชื่อ',
      status: l.status,
      date: l.startDate || '',
      desc: l.reason || '',
    })),
    ...baseSupplies.map(s => ({
      id: s.id,
      type: 'supply',
      title: `ขอเบิกพัสดุ: ${s.itemName || 'ไม่ระบุชื่อพัสดุ'}`,
      user: s.employeeName || 'ไม่ระบุชื่อ',
      status: s.status,
      date: s.createdAt || '',
      desc: `จำนวน ${s.quantity || 0} หน่วย สำหรับ${s.purpose || 'ทั่วไป'}`,
    }))
  ].sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    return dateB.localeCompare(dateA);
  }).slice(0, 5);

  return (
    <div className="space-y-6" id="dashboard-view-container">
      {/* Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-radial from-slate-900 to-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden"
        id="dashboard-header-banner"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="bg-blue-500/20 text-blue-300 font-mono text-xs px-3 py-1 rounded-full border border-blue-500/30 uppercase tracking-wider">
              {isEmployee ? `พนักงาน: ${currentUser?.name}` : 'ฝ่ายบุคคล / Admin Portal'}
            </span>
            <h1 className="text-3xl md:text-4xl font-sans font-bold tracking-tight mt-3">
              {isEmployee ? `สวัสดีตอนเช้า, คุณ ${targetEmployee?.firstName || currentUser?.name}` : 'ระบบจัดการออฟฟิศอัจฉริยะ'}
            </h1>
            <p className="text-slate-400 mt-2 text-sm md:text-base max-w-xl">
              {isEmployee 
                ? 'ยินดีต้อนรับสู่แดชบอร์ดส่วนบุคคล คุณสามารถตรวจสอบและกรอกข้อมูลประวัติพนักงาน ยื่นใบคำขอลาหยุด ตรวจสอบสถานะการอนุมัติ และขอเบิกพัสดุอุปกรณ์ได้ทันที'
                : 'ยินดีต้อนรับสู่แดชบอร์ดศูนย์กลางการควบคุมสำนักงาน จัดการบุคลากร อนุมัติการลา เบิกจ่ายวัสดุอุปกรณ์สำนักงาน และควบคุมระบบได้อย่างรวดเร็วในจุดเดียว'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {isEmployee ? (
              <button
                onClick={() => setActiveTab('employees')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer"
                id="dashboard-action-my-profile"
              >
                <Users className="w-4 h-4" />
                ประวัติส่วนตัวของฉัน
              </button>
            ) : (
              <button
                onClick={openAddEmployeeModal}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer"
                id="dashboard-action-add-employee"
              >
                <Plus className="w-4 h-4" />
                เพิ่มพนักงาน
              </button>
            )}
            <button
              onClick={openRequestLeaveModal}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-4 py-2.5 rounded-xl text-sm font-medium border border-white/10 transition cursor-pointer"
              id="dashboard-action-request-leave"
            >
              <CalendarDays className="w-4 h-4" />
              ยื่นใบลา
            </button>
            <button
              onClick={openRequestSupplyModal}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer"
              id="dashboard-action-request-supply"
            >
              <Package className="w-4 h-4" />
              เบิกพัสดุ
            </button>
          </div>
        </div>
      </motion.div>

      {/* Grid Statistics Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-counter-grid">
        {/* Box 1 */}
        {!isEmployee ? (
          <motion.div 
            onClick={() => setActiveTab('employees')}
            whileHover={{ y: -3 }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer group"
            id="stat-box-employees"
          >
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-400">จำนวนพนักงานทั้งหมด</p>
              <h3 className="text-3xl font-sans font-bold text-slate-800">{totalEmployees}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                ทำงานอยู่ปกติ {activeEmployees} คน
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            onClick={() => setActiveTab('employees')}
            whileHover={{ y: -3 }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer group"
            id="stat-box-profile-verify"
          >
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-400">สถานะข้อมูลประวัติ</p>
              <h3 className={`text-xl font-sans font-bold ${
                targetEmployee?.verificationStatus === 'verified' ? 'text-emerald-600' : 'text-amber-500'
              }`}>
                {targetEmployee?.verificationStatus === 'verified' ? '✅ ตรวจสอบแล้ว' : '⚠️ รอตรวจสอบ'}
              </h3>
              <p className="text-xs text-slate-400">
                {targetEmployee?.verificationStatus === 'verified' 
                  ? 'ประวัติของท่านผ่านการตรวจสอบแล้ว' 
                  : 'กรอกหรือปรับปรุงเพื่อรอ HR ตรวจสอบ'}
              </p>
            </div>
            <div className={`p-3 rounded-xl transition ${
              targetEmployee?.verificationStatus === 'verified' ? 'bg-emerald-50' : 'bg-amber-50'
            }`}>
              <Users className={`w-6 h-6 ${targetEmployee?.verificationStatus === 'verified' ? 'text-emerald-600' : 'text-amber-500'}`} />
            </div>
          </motion.div>
        )}

        {/* Box 2 */}
        {!isEmployee ? (
          <motion.div 
            onClick={() => setActiveTab('leaves')}
            whileHover={{ y: -3 }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer group"
            id="stat-box-leaves"
          >
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-400">คำขอรออนุมัติการลา</p>
              <h3 className="text-3xl font-sans font-bold text-slate-800">{pendingLeaves}</h3>
              <p className="text-xs text-slate-500">
                {pendingLeaves > 0 ? `⚠️ มี ${pendingLeaves} รายการรอการดำเนินการ` : '✅ ไม่มีงานค้าง'}
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition">
              <CalendarDays className="w-6 h-6 text-amber-500" />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            onClick={() => setActiveTab('leaves')}
            whileHover={{ y: -3 }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer group"
            id="stat-box-my-leaves-total"
          >
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-400">ใบลาสะสมของฉัน</p>
              <h3 className="text-3xl font-sans font-bold text-slate-800">{myLeaves.length}</h3>
              <p className="text-xs text-slate-500">
                {myPendingLeaves > 0 ? `⚠️ รอ HR พิจารณา ${myPendingLeaves} ใบ` : '✅ ได้อนุมัติเสร็จสิ้น'}
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition">
              <CalendarDays className="w-6 h-6 text-amber-500" />
            </div>
          </motion.div>
        )}

        {/* Box 3 */}
        {!isEmployee ? (
          <motion.div 
            onClick={() => setActiveTab('supplies')}
            whileHover={{ y: -3 }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer group"
            id="stat-box-supplies-stock"
          >
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-400">วัสดุอุปกรณ์ใกล้หมดคลัง</p>
              <h3 className="text-3xl font-sans font-bold text-slate-800">{lowStockItems}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 text-amber-600">
                {lowStockItems > 0 ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    ควรสั่งซื้อเพิ่มเติมด่วน!
                  </>
                ) : (
                  '✅ พัสดุทุกรายการเพียงพอ'
                )}
              </p>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl group-hover:bg-rose-100 transition">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            onClick={() => setActiveTab('supplies')}
            whileHover={{ y: -3 }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer group"
            id="stat-box-my-supplies-total"
          >
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-400">รายการเบิกอุปกรณ์ของฉัน</p>
              <h3 className="text-3xl font-sans font-bold text-slate-800">{mySupplies.length}</h3>
              <p className="text-xs text-slate-400">คำร้องเบิกพัสดุส่วนการประสานงาน</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </motion.div>
        )}

        {/* Box 4 */}
        {!isEmployee ? (
          <motion.div 
            onClick={() => setActiveTab('supplies')}
            whileHover={{ y: -3 }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer group"
            id="stat-box-supplies-requests"
          >
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-400">คำขอเบิกพัสดุรออนุมัติ</p>
              <h3 className="text-3xl font-sans font-bold text-slate-800">{pendingSupplies}</h3>
              <p className="text-xs text-slate-500">
                {pendingSupplies > 0 ? `📦 เบิกพัสดุค้างจ่าย ${pendingSupplies} รายการ` : '✅ จ่ายครบถ้วนแล้ว'}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition">
              <Package className="w-6 h-6 text-emerald-500" />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            onClick={() => setActiveTab('supplies')}
            whileHover={{ y: -3 }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer group"
            id="stat-box-my-pending-all"
          >
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-400">คำขอที่อยู่ระหว่างดำเนินการ</p>
              <h3 className="text-3xl font-sans font-bold text-amber-500">{myPendingLeaves + myPendingSupplies}</h3>
              <p className="text-xs text-slate-500">
                คุณมีคำขอลา {myPendingLeaves} และเบิกพัสดุ {myPendingSupplies} ที่กำลังตรวจสอบ
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition flex-shrink-0">
              <Activity className="w-6 h-6 text-emerald-500" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Charts & Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" id="charts-and-activities">
        {/* Department Distribution Bar Chart */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between" id="chart-department-block">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-medium text-slate-800 font-sans flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                สถิติจำนวนพนักงานรายแผนก
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">พนักงานปัจจุบัน {totalEmployees} คน แบ่งรายกลุ่มงาน</p>
            </div>
          </div>
          <div className="h-64 mt-2">
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', border: 'none' }}
                    labelClassName="text-blue-300 font-medium"
                  />
                  <Bar dataKey="พนักงาน" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                ไม่มีข้อมูลที่ต้องการแสดงผล
              </div>
            )}
          </div>
        </div>

        {/* Inventory Category Pie Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between" id="chart-category-block">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-base font-medium text-slate-800 font-sans flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-500" />
                อัตราส่วนสต็อกวัสดุคลังรายหมวดหมู่
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">วิจัยและประเมินสินค้าสำนักงานในคลังส่วนกลาง</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row lg:flex-col xl:flex-row items-center justify-between gap-4 py-2 mt-2">
            <div className="h-44 w-44 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={catData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {catData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', border: 'none' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <span className="text-xs text-slate-400 block leading-tight">พัสดุรวม</span>
                <span className="text-xl font-bold font-mono text-slate-700">
                  {supplyItems.reduce((acc, curr) => acc + curr.stock, 0)}
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-2 w-full">
              {catData.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }}></span>
                    <span className="text-slate-600 font-medium">{item.name}</span>
                  </div>
                  <span className="text-slate-500 font-mono font-bold">{item.value} ชิ้น/ชุด</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity List & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" id="dashboard-bottom-grid">
        {/* Dynamic Activity Feeds */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between" id="activity-feeds-panel">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-base font-medium text-slate-800 font-sans flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  ประวัติกิจกรรมล่าสุดในแผนก
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">ความคลื่นไหวสถิติการยื่นคำขอของพนักงานสำนักงาน</p>
              </div>
            </div>

            <div className="space-y-4" id="activity-items-list">
              {activities.length > 0 ? (
                activities.map((act) => (
                  <div key={act.id} className="flex gap-4 p-3 hover:bg-slate-50 rounded-xl transition border border-slate-50">
                    <div className="mt-1 flex-shrink-0">
                      {act.type === 'leave' ? (
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                          <CalendarDays className="w-4.5 h-4.5" />
                        </div>
                      ) : (
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                          <Package className="w-4.5 h-4.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <h5 className="text-sm font-semibold text-slate-700 truncate">{act.title}</h5>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {act.date}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            act.status === 'approved' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : act.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {act.status === 'approved' ? 'อนุมัติแล้ว' : act.status === 'pending' ? 'รออนุมัติ' : 'ปฏิเสธ'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">ยื่นโดย: {act.user}</p>
                      {act.desc && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1 italic">
                          " {act.desc} "
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 text-sm">
                  ไม่พบรายการกิจกรรมล่าสุดในระบบ
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Overview Details Card / Quick Guideline */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between" id="office-rules-guidelines">
          <div className="space-y-4">
            <div>
              <h4 className="text-base font-medium text-slate-800 font-sans flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                คู่มือการดำเนินการเบื้องต้น
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">แนวทางหลักการสำหรับผู้ดูแลระบบและฝ่ายทะเบียน</p>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-600" id="rule-items-stack">
              <div className="p-3 bg-gradient-to-r from-slate-50 to-blue-50/20 rounded-xl border border-slate-100">
                <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  การตรวจสอบสิทธิ์ความคุมพนักงาน
                </p>
                <p className="text-slate-500 mt-1">
                  กรุณาตรวจสอบประวัติพนักงานและวันเริ่มงานก่อนกดโอนย้ายแผนกหรือระงับบัญชีการใช้งานในสำนักงานใหญ่
                </p>
              </div>

              <div className="p-3 bg-gradient-to-r from-slate-50 to-emerald-50/20 rounded-xl border border-slate-100">
                <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  การจัดจ่ายและควบคุมสต็อกสินค้า
                </p>
                <p className="text-slate-500 mt-1">
                  เมื่อระบบแสดงผลค่าเตือนสต็อกพัสดุสีเหลือง/แดง แนะนำให้ฝ่ายจัดซื้อสร้างใบสั่งซื้อเข้าไปที่หน้าการตั้งค่าพัสดุ
                </p>
              </div>

              <div className="p-3 bg-gradient-to-r from-slate-50 to-amber-50/20 rounded-xl border border-slate-100">
                <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                  เกณฑ์การอนุมัติใบลาพักผ่อนพนักงาน
                </p>
                <p className="text-slate-500 mt-1">
                  พนักงานระดับปฏิบัติการลากิจต้องล่วงหน้าอย่างน้อย 1 วัน สำหรับการลาพักร้อนต้องยื่นล่วงหน้าอย่างน้อย 3 วันทำการ
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer group" onClick={() => setActiveTab('settings')}>
            <span>ตั้งค่าโครงสร้างองค์กรเพิ่มเติม</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </div>
        </div>
      </div>
    </div>
  );
}
