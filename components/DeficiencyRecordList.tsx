import React, { useState } from 'react';
import { DeficiencyRecordV2, AnyDeficiencyRecord } from '../types';
import { ChevronDown, Image as ImageIcon, ExternalLink, ShieldCheck } from 'lucide-react';
import { buildTicketUrl, extractTicketNo } from '../services/ticketLink';

export type { DeficiencyItemV2, DeficiencyRecordV2, DeficiencyRecordV1, AnyDeficiencyRecord } from '../types';

export const isV2 = (r: AnyDeficiencyRecord): r is DeficiencyRecordV2 => (r as DeficiencyRecordV2).version === 'v2';

const formatDate = (d: string) => { try { return new Date(d).toLocaleDateString('zh-TW'); } catch { return d; } };

// 稽核類型徽章顏色
const typeBadgeClass = (type: string) => {
  if (type === '工單') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (type.includes('保養')) return 'bg-purple-100 text-purple-700 border-purple-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
};

interface DeficiencyRecordListProps {
  records: AnyDeficiencyRecord[];
  showAuditor?: boolean;   // 是否顯示稽核員欄（個人視角不需要）
  showName?: boolean;      // 是否顯示被稽核員工姓名（依人分組的視角不需要）
  onViewPhotos?: (photoUrlString: string) => void;
}

export const DeficiencyRecordList: React.FC<DeficiencyRecordListProps> = ({ records, showAuditor = true, showName = false, onViewPhotos }) => {
  const [expanded, setExpanded] = useState<number | null>(null);

  const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">目前尚無任何稽核紀錄</div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((rec, i) => {
        const v2 = isV2(rec);
        const isOpen = expanded === i;
        const totalCount = v2 ? rec.items.reduce((s, it) => s + (parseInt(it.count) || 0), 0) : null;
        const noDeficiency = v2 && rec.items.length === 0;

        return (
          <div key={i} className={`border rounded-xl overflow-hidden transition-all ${noDeficiency ? 'border-green-200 bg-green-50/40' : 'border-gray-200 bg-white'}`}>
            {/* 摘要列（點擊展開） */}
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : i)}
              className="w-full text-left p-4 hover:bg-gray-50/70 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* 第一列：日期 + 徽章群 */}
                  <div className="flex items-center flex-wrap gap-2 mb-1.5">
                    <span className="font-mono text-xs text-gray-500">{formatDate(rec.date)}</span>
                    {v2 ? (
                      <>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeBadgeClass(rec.auditType)}`}>{rec.auditType}</span>
                        {rec.zone && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">{rec.zone}</span>}
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 border border-gray-300">舊版</span>
                        {rec.status && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">{rec.status}</span>}
                      </>
                    )}
                    {showName && <span className="text-xs font-bold text-gray-800">{rec.name}</span>}
                  </div>

                  {/* 第二列：站名 */}
                  <div className="font-bold text-gray-900 text-sm truncate">{rec.station}</div>

                  {/* 第三列：缺失摘要 */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {v2 ? (
                      noDeficiency ? (
                        <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                          <ShieldCheck size={12} className="mr-1" /> 無缺失
                        </span>
                      ) : (
                        rec.items.map((it, j) => (
                          <span key={j} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                            {it.label} ×{it.count || '?'}
                          </span>
                        ))
                      )
                    ) : (
                      <span className="text-[11px] text-gray-500 line-clamp-1">
                        {[rec.ppe, rec.fencing, rec.boxClean, rec.siteClean, rec.order, rec.gnop, rec.other].filter(Boolean).join('、') || '—'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {v2 && !noDeficiency && totalCount !== null && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">{totalCount} 筆</span>
                  )}
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </button>

            {/* 展開明細 */}
            {isOpen && (
              <div className="border-t border-gray-100 bg-gray-50/60 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                {v2 ? (
                  <div className="space-y-3">
                    {noDeficiency ? (
                      <p className="text-sm text-green-700 font-bold flex items-center"><ShieldCheck size={16} className="mr-1.5" /> 本次稽核無缺失</p>
                    ) : (
                      rec.items.map((it, j) => (
                        <div key={j} className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-gray-800">{it.label}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{it.count} 筆</span>
                          </div>
                          <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{it.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {[
                      ['個人防護裝備', rec.ppe], ['圈圍架設', rec.fencing],
                      ['開關箱內清潔', rec.boxClean], ['現場清潔', rec.siteClean],
                      ['作業順序', rec.order], ['GNOP結單', rec.gnop], ['其他描述', rec.other],
                    ].filter(([, v]) => v).map(([label, value], j) => (
                      <div key={j} className="bg-white border border-gray-200 rounded-lg p-3">
                        <span className="font-bold text-gray-800 block mb-0.5">{label}</span>
                        <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 底部資訊列：工單 / 照片 / 稽核員 */}
                <div className="flex items-center flex-wrap gap-3 mt-3 pt-3 border-t border-gray-200">
                  {(rec as any).ticketUrl && (
                    <a
                      href={buildTicketUrl((rec as any).ticketNo || (rec as any).ticketUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline font-mono text-xs"
                    >
                      {extractTicketNo((rec as any).ticketNo || (rec as any).ticketUrl)}
                      <ExternalLink size={11} />
                    </a>
                  )}
                  {rec.photoUrl && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onViewPhotos?.(rec.photoUrl!); }}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-bold"
                    >
                      <ImageIcon size={13} /> 查看照片
                    </button>
                  )}
                  {showAuditor && rec.auditor && (
                    <span className="text-xs text-gray-400 ml-auto">稽核員：{rec.auditor}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
