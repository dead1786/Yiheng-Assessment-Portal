/**
 * 益恆科技 - 智慧維運系統後端 (Fix: 修正圖片上傳資料夾結構 & 檔名邏輯)
 * Last Updated: 2026-01-14
 */

// ==========================================
// 1. 全域設定與常數
// ==========================================
const GEMINI_API_KEY = "AIzaSyC9H8xTRwmbrOHTq9TtnFpQszzMD90AntE";
// 請確認 Key 是否正確
const GEMINI_MODEL = "gemini-2.5-flash"; 
const LINE_CHANNEL_ACCESS_TOKEN = "WxWlD6o+KA+l/9cH9dg9nOs2iSh/Z/LgbWYfukJmrtr2nVk0curlvF4nDFIUFIUpz9wc475VtxlhCiAc9/i9IQTq0Ykod2vq+99ksd8rdcQ6AVXnz6HUfSSHKb/5wGH/DGGE3ABVKtpmk10Q1K1BDAdB04t89/1O/w1cDnyilFU=";
// --- 外部試算表 ID 設定 (請確認這些 ID 是你自己的) ---
const DEFICIENCY_SHEET_ID = "1OijPUpad24KdNgqR0zGyJNaD1yT_Om_zBJMzRSZ72mg";
const DEFICIENCY_TAB_NAME = "北區";
const SOURCE_SCHEDULE_ID = "12LHjXtNDxOegyVXciUdSGxCXlhkIxyDCX0h81OsSwg0";
const LEAVE_SHEET_ID = "1gPIvD8XK8d-sHqdMl0yOMEYxfzeXk-GXnId_4t9ou58";
const LEAVE_TAB_NAME = "北區維運班表"; 
const ROOT_FOLDER_ID = "1GP65QjEcuwg_TEcchxuJuTsJLnYC_tPy";

// --- 分頁名稱定義 ---
const SHEET_EMPLOYEE = "員工名單";
const SHEET_OTP = "OTP";
const SHEET_SETTINGS = "網站設定";
const SHEET_RECORDS = "考核紀錄";
const SHEET_QUESTIONS = "考核題目";
const SHEET_DEFICIENCIES = "缺失記錄";
const SHEET_SCHEDULE = "北區維運班表"; 
const SHEET_CLOCK_RECORDS = "打卡紀錄"; 
const SHEET_EXCHANGE_STATIONS = "站點清單"; 
const SHEET_OFFICE_SETTINGS = "站點設定";     
const DEFAULT_OFFICE = ["北區辦公室", 25.08050386, 121.4459921, 100];
const SCORING_PROMPT = `你是益恆科技的資深維運經理。你的任務是評估員工的考核回答。
請注意：這不是死板的考試，你需要展現「因材施教」的管理智慧。
【評分核心邏輯】
請務必參考該員工的「年資」與「職等」來動態調整評分標準：
1. 若為【資淺員工 (年資 < 3年)】：
   - 請採取「鼓勵性質」評分。
   - 只要觀念大方向正確，即便細節不完美，也應給予及格以上的分數 (60-80分)。
   - 評語重點在於「肯定其學習態度」並溫柔提點改進。
2. 若為【資深員工 (年資 >= 3年)】：
   - 請採取「嚴格標準」。
   - 要求具備危機意識、SOP 完整性與解決效率。
   - 若回答過於簡略，請勿給予高分。
【評分維度權重】
1. 危機意識 (40%)
2. SOP 合規性 (30%)
3. 解決效率 (30%)
輸出要求：
分數必須介於 0-100。評語請使用繁體中文，針對該員工的資歷給出適當的建議。`;
// ==========================================
// 2. HTTP 請求處理
// ==========================================
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.tryLock(60000);
const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    
    if (action === 'authenticate') return createJSONOutput(authenticateEmployee(postData.name, postData.otp));
else if (action === 'sendLineOtp') return createJSONOutput(sendLineOtp(postData.name));
    else if (action === 'getDeficiencyRecords') return createJSONOutput(getDeficiencyRecords(postData.name));
else if (action === 'getShiftSchedule') return createJSONOutput(getShiftSchedule(postData.name));
    else if (action === 'submitAssessment') return createJSONOutput(saveAssessment(postData.name, postData.answers, postData.jobTitle, postData.jobGrade, postData.yearsOfService, postData.questions));
else if (action === 'getHistory') return createJSONOutput(getHistory(postData.name));
    else if (action === 'getAdminData') return createJSONOutput(getAdminData());
else if (action === 'updateQuestions') return createJSONOutput(saveQuestions(postData.questions));
    else if (action === 'updateAdminPassword') return createJSONOutput(updateAdminPassword(postData.newPassword));
else if (action === 'submitAdminReview') return createJSONOutput(saveAdminReview(postData.rowIndex, postData.adminComment, postData.adminScore));
    else if (action === 'getEmployeeList') return createJSONOutput(getEmployeeList());
else if (action === 'updateEmployeeList') return createJSONOutput(updateEmployeeList(postData.employees));
    else if (action === 'kickUser') return createJSONOutput(kickUser(postData.name));
else if (action === 'checkLoginStatus') return createJSONOutput(checkLoginStatus(postData.name, postData.sessionTime));
    else if (action === 'submitDeficiencyReport') return createJSONOutput(submitDeficiencyReport(postData.data));
else if (action === 'updateScheduleSource') return createJSONOutput(updateScheduleSource(postData.data));
    else if (action === 'getStationList') return createJSONOutput(getStationList());
else if (action === 'getOfficeList') return createJSONOutput(getOfficeList());
    else if (action === 'uploadImage') return createJSONOutput(uploadImageToDrive(postData.data));
else if (action === 'submitClockIn') return createJSONOutput(submitClockIn(postData.data));
    else if (action === 'getClockInStatus') return createJSONOutput(getClockInStatus(postData.name));
else return createJSONOutput({ success: false, message: "Unknown Action: " + action });
} catch (error) { 
    return createJSONOutput({ success: false, message: "System Error: " + error.toString() });
} finally { 
    lock.releaseLock(); 
  }
}

function doGet(e) { return createJSONOutput({ status: "Running" });
}
function createJSONOutput(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function getSheetByName(sheetName) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName); }
function ensureSheet(sheetName, headers) { 
  const ss = SpreadsheetApp.getActiveSpreadsheet();
let sheet = ss.getSheetByName(sheetName); 
  if (!sheet) { 
    sheet = ss.insertSheet(sheetName);
if (headers && headers.length > 0) sheet.appendRow(headers); 
  } 
  return sheet;
}

// ==========================================
// 3. 核心業務邏輯 (Auth, Assessment, Employee)
// ==========================================

function getColumnMap(headers) {
  let colMap = { 
    name: -1, jobTitle: -1, jobGrade: -1, years: -1, perm: -1, kpi: -1, 
    joinDate: -1, annualLeave: -1, annualLeaveUsed: -1, assignedStation: -1, 
    allowRemote: -1, schedulePerm: -1, salary: -1, gradeBonus: -1 ,kickTime: -1
  };
headers.forEach((h, i) => {
    const norm = String(h).toUpperCase().replace(/[\s\u3000\u200B-\u200D\uFEFF]/g, '');
    
    if (["姓名", "NAME"].includes(norm)) colMap.name = i;
    else if (["職稱", "TITLE", "JOBTITLE"].includes(norm)) colMap.jobTitle = i;
    else if (["職等", "GRADE", "JOBGRADE"].includes(norm)) colMap.jobGrade = i;
    else if (["年資", "YEARS", "YEARSOFSERVICE"].includes(norm)) colMap.years = i;
    else if (["授權", "授權開關", "PERMIT", "PERMISSION", "考核", "考核開關", "是否考核", "權限", "開關"].includes(norm)) colMap.perm = 
i;
    
    else if (["到職日", "JOINDATE", "DATE"].includes(norm)) colMap.joinDate = i;
    else if (["KPI", "年度KPI", "考績"].includes(norm)) colMap.kpi = i;
    else if (["特休天數", "特休", "ANNUALLEAVE", "TOTALLEAVE"].includes(norm)) colMap.annualLeave = i;
    else if (["已休天數", "已休", "USEDLEAVE", "LEAVEUSED"].includes(norm)) colMap.annualLeaveUsed = i;
    else if (["指定站點", "STATION", "ASSIGNEDSTATION"].includes(norm)) colMap.assignedStation = i;
else if (["遠端打卡", "REMOTE", "ALLOWREMOTE"].includes(norm)) colMap.allowRemote = i;
    else if (["排班權限", "SCHEDULEPERM", "SCHEDULEPERMISSION"].includes(norm)) colMap.schedulePerm = i;
else if (["薪資", "SALARY"].includes(norm)) colMap.salary = i;
    else if (["職等加給", "BONUS", "GRADEBONUS"].includes(norm)) colMap.gradeBonus = i;
else if (["強制登出時間", "FORCELOGOUT", "KICKTIME"].includes(norm)) colMap.kickTime = i
  });
  
  return colMap;
}

function saveAssessment(name, answers, jobTitle, jobGrade, yearsOfService, questions) {
  const lock = LockService.getScriptLock();
try {
    lock.tryLock(30000);

    const sheet = ensureSheet(SHEET_RECORDS, [
      "時間戳記", "姓名", "職稱", "職等", "年資", 
      "題目", "回答", "AI評分", "AI評語", 
      "主管評分", "主管評語", "最終分數"
    ]);
const userDetails = { jobGrade: jobGrade, yearsOfService: yearsOfService };
    const aiResult = getAIScoreAndComment(questions, answers, userDetails);

    const questionsStr = JSON.stringify(questions);
const answersStr = JSON.stringify(answers);

    sheet.appendRow([
      new Date(), name, jobTitle, jobGrade, yearsOfService, 
      questionsStr, answersStr, aiResult.score, aiResult.comment, 
      "", "", aiResult.score
    ]);
closeEmployeePermission(name);

    return { success: true, message: "考核已提交！AI 評分結果：" + aiResult.score + " 分" };
} catch (e) {
    return { success: false, message: "儲存失敗: " + e.message };
} finally {
    lock.releaseLock();
  }
}

function closeEmployeePermission(name) {
  try {
    const sheet = getSheetByName(SHEET_EMPLOYEE);
if (!sheet) return;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    let nameIdx = -1;
let permIdx = -1;

    headers.forEach((h, i) => {
      const norm = String(h).toUpperCase().replace(/[\s\u200B-\u200D\uFEFF]/g, '');
      if (["姓名", "NAME"].includes(norm)) nameIdx = i;
      if (["授權", "授權開關", "PERMIT", "考核", "考核開關", "是否考核"].includes(norm)) permIdx = i;
    });
if (nameIdx === -1 || permIdx === -1) {
      Logger.log("❌ 找不到姓名或授權開關欄位");
      return;
}

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][nameIdx]).trim() === String(name).trim()) {
        sheet.getRange(i + 1, permIdx + 1).setValue("FALSE");
break;
      }
    }
  } catch(e) {
    Logger.log("關閉權限失敗: " + e.toString());
}
}


function updateEmployeeList(employees) {
  const lock = LockService.getScriptLock();
  try {
    lock.tryLock(15000); 
    const sheet = getSheetByName(SHEET_EMPLOYEE);
if (!sheet) return { success: false, message: "找不到員工名單分頁" };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
const colMap = getColumnMap(headers);
    
    if (colMap.name === -1) return { success: false, message: "標題列找不到「姓名」，請檢查試算表" };
let lastCol = sheet.getLastColumn();
if (colMap.assignedStation === -1) { 
      lastCol++; 
      sheet.getRange(1, lastCol).setValue("指定站點"); 
      colMap.assignedStation = lastCol - 1;
}
    if (colMap.allowRemote === -1) { 
      lastCol++; 
      sheet.getRange(1, lastCol).setValue("遠端打卡");
colMap.allowRemote = lastCol - 1; 
    }

    employees.forEach(emp => {
      let foundIndex = -1;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][colMap.name]).trim() === String(emp.name).trim()) {
          foundIndex = i + 1;
          break;
        }
      }
  
    if (foundIndex !== -1) {
        if (colMap.jobTitle !== -1) sheet.getRange(foundIndex, colMap.jobTitle + 1).setValue(emp.jobTitle);
        if (colMap.jobGrade !== -1) sheet.getRange(foundIndex, colMap.jobGrade + 1).setValue(emp.jobGrade);
        if (colMap.perm !== -1) sheet.getRange(foundIndex, colMap.perm + 1).setValue(emp.permission ? "TRUE" : "FALSE");
        if (colMap.assignedStation !== -1) sheet.getRange(foundIndex, colMap.assignedStation + 1).setValue(emp.assignedStation || "");
       
 if (colMap.allowRemote !== -1) sheet.getRange(foundIndex, colMap.allowRemote + 1).setValue(emp.allowRemote ? "TRUE" : "FALSE");
        const schedulePermIdx = 23;
sheet.getRange(foundIndex, schedulePermIdx + 1).setValue(emp.canEditSchedule ? "TRUE" : "FALSE");
      } else {
        let newRow = new Array(headers.length).fill("");
if (colMap.name !== -1) newRow[colMap.name] = emp.name;
        if (colMap.jobTitle !== -1) newRow[colMap.jobTitle] = emp.jobTitle;
if (colMap.jobGrade !== -1) newRow[colMap.jobGrade] = emp.jobGrade;
        if (colMap.perm !== -1) newRow[colMap.perm] = emp.permission ? "TRUE" : "FALSE";
if (colMap.assignedStation !== -1) newRow[colMap.assignedStation] = emp.assignedStation || "";
        if (colMap.allowRemote !== -1) newRow[colMap.allowRemote] = emp.allowRemote ? "TRUE" : "FALSE";
sheet.appendRow(newRow);
      }
    });

    return { success: true, message: "資料已成功同步" };
} catch (e) {
    return { success: false, message: "同步失敗：" + e.message };
} finally {
    lock.releaseLock();
  }
}

function recordLogin(empSheet, empRowIndex) {
  try {
    if (!empSheet || empRowIndex < 2) return;
const headers = empSheet.getRange(1, 1, 1, empSheet.getLastColumn()).getValues()[0];
    let countCol = -1;
    let timeCol = -1;
headers.forEach((h, i) => {
      const norm = String(h).toUpperCase().replace(/[\s\u3000\u200B-\u200D\uFEFF]/g, '');
      if (norm === "登入次數") countCol = i;
      if (norm === "最後登入時間") timeCol = i;
    });
if (countCol === -1) {
      countCol = headers.length;
empSheet.getRange(1, countCol + 1).setValue("登入次數");
    }
    if (timeCol === -1) {
      timeCol = (countCol === headers.length) ?
countCol + 1 : headers.length;
      empSheet.getRange(1, timeCol + 1).setValue("最後登入時間");
    }

    const countCell = empSheet.getRange(empRowIndex, countCol + 1);
const currentCount = countCell.getValue();
    countCell.setValue((Number(currentCount) || 0) + 1);
    empSheet.getRange(empRowIndex, timeCol + 1).setValue(new Date());
} catch (e) {
    Logger.log("紀錄登入失敗: " + e.toString());
}
}

function getDeficiencyRecords(name) {
  try {
    const sheet = getSheetByName(SHEET_DEFICIENCIES);
if (!sheet) return { success: true, records: [] };
    const data = sheet.getDataRange().getDisplayValues();
    const records = [];
const nameColIdx = data[0].indexOf("姓名") !== -1 ? data[0].indexOf("姓名") : 0;
    const fetchAll = !name || name.trim() === "";
for (let i = 1; i < data.length; i++) {
      const row = data[i];
if (fetchAll || row[nameColIdx].trim() === name.trim()) {
        records.push({
          name: row[nameColIdx], station: row[1], date: row[2], status: row[3],
          ppe: row[4], fencing: row[5], boxClean: row[6], siteClean: row[7],
          order: row[8], gnop: row[9], other: row[10],
          auditor: row[11] || "",  // 新增：讀取稽核員
          photoUrl: row[12] || ""  // 新增：讀取照片連結
        });
      }
    }
    return { success: true, records: records };
} catch (e) { return { success: false, records: [], message: e.message };
}
}

function getClockInStatus(name) {
  try {
    const sheet = getSheetByName(SHEET_CLOCK_RECORDS);
if (!sheet) return { success: true, todayCount: 0, lastRecord: null };

    const data = sheet.getDataRange().getValues();
    let todayCount = 0;
let lastRecord = null;
    const now = new Date();
    const todayStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy/MM/dd");
for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
if (String(row[1]) === name) { 
        const recDate = new Date(row[0]);
const recDateStr = Utilities.formatDate(recDate, Session.getScriptTimeZone(), "yyyy/MM/dd");
        const recTimeStr = Utilities.formatDate(recDate, Session.getScriptTimeZone(), "MM/dd HH:mm");
if (!lastRecord) {
          lastRecord = {
            time: recTimeStr,
            station: row[2],
            status: row[3]
          };
}

        if (recDateStr === todayStr && String(row[3]) !== "失敗" && String(row[3]) !== "權限不足") {
          todayCount++;
}
      }
    }

    return { success: true, todayCount: todayCount, lastRecord: lastRecord };
} catch (e) {
    return { success: false, message: e.message };
}
}

function getOfficeList() {
  try {
    const sheet = ensureSheet(SHEET_OFFICE_SETTINGS, ["站點名稱", "緯度", "經度", "允許誤差(m)"]);
if (sheet.getLastRow() <= 1) sheet.appendRow(DEFAULT_OFFICE); 
    const data = sheet.getDataRange().getValues();
    const offices = [];
for (let i = 1; i < data.length; i++) {
      if (data[i][0]) offices.push(String(data[i][0]));
}
    return { success: true, offices: offices };
} catch (e) {
    return { success: false, offices: [], message: e.message };
}
}

function getStationList() {
  try {
    const sheet = getSheetByName(SHEET_EXCHANGE_STATIONS); // "站點清單"
    if (!sheet) return { success: true, stations: [] }; 
    
    const data = sheet.getDataRange().getValues();
    const stations = [];

    for (let i = 1; i < data.length; i++) {
      const val = String(data[i][0]).trim();
      if (val && val !== "站點名稱") {
         stations.push(val);
      }
    }
    
    return { success: true, stations: stations };
  } catch (e) { 
    return { success: false, message: e.message, stations: [] };
  }
}

function submitClockIn(data) {
  try {
    const recordSheet = ensureSheet(SHEET_CLOCK_RECORDS, ["時間戳記", "姓名", "站點", "打卡狀態", "距離誤差(m)", "經緯度", "備註"]);
    const stationSheet = ensureSheet(SHEET_OFFICE_SETTINGS, ["站點名稱", "緯度", "經度", "允許誤差(m)"]);

    if (stationSheet.getLastRow() <= 1) stationSheet.appendRow(DEFAULT_OFFICE);

    const name = data.name;
    const selectedStation = data.station; 
    const userLat = parseFloat(data.lat);
    const userLng = parseFloat(data.lng);

    const empInfo = getEmployeeInfo(name);
    const assignedStr = (empInfo && empInfo.assignedStation) ? String(empInfo.assignedStation) : "";
    const allowRemote = empInfo ? empInfo.allowRemote : false;
    const allowedList = assignedStr.split(/[,，]/).map(s => s.trim()).filter(s => s);

    if (!allowRemote && !allowedList.includes(selectedStation)) {
        if (allowedList.length === 0) {
             const msg = `❌ 權限不足：您尚未被指派任何打卡站點。`;
             recordSheet.appendRow([new Date(), name, selectedStation, "權限不足", 0, `${userLat},${userLng}`, msg]);
             return { success: false, message: msg };
        }
        const msg = `❌ 權限不足：您未被授權在「${selectedStation}」打卡。`;
        recordSheet.appendRow([new Date(), name, selectedStation, "權限不足", 0, `${userLat},${userLng}`, msg]);
        return { success: false, message: msg };
    }

    const stationsData = stationSheet.getDataRange().getValues();
    let targetLat = 0, targetLng = 0, radius = 100;
    let stationFound = false;

    for (let i = 1; i < stationsData.length; i++) {
      if (String(stationsData[i][0]).trim() === String(selectedStation).trim()) {
        targetLat = parseFloat(stationsData[i][1]);
        targetLng = parseFloat(stationsData[i][2]);
        radius = parseFloat(stationsData[i][3]) || 100;
        stationFound = true;
        break;
      }
    }

    let status = "失敗";
    let message = "";
    let distance = -1;

    if (!stationFound) {
       message = `系統錯誤：找不到「${selectedStation}」的座標設定，請聯繫管理員。`;
    } else {
       distance = calculateDistance(userLat, userLng, targetLat, targetLng);
       if (allowRemote) {
         status = "遠端打卡";
         message = "✅ 遠端打卡成功！";
       } else if (distance <= radius) {
         status = "正常";
         message = `✅ 打卡成功！(誤差 ${Math.round(distance)}m)`;
       } else {
         status = "失敗";
         message = `❌ 打卡失敗：不在${selectedStation}範圍內 (距離 ${Math.round(distance)}m)`;
         recordSheet.appendRow([new Date(), name, selectedStation, status, Math.round(distance), `${userLat},${userLng}`, message]);
         return { success: false, message: message, distance: distance };
       }
    }

    recordSheet.appendRow([new Date(), name, selectedStation, status, Math.round(distance), `${userLat},${userLng}`, message]);
    return { success: true, message: message, distance: distance };

  } catch (e) {
    return { success: false, message: "Server Error: " + e.message };
  }
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; 
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getEmployeeInfo(name) {
  const list = getEmployeeList();
  if (list.success) return list.employees.find(e => e.name === name);
return null;
}

// ✅ 修正重點：實作「YYYY-MM -> 站名 -> 檔案」的邏輯
function uploadImageToDrive(data) { 
    try { 
        if (!ROOT_FOLDER_ID || ROOT_FOLDER_ID.includes("請在此填入")) { 
            return { success: false, message: "後端尚未設定 Folder ID" };
        } 
        
        const rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID); 
        const now = new Date(); 
        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, '0'); 
        
        // 1. 建立或尋找「YYYY-MM」資料夾 (直接在根目錄下)
        const monthFolderName = `${year}-${month}`; 
        let monthFolder;
        const monthFolders = rootFolder.getFoldersByName(monthFolderName); 
        if (monthFolders.hasNext()) {
             monthFolder = monthFolders.next();
        } else {
             monthFolder = rootFolder.createFolder(monthFolderName); 
        }

        // 2. 建立或尋找「站點名稱」資料夾 (在 YYYY-MM 下)
        // 預設為 UnknownStation 防止空值
        const stationName = data.stationName ? data.stationName.trim() : "UnknownStation";
        let stationFolder;
        const stationFolders = monthFolder.getFoldersByName(stationName);
        if (stationFolders.hasNext()) {
            stationFolder = stationFolders.next();
        } else {
            stationFolder = monthFolder.createFolder(stationName);
        }

        // 3. 儲存檔案
        const contentType = data.mimeType || "image/jpeg"; 
        const blob = Utilities.newBlob(Utilities.base64Decode(data.base64), contentType, data.fileName); 
        const file = stationFolder.createFile(blob);
        
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); 
        
        return { success: true, fileUrl: file.getUrl(), message: "上傳成功" };

    } catch (e) { 
        return { success: false, message: "上傳失敗: " + e.message };
    } 
}

function submitDeficiencyReport(data) { try { const ss = SpreadsheetApp.openById(DEFICIENCY_SHEET_ID); const sheet = ss.getSheetByName(DEFICIENCY_TAB_NAME);
if (!sheet) return { success: false, message: `找不到分頁` }; const photoLinks = Array.isArray(data.photoUrl) ? data.photoUrl.join(",\n") : (data.photoUrl || "");
sheet.appendRow([data.targetName, data.station, data.date, data.status, data.ppe, data.fencing, data.boxClean, data.siteClean, data.order, data.gnop, data.other, data.auditor, photoLinks]); return { success: true, message: "缺失回報已成功送出！" };
} catch (e) { return { success: false, message: "寫入失敗: " + e.message };
} }
function updateScheduleSource(data) {
  try {
    const targetDate = new Date(data.date);
    const year = targetDate.getFullYear();
const dateStr = Utilities.formatDate(targetDate, Session.getScriptTimeZone(), "yyyy/MM/dd");
    const sourceSS = SpreadsheetApp.openById(SOURCE_SCHEDULE_ID);
updateTargetSheet(sourceSS, "N1-" + year, dateStr, 2, { 4: data.n1_day, 5: data.n1_night });
updateTargetSheet(sourceSS, "N2-" + year, dateStr, 2, { 4: data.n2_day, 5: data.n2_night });
updateScheduleLayout(sourceSS, LEAVE_TAB_NAME, dateStr, data);

    return { success: true, message: "✅ 班表已同步更新 (含源頭與總表)！" };
} catch (e) {
    return { success: false, message: "同步失敗: " + e.message };
}
}
function updateScheduleLayout(ss, tabName, dateStr, data) {
  const sheet = ss.getSheetByName(tabName);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
const dates = sheet.getRange(1, 1, lastRow, 1).getValues();
  
  let targetRow = -1;
for (let i = 0; i < dates.length; i++) {
    if (dates[i][0] instanceof Date && Utilities.formatDate(dates[i][0], Session.getScriptTimeZone(), "yyyy/MM/dd") === dateStr) {
      targetRow = i + 1;
break;
    }
  }

  if (targetRow === -1) return;

  if (data.n1_d !== undefined)   sheet.getRange(targetRow, 5).setValue(data.n1_d);
  if (data.n1_e !== undefined)   sheet.getRange(targetRow, 6).setValue(data.n1_e);
  if (data.n1_f !== undefined)   sheet.getRange(targetRow, 7).setValue(data.n1_f);
  if (data.n1_g !== undefined)   sheet.getRange(targetRow, 8).setValue(data.n1_g);     
  if (data.n1_sup !== undefined) sheet.getRange(targetRow, 9).setValue(data.n1_sup);

  if (data.n2_f !== undefined)   sheet.getRange(targetRow, 14).setValue(data.n2_f);
  if (data.n2_g !== undefined)   sheet.getRange(targetRow, 15).setValue(data.n2_g);
  if (data.n2_h !== undefined)   sheet.getRange(targetRow, 16).setValue(data.n2_h);
  if (data.n2_i !== undefined)   sheet.getRange(targetRow, 17).setValue(data.n2_i);
  if (data.n2_c !== undefined)   sheet.getRange(targetRow, 18).setValue(data.n2_c);    
  if (data.n2_sup !== undefined) sheet.getRange(targetRow, 19).setValue(data.n2_sup);

  if (data.maint_1 !== undefined) sheet.getRange(targetRow, 20).setValue(data.maint_1);
  if (data.maint_2 !== undefined) sheet.getRange(targetRow, 21).setValue(data.maint_2); 
  if (data.other_1 !== undefined) sheet.getRange(targetRow, 22).setValue(data.other_1);
  if (data.other_2 !== undefined) sheet.getRange(targetRow, 23).setValue(data.other_2); 

  if (data.leave !== undefined) {
    sheet.getRange(targetRow, 24, 1, 5).clearContent();
if (data.leave.length > 0) {
      const leaveData = [data.leave.slice(0, 5)];
sheet.getRange(targetRow, 24, 1, leaveData[0].length).setValues(leaveData);
    }
  }
}
function updateTargetSheet(ss, tabName, dateStr, dateCol, colValueMap) { const sheet = ss.getSheetByName(tabName); if (!sheet) return;
const data = sheet.getRange(1, dateCol, sheet.getLastRow(), 1).getValues(); for (let i = 0; i < data.length; i++) { if (data[i][0] instanceof Date && Utilities.formatDate(data[i][0], Session.getScriptTimeZone(), "yyyy/MM/dd") === dateStr) { for (let col in colValueMap) { sheet.getRange(i + 1, parseInt(col)).setValue(colValueMap[col]);
} break; } } }

function getUserDetails(name) {
  const empSheet = getSheetByName(SHEET_EMPLOYEE);
if (!empSheet) return null;

  const empData = empSheet.getDataRange().getDisplayValues();
  const headers = empData[0];
  const colMap = getColumnMap(headers);
if (colMap.name === -1) return null;

  for (let i = 1; i < empData.length; i++) {
    if (empData[i][colMap.name].trim() === name.trim()) {
      let permissionGranted = false;
if (colMap.perm !== -1) {
        const perm = String(empData[i][colMap.perm]).toUpperCase().trim();
permissionGranted = (perm === 'TRUE' || perm === '是');
      }

      let canEditSchedule = false;
if (colMap.schedulePerm !== -1) {
        const sPerm = String(empData[i][colMap.schedulePerm]).toUpperCase().trim();
canEditSchedule = (sPerm === 'TRUE' || sPerm === '是');
      }

      let allowRemote = false;
if (colMap.allowRemote !== -1) {
        const rVal = String(empData[i][colMap.allowRemote]).toUpperCase().trim();
allowRemote = (rVal === 'TRUE' || rVal === '是');
      }

      return {
        name: name,
        jobTitle: colMap.jobTitle !== -1 ?
String(empData[i][colMap.jobTitle]).trim() : "",
        jobGrade: colMap.jobGrade !== -1 ?
String(empData[i][colMap.jobGrade]).trim() : "",
        yearsOfService: colMap.years !== -1 ?
String(empData[i][colMap.years]).trim() : "",
        joinDate: colMap.joinDate !== -1 ?
String(empData[i][colMap.joinDate]).trim() : "",
        kpi: colMap.kpi !== -1 ? String(empData[i][colMap.kpi]).trim() ||
"尚未設定" : "尚未設定",
        annualLeave: colMap.annualLeave !== -1 ?
(String(empData[i][colMap.annualLeave]).trim() || "0") : "0",
        annualLeaveUsed: colMap.annualLeaveUsed !== -1 ?
(String(empData[i][colMap.annualLeaveUsed]).trim() || "0") : "0",
        assignedStation: colMap.assignedStation !== -1 ?
String(empData[i][colMap.assignedStation]).trim() : "",
        canEditSchedule: canEditSchedule,
        allowRemote: allowRemote,
        permissionGranted: permissionGranted,
        rowIndex: i + 1 ,
        kickTime: colMap.kickTime !== -1 ?
empData[i][colMap.kickTime] : ""
      };
    }
  }
  return null;
}

function saveAdminReview(rowIndex, adminComment, adminScore) {
  const lock = LockService.getScriptLock();
  try {
    lock.tryLock(10000);
    const sheet = getSheetByName(SHEET_RECORDS);
if (!sheet) return { success: false, message: "找不到紀錄表" };

    if (rowIndex < 2 || rowIndex > sheet.getLastRow()) {
      return { success: false, message: "無效的資料列索引" };
}

    const aiScoreCell = sheet.getRange(rowIndex, 8);
const aiScore = aiScoreCell.getValue() || 0;

    const finalScore = Math.round((aiScore * 0.6) + (adminScore * 0.4));
    sheet.getRange(rowIndex, 10).setValue(adminScore);
sheet.getRange(rowIndex, 11).setValue(adminComment);
    sheet.getRange(rowIndex, 12).setValue(finalScore);

    return { success: true, message: "評分已更新！最終分數：" + finalScore };
} catch (e) {
    return { success: false, message: "更新失敗: " + e.message };
} finally {
    lock.releaseLock();
  }
}
function parseJsonSafe(str) {
  try {
    return JSON.parse(str);
} catch (e) {
    return str ? [str] : [];
}
}

function getHistory(name) {
  try {
    const sheet = getSheetByName(SHEET_RECORDS);
if (!sheet) return { success: true, records: [] };

    const data = sheet.getDataRange().getValues();
    const records = [];
for (let i = 1; i < data.length; i++) {
      const row = data[i];
if (String(row[1]).trim() === String(name).trim()) {
        records.push({
          timestamp: row[0],
          name: row[1],
          jobTitle: row[2],
          jobGrade: row[3],
          yearsOfService: row[4],
          questions: parseJsonSafe(row[5]), 
          answers: parseJsonSafe(row[6]),  
          aiScore: row[7],
          aiComment: row[8],
          adminScore: row[9],
          adminComment: row[10],
          finalScore: row[11],
          rowIndex: i + 1 
        });
}
    }

    records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
return { success: true, records: records };
  } catch (e) {
    return { success: false, message: "讀取失敗: " + e.message, records: [] };
}
}
function getAdminData() {
  try {
    const sheet = getSheetByName(SHEET_RECORDS);
if (!sheet) return { success: true, records: [], questions: [] };

    const data = sheet.getDataRange().getValues();
    const records = [];
for (let i = 1; i < data.length; i++) {
      const row = data[i];
      records.push({
        timestamp: row[0],
        name: row[1],
        jobTitle: row[2],
        jobGrade: row[3],
        yearsOfService: row[4],
        questions: parseJsonSafe(row[5]),
        answers: parseJsonSafe(row[6]),
        aiScore: row[7],
        aiComment: row[8],
        adminScore: row[9],
        adminComment: row[10],
        finalScore: row[11],
        rowIndex: i + 1
      });
}

    records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return { success: true, records: records, questions: [] };
} catch (e) {
    return { success: false, message: "管理員資料讀取失敗: " + e.message, records: [] };
}
}
function saveQuestions(q) { return {success:true}; }
function kickUser(name) {
  const sheet = getSheetByName(SHEET_EMPLOYEE);
if (!sheet) return { success: false, message: "找不到員工名單" };
  
  const details = getUserDetails(name);
if (!details) return { success: false, message: "找不到該員工" };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colMap = getColumnMap(headers);
let kickCol = colMap.kickTime;
  if (kickCol === -1) {
    kickCol = headers.length;
sheet.getRange(1, kickCol + 1).setValue("強制登出時間");
  }

  sheet.getRange(details.rowIndex, kickCol + 1).setValue(new Date().getTime());
return { success: true, message: `已成功對 ${name} 執行強制下線指令。` };
}
function checkLoginStatus(name, sessionTime) {
  try {
    const details = getUserDetails(name);
if (!details) return { success: false, message: "User not found" };

    let isKicked = false;
if (details.kickTime && sessionTime) {
      if (Number(details.kickTime) > Number(sessionTime)) {
        isKicked = true;
}
    }

    return { 
      success: true, 
      kicked: isKicked, 
      userDetails: details 
    };
} catch (e) {
    return { success: false };
  }
}

function sendLineOtp(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
const empSheet = ss.getSheetByName(SHEET_EMPLOYEE);
  const otpSheet = ensureSheet(SHEET_OTP, ["姓名", "OTP", "時間"]);
  
  if (!empSheet) return { success: false, message: "系統錯誤：找不到員工名單分頁" };
const empData = empSheet.getDataRange().getValues();
  const headers = empData[0];
  const nameCol = headers.findIndex(h => String(h).includes("姓名"));
const lineIdCol = headers.findIndex(h => String(h).toUpperCase().includes("LINE ID"));
  
  if (lineIdCol === -1) return { success: false, message: "錯誤：請先在員工名單新增「LINE ID」欄位" };
let userLineId = "";
  for (let i = 1; i < empData.length; i++) {
    if (String(empData[i][nameCol]).trim() === String(name).trim()) {
      userLineId = String(empData[i][lineIdCol]).trim();
break;
    }
  }
  
  if (!userLineId) return { success: false, message: `找不到 ${name} 的 LINE ID，請聯繫管理員。` };
const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpValues = otpSheet.getDataRange().getValues();
  for (let i = otpValues.length - 1; i >= 1; i--) {
    if (String(otpValues[i][0]).trim() === String(name).trim()) otpSheet.deleteRow(i + 1);
}
  otpSheet.appendRow([name, otp, new Date()]);

  const url = "https://api.line.me/v2/bot/message/push";
const payload = {
    to: userLineId,
    messages: [
      {
        type: "text",
        text: `【益恆維運平台】\n(驗證碼有效時間：1分鐘)\n您的登入驗證碼為：`
      },
      {
        type: "text",
        text: `${otp}` 
      }
    ]
  };
const options = {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + LINE_CHANNEL_ACCESS_TOKEN },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
try {
    const res = UrlFetchApp.fetch(url, options);
if (res.getResponseCode() === 200) {
      return { success: true, message: "驗證碼已發送至您的 LINE！" };
} else {
      return { success: false, message: "LINE 發送失敗，請聯繫管理員。" };
}
  } catch (e) {
    return { success: false, message: "連線錯誤：" + e.toString() };
}
}
function getAdminPassword() { const s = ensureSheet(SHEET_SETTINGS, ["題目","管理員密碼"]); return s.getRange(1,2).getValue() || "abc123"; }
function updateAdminPassword(p) { const s = ensureSheet(SHEET_SETTINGS, ["題目","管理員密碼"]);
s.getRange(1,2).setValue(p); return {success:true}; }
function getRandomQuestionsByGrade(grade) {
  const gradeColMap = { "3": 3, "4": 5, "5": 7, "6": 9 };
const targetCol = gradeColMap[String(grade).trim()];
  if (!targetCol) return [];
try {
    const sheet = getSheetByName(SHEET_QUESTIONS);
    if (!sheet) return [];
    const lastRow = sheet.getLastRow();
if (lastRow < 2) return [];

    const range = sheet.getRange(2, targetCol, lastRow - 1, 1);
    const values = range.getValues();
const validQuestions = values.flat().filter(q => q && String(q).trim() !== "");

    if (validQuestions.length <= 3) return validQuestions;

    const selected = [];
const pool = [...validQuestions];
    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(Math.random() * pool.length);
selected.push(pool[idx]);
      pool.splice(idx, 1);
    }
    return selected;
  } catch (e) {
    return [];
}
}
function findStandardAnswer(q) { return ""; }
function getAIScoreAndComment(questions, answers, userDetails) {
  if (!questions || questions.length === 0) return { score: 0, comment: "無題目，略過評分" };
  const prompt = SCORING_PROMPT + `
  
  【受評員工資訊】
  職等: ${userDetails.jobGrade}
  年資: ${userDetails.yearsOfService}
  
  【考核問答內容】
  ${questions.map((q, i) => `題目 ${i+1}: ${q}\n回答 ${i+1}: ${answers[i] || "（未回答）"}`).join('\n\n')}
  
  【輸出格式絕對要求】
  請僅回傳一個純 JSON 物件，嚴禁包含 Markdown 標記 (如 \`\`\`json ... \`\`\`)，格式如下：
  {
    "score": 數字(0-100),
    "comment": "針對該員工年資與回答的具體評語 (繁體中文)"
  }
  `;
try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };
const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    
    if (code !== 200) {
      throw new Error("Gemini API 回應錯誤: " + response.getContentText());
}

    const json = JSON.parse(response.getContentText());
    if (json.candidates && json.candidates.length > 0) {
      let text = json.candidates[0].content.parts[0].text;
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
try {
        const result = JSON.parse(text);
return { 
          score: (typeof result.score === 'number') ?
result.score : 0, 
          comment: result.comment ||
"AI 未提供評語" 
        };
} catch (e) {
        Logger.log("JSON Parse Error: " + text);
return { score: 0, comment: "AI 回傳格式異常，無法解析。" };
      }
    }
  } catch (e) {
    Logger.log("AI Scoring System Error: " + e.toString());
return { score: 0, comment: "AI 評分服務暫時無法使用，請稍後再試。" };
  }
  
  return { score: 0, comment: "AI 無回應" };
}
function getEmployeeList(){
    try {
        const sheet = getSheetByName(SHEET_EMPLOYEE);
if(!sheet) return {success: false, message: "找不到員工名單"};
        const data = sheet.getDataRange().getDisplayValues();
        const headers = data[0];
        const employees = [];
const colorIdx = 22;
        const schedulePermIdx = 23;
        
        let colMap = {name:-1,jobTitle:-1,jobGrade:-1,years:-1,perm:-1,kpi:-1,joinDate:-1,salary:-1,gradeBonus:-1,annualLeave:-1,annualLeaveUsed:-1, assignedStation:-1, allowRemote:-1};
headers.forEach((h,i)=>{
            const norm=String(h).toUpperCase().replace(/\s/g,'');
            if(norm==="姓名")colMap.name=i;
            else if(["職稱","TITLE"].includes(norm)) colMap.jobTitle=i;
            else if(["職等","GRADE"].includes(norm)) colMap.jobGrade=i;
            else if(["年資","YEARS"].includes(norm)) colMap.years=i;
            else if(["授權","授權開關","PERMIT"].includes(norm)) colMap.perm=i;
            else if(["到職日","JOINDATE"].includes(norm)) colMap.joinDate=i;
            else if(["KPI","年度KPI"].includes(norm)) colMap.kpi=i;
            else if(["薪資","SALARY"].includes(norm)) colMap.salary=i;
            else if(["職等加給","BONUS"].includes(norm)) colMap.gradeBonus=i;
            else if(["特休天數","特休"].includes(norm)) colMap.annualLeave = i;
            else if(["已休天數","已休"].includes(norm)) colMap.annualLeaveUsed = i;
            else if(["指定站點","STATION"].includes(norm)) colMap.assignedStation = i;
            else if(["遠端打卡","REMOTE"].includes(norm)) colMap.allowRemote 
= i;
        });

        if(colMap.name===-1)return{success:false,employees:[]};
        
        for(let i=1;i<data.length;i++){
            const row=data[i];
let permVal=colMap.perm!==-1?String(row[colMap.perm]).toUpperCase().trim():"FALSE";
            let sPermVal="FALSE";
            if(row[schedulePermIdx]) sPermVal=String(row[schedulePermIdx]).toUpperCase().trim();
            
            let remoteVal = colMap.allowRemote !== -1 ? String(row[colMap.allowRemote]).toUpperCase().trim() : "FALSE";
employees.push({
                name:row[colMap.name],
                joinDate:colMap.joinDate!==-1?row[colMap.joinDate]:"",
                jobTitle:colMap.jobTitle!==-1?row[colMap.jobTitle]:"",
                yearsOfService:colMap.years!==-1?row[colMap.years]:"",
                jobGrade: colMap.jobGrade !== -1 ? row[colMap.jobGrade] : "",
                jobGradeBonus:colMap.gradeBonus!==-1?row[colMap.gradeBonus]:"",
                salary:colMap.salary!==-1?row[colMap.salary]:"",
                permission:(permVal==='TRUE'||permVal==='是'),
                kpi:colMap.kpi!==-1?row[colMap.kpi]:"",
                color:(row[colorIdx])?row[colorIdx]:"",
                canEditSchedule:(sPermVal==='TRUE'||sPermVal==='是'),
                annualLeave: 
(row[colMap.annualLeave] !== undefined && row[colMap.annualLeave] !== "") ? String(row[colMap.annualLeave]).trim() : "0",
                annualLeaveUsed: (row[colMap.annualLeaveUsed] !== undefined && row[colMap.annualLeaveUsed] !== "") ?
String(row[colMap.annualLeaveUsed]).trim() : "0",
                assignedStation: colMap.assignedStation !== -1 ?
row[colMap.assignedStation] : "",
                allowRemote: (remoteVal === 'TRUE' || remoteVal === '是')
            })
        }
        return {success:true,employees:employees}
    } catch(e){return{success:false,message:e.message}}
}

function getShiftSchedule(targetName) {
  try {
    const ss = SpreadsheetApp.openById(SOURCE_SCHEDULE_ID);
const sheet = ss.getSheetByName(LEAVE_TAB_NAME); 
    if (!sheet) return { success: false, message: "錯誤：找不到 [" + LEAVE_TAB_NAME + "] 分頁" };
    const colorMap = {};
    const empList = getEmployeeList();
if (empList.success) empList.employees.forEach(e => { if(e.color) colorMap[e.name] = e.color; });
    const now = new Date();
const rangeStart = new Date(now.getFullYear(), now.getMonth(), 1); 
    const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);

    const data = sheet.getDataRange().getValues();
    const shifts = [];
for (let i = 1; i < data.length; i++) {
      const row = data[i];
if (!(row[0] instanceof Date)) continue; 
      
      const rowDate = row[0];
      const dateStr = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), "yyyy/MM/dd");
      if (targetName && (rowDate < rangeStart || rowDate > rangeEnd)) {
        continue;
}

      const rowData = row.map(cell => {
         if (cell instanceof Date) {
            return Utilities.formatDate(cell, Session.getScriptTimeZone(), "yyyy/MM/dd");
         }
         return String(cell || "").trim();
      });
      let myType = "";      
      let myShiftName = "";
      if (rowData[2] === targetName) { myType = "night";
myShiftName = "N1 大夜"; } 
      else if (rowData[3] === targetName) { myType = "day";
myShiftName = "N1 日班"; }
      else if (rowData[11] === targetName) { myType = "night";
myShiftName = "N2 大夜"; }
      else if (rowData[12] === targetName) { myType = "day";
myShiftName = "N2 日班"; }

      if (targetName && !myType) {
        continue;
}

      shifts.push({
        date: dateStr,
        day: rowData[1],
        n1_night: rowData[2],
        n1_day: rowData[3],
        n2_night: rowData[11],
        n2_day: rowData[12],
        leave: rowData.slice(23, 28).filter(v => v),
        fullRecord: rowData,
        type: myType,      
        shiftTitle: myShiftName 
      });
}
    return { success: true, shifts: shifts, colorMap: colorMap };
} catch (e) { 
    return { success: false, message: "讀取班表失敗: " + e.toString() };
}
}

function authenticateEmployee(name, otpCode) {
  try {
    const userDetails = getUserDetails(name);
if (!userDetails) return { success: false, message: "查認此員工" };

    const adminPwd = getAdminPassword();
    if ((userDetails.jobTitle.indexOf("副理") !== -1 || name === "張凱傑") && String(otpCode) === String(adminPwd)) {
      recordLogin(getSheetByName(SHEET_EMPLOYEE), userDetails.rowIndex);
return { success: true, message: "管理員登入", isAdmin: true, canAssess: false, questions: [], userDetails: userDetails };
}

    const otpSheet = getSheetByName(SHEET_OTP);
if (!otpSheet) return { success: false, message: "OTP 系統錯誤" };
    
    const otpData = otpSheet.getDataRange().getValues();
    let targetOtpRowIndex = -1;
let isExpired = false;

    if (otpData.length > 1) {
      const codeCol = otpData[0].indexOf("OTP");
const nameCol = otpData[0].indexOf("姓名");
      const timeCol = otpData[0].indexOf("時間") !== -1 ? otpData[0].indexOf("時間") : 2;
for (let i = otpData.length - 1; i >= 1; i--) {
        if (String(otpData[i][nameCol]).trim() == name.trim() && String(otpData[i][codeCol]).trim() == String(otpCode).trim()) {
          const otpTime = new Date(otpData[i][timeCol]);
if ((new Date().getTime() - otpTime.getTime()) / 1000 / 60 > 5) isExpired = true;
          targetOtpRowIndex = i + 1;
          break;
}
      }
    }

    if (targetOtpRowIndex !== -1) {
      otpSheet.deleteRow(targetOtpRowIndex);
      recordLogin(getSheetByName(SHEET_EMPLOYEE), userDetails.rowIndex);
if (isExpired) return { success: false, message: "驗證碼過期" };
      
      const questions = userDetails.permissionGranted ? getRandomQuestionsByGrade(userDetails.jobGrade) : [];
return { 
        success: true, 
        message: "登入成功", 
        isAdmin: false, 
        canAssess: userDetails.permissionGranted, 
        questions: questions, 
        userDetails: userDetails 
      };
}
    return { success: false, message: "驗證碼錯誤" };
} catch (e) { 
    return { success: false, message: "Auth Error: " + e.message }; 
  }
}