import React, { useState, useMemo } from 'react';
import { AnyDeficiencyRecord, DeficiencyRecordV2, isV2 } from './DeficiencyRecordList';
import { ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Users, X, BarChart3, ShieldCheck, ClipboardCheck, AlertTriangle } from 'lucide-react';

// 8 大缺失類別（與稽核回報表單一致）
const CATEGORIES = [
  'GNOP結案', 'VM外觀', '工具使用', '車倉相關',
  '現場須立即填寫的文件', '現場維修流程', '換電站的附屬設施檢查', '換電站環境清潔',
];

type Preset = 'week' | 'month' | 'year' | 'custom';

// 稽核類型篩選選項
const AUDIT_TYPE_OPTIONS = ['工單', '月保養', '半年保養', '年度保養'];

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseDate = (s: string): Date | null => {
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

// 取本週（週一起算）
const getWeekRange = (base: Date): [Date, Date] => {
  const day = (base.getDay() + 6) % 7;
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate() - day);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return [start, end];
};

const getMonthRange = (base: Date): [Date, Date] => [
  new Date(base.getFullYear(), base.getMonth(), 1),
  new Date(base.getFullYear(), base.getMonth() + 1, 0),
];

const getYearRange = (base: Date): [Date, Date] => [
  new Date(base.getFullYear(), 0, 1),
  new Date(base.getFullYear(), 11, 31),
];

interface CategoryEntry {
  date: string;
  station: string;
  name: string;
  text: string;
  count: string;
  auditType: string;
}

interface AuditStatsDashboardProps {
  records: AnyDeficiencyRecord[];
  mode: 'personal' | 'multi';   // personal: 個人視角（無人員篩選、不顯示姓名）
  onBack: () => void;
}

export const AuditStatsDashboard: React.FC<AuditStatsDashboardProps> = ({ records, mode, onBack }) => {
  const today = useMemo(() => new Date(), []);

  const [preset, setPreset] = useState<Preset>('month');
  const [selStart, setSelStart] = useState<Date | null>(null);
  const [selEnd, setSelEnd] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);  // 空 = 全部
  const [peopleModalOpen, setPeopleModalOpen] = useState(false);

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);  // 空 = 全部
  const [typeModalOpen, setTypeModalOpen] = useState(false);

  const [detailCategory, setDetailCategory] = useState<string | null>(null);

  // 目前生效的日期區間
  const [rangeStart, rangeEnd] = useMemo((): [Date, Date] => {
    if (preset === 'week') return getWeekRange(today);
    if (preset === 'month') return getMonthRange(today);
    if (preset === 'year') return getYearRange(today);
    const s = selStart || today;
    return [s, selEnd || s];
  }, [preset, selStart, selEnd, today]);

  // 僅新版資料 + 日期篩選
  const dateFiltered = useMemo(() => {
    const s = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
    const e = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59, 59);
    return records.filter(isV2).filter(r => {
      const d = parseDate(r.date);
      return d && d >= s && d <= e;
    }) as DeficiencyRecordV2[];
  }, [records, rangeStart, rangeEnd]);

  // 類型篩選（未選 = 全部）
  const typeFiltered = useMemo(() => {
    if (selectedTypes.length === 0) return dateFiltered;
    return dateFiltered.filter(r => selectedTypes.includes(r.auditType));
  }, [dateFiltered, selectedTypes]);

  // 該區間內有被稽核的人員名單
  const candidates = useMemo(() => {
    return Array.from(new Set(typeFiltered.map(r => r.name))).sort();
  }, [typeFiltered]);

  // 人員篩選（未選 = 全部）
  const filtered = useMemo(() => {
    if (mode === 'personal' || selectedPeople.length === 0) return typeFiltered;
    return typeFiltered.filter(r => selectedPeople.includes(r.name));
  }, [typeFiltered, selectedPeople, mode]);

  // 統計
  const stats = useMemo(() => {
    const perCategory: Record<string, { count: number; entries: CategoryEntry[] }> = {};
    CATEGORIES.forEach(c => { perCategory[c] = { count: 0, entries: [] }; });
    let totalDef = 0;

    filtered.forEach(r => {
      r.items.forEach(it => {
        const n = parseInt(it.count) || 0;
        totalDef += n;
        if (perCategory[it.label]) {
          perCategory[it.label].count += n;
          perCategory[it.label].entries.push({
            date: r.date, station: r.station, name: r.name,
            text: it.text, count: it.count, auditType: r.auditType,
          });
        }
      });
    });

    return { auditCount: filtered.length, totalDef, perCategory };
  }, [filtered]);

  // 日曆點選：第一下起始日，第二下結束日
  const handleDayClick = (d: Date) => {
    if (!selStart || (selStart && selEnd)) {
      setSelStart(d);
      setSelEnd(null);
      setPreset('custom');
    } else {
      if (d < selStart) {
        setSelEnd(selStart);
        setSelStart(d);
      } else {
        setSelEnd(d);
      }
      setPreset('custom');
      setCalendarOpen(false);
    }
  };

  const applyPreset = (p: Preset) => {
    setPreset(p);
    setSelStart(null);
    setSelEnd(null);
    setCalendarOpen(false);
  };

  const togglePerson = (name: string) => {
    setSelectedPeople(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const toggleType = (t: string) => {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  // 日曆格子
  const calendarDays = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const lastDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const offset = first.getDay(); // 週日起
    const cells: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= lastDate; d++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    return cells;
  }, [viewMonth]);

  const inRange = (d: Date) => {
    if (preset !== 'custom' || !selStart) return false;
    const end = selEnd || selStart;
    return d >= selStart && d <= end;
  };
  const isEdge = (d: Date) => {
    if (preset !== 'custom' || !selStart) return false;
    return fmt(d) === fmt(selStart) || (selEnd !== null && fmt(d) === fmt(selEnd));
  };

  const rangeLabel = `${fmt(rangeStart)} ~ ${fmt(rangeEnd)}`;

  return (
    <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">

      {/* 頂部：返回 + 標題 */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
          <ArrowLeft size={22} className="text-gray-600" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="text-blue-600" size={22} /> 稽核統計表
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">僅統計新版稽核資料</p>
        </div>
      </div>

      {/* 日期區間選擇 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex gap-2 mb-3">
          {([['week', '當週'], ['month', '當月'], ['year', '年度']] as [Preset, string][]).map(([p, label]) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                preset === p ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCalendarOpen(!calendarOpen)}
          className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
            preset === 'custom' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <CalendarIcon size={16} className={preset === 'custom' ? 'text-blue-600' : 'text-gray-400'} />
            {rangeLabel}
          </span>
          <ChevronRight size={16} className={`text-gray-400 transition-transform ${calendarOpen ? 'rotate-90' : ''}`} />
        </button>

        {/* 內嵌日曆：點第一下=起始日，第二下=結束日 */}
        {calendarOpen && (
          <div className="mt-3 border border-gray-200 rounded-xl p-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={18} className="text-gray-600" />
              </button>
              <span className="font-bold text-gray-800 text-sm">{viewMonth.getFullYear()} 年 {viewMonth.getMonth() + 1} 月</span>
              <button
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight size={18} className="text-gray-600" />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {['日', '一', '二', '三', '四', '五', '六'].map(w => (
                <div key={w} className="text-center text-[11px] font-bold text-gray-400 py-1">{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {calendarDays.map((d, i) => d === null ? (
                <div key={i} />
              ) : (
                <button
                  key={i}
                  onClick={() => handleDayClick(d)}
                  className={`h-9 text-sm rounded-lg font-medium transition-colors mx-0.5 ${
                    isEdge(d)
                      ? 'bg-blue-600 text-white font-bold'
                      : inRange(d)
                        ? 'bg-blue-100 text-blue-700'
                        : fmt(d) === fmt(today)
                          ? 'border border-blue-300 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {d.getDate()}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-gray-400 text-center mt-2">
              {!selStart || (selStart && selEnd) ? '點選「起始日」' : '再點選「結束日」'}
            </p>
          </div>
        )}
      </div>

      {/* 篩選按鈕列：類型（全視角）＋人員（非個人視角） */}
      <div className={`grid gap-3 mb-4 ${mode === 'multi' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <button
          onClick={() => setTypeModalOpen(true)}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3.5 flex items-center justify-between hover:border-blue-300 transition-all"
        >
          <span className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
            <ClipboardCheck size={15} className="text-blue-600" />
            類型
          </span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
            selectedTypes.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {selectedTypes.length > 0 ? `已選 ${selectedTypes.length}` : '全部'}
          </span>
        </button>

        {mode === 'multi' && (
          <button
            onClick={() => setPeopleModalOpen(true)}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3.5 flex items-center justify-between hover:border-blue-300 transition-all"
          >
            <span className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
              <Users size={15} className="text-blue-600" />
              人員
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
              selectedPeople.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {selectedPeople.length > 0 ? `已選 ${selectedPeople.length} 人` : `全部 (${candidates.length})`}
            </span>
          </button>
        )}
      </div>

      {/* 總覽卡 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-500 mb-1">
            <ClipboardCheck size={14} className="text-blue-600" /> 被稽核次數
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.auditCount}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">次</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-500 mb-1">
            <AlertTriangle size={14} className="text-red-500" /> 缺失總筆數
          </div>
          <p className={`text-3xl font-bold ${stats.totalDef > 0 ? 'text-red-600' : 'text-green-600'}`}>{stats.totalDef}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">筆</p>
        </div>
      </div>

      {/* 8 類別統計 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-gray-800 mb-3">缺失分類統計 <span className="text-[11px] text-gray-400 font-normal">（點分類看明細）</span></h3>
        {stats.auditCount === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">此區間內無新版稽核資料</div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {CATEGORIES.map(cat => {
              const c = stats.perCategory[cat];
              const hasData = c.count > 0;
              return (
                <button
                  key={cat}
                  onClick={() => hasData && setDetailCategory(cat)}
                  disabled={!hasData}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    hasData
                      ? 'bg-red-50 border-red-200 hover:border-red-400 hover:shadow-sm active:scale-[0.98]'
                      : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <p className={`text-xs font-bold leading-snug mb-2 min-h-[2rem] ${hasData ? 'text-gray-800' : 'text-gray-400'}`}>{cat}</p>
                  <div className="flex items-end justify-between">
                    <span className={`text-2xl font-bold ${hasData ? 'text-red-600' : 'text-gray-300'}`}>{c.count}</span>
                    <span className="text-[10px] text-gray-400 mb-1">筆</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 分類明細（置中靠上彈窗） */}
      {detailCategory && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[8vh] px-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setDetailCategory(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[78vh] flex flex-col animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900">{detailCategory}</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  共 {stats.perCategory[detailCategory].count} 筆缺失 · {stats.perCategory[detailCategory].entries.length} 次稽核
                </p>
              </div>
              <button onClick={() => setDetailCategory(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {stats.perCategory[detailCategory].entries
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((e, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                  <div className="flex items-center flex-wrap gap-2 mb-1.5">
                    <span className="font-mono text-[11px] text-gray-500">{e.date}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{e.auditType}</span>
                    {mode === 'multi' && <span className="text-xs font-bold text-gray-800">{e.name}</span>}
                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{e.count} 筆</span>
                  </div>
                  <p className="text-xs font-bold text-gray-700 mb-1">{e.station}</p>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{e.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 人員多選小窗 */}
      {peopleModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPeopleModalOpen(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm max-h-[70vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900">人員篩選</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">僅列出此區間內有被稽核的人員；不勾選 = 全部</p>
              </div>
              <button onClick={() => setPeopleModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {candidates.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">此區間內無被稽核人員</p>
              ) : (
                candidates.map(name => (
                  <label
                    key={name}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPeople.includes(name)}
                      onChange={() => togglePerson(name)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm font-bold text-gray-800">{name}</span>
                    <span className="ml-auto text-[11px] text-gray-400">
                      {dateFiltered.filter(r => r.name === name).length} 次
                    </span>
                  </label>
                ))
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => setSelectedPeople([])}
                className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-200 transition-colors"
              >
                清除（全部）
              </button>
              <button
                onClick={() => setPeopleModalOpen(false)}
                className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-colors"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 類型多選小窗 */}
      {typeModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setTypeModalOpen(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm max-h-[70vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900">類型篩選</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">不勾選 = 全部類型</p>
              </div>
              <button onClick={() => setTypeModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {AUDIT_TYPE_OPTIONS.map(t => (
                <label
                  key={t}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(t)}
                    onChange={() => toggleType(t)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm font-bold text-gray-800">{t}</span>
                  <span className="ml-auto text-[11px] text-gray-400">
                    {dateFiltered.filter(r => r.auditType === t).length} 次
                  </span>
                </label>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => setSelectedTypes([])}
                className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-200 transition-colors"
              >
                清除（全部）
              </button>
              <button
                onClick={() => setTypeModalOpen(false)}
                className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-colors"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
