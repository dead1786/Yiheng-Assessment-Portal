/**
 * 稽核紀錄附件（試算表 Z 欄）解析
 *
 * Z 欄一格可同時放多個項目，用逗號 / 直線 / 換行分隔（與照片相同）：
 *  - 照片連結（App 上傳到 Drive 的檔案連結）→ 照片預覽
 *  - PDF 連結（手動貼進 Z 欄的 Drive 連結，檔案放在稽核 PDF 資料夾）→ 「開啟 PDF」按鈕
 *  - 純文字關鍵字（例如「GNT2609961961 2026_WK37」）→ 對照 PDF 資料夾清單，唯一符合時才變成按鈕
 *  - Drive 資料夾連結 → 「開啟資料夾」按鈕
 *
 * Drive 連結本身看不出是照片還是 PDF，所以靠後端 getAuditPdfIndex 回傳的
 * 「稽核 PDF 資料夾清單」判斷：檔案 ID 在清單裡就是 PDF；不在清單裡的一律視為照片（維持既有行為）。
 * 網址路徑以 .pdf 結尾的一般連結也視為 PDF。
 */
export interface PdfIndexFile {
  id: string;
  name: string;
  /** 相對於 PDF 根資料夾的子路徑，例如 "2026"；根目錄為空字串 */
  path?: string;
}

export type Attachment =
  | { kind: 'image'; url: string; raw: string }
  | { kind: 'pdf'; url: string; name: string; raw: string }
  | { kind: 'folder'; url: string; raw: string }
  | { kind: 'text'; text: string; raw: string };

export type PdfAttachment = Extract<Attachment, { kind: 'pdf' }>;

/** 與各照片 modal 相同的分隔規則：逗號、直線、換行 */
export const splitAttachmentField = (field?: string | null): string[] =>
  (field || '').split(/[,|\n]+/).map(s => s.trim()).filter(Boolean);

const isUrl = (s: string) => /^https?:\/\//i.test(s);
const isDriveFolderUrl = (u: string) => /drive\.google\.com\/drive\/(u\/\d+\/)?folders\//i.test(u);

export const extractDriveFileId = (url: string): string | null => {
  const m = url.match(/\/(?:file\/)?d\/([a-zA-Z0-9_-]{10,})/) || url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  return m ? m[1] : null;
};

export const drivePdfViewUrl = (id: string) => `https://drive.google.com/file/d/${id}/view`;

const pathnameOf = (u: string) => { try { return new URL(u).pathname; } catch { return u.split(/[?#]/)[0]; } };
const looksLikePdfUrl = (u: string) => /\.pdf$/i.test(pathnameOf(u));
const fileNameFromUrl = (u: string) => { try { return decodeURIComponent(pathnameOf(u).split('/').pop() || '') || u; } catch { return u; } };
export const stripPdfExt = (name: string) => name.replace(/\.pdf$/i, '').trim();

/**
 * 比對用正規化：小寫、去 .pdf、WK→W（試算表常寫 WK37，檔名是 W37）、去掉空白與各種分隔符號
 */
export const normalizeKey = (s: string): string =>
  s.toLowerCase()
    .replace(/\.pdf$/, '')
    .replace(/wk(?=\d)/g, 'w')
    .replace(/[\s_\-~、，,.\/\\()（）【】\[\]:：]+/g, '');

// 純數字兩碼（如「17」）太容易誤中，不當片段；兩碼含字母（如 W6）或三碼以上才算
const isUsableToken = (t: string) => t.length >= 3 || (t.length === 2 && /\D/.test(t));
const tokensOf = (s: string): string[] =>
  s.split(/[\s_\-~、，,\/\\|]+/).map(normalizeKey).filter(t => t && isUsableToken(t));

interface Candidate { file: PdfIndexFile; name: string; path: string }
const candidateCache = new WeakMap<PdfIndexFile[], Candidate[]>();
const candidatesOf = (index: PdfIndexFile[]): Candidate[] => {
  let c = candidateCache.get(index);
  if (!c) {
    c = index.map(file => ({
      file,
      name: normalizeKey(file.name),
      path: normalizeKey(file.path ? `${file.path}/${file.name}` : file.name),
    }));
    candidateCache.set(index, c);
  }
  return c;
};

/**
 * 用試算表裡的純文字關鍵字找 PDF。只在「唯一」符合時回傳，模稜兩可寧可不配（避免連到錯的檔）。
 * 1. 整段正規化後等於檔名或路徑 → 命中
 * 2. 整段被檔名/路徑包含且只有一個檔案符合 → 命中
 * 3. 拆成片段（空白、_、-、、等分隔），算每個檔案包含幾個片段；最高分唯一且 ≥1 → 命中
 */
export function matchPdfByKeyword(text: string, index: PdfIndexFile[]): PdfIndexFile | null {
  const key = normalizeKey(text);
  if (!key || index.length === 0) return null;
  const cands = candidatesOf(index);

  const exact = cands.filter(c => c.name === key || c.path === key);
  if (exact.length === 1) return exact[0].file;
  if (exact.length > 1) return null;

  const contains = cands.filter(c => c.path.includes(key));
  if (contains.length === 1) return contains[0].file;
  if (contains.length > 1) return null;

  const tokens = tokensOf(text);
  if (tokens.length === 0) return null;
  let best: Candidate | null = null;
  let bestScore = 0;
  let tie = false;
  for (const c of cands) {
    const score = tokens.reduce((s, t) => s + (c.path.includes(t) ? 1 : 0), 0);
    if (score > bestScore) { best = c; bestScore = score; tie = false; }
    else if (score === bestScore && score > 0) tie = true;
  }
  return best && bestScore > 0 && !tie ? best.file : null;
}

/** 把 Z 欄字串拆成附件清單；index 為 null（清單還沒抓到）時 Drive 連結一律當照片 */
export function classifyAttachments(field: string | null | undefined, index: PdfIndexFile[] | null | undefined): Attachment[] {
  const list = index && index.length > 0 ? index : null;
  const byId = list ? new Map<string, PdfIndexFile>(list.map(f => [f.id, f])) : null;
  return splitAttachmentField(field).map<Attachment>(raw => {
    if (isUrl(raw)) {
      if (isDriveFolderUrl(raw)) return { kind: 'folder', url: raw, raw };
      const id = extractDriveFileId(raw);
      const hit = id && byId ? byId.get(id) : undefined;
      if (hit) return { kind: 'pdf', url: raw, name: stripPdfExt(hit.name), raw };
      if (looksLikePdfUrl(raw)) return { kind: 'pdf', url: raw, name: stripPdfExt(fileNameFromUrl(raw)), raw };
      return { kind: 'image', url: raw, raw };
    }
    const hit = list ? matchPdfByKeyword(raw, list) : null;
    if (hit) return { kind: 'pdf', url: drivePdfViewUrl(hit.id), name: stripPdfExt(hit.name), raw };
    return { kind: 'text', text: raw, raw };
  });
}

export interface GroupedAttachments {
  images: string[];
  pdfs: PdfAttachment[];
  folders: string[];
  texts: string[];
}

export const EMPTY_GROUP: GroupedAttachments = { images: [], pdfs: [], folders: [], texts: [] };

/** 依種類分組，方便卡片渲染 */
export function groupAttachments(attachments: Attachment[]): GroupedAttachments {
  const g: GroupedAttachments = { images: [], pdfs: [], folders: [], texts: [] };
  for (const a of attachments) {
    if (a.kind === 'image') g.images.push(a.url);
    else if (a.kind === 'pdf') g.pdfs.push(a);
    else if (a.kind === 'folder') g.folders.push(a.url);
    else g.texts.push(a.text);
  }
  return g;
}
