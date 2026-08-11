import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { DeficiencyReportFormV2 } from './components/DeficiencyReportFormV2';
import { DeficiencyRecordList, AnyDeficiencyRecord } from './components/DeficiencyRecordList';
import { AuditStatsDashboard } from './components/AuditStatsDashboard';
import { User } from './types';
import { ClipboardCheck, User as UserIcon, Users, ShieldAlert, ChevronRight, X, AlertTriangle, BarChart3 } from 'lucide-react';

// ===== 測試專用：攔截 API 請求，改用模擬資料 =====
const MOCK_STATIONS = [
  'GoStation 台北民生敦化站', 'GoStation 台北南京復興站', 'GoStation 新北板橋文化站',
  'GoStation 新北三重重新站', 'GoStation 桃園中壢中央西站', 'GoStation 台北信義松仁站',
];
const MOCK_EMPLOYEES = [
  { name: '王小明', jobTitle: '維運工程師' },
  { name: '李大華', jobTitle: '資深維運工程師' },
  { name: '陳美玲', jobTitle: '維運主任' },
];

localStorage.setItem('cache_stations', JSON.stringify(MOCK_STATIONS));
localStorage.setItem('admin_employees', JSON.stringify(MOCK_EMPLOYEES));

const realFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.toString();
  if (url.startsWith('/__mock_api__') || url === '') {
    return Promise.resolve(new Response(JSON.stringify({ success: false, message: '測試模式：未連接後端' }), {
      headers: { 'Content-Type': 'application/json' }
    }));
  }
  return realFetch(input, init);
};

const MOCK_USER: User = {
  name: '測試稽核員', jobTitle: '維運主任', jobGrade: 'M1', yearsOfService: '5',
  kpi: '', joinDate: '2021-01-01', isAdmin: true, canAssess: true, canEditSchedule: true,
  annualLeave: '0', annualLeaveUsed: '0', assignedStation: '', allowRemote: false,
};

// ===== 模擬紀錄：混合新版 (v2) 與舊版 (v1) =====
const MOCK_RECORDS: AnyDeficiencyRecord[] = [
  // v2 有缺失（工單）
  {
    version: 'v2', zone: 'N1', name: '王小明', station: 'GoStation 台北民生敦化站',
    date: '2026-08-05', auditType: '工單', ticketNo: 'GNT2607912106',
    ticketUrl: 'https://prod-gnop.gogoro.com/ticket/management/search/detail/GNT2607912106',
    items: [
      { label: 'GNOP結案', text: '浮水印錯誤，維運項目內容敘述異常', count: '1' },
      { label: '車倉相關', text: '防火提袋破損，未使用LV1方式運送', count: '2' },
    ],
    photoUrl: 'https://drive.google.com/drive/folders/xxxx', auditor: '測試稽核員',
  },
  // v2 無缺失（月保養）
  {
    version: 'v2', zone: 'N2', name: '王小明', station: 'GoStation 新北板橋文化站',
    date: '2026-08-03', auditType: '月保養',
    items: [], auditor: '測試稽核員',
  },
  // v2 有缺失（年度保養，多項目）
  {
    version: 'v2', zone: 'N1', name: '李大華', station: 'GoStation 台北信義松仁站',
    date: '2026-07-28', auditType: '年度保養',
    items: [
      { label: 'VM外觀', text: 'Slot Cover #1破損未註記；多顆電池髒汙；下蓋無法鎖附', count: '3' },
      { label: '工具使用', text: '熱顯影量測方式錯誤', count: '1' },
      { label: '現場須立即填寫的文件', text: '電流數字填寫錯誤', count: '1' },
      { label: '換電站環境清潔', text: '開關箱內有施工垃圾未清除，點檢表✔OK', count: '1' },
    ],
    photoUrl: 'https://drive.google.com/drive/folders/yyyy', auditor: '測試稽核員',
  },
  // v2 有缺失（半年保養）
  {
    version: 'v2', zone: 'C1', name: '陳美玲', station: 'GoStation 桃園中壢中央西站',
    date: '2026-07-20', auditType: '半年保養',
    items: [
      { label: '換電站的附屬設施檢查', text: '站點招牌C型鋼保護套缺少', count: '1' },
    ],
    auditor: '測試稽核員',
  },
  // v2 補充：涵蓋當週/當月/年度不同區間
  {
    version: 'v2', zone: 'N1', name: '王小明', station: 'GoStation 台北南京復興站',
    date: '2026-08-10', auditType: '月保養',
    items: [
      { label: 'VM外觀', text: '上蓋與前蓋間隙大於3mm，點檢表✔OK', count: '2' },
    ],
    auditor: '測試稽核員',
  },
  {
    version: 'v2', zone: 'N1', name: '王小明', station: 'GoStation 台北信義松仁站',
    date: '2026-07-12', auditType: '工單',
    ticketNo: 'GNT2607001234',
    ticketUrl: 'https://prod-gnop.gogoro.com/ticket/management/search/detail/GNT2607001234',
    items: [], auditor: '測試稽核員',
  },
  {
    version: 'v2', zone: 'N2', name: '李大華', station: 'GoStation 新北三重重新站',
    date: '2026-08-08', auditType: '工單',
    ticketNo: 'GNT2608005678',
    ticketUrl: 'https://prod-gnop.gogoro.com/ticket/management/search/detail/GNT2608005678',
    items: [
      { label: 'GNOP結案', text: '結案備註內容不完整，無點檢表連結', count: '1' },
    ],
    auditor: '測試稽核員',
  },
  {
    version: 'v2', zone: 'C1', name: '陳美玲', station: 'GoStation 桃園中壢中央西站',
    date: '2026-03-15', auditType: '年度保養',
    items: [
      { label: '工具使用', text: '地阻值量測前，未使用迴路電阻板先測試地阻計狀態', count: '2' },
      { label: '現場維修流程', text: '離場確認未落實', count: '1' },
    ],
    auditor: '測試稽核員',
  },
  // v1 舊版紀錄
  {
    version: 'v1', name: '王小明', station: 'GoStation 台北南京復興站',
    date: '2026-06-15', status: '施作完成',
    ppe: '未戴安全帽', fencing: '', boxClean: '箱內有人工垃圾', siteClean: '',
    order: '', gnop: '結單註記不完善', other: '現場遺留工具未收回',
    auditor: '測試稽核員', photoUrl: '',
    ticketUrl: 'https://prod-gnop.gogoro.com/ticket/management/search/detail/GNT2605859689',
  },
  {
    version: 'v1', name: '李大華', station: 'GoStation 新北三重重新站',
    date: '2026-05-30', status: '施作中',
    ppe: '', fencing: '三角錐距離不足', boxClean: '', siteClean: '',
    order: '未先斷電', gnop: '', other: '',
    auditor: '測試稽核員',
  },
];

type Tab = 'form' | 'personal' | 'auditor' | 'admin';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'form', label: '稽核回報表單', icon: <ClipboardCheck size={15} /> },
  { key: 'personal', label: '個人視角', icon: <UserIcon size={15} /> },
  { key: 'auditor', label: '稽核人視角', icon: <ShieldAlert size={15} /> },
  { key: 'admin', label: '管理員視角', icon: <Users size={15} /> },
];

const TestApp: React.FC = () => {
  const [tab, setTabRaw] = useState<Tab>('form');
  const [toast, setToast] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);

  const setTab = (t: Tab) => { setTabRaw(t); setStatsOpen(false); };

  // 統計表按鈕（三個視角共用）
  const StatsButton = (
    <button
      onClick={() => setStatsOpen(true)}
      className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm transition-all active:scale-95"
    >
      <BarChart3 size={14} /> 統計表
    </button>
  );

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  };

  const handleViewPhotos = () => showToast('（測試模式）此處會開啟照片瀏覽');

  // 依被稽核人分組（稽核人/管理員視角用）
  const grouped = React.useMemo(() => {
    const map: Record<string, AnyDeficiencyRecord[]> = {};
    MOCK_RECORDS.forEach(r => {
      if (!map[r.name]) map[r.name] = [];
      map[r.name].push(r);
    });
    return Object.entries(map).map(([name, records]) => ({ name, records }));
  }, []);

  const personalRecords = MOCK_RECORDS.filter(r => r.name === '王小明');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-2xl mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-xl text-sm text-yellow-800 font-bold text-center">
        🧪 測試預覽模式 — 稽核回報新版（模擬資料，不會寫入後端）
      </div>

      {/* 分頁切換 */}
      <div className="w-full max-w-2xl mb-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 rounded-lg font-bold text-sm whitespace-nowrap flex items-center gap-1.5 transition-all ${
              tab === t.key ? 'bg-red-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* 表單 */}
      {tab === 'form' && (
        <DeficiencyReportFormV2
          user={MOCK_USER}
          apiUrl="/__mock_api__"
          onBack={() => showToast('（測試模式）已點擊返回')}
          onAlert={showToast}
        />
      )}

      {/* 個人視角：王小明查看自己的缺失 */}
      {tab === 'personal' && (
        statsOpen ? (
          <AuditStatsDashboard records={personalRecords} mode="personal" onBack={() => setStatsOpen(false)} />
        ) : (
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="text-orange-500" size={20} /> 我的稽核紀錄
              </h2>
              {StatsButton}
            </div>
            <p className="text-sm text-gray-500 mb-5">模擬「王小明」查看自己的紀錄（不顯示稽核員）</p>
            <DeficiencyRecordList
              records={personalRecords}
              showAuditor={false}
              showName={false}
              onViewPhotos={handleViewPhotos}
            />
          </div>
        </div>
        )
      )}

      {/* 稽核人視角：測試稽核員查看自己稽核過的人 */}
      {tab === 'auditor' && (
        statsOpen ? (
          <AuditStatsDashboard records={MOCK_RECORDS} mode="multi" onBack={() => setStatsOpen(false)} />
        ) : (
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ShieldAlert className="text-orange-500" size={20} /> 我的稽核紀錄（稽核員）
              </h2>
              {StatsButton}
            </div>
            <p className="text-sm text-gray-500 mb-5">模擬稽核員「測試稽核員」依被稽核人分組瀏覽</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {grouped.map((g, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedPerson(g.name)}
                  className="flex justify-between items-center p-4 rounded-xl border bg-red-50 border-red-200 hover:border-red-300 transition-all hover:shadow-md"
                >
                  <div className="text-left">
                    <h3 className="font-bold text-gray-800">{g.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">共 {g.records.length} 筆</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
        )
      )}

      {/* 管理員視角：所有員工 + 缺失計數 */}
      {tab === 'admin' && (
        statsOpen ? (
          <AuditStatsDashboard records={MOCK_RECORDS} mode="multi" onBack={() => setStatsOpen(false)} />
        ) : (
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="text-blue-600" size={20} /> 稽核紀錄（管理員）
              </h2>
              {StatsButton}
            </div>
            <p className="text-sm text-gray-500 mb-5">模擬管理員查看所有員工的稽核紀錄</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MOCK_EMPLOYEES.map((emp, i) => {
                const count = MOCK_RECORDS.filter(r => r.name === emp.name).length;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedPerson(emp.name)}
                    className={`flex justify-between items-center p-4 rounded-xl border transition-all hover:shadow-md ${
                      count > 0 ? 'bg-red-50 border-red-200 hover:border-red-300' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="text-left">
                      <h3 className="font-bold text-gray-800">{emp.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{emp.jobTitle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${count > 0 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {count} 筆
                      </span>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        )
      )}

      {/* 個人明細 Modal（稽核人/管理員共用） */}
      {selectedPerson && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedPerson(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={20} />
                {selectedPerson} 的稽核歷史明細
              </h3>
              <button onClick={() => setSelectedPerson(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              <DeficiencyRecordList
                records={MOCK_RECORDS.filter(r => r.name === selectedPerson)}
                showAuditor={true}
                showName={false}
                onViewPhotos={handleViewPhotos}
              />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm animate-in fade-in slide-in-from-top-2 duration-200 max-w-[90vw]">
          {toast}
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<TestApp />);
