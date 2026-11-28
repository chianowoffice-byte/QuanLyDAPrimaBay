

function toISODate(v) {
  if (!v) return '';
  v = String(v).trim(); if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0,10);
  var m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
  m = v.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (m) return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
  var n=parseInt(v);
  if (!isNaN(n) && n>40000 && n<60000) {
    var d=new Date(Date.UTC(1899,11,30)+n*86400000); return d.toISOString().slice(0,10);
  }
  return '';
}
function fmtDateVN(v) {
  if (!v) return ''; var iso=toISODate(v); if (!iso) return '';
  var p=iso.split('-'); if(p.length<3) return v; return p[2]+'/'+p[1]+'/'+p[0];
}
function fmtDateFull(iso) {
  if(!iso) return '—';
  try {
    var d=new Date(iso); if(isNaN(d)) return fmtDateVN(iso)||iso;
    var dd=String(d.getDate()).padStart(2,'0'), mm=String(d.getMonth()+1).padStart(2,'0'), yy=d.getFullYear();
    var hh=String(d.getHours()).padStart(2,'0'), min=String(d.getMinutes()).padStart(2,'0');
    if(hh!=='00'||min!=='00') return dd+'/'+mm+' '+hh+':'+min;
    return dd+'/'+mm+'/'+yy;
  } catch(e){ return iso; }
}

// v20260716_232320_113025
window.onerror = function(msg,src,line,col,err){
  var d=document.createElement('div');
  d.style.cssText='position:fixed;top:0;left:0;right:0;background:#C0392B;color:#fff;padding:12px 16px;z-index:99999;font-size:13px;font-family:monospace';
  d.textContent='JS Error: '+msg+' (L'+line+')';
  document.body && document.body.appendChild(d);
  return false;
};
// SUPABASE CONFIG
// ══════════════════════════════════════════════════
var SUPABASE_URL = 'https://oodeswfnxnqabjbmecmi.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZGVzd2ZueG5xYWJqYm1lY21pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzOTc1MTIsImV4cCI6MjA5Nzk3MzUxMn0.FY8ld0DW0ccnAmpfZ8cUwE2jnt8LI8teZXLBFQJNfos';
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ══════════════════════════════════════════════════
// SUPABASE AUTH + DATA HELPERS
// ══════════════════════════════════════════════════

// sbLogin: không dùng Supabase Auth (phương án 2)

// Lấy danh sách hồ sơ từ DB — kéo tất cả cột loan_files + customers + apartments
// KHÔNG kéo weekly_reports/checklist_items/cic_results (lazy load khi mở chi tiết)
async function sbLoadHS() {
  var { data, error } = await sb
    .from('loan_files')
    .select(`
      *,
      customers(*),
      apartments(*),
      users!loan_files_officer_id_fkey(id, full_name, email, pgd)
    `)
    .order('bim_seq', { ascending: true });
  if (error) { console.error('sbLoadHS:', error); return []; }
  return data || [];
}

// Lấy đầy đủ dữ liệu 1 hồ sơ (khi mở chi tiết) — weekly_reports, checklist, cic lazy load
async function sbLoadHSDetail(id) {
  var { data, error } = await sb
    .from('loan_files')
    .select(`
      *,
      customers(*),
      apartments(*),
      users!loan_files_officer_id_fkey(id, full_name, email, pgd),
      weekly_reports(*),
      checklist_items(*),
      cic_results(*)
    `)
    .eq('id', id)
    .single();
  if (error) { console.error('sbLoadHSDetail:', error); return null; }
  return data;
}

// Lấy danh sách users từ DB
async function sbLoadUsers() {
  var { data, error } = await sb.from('users').select('*').order('full_name');
  if (error) { console.error('sbLoadUsers:', error); return []; }
  return data || [];
}

// Lưu weekly report
async function sbSaveWeeklyReport(entry) {
  var { error } = await sb.from('weekly_reports').insert(entry);
  if (error) console.error('sbSaveWeeklyReport:', error);
  return !error;
}

// Cập nhật loan_file
async function sbUpdateLF(id, data) {
  var { error } = await sb.from('loan_files').update(data).eq('id', id);
  if (error) console.error('sbUpdateLF:', error);
  return !error;
}

// Cập nhật customer
async function sbUpdateCustomer(id, data) {
  var { error } = await sb.from('customers').update(data).eq('id', id);
  if (error) console.error('sbUpdateCustomer:', error);
  return !error;
}

// Log hoạt động
async function sbLog(action, desc, lf_id) {
  await sb.from('activity_log').insert({
    user_id: currentUser ? currentUser.db_id : null,
    loan_file_id: lf_id || null,
    action: action,
    description: desc
  });
}

var useSupabase = true; // flag: true = dùng DB thật, false = localStorage


var users = JSON.parse(localStorage.getItem('pb5_users') || 'null'); if(!users){ users = [{"id": "u_admin", "name": "Nguyễn Việt Anh", "login": "vietanh", "pw": "admin2025", "role": "admin", "active": true, "pgd": "Tổ NHSODV", "cv": "Tổ trưởng"}, {"id": "u_ql", "name": "Nguyễn Thị Phương", "login": "phuongnt27@bidv.com.vn", "pw": "157332", "role": "ql", "active": true, "pgd": "Phòng KHCN", "cv": "Phó Trưởng phòng KHCN", "maCB": "157332"}, {"id": "u_bim1", "name": "BIM - Quản lý dự án", "login": "bim1", "pw": "bim2025", "role": "cdt", "active": true, "cdtLevel": "standard"}, {"id": "u_bim2", "name": "BIM - Giám đốc", "login": "bim2", "pw": "bim2025", "role": "cdt", "active": true, "cdtLevel": "admin", "canSetGiaiNgan": true}, {"id": "u_145318", "name": "Tạ Thị Vân", "login": "vantt71@bidv.com.vn", "pw": "145318", "role": "cb", "active": true, "pgd": "PGD Hào Nam", "cv": "Chuyên viên KHƯT cấp 4", "maCB": "145318"}, {"id": "u_145344", "name": "Bùi Phương Anh", "login": "anhbp1@bidv.com.vn", "pw": "145344", "role": "cb", "active": true, "pgd": "PGD West Lake", "cv": "Phó GĐ PGD phụ trách KD", "maCB": "145344"}, {"id": "u_149031", "name": "Trần Văn Long", "login": "longtv@bidv.com.vn", "pw": "149031", "role": "cb", "active": true, "pgd": "PGD Hào Nam", "cv": "Phó GĐ PGD phụ trách KD", "maCB": "149031"}, {"id": "u_151417", "name": "Nguyễn Thị Thanh Nga", "login": "ngantt25@bidv.com.vn", "pw": "151417", "role": "cb", "active": true, "pgd": "PGD Nam Cao", "cv": "Phó GĐ PGD phụ trách KD", "maCB": "151417"}, {"id": "u_153545", "name": "Nguyễn Thị Ngọc Diệp", "login": "diepntn3@bidv.com.vn", "pw": "153545", "role": "cb", "active": true, "pgd": "PGD Nam Cao", "cv": "Phó GĐ PGD phụ trách KD", "maCB": "153545"}, {"id": "u_157252", "name": "Vũ Hoài Phương", "login": "phuongvh3@bidv.com.vn", "pw": "157252", "role": "cb", "active": true, "pgd": "PGD Lương Định Của", "cv": "Chuyên viên KHƯT cấp 3", "maCB": "157252"}, {"id": "u_157333", "name": "Dương Kiều Huyền", "login": "huyendk@bidv.com.vn", "pw": "157333", "role": "cb", "active": true, "pgd": "Phòng KHCN", "cv": "Phó Trưởng phòng KHCN", "maCB": "157333"}, {"id": "u_157345", "name": "Nguyễn Công Thành", "login": "thanhnc6@bidv.com.vn", "pw": "157345", "role": "cb", "active": true, "pgd": "Phòng KHCN", "cv": "Phó Trưởng phòng KHCN", "maCB": "157345"}, {"id": "u_158495", "name": "Nguyễn Trung Hiếu", "login": "hieunt35@bidv.com.vn", "pw": "158495", "role": "cb", "active": true, "pgd": "PGD Nam Cao", "cv": "Chuyên viên KHƯT cấp 2", "maCB": "158495"}, {"id": "u_164065", "name": "Dương Thanh Tùng", "login": "tungdt4@bidv.com.vn", "pw": "164065", "role": "cb", "active": true, "pgd": "PGD West Lake", "cv": "Phó GĐ PGD phụ trách KD", "maCB": "164065"}, {"id": "u_165182", "name": "Nguyễn Thanh Hải", "login": "haint17@bidv.com.vn", "pw": "165182", "role": "cb", "active": true, "pgd": "PGD Hào Nam", "cv": "CV KHCN C1", "maCB": "165182"}, {"id": "u_165874", "name": "Ninh Thu Hương", "login": "huongnt74@bidv.com.vn", "pw": "165874", "role": "cb", "active": true, "pgd": "Phòng KHCN", "cv": "Chuyên viên KHƯT cấp 3", "maCB": "165874"}, {"id": "u_171081", "name": "Trịnh Tuấn Anh", "login": "anhtt26@bidv.com.vn", "pw": "171081", "role": "cb", "active": true, "pgd": "PGD Nam Cao", "cv": "Chuyên viên KHCN cấp 1", "maCB": "171081"}, {"id": "u_171086", "name": "Trần Thị Thủy", "login": "thuytt42@bidv.com.vn", "pw": "171086", "role": "cb", "active": true, "pgd": "Phòng KHCN", "cv": "Chuyên viên KHƯT cấp 2", "maCB": "171086"}, {"id": "u_173057", "name": "Nguyễn Thị Thảo", "login": "thaont63@bidv.com.vn", "pw": "173057", "role": "cb", "active": true, "pgd": "Phòng KHCN", "cv": "Chuyên viên KHCN cấp 2", "maCB": "173057"}, {"id": "u_173264", "name": "Lê Thùy Linh", "login": "linhlt14@bidv.com.vn", "pw": "173264", "role": "cb", "active": true, "pgd": "Phòng KHCN", "cv": "Chuyên viên KHCN cấp 2", "maCB": "173264"}, {"id": "u_173789", "name": "Bùi Nhật Tân", "login": "tanbn@bidv.com.vn", "pw": "173789", "role": "cb", "active": true, "pgd": "PGD West Lake", "cv": "Chuyên viên KHCN cấp 1", "maCB": "173789"}, {"id": "u_178446", "name": "Phan Đức Trung", "login": "trungpd1@bidv.com.vn", "pw": "178446", "role": "cb", "active": true, "pgd": "PGD Lương Định Của", "cv": "Chuyên viên KHCN cấp 2", "maCB": "178446"}, {"id": "u_182410", "name": "Nguyễn Văn Thắng", "login": "thangnv18@bidv.com.vn", "pw": "182410", "role": "cb", "active": true, "pgd": "PGD West Lake", "cv": "Chuyên viên KHHH cấp 1", "maCB": "182410"}, {"id": "u_36691", "name": "Phạm Thị Tuyết Mai", "login": "maiptt2@bidv.com.vn", "pw": "36691", "role": "cb", "active": true, "pgd": "PGD Lương Định Của", "cv": "Phó GĐ PGD phụ trách KD", "maCB": "36691"}]; }

var hsList = JSON.parse(localStorage.getItem('pb5_hs') || 'null'); if(!hsList){ hsList = [{"id": "HSP11006", "maBIM": "BIM-001", "sttBIM": 1, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "TRẦN THÀNH CÔNG", "cccd": "031095005713", "sdt": "0326606369", "diaChi": "CHCC 2403 tòa nhà N01A TTTM DV nhà ở Golden Land 275 Nguyễn Trãi, Phường Khương Đình, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "CÔNG TY TNHH PHÁT TRIỂN BẤT ĐỘNG SẢN TRUST LAND", "maCanHo": "P1-10-06", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1939101876, "tyLeVay": 0.7, "hanMucDeXuat": 581730563, "vtcPhaiNop": 195995447, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_157345", "cbBIMName": "NGUYEN CONGTHANH", "cbBIMSdt": "0949496666", "cbBIMEmail": "thanhnc6@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11105", "maBIM": "BIM-002", "sttBIM": 2, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "NGUYỄN NGỌC NAM", "cccd": "001076020833", "sdt": "0336047809", "diaChi": "Thôn Yên Quán, xã Hưng Đạo, TP Hà Nội", "vung": "Hà Nội", "daiLy": "MAI VIỆT", "maCanHo": "P1-11-05", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1964526989, "tyLeVay": 0.7, "hanMucDeXuat": 589358097, "vtcPhaiNop": 196452699, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_157345", "cbBIMName": "NGUYEN CONGTHANH", "cbBIMSdt": "0949496666", "cbBIMEmail": "thanhnc6@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11206", "maBIM": "BIM-003", "sttBIM": 3, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "NGUYỄN THỊ MAI", "cccd": "033173001328", "sdt": "0914354237", "diaChi": "P602-50c, Ngõ 203 Trường Chinh, Phường Phương Liệt, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "An Việt Homes", "maCanHo": "P1-12-06", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1958484444, "tyLeVay": 0.7, "hanMucDeXuat": 587545333, "vtcPhaiNop": 197960000, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_157345", "cbBIMName": "NGUYEN CONGTHANH", "cbBIMSdt": "0949496666", "cbBIMEmail": "thanhnc6@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11217", "maBIM": "BIM-004", "sttBIM": 4, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "PHẠM THU HIỀN", "cccd": "022199002657", "sdt": "0865140086", "diaChi": "Căn hộ 3017 Tòa S3.02, Tổ dân phố số 11, Phường Tây Mỗ, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "An Việt Homes", "maCanHo": "P1-12-17", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1783590125, "tyLeVay": 0.7, "hanMucDeXuat": 535077038, "vtcPhaiNop": 179022880, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_145344", "cbBIMName": "BUI PHUONG ANH", "cbBIMSdt": "0986312379", "cbBIMEmail": "anhbp1@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11520", "maBIM": "BIM-005", "sttBIM": 5, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "VŨ ĐẠI DƯƠNG", "cccd": "001087021886", "sdt": "0912491919", "diaChi": "216 Bạch Mai, Phường Bạch Mai, TP Hà Nội", "vung": "Hà Nội", "daiLy": "An Việt Homes", "maCanHo": "P1-15-20", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1766385268, "tyLeVay": 0.7, "hanMucDeXuat": 529915580, "vtcPhaiNop": 177353217, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_145344", "cbBIMName": "BUI PHUONG ANH", "cbBIMSdt": "0986312379", "cbBIMEmail": "anhbp1@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11521", "maBIM": "BIM-006", "sttBIM": 6, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Vũ Tuấn Đạt", "cccd": "001083047711", "sdt": "0987888510", "diaChi": "Thôn Phú Mỹ, Xã Phú Xuyên, Tp Hà Nội", "vung": "Hà Nội", "daiLy": "An Việt Homes", "maCanHo": "P1-15-21", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1765275761, "tyLeVay": 0.7, "hanMucDeXuat": 529582728, "vtcPhaiNop": 176527576, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_145344", "cbBIMName": "BUI PHUONG ANH", "cbBIMSdt": "0986312379", "cbBIMEmail": "anhbp1@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11522", "maBIM": "BIM-007", "sttBIM": 7, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Vũ Thị Cúc Hoa", "cccd": "001184008374", "sdt": "0987888510", "diaChi": "216 Bạch Mai, Phường Bạch Mai, TP Hà Nội", "vung": "Hà Nội", "daiLy": "An Việt Homes", "maCanHo": "P1-15-22", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1758615956, "tyLeVay": 0.7, "hanMucDeXuat": 527584787, "vtcPhaiNop": 175861596, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_158495", "cbBIMName": "NGUYEN TRUNG HIEU", "cbBIMSdt": "0967890866", "cbBIMEmail": "hieunt35@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11526", "maBIM": "BIM-008", "sttBIM": 8, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "LÊ THỊ THU THỦY", "cccd": "001177020986", "sdt": "0915988088", "diaChi": "31B Nguyễn Khuyến, Phường Văn Miếu - Quốc Tử Giám, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "An Việt Homes", "maCanHo": "P1-15-26", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1774847126, "tyLeVay": 0.7, "hanMucDeXuat": 532454138, "vtcPhaiNop": 177485000, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_158495", "cbBIMName": "NGUYEN TRUNG HIEU", "cbBIMSdt": "0967890866", "cbBIMEmail": "hieunt35@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11610", "maBIM": "BIM-009", "sttBIM": 9, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "PHÙNG VĂN TƯỚC", "cccd": "020094000149", "sdt": "0982457571", "diaChi": "168 Nguyễn Phi Khanh, Phường Tam Thanh, Tỉnh Lạng Sơn", "vung": "Lạng Sơn", "daiLy": "SRT ĐÔNG BẮC", "maCanHo": "P1-16-10", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 2031640845, "tyLeVay": 0.7, "hanMucDeXuat": 609492254, "vtcPhaiNop": 203164084, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_158495", "cbBIMName": "NGUYEN TRUNG HIEU", "cbBIMSdt": "0967890866", "cbBIMEmail": "hieunt35@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11622", "maBIM": "BIM-010", "sttBIM": 10, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "HOÀNG THU HƯƠNG", "cccd": "022183007578", "sdt": "0858916888", "diaChi": "Thôn Khòn Khuyên, Phường Đông Kinh, Tỉnh Lạng Sơn", "vung": "Lạng Sơn", "daiLy": "SRT ĐÔNG BẮC", "maCanHo": "P1-16-22", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1762276084, "tyLeVay": 0.7, "hanMucDeXuat": 528682825, "vtcPhaiNop": 176227608, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_36691", "cbBIMName": "PHAM THI TUYET MAI", "cbBIMSdt": "0904377370", "cbBIMEmail": "maiptt2@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11626", "maBIM": "BIM-011", "sttBIM": 11, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "HOÀNG THỊ NỤ", "cccd": "020173001765", "sdt": "0817515658", "diaChi": "Tổ 2, Khối 14, Phường Kỳ Lừa, Tỉnh Lạng Sơn", "vung": "Lạng Sơn", "daiLy": "SRT ĐÔNG BẮC", "maCanHo": "P1-16-26", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1834939494, "tyLeVay": 0.7, "hanMucDeXuat": 550481848, "vtcPhaiNop": 183493949, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_36691", "cbBIMName": "PHAM THI TUYET MAI", "cbBIMSdt": "0904377370", "cbBIMEmail": "maiptt2@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11920", "maBIM": "BIM-012", "sttBIM": 12, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "TRẦN THỊ ÁNH NGUYỆT", "cccd": "026188002770", "sdt": "0966826139", "diaChi": "Khê Ngoại 3, xã Mê Linh, thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "REDLAND", "maCanHo": "P1-19-20", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1801134810, "tyLeVay": 0.7, "hanMucDeXuat": 540340443, "vtcPhaiNop": 180113481, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_36691", "cbBIMName": "PHAM THI TUYET MAI", "cbBIMSdt": "0904377370", "cbBIMEmail": "maiptt2@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP12001", "maBIM": "BIM-013", "sttBIM": 13, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "NGUYỄN VĂN PHÚC", "cccd": "035088001403", "sdt": "0977815591", "diaChi": "Thôn 4 Thượng Vỹ, Xã Vĩnh Trụ, Tỉnh Ninh Bình", "vung": "Ninh Bình", "daiLy": "An Việt Homes", "maCanHo": "P1-20-01", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1929211457, "tyLeVay": 0.7, "hanMucDeXuat": 578763437, "vtcPhaiNop": 192921146, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_151417", "cbBIMName": "NGUYEN THI THANH NGA", "cbBIMSdt": "0986848363", "cbBIMEmail": "ngantt25@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP12012A", "maBIM": "BIM-014", "sttBIM": 14, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Vũ Thị Phượng", "cccd": "036197010855", "sdt": "0354395823", "diaChi": "Căn hộ 1126 - HH4B, phường Hoàng Liệt, thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "Thành Phát Global", "maCanHo": "P1-20-12A", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 2053461213, "tyLeVay": 0.7, "hanMucDeXuat": 616038364, "vtcPhaiNop": 205346121, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_151417", "cbBIMName": "NGUYEN THI THANH NGA", "cbBIMSdt": "0986848363", "cbBIMEmail": "ngantt25@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP12210", "maBIM": "BIM-015", "sttBIM": 15, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Nguyễn Văn Tuấn", "cccd": "040098009016", "sdt": "0357646222", "diaChi": "Số 29 ngõ 282 Kim Giang, Định Công, Hà Nội", "vung": "Hà Nội", "daiLy": "DOHALAND", "maCanHo": "P1-22-10", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 2091378947, "tyLeVay": 0.7, "hanMucDeXuat": 627413684, "vtcPhaiNop": 209137895, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_153545", "cbBIMName": "NGUYEN THI NGOC DIEP", "cbBIMSdt": "0986180686", "cbBIMEmail": "diepntn3@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP12220", "maBIM": "BIM-016", "sttBIM": 16, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "LẦU MAI TRANG", "cccd": "001191054042", "sdt": "0943030991", "diaChi": "Phòng 214 N5 Bán Đảo Linh Đàm, Phường Hoàng Liệt, TP Hà Nội", "vung": "Hà Nội", "daiLy": "An Việt Homes", "maCanHo": "P1-22-20", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1860428083, "tyLeVay": 0.7, "hanMucDeXuat": 558128425, "vtcPhaiNop": 186080000, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_153545", "cbBIMName": "NGUYEN THI NGOC DIEP", "cbBIMSdt": "0986180686", "cbBIMEmail": "diepntn3@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP12412A", "maBIM": "BIM-017", "sttBIM": 17, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Trần Phương Anh", "cccd": "020197007472", "sdt": "0946416897", "diaChi": "Toà N02T2, Khu Chung Cư Ngoại Giao Đoàn, Phường Xuân Đỉnh, Thành Phố Hà Nội", "vung": "Hà Nội", "daiLy": "An Việt Homes", "maCanHo": "P1-24-12A", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 2072812608, "tyLeVay": 0.7, "hanMucDeXuat": 621843782, "vtcPhaiNop": 207282000, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_153545", "cbBIMName": "NGUYEN THI NGOC DIEP", "cbBIMSdt": "0986180686", "cbBIMEmail": "diepntn3@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP12617", "maBIM": "BIM-018", "sttBIM": 18, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "ĐINH THẢO ANH", "cccd": "019301008357", "sdt": "0945438976", "diaChi": "Ngách 68/53 Đường Cầu Giấy, thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "REDLAND", "maCanHo": "P1-26-17", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1964964432, "tyLeVay": 0.7, "hanMucDeXuat": 589489330, "vtcPhaiNop": 196496443, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_165874", "cbBIMName": "NINH THU HUONG", "cbBIMSdt": "0975466565", "cbBIMEmail": "huongnt74@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP20626", "maBIM": "BIM-019", "sttBIM": 19, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Lại Thế Vũ", "cccd": "035081015487", "sdt": "0969872012", "diaChi": "Thôn Thượng Cầu Vọng, Xã Thanh Bình, Tỉnh Ninh Bình", "vung": "Ninh Bình", "daiLy": "SRT ĐÔNG BẮC", "maCanHo": "P2-06-26", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1625681371, "tyLeVay": 0.7, "hanMucDeXuat": 487704411, "vtcPhaiNop": 162568137, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_165874", "cbBIMName": "NINH THU HUONG", "cbBIMSdt": "0975466565", "cbBIMEmail": "huongnt74@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP20805", "maBIM": "BIM-020", "sttBIM": 20, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Nguyễn Xuân Bốn", "cccd": "034082002973", "sdt": "0963591337", "diaChi": "Thọ Am, xã Nam Phù, thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "CÔNG TY CỔ PHẦN BẤT ĐỘNG SẢN EVG", "maCanHo": "P2-08-05", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1810923984, "tyLeVay": 0.7, "hanMucDeXuat": 543277195, "vtcPhaiNop": 181092398, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_165874", "cbBIMName": "NINH THU HUONG", "cbBIMSdt": "0975466565", "cbBIMEmail": "huongnt74@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP20912A", "maBIM": "BIM-021", "sttBIM": 21, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "PHAN THỊ HUYỀN", "cccd": "040196019172", "sdt": "0962196556", "diaChi": "Số 35B Đường Phan Bội Châu, Phường Vinh Hưng, Tỉnh Nghệ An", "vung": "Nghệ An", "daiLy": "CÔNG TY CỔ PHẦN TRUNG THỰC LAND", "maCanHo": "P2-09-12A", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1726503884, "tyLeVay": 0.7, "hanMucDeXuat": 517951165, "vtcPhaiNop": 172650388, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_149031", "cbBIMName": "TRAN VAN LONG", "cbBIMSdt": "0912760607", "cbBIMEmail": "longtv@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21007", "maBIM": "BIM-022", "sttBIM": 22, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "LÀNH THỊ LIÊN", "cccd": "020189000623", "sdt": "0915589875", "diaChi": "Phố Đức Tâm, Xã Văn Quan, Tỉnh Lạng Sơn", "vung": "Lạng Sơn", "daiLy": "Duyên Hải (ĐXMB)", "maCanHo": "P2-10-07", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1905494249, "tyLeVay": 0.7, "hanMucDeXuat": 571648275, "vtcPhaiNop": 190549425, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_149031", "cbBIMName": "TRAN VAN LONG", "cbBIMSdt": "0912760607", "cbBIMEmail": "longtv@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21008", "maBIM": "BIM-023", "sttBIM": 23, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Nguyễn Ngọc Đức", "cccd": "001086036309", "sdt": "0934586898", "diaChi": "64B ngõ 26 phố Tư Đình, Tổ 28, Phường Long Biên, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "Nhật Minh Land", "maCanHo": "P2-10-08", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1826362936, "tyLeVay": 0.7, "hanMucDeXuat": 547908881, "vtcPhaiNop": 182636294, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_149031", "cbBIMName": "TRAN VAN LONG", "cbBIMSdt": "0912760607", "cbBIMEmail": "longtv@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21103", "maBIM": "BIM-024", "sttBIM": 24, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "TRẦN VĂN ĐÔ", "cccd": "030091001337", "sdt": "0988799128", "diaChi": "170 Trần Vỹ - Phú Diễn - Hà Nội", "vung": "Hà Nội", "daiLy": "Anexper", "maCanHo": "P2-11-03", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1891202183, "tyLeVay": 0.7, "hanMucDeXuat": 567360655, "vtcPhaiNop": 189120218, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_157252", "cbBIMName": "VU HOAI PHUONG", "cbBIMSdt": "0928252688", "cbBIMEmail": "phuongvh3@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21110", "maBIM": "BIM-025", "sttBIM": 25, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "NGUYỄN THẾ BÌNH", "cccd": "001083052833", "sdt": "0943889869", "diaChi": "Số 27 Ngõ 93 Phố Nghĩa Dũng, Phường Hồng Hà, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "Superland", "maCanHo": "P2-11-10", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 2351465050, "tyLeVay": 0.7, "hanMucDeXuat": 705439515, "vtcPhaiNop": 235146505, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_157252", "cbBIMName": "VU HOAI PHUONG", "cbBIMSdt": "0928252688", "cbBIMEmail": "phuongvh3@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21403A", "maBIM": "BIM-026", "sttBIM": 26, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "PHÍ VĂN ĐƯỜNG", "cccd": "001083013351", "sdt": "0981762468", "diaChi": "Số 111 thôn Thái Hoà, xã Tây Phương, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "REDLAND", "maCanHo": "P2-14-03A", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1856770311, "tyLeVay": 0.7, "hanMucDeXuat": 557031093, "vtcPhaiNop": 191000000, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_ql", "cbBIMName": "NGUYEN THI PHUONG", "cbBIMSdt": "0902022526", "cbBIMEmail": "phuongnt27@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21412", "maBIM": "BIM-027", "sttBIM": 27, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "NGUYỄN ĐỨC HUỲNH", "cccd": "033092004016", "sdt": "0359239348", "diaChi": "CH 612-CT1 Tổ hợp The Pride, Khu đô thị An Hưng, Phường Hà Đông, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "Fourhomes", "maCanHo": "P2-14-12", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1830763419, "tyLeVay": 0.7, "hanMucDeXuat": 549229026, "vtcPhaiNop": 185971689, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_ql", "cbBIMName": "NGUYEN THI PHUONG", "cbBIMSdt": "0902022526", "cbBIMEmail": "phuongnt27@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21515", "maBIM": "BIM-028", "sttBIM": 28, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "PHẠM NGỌC ĐỨC", "cccd": "025098009202", "sdt": "0378424878", "diaChi": "Căn 610Hh2 chung cư Thụy Vân, Phường Nông Trang, Tỉnh Phú Thọ", "vung": "Phú Thọ", "daiLy": "T-Land", "maCanHo": "P2-15-15", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1702007618, "tyLeVay": 0.7, "hanMucDeXuat": 510602285, "vtcPhaiNop": 170200762, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_151417", "cbBIMName": "NGUYEN THI THANH NGA", "cbBIMSdt": "0986848363", "cbBIMEmail": "ngantt25@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21606", "maBIM": "BIM-029", "sttBIM": 29, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "BÙI CHÍ ĐẠT", "cccd": "001096023562", "sdt": "0332303050", "diaChi": "Số nhà 17, ngõ 20 đường số 2, thôn Hưng Giáo, xã Tam Hưng, thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "SRT ĐÔNG BẮC", "maCanHo": "P2-16-06", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1951451970, "tyLeVay": 0.7, "hanMucDeXuat": 585435591, "vtcPhaiNop": 195145197, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_171081", "cbBIMName": "TRINH TUAN ANH", "cbBIMSdt": "0916133163", "cbBIMEmail": "anhtt26@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21607", "maBIM": "BIM-030", "sttBIM": 30, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "BÙI THÀNH LUÂN", "cccd": "001090023463", "sdt": "0986095045", "diaChi": "Số 4 Ngách 638/44 Ngô Gia Tự, Phường Việt Hưng, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "Bhomes", "maCanHo": "P2-16-07", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1962440897, "tyLeVay": 0.7, "hanMucDeXuat": 588732269, "vtcPhaiNop": 196244090, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_171081", "cbBIMName": "TRINH TUAN ANH", "cbBIMSdt": "0916133163", "cbBIMEmail": "anhtt26@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21615", "maBIM": "BIM-031", "sttBIM": 31, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "LÔ THUỲ LINH", "cccd": "020188000629", "sdt": "0383495595", "diaChi": "Số 36A ngõ 19 Thác Trà, Khối Trần Quang Khải 1, Phường Lương Văn Tri, Tỉnh Lạng Sơn", "vung": "Lạng Sơn", "daiLy": "SRT ĐÔNG BẮC", "maCanHo": "P2-16-15", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1756162386, "tyLeVay": 0.7, "hanMucDeXuat": 526848716, "vtcPhaiNop": 175616293, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_178446", "cbBIMName": "PHAN DUC TRUNG", "cbBIMSdt": "0986154065", "cbBIMEmail": "trungpd1@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21616", "maBIM": "BIM-032", "sttBIM": 32, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "LÔ THUỲ LINH", "cccd": "020188000629", "sdt": "0383495595", "diaChi": "Số 36A ngõ 19 Thác Trà, Khối Trần Quang Khải 1, Phường Lương Văn Tri, Tỉnh Lạng Sơn", "vung": "Lạng Sơn", "daiLy": "SRT ĐÔNG BẮC", "maCanHo": "P2-16-16", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1687205242, "tyLeVay": 0.7, "hanMucDeXuat": 506161573, "vtcPhaiNop": 168720524, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_178446", "cbBIMName": "PHAN DUC TRUNG", "cbBIMSdt": "0986154065", "cbBIMEmail": "trungpd1@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21712", "maBIM": "BIM-033", "sttBIM": 33, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Lương Tuấn Phương", "cccd": "020087009895", "sdt": "0974989678", "diaChi": "TDP số 2 Miêu Nha, Phường Xuân Phương, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "Nhật Minh Land", "maCanHo": "P2-17-12", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1807253263, "tyLeVay": 0.7, "hanMucDeXuat": 542175979, "vtcPhaiNop": 182668800, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_171086", "cbBIMName": "TRAN THI THUY", "cbBIMSdt": "0984104830", "cbBIMEmail": "thuytt42@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21712A", "maBIM": "BIM-034", "sttBIM": 34, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Nguyễn Việt Hưng", "cccd": "030085002266", "sdt": "0972178133", "diaChi": "Căn hộ 1601 Tòa CT2A khu nhà ở quận Hoàng Mai, Phường Hoàng Mai, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "CÔNG TY CỔ PHẦN TRUNG THỰC LAND", "maCanHo": "P2-17-12A", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1778483656, "tyLeVay": 0.7, "hanMucDeXuat": 533545097, "vtcPhaiNop": 177848366, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_171086", "cbBIMName": "TRAN THI THUY", "cbBIMSdt": "0984104830", "cbBIMEmail": "thuytt42@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21915", "maBIM": "BIM-035", "sttBIM": 35, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Nguyễn Thị Hằng", "cccd": "022175004310", "sdt": "0983859119", "diaChi": "Tổ 2, xã Mèo Vạc, tỉnh Tuyên Quang", "vung": "Tuyên Quang", "daiLy": "REDLAND", "maCanHo": "P2-19-15", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1735472307, "tyLeVay": 0.7, "hanMucDeXuat": 520641692, "vtcPhaiNop": 173547231, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_165182", "cbBIMName": "NGUYEN THANH HAI", "cbBIMSdt": "0916949799", "cbBIMEmail": "haint17@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP22012A", "maBIM": "BIM-036", "sttBIM": 36, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "NGUYỄN VĂN TRUNG", "cccd": "035083004543", "sdt": "0983697355", "diaChi": "Thôn 6 Thượng Vỹ, Xã Vĩnh Trụ, Tỉnh Ninh Bình", "vung": "Ninh Bình", "daiLy": "An Việt Homes", "maCanHo": "P2-20-12A", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1872260216, "tyLeVay": 0.7, "hanMucDeXuat": 561678065, "vtcPhaiNop": 188050287, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_165182", "cbBIMName": "NGUYEN THANH HAI", "cbBIMSdt": "0916949799", "cbBIMEmail": "haint17@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP22107", "maBIM": "BIM-037", "sttBIM": 37, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "MAI XUÂN TRƯỜNG", "cccd": "001089005654", "sdt": "0987609084", "diaChi": "Tổ 40 cụm 6, Phường Phú Thượng, Thành Phố Hà Nội", "vung": "Hà Nội", "daiLy": "Nhật Minh Land", "maCanHo": "P2-21-07", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1938778479, "tyLeVay": 0.7, "hanMucDeXuat": 581633544, "vtcPhaiNop": 193877848, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_173264", "cbBIMName": "LE THUY LINH", "cbBIMSdt": "0384106068", "cbBIMEmail": "linhlt14@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP22206", "maBIM": "BIM-038", "sttBIM": 38, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "MẠC THỊ THÙY", "cccd": "024190001445", "sdt": "0967929883", "diaChi": "P711 Ct3, KĐT Đặng Xá, Xã Gia Lâm, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "CÔNG TY TNHH PHÁT TRIỂN BẤT ĐỘNG SẢN TRUST LAND", "maCanHo": "P2-22-06", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 2008801586, "tyLeVay": 0.7, "hanMucDeXuat": 602640476, "vtcPhaiNop": 200880159, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_173264", "cbBIMName": "LE THUY LINH", "cbBIMSdt": "0384106068", "cbBIMEmail": "linhlt14@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP22208", "maBIM": "BIM-039", "sttBIM": 39, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "TRẦN VĂN HOAN", "cccd": "036087015766", "sdt": "0985211575", "diaChi": "Căn hộ 3826, Tòa 39.1 (GS1) Vinhomes Park, Phường Tây Mỗ, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "DOHALAND", "maCanHo": "P2-22-08", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1936392008, "tyLeVay": 0.7, "hanMucDeXuat": 580917602, "vtcPhaiNop": 193639201, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_145318", "cbBIMName": "TA THI VAN", "cbBIMSdt": "0986848363", "cbBIMEmail": "vantt71@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP22230", "maBIM": "BIM-040", "sttBIM": 40, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Nguyễn Thu Trang", "cccd": "001187052332", "sdt": "0904736226", "diaChi": "Số 11 ngách 2/103 Nguyễn Văn Cừ, Tổ 11, Phường Bồ Đề, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "BHS", "maCanHo": "P2-22-30", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1752537599, "tyLeVay": 0.7, "hanMucDeXuat": 525761280, "vtcPhaiNop": 175253760, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_145318", "cbBIMName": "TA THI VAN", "cbBIMSdt": "0986848363", "cbBIMEmail": "vantt71@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP22310", "maBIM": "BIM-041", "sttBIM": 41, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "NGUYỄN VĂN HIẾU", "cccd": "014088001526", "sdt": "0816555959", "diaChi": "Tổ Dân phố Trung Nguyên, Phường Thảo Nguyên, Tỉnh Sơn La", "vung": "Sơn La", "daiLy": "CÔNG TY TNHH BẤT ĐỘNG SẢN THT Land", "maCanHo": "P2-23-10", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 2468259351, "tyLeVay": 0.7, "hanMucDeXuat": 740477805, "vtcPhaiNop": 246825935, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_182410", "cbBIMName": "NGUYEN VAN THANG", "cbBIMSdt": "0982505275", "cbBIMEmail": "thangnv18@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP22406", "maBIM": "BIM-042", "sttBIM": 42, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Vũ Anh Tùng", "cccd": "022082006660", "sdt": "0946966558", "diaChi": "Phòng 1104 Nhà 17T9 KĐT Trung Hòa Nhân Chính, Phường Yên Hòa, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "CÔNG TY CỔ PHẦN TRUNG THỰC LAND", "maCanHo": "P2-24-06", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 2027918124, "tyLeVay": 0.7, "hanMucDeXuat": 608375437, "vtcPhaiNop": 202791812, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_182410", "cbBIMName": "NGUYEN VAN THANG", "cbBIMSdt": "0982505275", "cbBIMEmail": "thangnv18@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP22903", "maBIM": "BIM-043", "sttBIM": 43, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "NGÔ THỊ HÀ TRANG", "cccd": "040192023059", "sdt": "0971291599", "diaChi": "276/11/27 số nhà 20A Đại Từ, Hoàng Mai, Hà Nội", "vung": "Hà Nội", "daiLy": "CÔNG TY TNHH PHÁT TRIỂN BẤT ĐỘNG SẢN TRUST LAND", "maCanHo": "P2-29-03", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 2013427011, "tyLeVay": 0.7, "hanMucDeXuat": 604028103, "vtcPhaiNop": 201342701, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_164065", "cbBIMName": "DUONG THANH TUNG", "cbBIMSdt": "0969667388", "cbBIMEmail": "tungdt4@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP22910", "maBIM": "BIM-044", "sttBIM": 44, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "DƯƠNG HOÀNG ANH", "cccd": "001097017683", "sdt": "0826141997", "diaChi": "137 Dương Văn Bé, Phường Vĩnh Hưng, Hà Nội", "vung": "Hà Nội", "daiLy": "CÔNG TY TNHH ĐẦU TƯ VÀ PHÁT TRIỂN BẤT ĐỘNG SẢN GLOBAL PROPERTY", "maCanHo": "P2-29-10", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 2503297640, "tyLeVay": 0.7, "hanMucDeXuat": 750989292, "vtcPhaiNop": 250329764, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_164065", "cbBIMName": "DUONG THANH TUNG", "cbBIMSdt": "0969667388", "cbBIMEmail": "tungdt4@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}]; }
if(!hsList) { hsList = DEMO_HS; }
var actLog = JSON.parse(localStorage.getItem('pb5_log') || '[]');
// ══════════════════════════════════════════════════
// SUPABASE CONFIG
// ══════════════════════════════════════════════════
var SUPABASE_URL = 'https://oodeswfnxnqabjbmecmi.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZGVzd2ZueG5xYWJqYm1lY21pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzOTc1MTIsImV4cCI6MjA5Nzk3MzUxMn0.FY8ld0DW0ccnAmpfZ8cUwE2jnt8LI8teZXLBFQJNfos';
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ══════════════════════════════════════════════════
// SUPABASE AUTH + DATA HELPERS
// ══════════════════════════════════════════════════

// sbLogin: không dùng Supabase Auth (phương án 2)

// Lấy danh sách hồ sơ từ DB

// Lấy danh sách users từ DB

// Lưu weekly report

// Cập nhật loan_file

// Cập nhật customer

// Log hoạt động

var useSupabase = true; // flag: true = dùng DB thật, false = localStorage


var users = JSON.parse(localStorage.getItem('pb5_users') || 'null'); if(!users){ users = [{"id": "u_admin", "name": "Nguyễn Việt Anh", "login": "vietanh", "pw": "admin2025", "role": "admin", "active": true, "pgd": "Tổ NHSODV", "cv": "Tổ trưởng"}, {"id": "u_ql", "name": "Nguyễn Thị Phương", "login": "phuongnt27@bidv.com.vn", "pw": "157332", "role": "ql", "active": true, "pgd": "Phòng KHCN", "cv": "Phó Trưởng phòng KHCN", "maCB": "157332"}, {"id": "u_bim1", "name": "BIM - Quản lý dự án", "login": "bim1", "pw": "bim2025", "role": "cdt", "active": true, "cdtLevel": "standard"}, {"id": "u_bim2", "name": "BIM - Giám đốc", "login": "bim2", "pw": "bim2025", "role": "cdt", "active": true, "cdtLevel": "admin", "canSetGiaiNgan": true}, {"id": "u_145318", "name": "Tạ Thị Vân", "login": "vantt71@bidv.com.vn", "pw": "145318", "role": "cb", "active": true, "pgd": "PGD Hào Nam", "cv": "Chuyên viên KHƯT cấp 4", "maCB": "145318"}, {"id": "u_145344", "name": "Bùi Phương Anh", "login": "anhbp1@bidv.com.vn", "pw": "145344", "role": "cb", "active": true, "pgd": "PGD West Lake", "cv": "Phó GĐ PGD phụ trách KD", "maCB": "145344"}, {"id": "u_149031", "name": "Trần Văn Long", "login": "longtv@bidv.com.vn", "pw": "149031", "role": "cb", "active": true, "pgd": "PGD Hào Nam", "cv": "Phó GĐ PGD phụ trách KD", "maCB": "149031"}, {"id": "u_151417", "name": "Nguyễn Thị Thanh Nga", "login": "ngantt25@bidv.com.vn", "pw": "151417", "role": "cb", "active": true, "pgd": "PGD Nam Cao", "cv": "Phó GĐ PGD phụ trách KD", "maCB": "151417"}, {"id": "u_153545", "name": "Nguyễn Thị Ngọc Diệp", "login": "diepntn3@bidv.com.vn", "pw": "153545", "role": "cb", "active": true, "pgd": "PGD Nam Cao", "cv": "Phó GĐ PGD phụ trách KD", "maCB": "153545"}, {"id": "u_157252", "name": "Vũ Hoài Phương", "login": "phuongvh3@bidv.com.vn", "pw": "157252", "role": "cb", "active": true, "pgd": "PGD Lương Định Của", "cv": "Chuyên viên KHƯT cấp 3", "maCB": "157252"}, {"id": "u_157333", "name": "Dương Kiều Huyền", "login": "huyendk@bidv.com.vn", "pw": "157333", "role": "cb", "active": true, "pgd": "Phòng KHCN", "cv": "Phó Trưởng phòng KHCN", "maCB": "157333"}, {"id": "u_157345", "name": "Nguyễn Công Thành", "login": "thanhnc6@bidv.com.vn", "pw": "157345", "role": "cb", "active": true, "pgd": "Phòng KHCN", "cv": "Phó Trưởng phòng KHCN", "maCB": "157345"}, {"id": "u_158495", "name": "Nguyễn Trung Hiếu", "login": "hieunt35@bidv.com.vn", "pw": "158495", "role": "cb", "active": true, "pgd": "PGD Nam Cao", "cv": "Chuyên viên KHƯT cấp 2", "maCB": "158495"}, {"id": "u_164065", "name": "Dương Thanh Tùng", "login": "tungdt4@bidv.com.vn", "pw": "164065", "role": "cb", "active": true, "pgd": "PGD West Lake", "cv": "Phó GĐ PGD phụ trách KD", "maCB": "164065"}, {"id": "u_165182", "name": "Nguyễn Thanh Hải", "login": "haint17@bidv.com.vn", "pw": "165182", "role": "cb", "active": true, "pgd": "PGD Hào Nam", "cv": "CV KHCN C1", "maCB": "165182"}, {"id": "u_165874", "name": "Ninh Thu Hương", "login": "huongnt74@bidv.com.vn", "pw": "165874", "role": "cb", "active": true, "pgd": "Phòng KHCN", "cv": "Chuyên viên KHƯT cấp 3", "maCB": "165874"}, {"id": "u_171081", "name": "Trịnh Tuấn Anh", "login": "anhtt26@bidv.com.vn", "pw": "171081", "role": "cb", "active": true, "pgd": "PGD Nam Cao", "cv": "Chuyên viên KHCN cấp 1", "maCB": "171081"}, {"id": "u_171086", "name": "Trần Thị Thủy", "login": "thuytt42@bidv.com.vn", "pw": "171086", "role": "cb", "active": true, "pgd": "Phòng KHCN", "cv": "Chuyên viên KHƯT cấp 2", "maCB": "171086"}, {"id": "u_173057", "name": "Nguyễn Thị Thảo", "login": "thaont63@bidv.com.vn", "pw": "173057", "role": "cb", "active": true, "pgd": "Phòng KHCN", "cv": "Chuyên viên KHCN cấp 2", "maCB": "173057"}, {"id": "u_173264", "name": "Lê Thùy Linh", "login": "linhlt14@bidv.com.vn", "pw": "173264", "role": "cb", "active": true, "pgd": "Phòng KHCN", "cv": "Chuyên viên KHCN cấp 2", "maCB": "173264"}, {"id": "u_173789", "name": "Bùi Nhật Tân", "login": "tanbn@bidv.com.vn", "pw": "173789", "role": "cb", "active": true, "pgd": "PGD West Lake", "cv": "Chuyên viên KHCN cấp 1", "maCB": "173789"}, {"id": "u_178446", "name": "Phan Đức Trung", "login": "trungpd1@bidv.com.vn", "pw": "178446", "role": "cb", "active": true, "pgd": "PGD Lương Định Của", "cv": "Chuyên viên KHCN cấp 2", "maCB": "178446"}, {"id": "u_182410", "name": "Nguyễn Văn Thắng", "login": "thangnv18@bidv.com.vn", "pw": "182410", "role": "cb", "active": true, "pgd": "PGD West Lake", "cv": "Chuyên viên KHHH cấp 1", "maCB": "182410"}, {"id": "u_36691", "name": "Phạm Thị Tuyết Mai", "login": "maiptt2@bidv.com.vn", "pw": "36691", "role": "cb", "active": true, "pgd": "PGD Lương Định Của", "cv": "Phó GĐ PGD phụ trách KD", "maCB": "36691"}]; }

var hsList = JSON.parse(localStorage.getItem('pb5_hs') || 'null'); if(!hsList){ hsList = [{"id": "HSP11006", "maBIM": "BIM-001", "sttBIM": 1, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "TRẦN THÀNH CÔNG", "cccd": "031095005713", "sdt": "0326606369", "diaChi": "CHCC 2403 tòa nhà N01A TTTM DV nhà ở Golden Land 275 Nguyễn Trãi, Phường Khương Đình, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "CÔNG TY TNHH PHÁT TRIỂN BẤT ĐỘNG SẢN TRUST LAND", "maCanHo": "P1-10-06", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1939101876, "tyLeVay": 0.7, "hanMucDeXuat": 581730563, "vtcPhaiNop": 195995447, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_157345", "cbBIMName": "NGUYEN CONGTHANH", "cbBIMSdt": "0949496666", "cbBIMEmail": "thanhnc6@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11105", "maBIM": "BIM-002", "sttBIM": 2, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "NGUYỄN NGỌC NAM", "cccd": "001076020833", "sdt": "0336047809", "diaChi": "Thôn Yên Quán, xã Hưng Đạo, TP Hà Nội", "vung": "Hà Nội", "daiLy": "MAI VIỆT", "maCanHo": "P1-11-05", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1964526989, "tyLeVay": 0.7, "hanMucDeXuat": 589358097, "vtcPhaiNop": 196452699, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_157345", "cbBIMName": "NGUYEN CONGTHANH", "cbBIMSdt": "0949496666", "cbBIMEmail": "thanhnc6@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11206", "maBIM": "BIM-003", "sttBIM": 3, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "NGUYỄN THỊ MAI", "cccd": "033173001328", "sdt": "0914354237", "diaChi": "P602-50c, Ngõ 203 Trường Chinh, Phường Phương Liệt, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "An Việt Homes", "maCanHo": "P1-12-06", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1958484444, "tyLeVay": 0.7, "hanMucDeXuat": 587545333, "vtcPhaiNop": 197960000, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_157345", "cbBIMName": "NGUYEN CONGTHANH", "cbBIMSdt": "0949496666", "cbBIMEmail": "thanhnc6@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11217", "maBIM": "BIM-004", "sttBIM": 4, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "PHẠM THU HIỀN", "cccd": "022199002657", "sdt": "0865140086", "diaChi": "Căn hộ 3017 Tòa S3.02, Tổ dân phố số 11, Phường Tây Mỗ, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "An Việt Homes", "maCanHo": "P1-12-17", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1783590125, "tyLeVay": 0.7, "hanMucDeXuat": 535077038, "vtcPhaiNop": 179022880, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_145344", "cbBIMName": "BUI PHUONG ANH", "cbBIMSdt": "0986312379", "cbBIMEmail": "anhbp1@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11520", "maBIM": "BIM-005", "sttBIM": 5, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "VŨ ĐẠI DƯƠNG", "cccd": "001087021886", "sdt": "0912491919", "diaChi": "216 Bạch Mai, Phường Bạch Mai, TP Hà Nội", "vung": "Hà Nội", "daiLy": "An Việt Homes", "maCanHo": "P1-15-20", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1766385268, "tyLeVay": 0.7, "hanMucDeXuat": 529915580, "vtcPhaiNop": 177353217, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_145344", "cbBIMName": "BUI PHUONG ANH", "cbBIMSdt": "0986312379", "cbBIMEmail": "anhbp1@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11521", "maBIM": "BIM-006", "sttBIM": 6, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Vũ Tuấn Đạt", "cccd": "001083047711", "sdt": "0987888510", "diaChi": "Thôn Phú Mỹ, Xã Phú Xuyên, Tp Hà Nội", "vung": "Hà Nội", "daiLy": "An Việt Homes", "maCanHo": "P1-15-21", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1765275761, "tyLeVay": 0.7, "hanMucDeXuat": 529582728, "vtcPhaiNop": 176527576, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_145344", "cbBIMName": "BUI PHUONG ANH", "cbBIMSdt": "0986312379", "cbBIMEmail": "anhbp1@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11522", "maBIM": "BIM-007", "sttBIM": 7, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Vũ Thị Cúc Hoa", "cccd": "001184008374", "sdt": "0987888510", "diaChi": "216 Bạch Mai, Phường Bạch Mai, TP Hà Nội", "vung": "Hà Nội", "daiLy": "An Việt Homes", "maCanHo": "P1-15-22", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1758615956, "tyLeVay": 0.7, "hanMucDeXuat": 527584787, "vtcPhaiNop": 175861596, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_158495", "cbBIMName": "NGUYEN TRUNG HIEU", "cbBIMSdt": "0967890866", "cbBIMEmail": "hieunt35@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11526", "maBIM": "BIM-008", "sttBIM": 8, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "LÊ THỊ THU THỦY", "cccd": "001177020986", "sdt": "0915988088", "diaChi": "31B Nguyễn Khuyến, Phường Văn Miếu - Quốc Tử Giám, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "An Việt Homes", "maCanHo": "P1-15-26", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1774847126, "tyLeVay": 0.7, "hanMucDeXuat": 532454138, "vtcPhaiNop": 177485000, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_158495", "cbBIMName": "NGUYEN TRUNG HIEU", "cbBIMSdt": "0967890866", "cbBIMEmail": "hieunt35@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11610", "maBIM": "BIM-009", "sttBIM": 9, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "PHÙNG VĂN TƯỚC", "cccd": "020094000149", "sdt": "0982457571", "diaChi": "168 Nguyễn Phi Khanh, Phường Tam Thanh, Tỉnh Lạng Sơn", "vung": "Lạng Sơn", "daiLy": "SRT ĐÔNG BẮC", "maCanHo": "P1-16-10", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 2031640845, "tyLeVay": 0.7, "hanMucDeXuat": 609492254, "vtcPhaiNop": 203164084, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_158495", "cbBIMName": "NGUYEN TRUNG HIEU", "cbBIMSdt": "0967890866", "cbBIMEmail": "hieunt35@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11622", "maBIM": "BIM-010", "sttBIM": 10, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "HOÀNG THU HƯƠNG", "cccd": "022183007578", "sdt": "0858916888", "diaChi": "Thôn Khòn Khuyên, Phường Đông Kinh, Tỉnh Lạng Sơn", "vung": "Lạng Sơn", "daiLy": "SRT ĐÔNG BẮC", "maCanHo": "P1-16-22", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1762276084, "tyLeVay": 0.7, "hanMucDeXuat": 528682825, "vtcPhaiNop": 176227608, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_36691", "cbBIMName": "PHAM THI TUYET MAI", "cbBIMSdt": "0904377370", "cbBIMEmail": "maiptt2@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11626", "maBIM": "BIM-011", "sttBIM": 11, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "HOÀNG THỊ NỤ", "cccd": "020173001765", "sdt": "0817515658", "diaChi": "Tổ 2, Khối 14, Phường Kỳ Lừa, Tỉnh Lạng Sơn", "vung": "Lạng Sơn", "daiLy": "SRT ĐÔNG BẮC", "maCanHo": "P1-16-26", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1834939494, "tyLeVay": 0.7, "hanMucDeXuat": 550481848, "vtcPhaiNop": 183493949, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_36691", "cbBIMName": "PHAM THI TUYET MAI", "cbBIMSdt": "0904377370", "cbBIMEmail": "maiptt2@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP11920", "maBIM": "BIM-012", "sttBIM": 12, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "TRẦN THỊ ÁNH NGUYỆT", "cccd": "026188002770", "sdt": "0966826139", "diaChi": "Khê Ngoại 3, xã Mê Linh, thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "REDLAND", "maCanHo": "P1-19-20", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1801134810, "tyLeVay": 0.7, "hanMucDeXuat": 540340443, "vtcPhaiNop": 180113481, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_36691", "cbBIMName": "PHAM THI TUYET MAI", "cbBIMSdt": "0904377370", "cbBIMEmail": "maiptt2@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP12001", "maBIM": "BIM-013", "sttBIM": 13, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "NGUYỄN VĂN PHÚC", "cccd": "035088001403", "sdt": "0977815591", "diaChi": "Thôn 4 Thượng Vỹ, Xã Vĩnh Trụ, Tỉnh Ninh Bình", "vung": "Ninh Bình", "daiLy": "An Việt Homes", "maCanHo": "P1-20-01", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1929211457, "tyLeVay": 0.7, "hanMucDeXuat": 578763437, "vtcPhaiNop": 192921146, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_151417", "cbBIMName": "NGUYEN THI THANH NGA", "cbBIMSdt": "0986848363", "cbBIMEmail": "ngantt25@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP12012A", "maBIM": "BIM-014", "sttBIM": 14, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Vũ Thị Phượng", "cccd": "036197010855", "sdt": "0354395823", "diaChi": "Căn hộ 1126 - HH4B, phường Hoàng Liệt, thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "Thành Phát Global", "maCanHo": "P1-20-12A", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 2053461213, "tyLeVay": 0.7, "hanMucDeXuat": 616038364, "vtcPhaiNop": 205346121, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_151417", "cbBIMName": "NGUYEN THI THANH NGA", "cbBIMSdt": "0986848363", "cbBIMEmail": "ngantt25@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP12210", "maBIM": "BIM-015", "sttBIM": 15, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Nguyễn Văn Tuấn", "cccd": "040098009016", "sdt": "0357646222", "diaChi": "Số 29 ngõ 282 Kim Giang, Định Công, Hà Nội", "vung": "Hà Nội", "daiLy": "DOHALAND", "maCanHo": "P1-22-10", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 2091378947, "tyLeVay": 0.7, "hanMucDeXuat": 627413684, "vtcPhaiNop": 209137895, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_153545", "cbBIMName": "NGUYEN THI NGOC DIEP", "cbBIMSdt": "0986180686", "cbBIMEmail": "diepntn3@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP12220", "maBIM": "BIM-016", "sttBIM": 16, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "LẦU MAI TRANG", "cccd": "001191054042", "sdt": "0943030991", "diaChi": "Phòng 214 N5 Bán Đảo Linh Đàm, Phường Hoàng Liệt, TP Hà Nội", "vung": "Hà Nội", "daiLy": "An Việt Homes", "maCanHo": "P1-22-20", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1860428083, "tyLeVay": 0.7, "hanMucDeXuat": 558128425, "vtcPhaiNop": 186080000, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_153545", "cbBIMName": "NGUYEN THI NGOC DIEP", "cbBIMSdt": "0986180686", "cbBIMEmail": "diepntn3@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP12412A", "maBIM": "BIM-017", "sttBIM": 17, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Trần Phương Anh", "cccd": "020197007472", "sdt": "0946416897", "diaChi": "Toà N02T2, Khu Chung Cư Ngoại Giao Đoàn, Phường Xuân Đỉnh, Thành Phố Hà Nội", "vung": "Hà Nội", "daiLy": "An Việt Homes", "maCanHo": "P1-24-12A", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 2072812608, "tyLeVay": 0.7, "hanMucDeXuat": 621843782, "vtcPhaiNop": 207282000, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_153545", "cbBIMName": "NGUYEN THI NGOC DIEP", "cbBIMSdt": "0986180686", "cbBIMEmail": "diepntn3@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP12617", "maBIM": "BIM-018", "sttBIM": 18, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "ĐINH THẢO ANH", "cccd": "019301008357", "sdt": "0945438976", "diaChi": "Ngách 68/53 Đường Cầu Giấy, thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "REDLAND", "maCanHo": "P1-26-17", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1964964432, "tyLeVay": 0.7, "hanMucDeXuat": 589489330, "vtcPhaiNop": 196496443, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_165874", "cbBIMName": "NINH THU HUONG", "cbBIMSdt": "0975466565", "cbBIMEmail": "huongnt74@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP20626", "maBIM": "BIM-019", "sttBIM": 19, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Lại Thế Vũ", "cccd": "035081015487", "sdt": "0969872012", "diaChi": "Thôn Thượng Cầu Vọng, Xã Thanh Bình, Tỉnh Ninh Bình", "vung": "Ninh Bình", "daiLy": "SRT ĐÔNG BẮC", "maCanHo": "P2-06-26", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1625681371, "tyLeVay": 0.7, "hanMucDeXuat": 487704411, "vtcPhaiNop": 162568137, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_165874", "cbBIMName": "NINH THU HUONG", "cbBIMSdt": "0975466565", "cbBIMEmail": "huongnt74@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP20805", "maBIM": "BIM-020", "sttBIM": 20, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Nguyễn Xuân Bốn", "cccd": "034082002973", "sdt": "0963591337", "diaChi": "Thọ Am, xã Nam Phù, thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "CÔNG TY CỔ PHẦN BẤT ĐỘNG SẢN EVG", "maCanHo": "P2-08-05", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1810923984, "tyLeVay": 0.7, "hanMucDeXuat": 543277195, "vtcPhaiNop": 181092398, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_165874", "cbBIMName": "NINH THU HUONG", "cbBIMSdt": "0975466565", "cbBIMEmail": "huongnt74@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP20912A", "maBIM": "BIM-021", "sttBIM": 21, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "PHAN THỊ HUYỀN", "cccd": "040196019172", "sdt": "0962196556", "diaChi": "Số 35B Đường Phan Bội Châu, Phường Vinh Hưng, Tỉnh Nghệ An", "vung": "Nghệ An", "daiLy": "CÔNG TY CỔ PHẦN TRUNG THỰC LAND", "maCanHo": "P2-09-12A", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1726503884, "tyLeVay": 0.7, "hanMucDeXuat": 517951165, "vtcPhaiNop": 172650388, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_149031", "cbBIMName": "TRAN VAN LONG", "cbBIMSdt": "0912760607", "cbBIMEmail": "longtv@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21007", "maBIM": "BIM-022", "sttBIM": 22, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "LÀNH THỊ LIÊN", "cccd": "020189000623", "sdt": "0915589875", "diaChi": "Phố Đức Tâm, Xã Văn Quan, Tỉnh Lạng Sơn", "vung": "Lạng Sơn", "daiLy": "Duyên Hải (ĐXMB)", "maCanHo": "P2-10-07", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1905494249, "tyLeVay": 0.7, "hanMucDeXuat": 571648275, "vtcPhaiNop": 190549425, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_149031", "cbBIMName": "TRAN VAN LONG", "cbBIMSdt": "0912760607", "cbBIMEmail": "longtv@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21008", "maBIM": "BIM-023", "sttBIM": 23, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Nguyễn Ngọc Đức", "cccd": "001086036309", "sdt": "0934586898", "diaChi": "64B ngõ 26 phố Tư Đình, Tổ 28, Phường Long Biên, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "Nhật Minh Land", "maCanHo": "P2-10-08", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1826362936, "tyLeVay": 0.7, "hanMucDeXuat": 547908881, "vtcPhaiNop": 182636294, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_149031", "cbBIMName": "TRAN VAN LONG", "cbBIMSdt": "0912760607", "cbBIMEmail": "longtv@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21103", "maBIM": "BIM-024", "sttBIM": 24, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "TRẦN VĂN ĐÔ", "cccd": "030091001337", "sdt": "0988799128", "diaChi": "170 Trần Vỹ - Phú Diễn - Hà Nội", "vung": "Hà Nội", "daiLy": "Anexper", "maCanHo": "P2-11-03", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1891202183, "tyLeVay": 0.7, "hanMucDeXuat": 567360655, "vtcPhaiNop": 189120218, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_157252", "cbBIMName": "VU HOAI PHUONG", "cbBIMSdt": "0928252688", "cbBIMEmail": "phuongvh3@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21110", "maBIM": "BIM-025", "sttBIM": 25, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "NGUYỄN THẾ BÌNH", "cccd": "001083052833", "sdt": "0943889869", "diaChi": "Số 27 Ngõ 93 Phố Nghĩa Dũng, Phường Hồng Hà, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "Superland", "maCanHo": "P2-11-10", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 2351465050, "tyLeVay": 0.7, "hanMucDeXuat": 705439515, "vtcPhaiNop": 235146505, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_157252", "cbBIMName": "VU HOAI PHUONG", "cbBIMSdt": "0928252688", "cbBIMEmail": "phuongvh3@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21403A", "maBIM": "BIM-026", "sttBIM": 26, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "PHÍ VĂN ĐƯỜNG", "cccd": "001083013351", "sdt": "0981762468", "diaChi": "Số 111 thôn Thái Hoà, xã Tây Phương, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "REDLAND", "maCanHo": "P2-14-03A", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1856770311, "tyLeVay": 0.7, "hanMucDeXuat": 557031093, "vtcPhaiNop": 191000000, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_ql", "cbBIMName": "NGUYEN THI PHUONG", "cbBIMSdt": "0902022526", "cbBIMEmail": "phuongnt27@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21412", "maBIM": "BIM-027", "sttBIM": 27, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "NGUYỄN ĐỨC HUỲNH", "cccd": "033092004016", "sdt": "0359239348", "diaChi": "CH 612-CT1 Tổ hợp The Pride, Khu đô thị An Hưng, Phường Hà Đông, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "Fourhomes", "maCanHo": "P2-14-12", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1830763419, "tyLeVay": 0.7, "hanMucDeXuat": 549229026, "vtcPhaiNop": 185971689, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_ql", "cbBIMName": "NGUYEN THI PHUONG", "cbBIMSdt": "0902022526", "cbBIMEmail": "phuongnt27@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21515", "maBIM": "BIM-028", "sttBIM": 28, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "PHẠM NGỌC ĐỨC", "cccd": "025098009202", "sdt": "0378424878", "diaChi": "Căn 610Hh2 chung cư Thụy Vân, Phường Nông Trang, Tỉnh Phú Thọ", "vung": "Phú Thọ", "daiLy": "T-Land", "maCanHo": "P2-15-15", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1702007618, "tyLeVay": 0.7, "hanMucDeXuat": 510602285, "vtcPhaiNop": 170200762, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_151417", "cbBIMName": "NGUYEN THI THANH NGA", "cbBIMSdt": "0986848363", "cbBIMEmail": "ngantt25@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21606", "maBIM": "BIM-029", "sttBIM": 29, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "BÙI CHÍ ĐẠT", "cccd": "001096023562", "sdt": "0332303050", "diaChi": "Số nhà 17, ngõ 20 đường số 2, thôn Hưng Giáo, xã Tam Hưng, thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "SRT ĐÔNG BẮC", "maCanHo": "P2-16-06", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1951451970, "tyLeVay": 0.7, "hanMucDeXuat": 585435591, "vtcPhaiNop": 195145197, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_171081", "cbBIMName": "TRINH TUAN ANH", "cbBIMSdt": "0916133163", "cbBIMEmail": "anhtt26@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21607", "maBIM": "BIM-030", "sttBIM": 30, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "BÙI THÀNH LUÂN", "cccd": "001090023463", "sdt": "0986095045", "diaChi": "Số 4 Ngách 638/44 Ngô Gia Tự, Phường Việt Hưng, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "Bhomes", "maCanHo": "P2-16-07", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1962440897, "tyLeVay": 0.7, "hanMucDeXuat": 588732269, "vtcPhaiNop": 196244090, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_171081", "cbBIMName": "TRINH TUAN ANH", "cbBIMSdt": "0916133163", "cbBIMEmail": "anhtt26@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21615", "maBIM": "BIM-031", "sttBIM": 31, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "LÔ THUỲ LINH", "cccd": "020188000629", "sdt": "0383495595", "diaChi": "Số 36A ngõ 19 Thác Trà, Khối Trần Quang Khải 1, Phường Lương Văn Tri, Tỉnh Lạng Sơn", "vung": "Lạng Sơn", "daiLy": "SRT ĐÔNG BẮC", "maCanHo": "P2-16-15", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1756162386, "tyLeVay": 0.7, "hanMucDeXuat": 526848716, "vtcPhaiNop": 175616293, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_178446", "cbBIMName": "PHAN DUC TRUNG", "cbBIMSdt": "0986154065", "cbBIMEmail": "trungpd1@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21616", "maBIM": "BIM-032", "sttBIM": 32, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "LÔ THUỲ LINH", "cccd": "020188000629", "sdt": "0383495595", "diaChi": "Số 36A ngõ 19 Thác Trà, Khối Trần Quang Khải 1, Phường Lương Văn Tri, Tỉnh Lạng Sơn", "vung": "Lạng Sơn", "daiLy": "SRT ĐÔNG BẮC", "maCanHo": "P2-16-16", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1687205242, "tyLeVay": 0.7, "hanMucDeXuat": 506161573, "vtcPhaiNop": 168720524, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_178446", "cbBIMName": "PHAN DUC TRUNG", "cbBIMSdt": "0986154065", "cbBIMEmail": "trungpd1@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21712", "maBIM": "BIM-033", "sttBIM": 33, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Lương Tuấn Phương", "cccd": "020087009895", "sdt": "0974989678", "diaChi": "TDP số 2 Miêu Nha, Phường Xuân Phương, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "Nhật Minh Land", "maCanHo": "P2-17-12", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1807253263, "tyLeVay": 0.7, "hanMucDeXuat": 542175979, "vtcPhaiNop": 182668800, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_171086", "cbBIMName": "TRAN THI THUY", "cbBIMSdt": "0984104830", "cbBIMEmail": "thuytt42@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21712A", "maBIM": "BIM-034", "sttBIM": 34, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Nguyễn Việt Hưng", "cccd": "030085002266", "sdt": "0972178133", "diaChi": "Căn hộ 1601 Tòa CT2A khu nhà ở quận Hoàng Mai, Phường Hoàng Mai, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "CÔNG TY CỔ PHẦN TRUNG THỰC LAND", "maCanHo": "P2-17-12A", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1778483656, "tyLeVay": 0.7, "hanMucDeXuat": 533545097, "vtcPhaiNop": 177848366, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_171086", "cbBIMName": "TRAN THI THUY", "cbBIMSdt": "0984104830", "cbBIMEmail": "thuytt42@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP21915", "maBIM": "BIM-035", "sttBIM": 35, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Nguyễn Thị Hằng", "cccd": "022175004310", "sdt": "0983859119", "diaChi": "Tổ 2, xã Mèo Vạc, tỉnh Tuyên Quang", "vung": "Tuyên Quang", "daiLy": "REDLAND", "maCanHo": "P2-19-15", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1735472307, "tyLeVay": 0.7, "hanMucDeXuat": 520641692, "vtcPhaiNop": 173547231, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_165182", "cbBIMName": "NGUYEN THANH HAI", "cbBIMSdt": "0916949799", "cbBIMEmail": "haint17@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP22012A", "maBIM": "BIM-036", "sttBIM": 36, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "NGUYỄN VĂN TRUNG", "cccd": "035083004543", "sdt": "0983697355", "diaChi": "Thôn 6 Thượng Vỹ, Xã Vĩnh Trụ, Tỉnh Ninh Bình", "vung": "Ninh Bình", "daiLy": "An Việt Homes", "maCanHo": "P2-20-12A", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1872260216, "tyLeVay": 0.7, "hanMucDeXuat": 561678065, "vtcPhaiNop": 188050287, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_165182", "cbBIMName": "NGUYEN THANH HAI", "cbBIMSdt": "0916949799", "cbBIMEmail": "haint17@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP22107", "maBIM": "BIM-037", "sttBIM": 37, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "MAI XUÂN TRƯỜNG", "cccd": "001089005654", "sdt": "0987609084", "diaChi": "Tổ 40 cụm 6, Phường Phú Thượng, Thành Phố Hà Nội", "vung": "Hà Nội", "daiLy": "Nhật Minh Land", "maCanHo": "P2-21-07", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1938778479, "tyLeVay": 0.7, "hanMucDeXuat": 581633544, "vtcPhaiNop": 193877848, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_173264", "cbBIMName": "LE THUY LINH", "cbBIMSdt": "0384106068", "cbBIMEmail": "linhlt14@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP22206", "maBIM": "BIM-038", "sttBIM": 38, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "MẠC THỊ THÙY", "cccd": "024190001445", "sdt": "0967929883", "diaChi": "P711 Ct3, KĐT Đặng Xá, Xã Gia Lâm, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "CÔNG TY TNHH PHÁT TRIỂN BẤT ĐỘNG SẢN TRUST LAND", "maCanHo": "P2-22-06", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 2008801586, "tyLeVay": 0.7, "hanMucDeXuat": 602640476, "vtcPhaiNop": 200880159, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_173264", "cbBIMName": "LE THUY LINH", "cbBIMSdt": "0384106068", "cbBIMEmail": "linhlt14@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP22208", "maBIM": "BIM-039", "sttBIM": 39, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "TRẦN VĂN HOAN", "cccd": "036087015766", "sdt": "0985211575", "diaChi": "Căn hộ 3826, Tòa 39.1 (GS1) Vinhomes Park, Phường Tây Mỗ, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "DOHALAND", "maCanHo": "P2-22-08", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1936392008, "tyLeVay": 0.7, "hanMucDeXuat": 580917602, "vtcPhaiNop": 193639201, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_145318", "cbBIMName": "TA THI VAN", "cbBIMSdt": "0986848363", "cbBIMEmail": "vantt71@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP22230", "maBIM": "BIM-040", "sttBIM": 40, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Nguyễn Thu Trang", "cccd": "001187052332", "sdt": "0904736226", "diaChi": "Số 11 ngách 2/103 Nguyễn Văn Cừ, Tổ 11, Phường Bồ Đề, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "BHS", "maCanHo": "P2-22-30", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 1752537599, "tyLeVay": 0.7, "hanMucDeXuat": 525761280, "vtcPhaiNop": 175253760, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_145318", "cbBIMName": "TA THI VAN", "cbBIMSdt": "0986848363", "cbBIMEmail": "vantt71@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP22310", "maBIM": "BIM-041", "sttBIM": 41, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "NGUYỄN VĂN HIẾU", "cccd": "014088001526", "sdt": "0816555959", "diaChi": "Tổ Dân phố Trung Nguyên, Phường Thảo Nguyên, Tỉnh Sơn La", "vung": "Sơn La", "daiLy": "CÔNG TY TNHH BẤT ĐỘNG SẢN THT Land", "maCanHo": "P2-23-10", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 2468259351, "tyLeVay": 0.7, "hanMucDeXuat": 740477805, "vtcPhaiNop": 246825935, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_182410", "cbBIMName": "NGUYEN VAN THANG", "cbBIMSdt": "0982505275", "cbBIMEmail": "thangnv18@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP22406", "maBIM": "BIM-042", "sttBIM": 42, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "Vũ Anh Tùng", "cccd": "022082006660", "sdt": "0946966558", "diaChi": "Phòng 1104 Nhà 17T9 KĐT Trung Hòa Nhân Chính, Phường Yên Hòa, Thành phố Hà Nội", "vung": "Hà Nội", "daiLy": "CÔNG TY CỔ PHẦN TRUNG THỰC LAND", "maCanHo": "P2-24-06", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 2027918124, "tyLeVay": 0.7, "hanMucDeXuat": 608375437, "vtcPhaiNop": 202791812, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_182410", "cbBIMName": "NGUYEN VAN THANG", "cbBIMSdt": "0982505275", "cbBIMEmail": "thangnv18@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP22903", "maBIM": "BIM-043", "sttBIM": 43, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "NGÔ THỊ HÀ TRANG", "cccd": "040192023059", "sdt": "0971291599", "diaChi": "276/11/27 số nhà 20A Đại Từ, Hoàng Mai, Hà Nội", "vung": "Hà Nội", "daiLy": "CÔNG TY TNHH PHÁT TRIỂN BẤT ĐỘNG SẢN TRUST LAND", "maCanHo": "P2-29-03", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 2013427011, "tyLeVay": 0.7, "hanMucDeXuat": 604028103, "vtcPhaiNop": 201342701, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_164065", "cbBIMName": "DUONG THANH TUNG", "cbBIMSdt": "0969667388", "cbBIMEmail": "tungdt4@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}, {"id": "HSP22910", "maBIM": "BIM-044", "sttBIM": 44, "createdAt": "17/06 00:00", "updatedAt": "17/06 00:00", "status": "moi", "locked": false, "kLocked": false, "source": "bim", "tenKH": "DƯƠNG HOÀNG ANH", "cccd": "001097017683", "sdt": "0826141997", "diaChi": "137 Dương Văn Bé, Phường Vĩnh Hưng, Hà Nội", "vung": "Hà Nội", "daiLy": "CÔNG TY TNHH ĐẦU TƯ VÀ PHÁT TRIỂN BẤT ĐỘNG SẢN GLOBAL PROPERTY", "maCanHo": "P2-29-10", "duAn": "Prima Bay - Hạ Long", "giaHDMB": 2503297640, "tyLeVay": 0.7, "hanMucDeXuat": 750989292, "vtcPhaiNop": 250329764, "vtcDaNop": 0, "csChinhSach": "20260617_Prima_vay", "hinhThucVay": "30 tháng", "hanGiaiNgan": "ngay ky HDMB + 45 ngay", "ngayGuiBIM": "46217", "canBoId": "u_164065", "cbBIMName": "DUONG THANH TUNG", "cbBIMSdt": "0969667388", "cbBIMEmail": "tungdt4@bidv.com.vn", "ck": {}, "files": {}, "contacts": [], "weeklyReports": [], "ketQuaKhaiThac": "", "chiTiet": "", "deXuatHoTro": "", "hanMucDuocDuyet": 0, "ngayGiaiNgan": "", "soTienGiaiNgan": 0}]; }
if(!hsList) { hsList = DEMO_HS; }

var currentUser = null;
var currentHSId = null;
var impRows = [];
var cdtRows = [];
var selOutcome = null;
var editUserId = null;
var confFn = null;

// ══════════════════════════════════════════════════════════
// DATABASE SYNC — Lưu dữ liệu lên Supabase
// ══════════════════════════════════════════════════════════

// Map app HS object → loan_files columns
// CHÚ Ý: area_construction, area_usable thuộc bảng apartments (không phải loan_files)
function mapHSToLF(h) {
  var appToDb={'moi':'new','dang':'processing','cho':'pending','choky':'approved','chogn':'approved','xong':'disbursed','tuchoi':'rejected'};
  return {
    // ── Core fields (chắc chắn có trong mọi phiên bản schema) ──
    status:                 appToDb[h.status]||'new',
    officer_id:             h.canBoId||null,
    sale_price:             parseInt(h.giaHDMB)||null,
    vtc_required:           parseInt(h.vtcPhaiNop)||null,
    vtc_paid:               parseInt(h.vtcDaNop)||null,
    loan_amount_requested:  parseInt(h.soTienVay)||null,
    loan_term_months:       parseInt(h.kyHan)||null,
    loan_amount_approved:   parseInt(h.hanMucDuocDuyet)||null,
    loan_form:              h.hinhThucVay||null,
    loan_policy_ref:        h.csChinhSach||null,
    hdmb_code:              h.soHDMB||null,
    hdmb_date:              h.ngayKyHDMB||null,
    max_disbursement_date:  h.hanGiaiNgan||null,
    disbursement_date:      h.ngayGiaiNgan||null,
    disbursement_amount:    parseInt(h.soTienGiaiNgan)||null,
    is_locked:              h.locked||false,
    is_kh_locked:           h.kLocked||false,
    notes:                  h.ghiChu||null,
    // ── Extended fields (cần chạy migration SQL để add vào DB) ──
    locked_by:              h.lockedBy||null,
    drive_folder_url:       h.drive_folder_url||null,
    pca_code:               h.pca_code||null,
    hdtd_code:              h.hdtd_code||null,
    mortgage_code:          h.mortgage_code||null,
    htls_agreement:         h.htls_agreement||null,
    qlts_agreement:         h.qlts_agreement||null,
    disbursement_1:         h.disbursement_1||null,
    equity_amount:          h.equity_amount||null,
    collateral_value_ratio: h.collateral_value_ratio||null,
    vtc_5pct:               h.vtc_5pct||null,
    payment_account:        h.payment_account||null,
    min_account_balance:    h.min_account_balance||null,
    valuation_1:            h.valuation_1||null,
    valuation_2:            h.valuation_2||null,
    hdmb_value_with_mgt:    h.hdmb_value_with_mgt||null,
    grace_period_months:    h.grace_period_months||null,
    income_salary:          h.income_salary||null,
    income_business:        h.income_business||null,
    income_rental:          h.income_rental||null,
    income_other:           h.income_other||null,
    expense_living:         h.expense_living||null,
    expense_debt:           h.expense_debt||null,
    updated_at:             new Date().toISOString()
    // KHÔNG có area_construction, area_usable → thuộc bảng apartments
  };
}

// Map app KH object → customers columns
function mapHSToCust(h) {
  return {
    salutation:h.salutation||null,
    full_name:h.tenKH||null, id_number:h.cccd||null,
    id_issue_place:h.id_issue_place||null, id_issue_date:h.id_issue_date||null,
    phone:h.sdt||null, email:h.email||null,
    address:h.diaChi||null, permanent_address:h.permanent_address||null,
    dob:h.ngaySinh||null,
    occupation:h.ngheNghiep||null, monthly_income:parseFloat(h.thuNhap)||null,
    cif:h.cif||null, agent:h.daiLy||null,
    has_co_borrower:h.coVoChong||false, co_salutation:h.co_salutation||null, co_name:h.tenVC||null,
    co_id_number:h.cccdVC||null,
    co_id_issue_place:h.co_id_issue_place||null, co_id_issue_date:h.co_id_issue_date||null,
    co_phone:h.sdtVC||null, co_dob:h.ngaySinhVC||null,
    co_occupation:h.ngheNghiepVC||null, co_monthly_income:parseFloat(h.thuNhapVC)||null,
    email_co_borrower:h.emailVC||null, cif_co_borrower:h.cifVC||null,
    co_address:h.diaChiVC||null, co_permanent_address:h.co_permanent_address||null,
    workplace:h.workplace||null, workplace_address:h.workplace_address||null,
    workplace_phone:h.workplace_phone||null, job_title:h.job_title||null,
    workplace2:h.workplace2||null, workplace2_address:h.workplace2_address||null,
    workplace2_phone:h.workplace2_phone||null, job_title2:h.job_title2||null,
    co_workplace:h.co_workplace||null, co_workplace_address:h.co_workplace_address||null,
    co_workplace_phone:h.co_workplace_phone||null, co_job_title:h.co_job_title||null,
    co_workplace2:h.co_workplace2||null, co_workplace2_address:h.co_workplace2_address||null,
    co_workplace2_phone:h.co_workplace2_phone||null, co_job_title2:h.co_job_title2||null,
    updated_at:new Date().toISOString()
  };
}

// Core fields đảm bảo tồn tại trong mọi phiên bản schema loan_files
function mapHSToLFCore(h) {
  var appToDb={'moi':'new','dang':'processing','cho':'pending','choky':'approved','chogn':'approved','xong':'disbursed','tuchoi':'rejected'};
  return {
    status:                h.status ? (appToDb[h.status]||'new') : undefined,
    officer_id:            h.canBoId||null,
    sale_price:            parseInt(h.giaHDMB)||null,
    vtc_required:          parseInt(h.vtcPhaiNop)||null,
    vtc_paid:              parseInt(h.vtcDaNop)||null,
    loan_amount_requested: parseInt(h.soTienVay)||null,
    loan_term_months:      parseInt(h.kyHan)||null,
    loan_amount_approved:  parseInt(h.hanMucDuocDuyet)||null,
    loan_form:             h.hinhThucVay||null,
    loan_policy_ref:       h.csChinhSach||null,
    hdmb_code:             h.soHDMB||null,
    hdmb_date:             h.ngayKyHDMB||null,
    max_disbursement_date: h.hanGiaiNgan||null,
    disbursement_date:     h.ngayGiaiNgan||null,
    disbursement_amount:   parseInt(h.soTienGiaiNgan)||null,
    is_locked:             h.locked||false,
    is_kh_locked:          h.kLocked||false,
    notes:                 h.ghiChu||null,
    updated_at:            new Date().toISOString()
  };
}

// Lưu loan_file + customer lên DB
async function dbSaveLoanFile(h) {
  if (!h || !h.id) return;
  var lfData   = mapHSToLF(h);
  var custData = mapHSToCust(h);
  var errors   = [];

  // Bước 1: Lưu core fields — luôn thành công
  console.log('[DB] Saving loan_file id='+h.id+' hdmb_code='+lfData.hdmb_code);
  var coreData = mapHSToLFCore(h);
  var r1 = await sb.from('loan_files').update(coreData).eq('id', h.id).select('id,hdmb_code');
  if (r1.error) {
    console.error('[DB] CORE ERROR:', r1.error.message, r1.error.code);
    alert('❌ Lỗi lưu DB: ' + r1.error.message + '\nCode: ' + r1.error.code);
    errors.push('loan_files: ' + r1.error.message);
  } else {
    console.log('[DB] CORE UPDATE OK hdmb_code='+((r1.data&&r1.data[0])||{}).hdmb_code);
    // Bước 2: Lưu extended fields — tách từng field riêng để field nào có thì lưu được
    var extFields = [
      { hdmb_value_with_mgt: parseInt(h.hdmb_value_with_mgt)||null,
        area_construction:   parseFloat(h.area_construction)||null,
        area_usable:         parseFloat(h.area_usable)||null },
      { locked_by: h.lockedBy||null },
      { drive_folder_url: h.drive_folder_url||null },
      { pca_code: h.pca_code||null, hdtd_code: h.hdtd_code||null, mortgage_code: h.mortgage_code||null },
      { htls_agreement: h.htls_agreement||null, qlts_agreement: h.qlts_agreement||null },
      { disbursement_1: h.disbursement_1||null, equity_amount: h.equity_amount||null },
      { collateral_value_ratio: h.collateral_value_ratio||null, vtc_5pct: h.vtc_5pct||null },
      { payment_account: h.payment_account||null, min_account_balance: h.min_account_balance||null },
      { valuation_1: h.valuation_1||null, valuation_2: h.valuation_2||null },
      { grace_period_months: h.grace_period_months||null },
      { income_salary: h.income_salary||null, income_business: h.income_business||null,
        income_rental: h.income_rental||null, income_other: h.income_other||null },
      { expense_living: h.expense_living||null, expense_debt: h.expense_debt||null }
    ];
    for (var _ei = 0; _ei < extFields.length; _ei++) {
      var _ef = extFields[_ei];
      var _rEf = await sb.from('loan_files').update(_ef).eq('id', h.id);
      if (_rEf.error) console.warn('[DB] ext['+Object.keys(_ef).join(',')+'] skip:', _rEf.error.message);
      else console.log('[DB] ext['+Object.keys(_ef).join(',')+'] OK');
    }
  }
  if (!r1.error && (!r1.data || r1.data.length === 0)) {
    // Row chưa tồn tại trong DB — thử insert
    // Row chưa tồn tại trong DB — thử insert với core fields (tránh PGRST204)
    console.warn('[DB] 0 rows updated → thử INSERT id='+h.id);
    var coreInsert = mapHSToLFCore(h);
    var insertData = Object.assign({id: h.id}, coreInsert);
    if (h.maCanHo) insertData.apartment_code = h.maCanHo;
    if (h.customerId) insertData.customer_id = h.customerId;
    var r1b = await sb.from('loan_files').insert(insertData).select('id,hdmb_code');
    if (r1b.error) {
      console.error('[DB] loan_files INSERT ERROR:', r1b.error.message, r1b.error.code);
      showNotif('❌ INSERT thất bại: ' + r1b.error.message);
      errors.push('loan_files insert: ' + r1b.error.message);
    } else {
      console.log('[DB] loan_files INSERT OK:', r1b.data);
    }
  } else if (!r1.error) {
    console.log('[DB] loan_files UPDATE OK hdmb_code='+((r1.data&&r1.data[0])||{}).hdmb_code);
  }

  // Update customers (nếu có customer_id)
  if (h.customerId) {
    console.log('[DB] Saving customer', h.customerId, custData);
    var r2 = await sb.from('customers').update(custData).eq('id', h.customerId);
    if (r2.error) { console.error('[DB] customers ERROR:', r2.error); errors.push('customers: ' + r2.error.message); }
    else { console.log('[DB] customers saved OK'); }
  } else {
    // Thử tìm customer_id từ loan_file trong DB
    var lfCheck = await sb.from('loan_files').select('customer_id,apartment_id').eq('id', h.id).single();
    if (!lfCheck.error && lfCheck.data) {
      if (lfCheck.data.customer_id) {
        h.customerId = lfCheck.data.customer_id;
        var r2b = await sb.from('customers').update(custData).eq('id', h.customerId);
        if (r2b.error) console.error('dbSaveLoanFile CUST fallback:', r2b.error);
      }
      if (lfCheck.data.apartment_id) h.apartmentId = lfCheck.data.apartment_id;
    }
  }

  // Lưu area_m2 (diện tích sử dụng) vào apartments — column này chắc chắn có
  if (h.apartmentId && h.dienTich) {
    var rApt = await sb.from('apartments').update({ area_m2: parseFloat(h.dienTich)||null }).eq('id', h.apartmentId);
    if (rApt.error) console.warn('[DB] apartments area_m2 error:', rApt.error.message);
    else console.log('[DB] apartments area_m2 OK');
  }

  // Ghi activity log (bỏ qua lỗi — không ảnh hưởng save chính)
  try {
    await sb.from('activity_log').insert({
      loan_file_id: h.id,
      action: 'update',
      description: 'Cập nhật hồ sơ: ' + (h.tenKH || h.id),
      created_at: new Date().toISOString()
    });
  } catch(e) { /* bỏ qua lỗi activity_log */ }

  if (errors.length) {
    console.warn('dbSaveLoanFile warnings:', errors);
  }
  return errors.length === 0;
}

// Lưu báo cáo tuần lên DB
async function dbSaveWeeklyReport(h, entry) {
  if (!h || !h.id) return;

  // Map app status mới → enum contact_status trong DB
  var statusMap = {
    'chua_lh':         'no_answer',
    'dang_can_nhac':   'contacted',
    'dong_y_cung_cap': 'waiting_docs',  // KH đồng ý - đang cung cấp
    'kh_tu_choi':      'rejected_kh',
    'nh_tu_choi':      'rejected_income',
    'von_tu_co':       'on_hold',   // Chuyển vốn tự có
    'nop_du':          'docs_complete',
    'da_phe_duyet':    'approved_loan',
    'soan_hs':         'appointment',    // Đã soạn HS - dùng appointment
    'cho_gn':          'rejected_cic',   // Chờ GN - dùng rejected_cic (enum dư)
    'da_gn':           'rejected_income',// Đã GN - dùng rejected_income (override label)
    'khac':            'other',     // Khác
    // Legacy
    'da_lh':           'contacted',
    'hen_gap':         'appointment',
    'cho_bs':          'waiting_docs',
    'kh_nghe':         'no_answer',
    'kh_bao_luu':      'on_hold',
    'duoc_vay':        'approved_loan',
    'tu_choi_tn':      'rejected_income',
    'tu_choi_cic':     'rejected_cic',
    'tu_choi_kh':      'rejected_kh',
  };

  // Lấy officer_id của currentUser từ DB
  var officerId = null;
  if (currentUser && currentUser.db_id) {
    officerId = currentUser.db_id;
  } else if (currentUser && currentUser.id) {
    // Thử tìm trong users list
    var dbU = users.find(function(u){ return u.login === currentUser.login; });
    if (dbU) officerId = dbU.id;
  }

  if (!officerId) {
    console.warn('[DB] dbSaveWeeklyReport: no officer_id, skipping DB save');
    return true; // Không lỗi, chỉ skip
  }

  var dbStatus = statusMap[entry.ketQua] || 'other';

  // Lưu app key vào đầu detail để restore khi load
  var detailSaved = '[KQ:' + (entry.ketQua||'') + ']' + (entry.chiTiet ? '\n' + entry.chiTiet : '');

  var data = {
    loan_file_id:   h.id,
    officer_id:     officerId,
    report_date:    new Date().toISOString().slice(0,10),
    week_number:    getWeekNum(),
    year:           new Date().getFullYear(),
    contact_status: dbStatus,
    detail:         detailSaved,
    support_request:entry.deXuat  || null,
    created_at:     new Date().toISOString()
  };

  console.log('[DB] Saving weekly_report:', data, 'dbId:', entry && entry.dbId);
  var r;
  if (entry && entry.dbId) {
    // Ghi đè bản ghi cũ (upsert)
    r = await sb.from('weekly_reports').update(data).eq('id', entry.dbId);
  } else {
    r = await sb.from('weekly_reports').insert(data);
  }
  if (r.error) {
    console.error('[DB] weekly_reports ERROR:', r.error);
    // Nếu lỗi enum → thử với 'other'
    if (r.error.message && r.error.message.includes('contact_status')) {
      data.contact_status = 'other';
      var r2 = await sb.from('weekly_reports').insert(data);
      if (r2.error) { console.error('[DB] weekly_reports retry ERROR:', r2.error); return false; }
      return true;
    }
    return false;
  }
  console.log('[DB] weekly_reports saved OK');
  return true;
}

// Lưu CIC lên DB
async function dbSaveCIC(h, cic) {
  if (!h || !h.id) return;
  // Xoá CIC cũ
  try { await sb.from('cic_results').delete().eq('loan_file_id', h.id); } catch(e) {}

  // worst_group = nhóm nợ cao nhất giữa KH chính và vợ/chồng
  var _khNhom = parseInt(cic.nhomNo)   || 0;
  var _vcNhom = parseInt(cic.vcNhomNo) || 0;
  var _worst  = Math.max(_khNhom, _vcNhom);
  if (_worst < 1) _worst = 1; // Tối thiểu group1 (đủ tiêu chuẩn)
  // queried_at là kiểu date (YYYY-MM-DD), không phải timestamp
  var _queriedAt = cic.ngay   ? toISODate(cic.ngay)
                : cic.vcNgay  ? toISODate(cic.vcNgay)
                : new Date().toISOString().slice(0,10);

  var data = {
    loan_file_id:  h.id,
    worst_group:   'group' + _worst,
    queried_at:    _queriedAt,
    queried_by:    (currentUser && currentUser.id) ? currentUser.id : null,
    // KH chính
    ma_so_cic:     cic.maSoCIC    || null,
    total_debt:    parseInt(cic.tongDuNo) || null,
    du_no_the:     parseInt(cic.duNoThe)  || null,
    // Vợ/chồng
    vc_ma_so_cic:  cic.vcMaSoCIC   || null,
    vc_tong_du_no: parseInt(cic.vcTongDuNo) || null,
    vc_du_no_the:  parseInt(cic.vcDuNoThe)  || null,
    vc_nhom_no:    _vcNhom || null,
    vc_ngay:       cic.vcNgay || null
  };

  console.log('[CIC] inserting data:', JSON.stringify(data));
  var r = await sb.from('cic_results').insert(data);
  if (r.error) {
    console.error('[CIC] insert failed:', r.error.message, r.error.details, r.error.hint, r.error.code);
    showNotif('❌ Lỗi lưu CIC: ' + r.error.message);
    return false;
  }
  console.log('[CIC] saved OK, data:', JSON.stringify(data));
  return true;
}

// Lưu checklist lên DB

var CK_GROUP_DB_MAP = {'gt':'personal_id','tn':'income_proof','tsbd':'collateral','kv':'existing_loan'};
var CK_DOC_GROUP = {};

// Build CK_DOC_GROUP map (phải sau CK_GROUPS)
if (typeof CK_GROUPS !== 'undefined') {
  CK_GROUPS.forEach(function(g){g.items.forEach(function(it){CK_DOC_GROUP[it.id]=CK_GROUP_DB_MAP[g.id]||'personal_id';});});
}
async function dbSaveCK(h, ck) {
  if (!h || !h.id) return;
  var now = new Date().toISOString();
  var codes = Object.keys(ck);
  for (var i=0; i<codes.length; i++) {
    var code=codes[i];
    var r=await sb.from('checklist_items').update({is_collected:ck[code],collected_at:ck[code]?now:null}).eq('loan_file_id',h.id).eq('item_code',code);
    if (r.error) {
      var r2=await sb.from('checklist_items').upsert({loan_file_id:h.id,doc_group:CK_DOC_GROUP[code]||'personal_id',item_code:code,is_collected:ck[code],collected_at:ck[code]?now:null},{onConflict:'loan_file_id,item_code'});
      if(r2.error) console.error('[CK] upsert failed:',code,r2.error.message);
    }
  }
}

// Lưu phân công CB lên DB
async function dbSaveAssignment(h) {
  if (!h || !h.id) return;
  var r = await sb.from('loan_files').update({
    officer_id: h.canBoId || null,
    notes:      h.ghiChu  || null,
    updated_at: new Date().toISOString()
  }).eq('id', h.id);
  if (r.error) console.error('dbSaveAssignment:', r.error);
  return !r.error;
}

// ── Auto-refresh: Supabase Realtime subscription ──────────
var realtimeChannel = null;


async function reloadFromDB() {
  var btn = document.getElementById('btn-reload-data');
  if (btn) { btn.textContent = '⏳ Đang tải...'; btn.disabled = true; }
  try {
    var [dbUsers, dbHS] = await Promise.all([sbLoadUsers(), sbLoadHS()]);
    if (dbUsers && dbUsers.length) users   = dbUsers.map(mapDbUser);
    if (dbHS    && dbHS.length)    hsList  = dbHS.map(mapDbHS);
    persist();
    renderHSTable();
    renderDB();
    if (typeof pRenderDB === 'function') pRenderDB();
    if (typeof pRenderHSTable === 'function') pRenderHSTable();
    if (document.getElementById('page-bidv') && document.getElementById('page-bidv').classList.contains('active')) renderBIDVTable();
    showNotif('✅ Đã tải lại dữ liệu mới nhất từ DB');
    if (currentHSId) openHS(currentHSId); // refresh popup nếu đang mở
  } catch(e) {
    showNotif('❌ Lỗi tải lại: ' + e.message);
  } finally {
    if (btn) { btn.textContent = '🔄 Tải lại'; btn.disabled = false; }
  }
}

function startRealtimeSync() {
  if (realtimeChannel) return; // đã subscribe
  try {
    realtimeChannel = sb
      .channel('loan_files_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'loan_files' },
        function(payload) {
          console.log('Realtime update:', payload.eventType, payload.new?.id);
          // Reload nhẹ — chỉ update record bị thay đổi trong hsList
          var changed = payload.new;
          if (!changed || !changed.id) return;
          var idx = hsList.findIndex(function(x){ return x.id === changed.id; });
          if (idx !== -1) {
            // Merge các trường thay đổi vào hsList
            hsList[idx].status   = changed.status   || hsList[idx].status;
            hsList[idx].locked   = changed.is_locked !== undefined ? changed.is_locked : hsList[idx].locked;
            hsList[idx].kLocked  = changed.is_kh_locked !== undefined ? changed.is_kh_locked : hsList[idx].kLocked;
            hsList[idx].canBoId  = changed.officer_id || hsList[idx].canBoId;
            persist();
            renderHSTable();
            renderDB();
            // Nếu popup đang mở hồ sơ này → refresh popup
            if (currentHSId === changed.id) {
              showNotif('🔄 Dữ liệu hồ sơ vừa được cập nhật bởi người khác.');
            }
          }
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'weekly_reports' },
        function(payload) {
          var wr = payload.new;
          if (!wr || !wr.loan_file_id) return;
          var idx = hsList.findIndex(function(x){ return x.id === wr.loan_file_id; });
          if (idx !== -1) {
            if (!hsList[idx].weeklyReports) hsList[idx].weeklyReports = [];
            // Thêm báo cáo mới vào list (tránh trùng)
            var exists = hsList[idx].weeklyReports.find(function(r){ return r.dbId === wr.id; });
            if (!exists) {
              hsList[idx].weeklyReports.push({
                dbId:    wr.id,
                time:    wr.created_at,
                ketQua:  wr.contact_status,
                chiTiet: wr.detail || '',
                deXuat:  wr.support_request || '',
                who:     wr.officer_id || '',
                type:    wr.type || 'report'
              });
              hsList[idx].lastContactAt = wr.created_at;
              persist(); renderHSTable(); renderDB();
            }
          }
        }
      )
      .subscribe();
    console.log('✅ Realtime sync started');
  } catch(e) {
    console.warn('Realtime không khả dụng:', e.message);
  }
}

function stopRealtimeSync() {
  if (realtimeChannel) {
    sb.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

// Hiển thị thông báo nhẹ (toast)
function showNotif(msg) {
  var el = document.getElementById('toast-notif');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  el.style.opacity = '1';
  clearTimeout(el._timer);
  el._timer = setTimeout(function(){
    el.style.opacity = '0';
    setTimeout(function(){ el.style.display = 'none'; }, 400);
  }, 3000);
}

// ══════════════════════════════════════════════════════════
// AUTO-SYNC ENGINE
// - Sau khi lưu: reload ngay từ DB
// - Idle 60 giây không tương tác: tự reload
// ══════════════════════════════════════════════════════════

var _idleTimer      = null;
var _logoutTimer    = null;
var _isSyncing      = false;
var IDLE_SECONDS    = 300;         // auto-reload dữ liệu sau 5 phút idle (giảm egress)
var LOGOUT_SECONDS  = 10 * 60;    // auto-logout sau 10 phút idle

var _lastSyncAt = 0;
var MIN_SYNC_INTERVAL = 120 * 1000; // tối thiểu 2 phút giữa 2 lần silent sync

// Reload toàn bộ dữ liệu từ DB (không block UI)
async function syncFromDB(silent) {
  if (_isSyncing) return;
  // Throttle silent sync: tối thiểu 2 phút/lần để giảm egress Supabase
  if (silent && (Date.now() - _lastSyncAt) < MIN_SYNC_INTERVAL) return;
  _isSyncing = true;
  _lastSyncAt = Date.now();
  var btn = document.getElementById('btn-reload-data');
  if (btn && !silent) { btn.textContent = '⏳'; btn.disabled = true; }
  try {
    var [dbUsers, dbHS] = await Promise.all([sbLoadUsers(), sbLoadHS()]);
    if (dbUsers && dbUsers.length) users  = dbUsers.map(mapDbUser);
    if (dbHS    && dbHS.length)    hsList = dbHS.map(mapDbHS);
    // Normalize số tiền từ string VN → integer
    hsList = hsList.map(function(h){
      var numFields = ['giaHDMB','soTienVay','vtcPhaiNop','vtcDaNop','hanMucDuocDuyet','soTienGiaiNgan'];
      numFields.forEach(function(f){ if(h[f]) h[f] = parseVND(h[f]) || h[f]; });
      return h;
    });
    persist();
    renderHSTable();
    renderDB();
    if (document.getElementById('page-bidv') && document.getElementById('page-bidv').classList.contains('active')) renderBIDVTable();
    // Nếu popup đang mở → refresh popup
    if (currentHSId) {
      var h = hsList.find(function(x){ return x.id === currentHSId; });
      if (h) {
        buildHSForm(h);
        buildHSFooter(h, h.locked);
      }
    }
    if (!silent) showNotif('✅ Đã tải lại dữ liệu mới nhất');
  } catch(e) {
    console.error('syncFromDB error:', e);
    if (!silent) showNotif('❌ Lỗi tải dữ liệu: ' + e.message);
  } finally {
    _isSyncing = false;
    if (btn) { btn.textContent = '🔄 Tải lại'; btn.disabled = false; }
    resetIdleTimer(); // reset lại timer sau khi sync xong
  }
}

// Reset bộ đếm idle (reload data + auto-logout)
function resetIdleTimer() {
  // Cập nhật lastActive trong session
  if (currentUser) {
    try {
      var raw = localStorage.getItem('pb5_session');
      if (raw) {
        var sess = JSON.parse(raw);
        sess.lastActive = new Date().toISOString();
        localStorage.setItem('pb5_session', JSON.stringify(sess));
      }
    } catch(e) {}
  }

  // Timer 1: reload dữ liệu sau 60 giây không tương tác
  clearTimeout(_idleTimer);
  _idleTimer = setTimeout(function(){
    if (!currentUser) return;
    var modal = document.getElementById('modal-hs');
    var modalOpen = modal && modal.classList.contains('open');
    if (modalOpen) { resetIdleTimer(); return; }
    syncFromDB(true);
  }, IDLE_SECONDS * 1000);

  // Timer 2: auto-logout sau 10 phút không tương tác
  clearTimeout(_logoutTimer);
  _logoutTimer = setTimeout(function(){
    if (!currentUser) return;
    showNotif('⏰ Phiên đăng nhập hết hạn do không hoạt động (10 phút). Đang đăng xuất...');
    setTimeout(function(){
      doLogout();
    }, 2000);
  }, LOGOUT_SECONDS * 1000);
}

// Gắn listener theo dõi tương tác người dùng
function initIdleWatcher() {
  ['mousemove','keydown','click','scroll','touchstart'].forEach(function(evt){
    document.addEventListener(evt, resetIdleTimer, { passive: true });
  });
  resetIdleTimer();
}

// Gọi sau save: lưu DB xong → reload → hiện kết quả
async function saveAndSync(saveFn, successMsg) {
  var ok = false;
  try {
    ok = await saveFn();
  } catch(e) {
    console.error('saveAndSync error:', e);
    ok = false;
  }
  if (ok !== false) {
    // Lưu DB thành công — KHÔNG sync lại ngay (tránh DB ghi đè data vừa lưu)
    // syncFromDB sẽ chạy tự động theo interval hoặc khi reload
    showNotif('✅ ' + (successMsg||'Đã lưu!'));
  } else {
    showNotif('⚠️ Lỗi đồng bộ DB — đã lưu tạm locally, kiểm tra kết nối.');
  }
}

// Alias để backward compatible

function persist(){
  localStorage.setItem('pb5_users', JSON.stringify(users));
  localStorage.setItem('pb5_hs',    JSON.stringify(hsList));
  localStorage.setItem('pb5_log',   JSON.stringify(actLog.slice(0,80)));
  // Lưu session hiện tại
  if (currentUser) {
    localStorage.setItem('pb5_session', JSON.stringify({
      user:      currentUser,
      loginAt:   localStorage.getItem('pb5_login_at') || new Date().toISOString(),
      lastActive: new Date().toISOString()
    }));
  }
}

// Khôi phục session khi reload trang
function restoreSession() {
  try {
    var raw = localStorage.getItem('pb5_session');
    if (!raw) return false;
    var sess = JSON.parse(raw);
    if (!sess || !sess.user || !sess.lastActive) return false;
    // Kiểm tra timeout 10 phút
    var last = new Date(sess.lastActive).getTime();
    var now  = Date.now();
    var TIMEOUT_MS = 10 * 60 * 1000; // 10 phút
    if (now - last > TIMEOUT_MS) {
      localStorage.removeItem('pb5_session');
      console.log('Session expired (10 min idle)');
      return false;
    }
    // Khôi phục
    currentUser = sess.user;
    return true;
  } catch(e) {
    return false;
  }
}
function genId(){ return 'HS' + Date.now().toString().slice(-7); }

function fmtDate(iso) {
  if(!iso) return '—';
  try {
    var d = new Date(iso);
    if(isNaN(d)) return iso;
    var dd  = String(d.getDate()).padStart(2,'0');
    var mm  = String(d.getMonth()+1).padStart(2,'0');
    var hh  = String(d.getHours()).padStart(2,'0');
    var min = String(d.getMinutes()).padStart(2,'0');
    return dd+'/'+mm+' '+hh+':'+min;
  } catch(e){ return iso; }
}

function nowStr(){
  var d = new Date();
  return d.getDate().toString().padStart(2,'0') + '/' +
    (d.getMonth()+1).toString().padStart(2,'0') + ' ' +
    d.getHours().toString().padStart(2,'0') + ':' +
    d.getMinutes().toString().padStart(2,'0');
}
function todayStr(){
  var d = new Date();
  return d.getDate().toString().padStart(2,'0') + '/' +
    (d.getMonth()+1).toString().padStart(2,'0') + '/' + d.getFullYear();
}
function getUserName(id){ var u=users.find(function(x){return x.id===id;}); return u?u.name:'—'; }
function isAdmin(){ return currentUser && currentUser.role==='admin'; }
function isViewer(){ return currentUser && (currentUser.role==='viewer' || currentUser.role==='qttd'); }
function isQTTD(){ return currentUser && currentUser.role==='qttd'; }
function isQL(){ return currentUser && (currentUser.role==='admin' || currentUser.role==='ql'); }
function isCDT(){ return currentUser && (currentUser.role==='cdt'||currentUser.role==='cdt_view'||currentUser.role==='cdt_admin'); }
function canSetGiaiNgan(){ return isQL() || (currentUser && currentUser.canSetGiaiNgan===true); }
function myHS(){ return (isQL()||isCDT()||isViewer()) ? hsList : hsList.filter(function(h){return h.canBoId===currentUser.id;}); }
function addLog(msg, type, hsId){
  actLog.unshift({msg:msg, type:type||'default', time:nowStr(), who:currentUser?currentUser.name:'?', hsId:hsId||null});
  persist();
}

// ==================================================
// STATUS
// ==================================================
var SC = {
  moi:   {l:'Moi nhan',       c:'b-moi'},
  dang:  {l:'Dang xu ly',     c:'b-dang'},
  cho:   {l:'Cho phe duyet',  c:'b-cho'},
  choky: {l:'Cho ky',         c:'b-choky'},
  chogn: {l:'Cho giai ngan',  c:'b-chogn'},
  xong:  {l:'Hoan thanh',     c:'b-xong'},
  tuchoi:{l:'Tu choi',        c:'b-tuchoi'}
};
var SC_VN = {
  moi:   'Mới nhận',   dang:  'Đang xử lý',
  cho:   'Chờ phê duyệt', choky: 'Chờ ký',
  chogn: 'Chờ giải ngân', xong:  'Hoàn thành',
  tuchoi:'Từ chối'
};
function sBadge(s){
  var c = SC[s] || SC.moi;
  return '<span class="badge ' + c.c + '">' + (SC_VN[s]||s) + '</span>';
}
var ROLE_LBL = {admin:'Admin', ql:'CB Quản lý', viewer:'Lãnh đạo / Kiểm tra', cb:'Cán bộ BIDV', cdt:'CĐT (BIM)', qttd:'QTTD'};
var ROLE_CLS = {admin:'rb-admin', viewer:'rb-ql', ql:'rb-ql', cb:'rb-cb', cdt:'rb-cdt', qttd:'rb-ql'};
function rBadge(r){ return '<span class="rb ' + (ROLE_CLS[r]||'rb-cb') + '">' + (ROLE_LBL[r]||r) + '</span>'; }

// ==================================================
// CHECKLIST CONFIG
// ==================================================
var CK_GROUPS = [
  {id:'gt', label:'Giấy tờ cá nhân', items:[
    {id:'cccd',  label:'Căn cước / CCCD / Hộ chiếu (còn hiệu lực)'},
    {id:'vneid', label:'VneID định danh mức 2'},
    {id:'hndc',  label:'Đăng ký kết hôn / Xác nhận độc thân'}
  ]},
  {id:'tn', label:'Chứng minh thu nhập', items:[
    {id:'hdld',  label:'HĐLĐ / QĐ bổ nhiệm hoặc tăng lương'},
    {id:'saoke', label:'Sao kê tài khoản NH / xác nhận TN (6 tháng gần nhất)'},
    {id:'tsts',  label:'Hồ sơ tài sản sở hữu - chứng minh năng lực TC (nếu có)'}
  ]},
  {id:'tsbd', label:'Hồ sơ tài sản bảo đảm', items:[
    {id:'hdmb',  label:'Hợp đồng mua bán căn hộ (ký với CĐT)'},
    {id:'bienl', label:'Biên lai đặt cọc / thanh toán (nếu có)'}
  ]},
  {id:'kv', label:'Khoản vay hiện tại', items:[
    {id:'hdtd',   label:'Hợp đồng tín dụng hiện tại (nếu có)'},
    {id:'saokeno',label:'Sao kê dư nợ tại ngân hàng khác (nếu có)'}
  ]}
];

var CT_STATUS_LABELS_FULL = {
  chua_lh:         'Chưa liên hệ được với KH',
  dang_can_nhac:   'KH đang cân nhắc phương án vay',
  dong_y_cung_cap: 'KH đồng ý vay. Đang cung cấp hồ sơ',
  kh_tu_choi:      'KH từ chối vay',
  nh_tu_choi:      'NH từ chối cho vay',
  von_tu_co:       'Chuyển sang TT bằng vốn tự có/ Thanh lý HĐMB',
  nop_du:          'KH đồng ý vay. Đã nộp đủ hồ sơ, chờ thẩm định',
  da_phe_duyet:    'Đã phê duyệt cho vay',
  soan_hs:         'Đã soạn hồ sơ và check file mềm',
  cho_gn:          'Đã kí hồ sơ chờ GN',
  da_gn:           'Đã Giải ngân',
  da_thong_bao:    'Đã ra thông báo cấp tín dụng'
};
function ckProgress(h){
  var total=0, done=0;
  CK_GROUPS.forEach(function(g){ g.items.forEach(function(it){ total++; if(h.ck && h.ck[it.id]) done++; }); });
  return {total:total, done:done, pct:total?Math.round(done/total*100):0};
}
function ckGroupDone(h, gid){
  var g = CK_GROUPS.find(function(x){return x.id===gid;});
  if(!g) return false;
  return g.items.every(function(it){ return h.ck && h.ck[it.id]; });
}

// ==================================================
// AUTH
// ==================================================
async function doLogin(){
  var u = document.getElementById('lu').value.trim().toLowerCase();
  var p = document.getElementById('lp').value;
  if(!u || !p){ showLoginErr('Vui lòng nhập đầy đủ thông tin.'); return; }

  // Ghép email
  var email = u;
  if(u.indexOf('@') === -1){
    if(u==='bim1') email='bim1@bimgroup.vn';
    else if(u==='bim2') email='bim2@bimgroup.vn';
    else if(u==='vietanh'||u==='admin') email='vietanh@bidv.com.vn';
    else email=u+'@bidv.com.vn';
  }
  console.log('[LOGIN] input:', u, '→ email query:', email);

  var btn=document.getElementById('login-btn');
  if(btn){ btn.textContent='Đang đăng nhập...'; btn.disabled=true; }

  try {
    // Tìm user trong DB
    // Thử 1: query theo email (đã ghép @bidv.com.vn nếu cần)
    var dbUser = null;
    var { data: d1, error: e1 } = await sb.from('users').select('*').eq('email', email).eq('is_active', true).maybeSingle();
    console.log('[LOGIN] query email result:', d1, 'error:', e1);
    if(d1) dbUser = d1;

    // Thử 2: nhập mã CB thuần số → tìm theo ma_cb
    if(!dbUser && /^\d+$/.test(u)){
      var { data: d2 } = await sb.from('users').select('*').eq('ma_cb', u).eq('is_active', true).maybeSingle();
      if(d2) dbUser = d2;
    }

    if(!dbUser){
      showLoginErr('Tên đăng nhập không tồn tại hoặc đã bị khoá.');
      if(btn){ btn.textContent='Đăng nhập'; btn.disabled=false; }
      return;
    }

    // Kiểm tra mật khẩu
    var ok = false;
    if(dbUser.ma_cb && p===dbUser.ma_cb) ok=true;           // mật khẩu = mã CB
    if(p==='admin2025' && dbUser.role==='admin') ok=true;   // mật khẩu admin
    if(p==='bim2025' && (dbUser.role==='cdt_view'||dbUser.role==='cdt_admin')) ok=true;
    if(dbUser.password && p===dbUser.password) ok=true;     // plain password field

    if(!ok){
      showLoginErr('Mật khẩu không đúng.');
      if(btn){ btn.textContent='Đăng nhập'; btn.disabled=false; }
      return;
    }

    // Set currentUser
    currentUser = {
      id: dbUser.id, db_id: dbUser.id,
      name: dbUser.full_name,
      login: u, email: dbUser.email,
      role: dbUser.role==='officer' ? 'cb' :
            dbUser.role==='manager' ? 'ql' :
            dbUser.role==='admin'   ? 'admin' :
            dbUser.role==='qttd'    ? 'qttd'  :
            (dbUser.role==='cdt_view'||dbUser.role==='cdt_admin') ? 'cdt' : dbUser.role,
      db_role: dbUser.role,
      pgd: dbUser.pgd||'', phone: dbUser.phone||'',
      maCB: dbUser.ma_cb||'',
      active: dbUser.is_active,
      canSetGiaiNgan: dbUser.can_set_disbursement
    };

    // Load dữ liệu
    var [dbUsers, dbHS] = await Promise.all([sbLoadUsers(), sbLoadHS()]);
    if(dbUsers && dbUsers.length) users  = dbUsers.map(mapDbUser);
    if(dbHS    && dbHS.length)    hsList = dbHS.map(mapDbHS);
    persist();

    localStorage.removeItem('pb5_log');  // Xoá log cũ
    localStorage.setItem('pb5_login_at', new Date().toISOString());
    localStorage.removeItem('pb5_hs');   // Xoá HS cache cũ, load lại từ DB
    localStorage.removeItem('pb5_users');// Xoá users cache cũ
    document.getElementById('login-wrap').style.display='none';
    document.getElementById('app-wrap').classList.add('show');
    applyPerms();
    // CĐT: vào module loan; các role khác: vào Prima Bay dashboard
    if (isCDT()) {
      if (typeof switchModule === 'function') switchModule('loan');
      showPage('cdt-view');
    } else {
      if (typeof showProjPage === 'function') showProjPage('db');
    }
    initIdleWatcher();

  } catch(err) {
    showLoginErr('Lỗi kết nối: '+err.message);
    if(btn){ btn.textContent='Đăng nhập'; btn.disabled=false; }
  }
}


function showLoginErr(msg){
  var el = document.getElementById('lerr');
  if(el){ el.textContent = msg; el.style.display = 'block'; }
}


function mapDbUser(u) {
  return {
    id:    u.id,
    db_id: u.id,
    name:  u.full_name,
    login: u.email ? u.email.split('@')[0] : u.id,
    email: u.email,
    role:  u.role === 'officer' ? 'cb' :
           u.role === 'manager' ? 'ql' :
           u.role === 'admin'   ? 'admin' :
           u.role === 'viewer'  ? 'viewer' :
           (u.role === 'cdt_view' || u.role === 'cdt_admin') ? 'cdt' : u.role,
    db_role: u.role,
    pgd:   u.pgd || '',
    phone: u.phone || '',
    active: u.is_active,
    canSetGiaiNgan: u.can_set_disbursement
  };
}

// Map hồ sơ từ DB sang format app
function mapDbHS(lf) {
  var cust = lf.customers || {};
  var apt  = lf.apartments || {};
  var off  = lf['users'] || {};
  return {
    id:            lf.id,
    customerId:    lf.customer_id || null,
    apartmentId:   lf.apartment_id || null,
    maBIM:         lf.bim_ref || '',
    sttBIM:        lf.bim_seq || 0,
    status: (function(){
      var dbToApp = {
        'new':'moi', 'processing':'dang', 'pending':'cho',
        'approved':'choky', 'signed':'choky', 'disbursed':'xong',
        'rejected':'tuchoi', 'cancelled':'tuchoi',
        'moi':'moi', 'dang':'dang', 'cho':'cho',
        'choky':'choky', 'xong':'xong', 'tuchoi':'tuchoi'
      };
      return dbToApp[lf.status] || 'moi';
    })(), // NOTE: deriveHSStatus() sẽ override khi render bảng
    salutation:         cust.salutation        || '',
    tenKH:              cust.full_name        || '',
    cccd:               cust.id_number        || '',
    id_issue_place:     cust.id_issue_place   || '',
    id_issue_date:      toISODate(cust.id_issue_date) || '',
    sdt:                cust.phone            || '',
    email:              cust.email            || '',
    cif:                cust.cif              || '',
    permanent_address:  cust.permanent_address|| '',
    diaChi:             cust.address          || '',
    vung:               cust.region           || '',
    daiLy:              cust.agent            || '',
    coVoChong:          cust.has_co_borrower  || false,
    co_salutation:      cust.co_salutation    || '',
    tenVC:              cust.co_name          || '',
    cccdVC:             cust.co_id_number     || '',
    co_id_issue_place:  cust.co_id_issue_place|| '',
    co_id_issue_date:   toISODate(cust.co_id_issue_date) || '',
    sdtVC:              cust.co_phone         || '',
    emailVC:            cust.email_co_borrower|| '',
    cifVC:              cust.cif_co_borrower  || '',
    diaChiVC:           cust.co_address       || '',
    co_permanent_address: cust.co_permanent_address || '',
    workplace:            cust.workplace            || '',
    workplace_address:    cust.workplace_address    || '',
    workplace_phone:      cust.workplace_phone      || '',
    job_title:            cust.job_title            || '',
    workplace2:           cust.workplace2           || '',
    workplace2_address:   cust.workplace2_address   || '',
    workplace2_phone:     cust.workplace2_phone     || '',
    job_title2:           cust.job_title2           || '',
    co_workplace:         cust.co_workplace         || '',
    co_workplace_address: cust.co_workplace_address || '',
    co_workplace_phone:   cust.co_workplace_phone   || '',
    co_job_title:         cust.co_job_title         || '',
    co_workplace2:        cust.co_workplace2        || '',
    co_workplace2_address:cust.co_workplace2_address|| '',
    co_workplace2_phone:  cust.co_workplace2_phone  || '',
    co_job_title2:        cust.co_job_title2        || '',
    ngaySinh:      toISODate(cust.dob)               || '',
    ngheNghiep:    cust.occupation        || '',
    thuNhap:       cust.monthly_income    || '',
    ngaySinhVC:    toISODate(cust.co_dob)            || '',
    ngheNghiepVC:  cust.co_occupation     || '',
    thuNhapVC:     cust.co_monthly_income || '',
    maCanHo:       apt.code       || '',
    tang:          apt.floor      || '',
    dienTich:      apt.area_m2    || '',
    giaHDMB:       parseVND(lf.sale_price) || 0,
    soHDMB:        lf.hdmb_code   || '',
    ngayKyHDMB:    toISODate(lf.hdmb_date)   || '',
    hanGiaiNgan:   toISODate(lf.max_disbursement_date) || '',
    vtcPhaiNop:    parseVND(lf.vtc_required) || parseVND(apt.vtc_required) || 0,
    vtcDaNop:      parseVND(lf.vtc_paid) || 0,
    soTienVay:     parseVND(lf.loan_amount_requested) || 0,
    kyHan:         lf.loan_term_months || '',
    hinhThucVay:   lf.loan_form   || '30 tháng HTLS',
    csChinhSach:   lf.loan_policy_ref || '',
    hanMucDuocDuyet: parseVND(lf.loan_amount_approved) || 0,
    ngayGiaiNgan:  toISODate(lf.disbursement_date) || '',
    soTienGiaiNgan:parseVND(lf.disbursement_amount) || 0,
    canBoId:       lf.officer_id  || '',
    cbBIMName:     off.full_name  || '',
    locked:        lf.is_locked   || false,
    kLocked:       lf.is_kh_locked || false,
    outcome:       lf.outcome     || '',
    outcomeNote:   lf.outcome_note || '',
    lastContactAt: (function(){
      // Ưu tiên: cột last_contact_date trong loan_files (được cập nhật mỗi lần save weekly report)
      if(lf.last_contact_date) return lf.last_contact_date;
      var wrs = lf.weekly_reports || [];
      if(wrs.length) {
        var sorted = wrs.slice().sort(function(a,b){
          return new Date(b.created_at||b.report_date) - new Date(a.created_at||a.report_date);
        });
        return sorted[0].created_at || sorted[0].report_date || '';
      }
      // Không có báo cáo nào → null (badge sẽ hiện "Chưa cập nhật", không tính từ ngày tạo HS)
      return null;
    })(),
    weeklyReports: (lf.weekly_reports || []).map(function(wr){
      var _d = wr.detail || '';
      var _kqIdx = _d.indexOf('[KQ:');
      var _kqEnd = _d.indexOf(']', _kqIdx);
      var _appKey, _chiTiet;
      if (_kqIdx===0 && _kqEnd>0) {
        // Có [KQ:xxx] prefix → dùng app key
        _appKey  = _d.slice(4, _kqEnd);
        var _rest = _d.slice(_kqEnd+1);
        _chiTiet = (_rest.charAt(0)===String.fromCharCode(10)) ? _rest.slice(1).trim() : _rest.trim();
      } else {
        // Không có [KQ:] prefix → dữ liệu cũ
        // Giữ contact_status nhưng đặt chiTiet = detail (nội dung thực)
        // Nếu contact_status không map được → dùng 'khac'
        var _cs = wr.contact_status || '';
        var _validKeys = ['chua_lh','dang_can_nhac','dong_y_cung_cap','kh_tu_choi',
          'nh_tu_choi','von_tu_co','nop_du','da_phe_duyet','soan_hs','cho_gn','da_gn','khac',
          'no_answer','contacted','waiting_docs','rejected_kh','rejected_income',
          'docs_complete','approved_loan','other','on_hold','appointment'];
        _appKey  = _cs; // giữ để getStatusLabel tra DB_STATUS_LABELS
        _chiTiet = _d;  // detail thực tế là nội dung CB nhập
      }
      return {
        time:    wr.created_at || wr.report_date || '',
        ketQua:  _appKey || '',
        chiTiet: _chiTiet,
        deXuat:  wr.support_request || '',
        who:     wr.officer_id || '',
        weekNum: wr.week_number || 0
      };
    }),
    ck: (function(){
      var ckObj={};
      (lf.checklist_items||[]).forEach(function(ci){
        if(ci.is_collected) ckObj[ci.item_code]=true;
      });
      return ckObj;
    })(),
    // Hợp đồng & Giải ngân (tab HĐ & GN)
    pca_code:              lf.pca_code              || '',
    hdtd_code:             lf.hdtd_code             || '',
    mortgage_code:         lf.mortgage_code         || '',
    htls_agreement:        lf.htls_agreement        || '',
    qlts_agreement:        lf.qlts_agreement        || '',
    disbursement_1:        lf.disbursement_1        || null,
    equity_amount:         lf.equity_amount         || null,
    collateral_value_ratio:lf.collateral_value_ratio|| null,
    vtc_5pct:              lf.vtc_5pct              || null,
    payment_account:       lf.payment_account       || '',
    min_account_balance:   lf.min_account_balance   || null,
    valuation_1:           lf.valuation_1           || null,
    valuation_2:           lf.valuation_2           || null,
    area_usable:           apt.area_usable          || lf.area_usable      || null,
    area_construction:     apt.area_construction    || lf.area_construction|| null,
    hdmb_value_with_mgt:   lf.hdmb_value_with_mgt  || null,
    grace_period_months:   lf.grace_period_months   || null,
    income_salary:         lf.income_salary         || null,
    income_business:       lf.income_business       || null,
    income_rental:         lf.income_rental         || null,
    income_other:          lf.income_other          || null,
    expense_living:        lf.expense_living        || null,
    expense_debt:          lf.expense_debt          || null,
    files: {},
    contacts: [],
    createdAt: lf.created_at || '',
    updatedAt: lf.updated_at || '',
    cic: (function(){
      var cr = lf.cic_results && lf.cic_results[0];
      if (!cr) return {};
      return {
        maSoCIC:    cr.ma_so_cic   || '',
        tongDuNo:   cr.total_debt  || '',
        duNoThe:    cr.du_no_the   || '',
        nhomNo:     cr.worst_group ? parseInt((cr.worst_group||'').replace('group',''))||0 : 0,
        ngay:       (cr.queried_at||'').slice(0,10),
        tctds:      [],
        vcMaSoCIC:  cr.vc_ma_so_cic  || '',
        vcTongDuNo: cr.vc_tong_du_no || '',
        vcDuNoThe:  cr.vc_du_no_the  || '',
        vcNhomNo:   cr.vc_nhom_no    || 0,
        vcNgay:     cr.vc_ngay       || ''
      };
    })()
  };
}
function doLogout(){
  currentUser = null;
  document.getElementById('login-wrap').style.display = 'flex';
  document.getElementById('app-wrap').classList.remove('show');
  document.getElementById('lu').value = '';
  document.getElementById('lp').value = '';
  document.getElementById('lerr').style.display = 'none';
}
function applyPerms(){
  var r = currentUser.role;
  var ini = currentUser.name.split(' ').slice(-2).map(function(w){return w[0];}).join('').toUpperCase();
  var avCol = {admin:'', ql:'teal', cb:'', cdt:'amber'};
  function setEl(id,prop,val){var e=document.getElementById(id);if(e)e[prop]=val;}
  setEl('sb-av','textContent', ini);
  setEl('sb-un','textContent', currentUser.name);
  setEl('sb-ur','textContent', ROLE_LBL[r]||r);
  setEl('psb-av','textContent', ini);
  setEl('psb-un','textContent', currentUser.name);
  setEl('psb-ur','textContent', ROLE_LBL[r]||r);
  function tog(id, show){ var el=document.getElementById(id); if(el) el.classList.toggle('hide',!show); }
  // Loan sidebar items
  tog('ni-db',        !isCDT());
  tog('ni-hs',        true);
  tog('ni-imp',       isQL());
  tog('ni-cdt-up',    isCDT());
  tog('ni-cdt-view',  isCDT());
  tog('ns-sys',       isAdmin());
  tog('ni-usr',       isAdmin());
  // Project sidebar items
  tog('p-btn-new-hs', isQL() && !isCDT() && !isViewer());
  tog('p-s-cb',       isQL() || isViewer());
  tog('p-panel-cbload', isQL() || isViewer());
  tog('pns-sys',      isAdmin() || isQL());
  tog('pni-imp',      isQL());
  tog('pni-usr',      isAdmin());
  tog('pns-cdt',      isCDT());
  tog('pni-cdt-up',   isCDT());
  tog('pni-cdt-view', isCDT());
  // Module tabs: CĐT chỉ thấy tab loan
  tog('mtab-project', !isCDT());
  if(isCDT() && typeof switchModule==='function') switchModule('loan');
  // Topbar buttons
  tog('btn-settings',   isAdmin());
  tog('btn-new-hs',   isQL() && !isCDT() && !isViewer());
  tog('btn-new-hs-top', isQL() && !isCDT() && !isViewer());
  tog('s-cb',         isQL() || isViewer());
  tog('panel-cbload', isQL() || isViewer());
}

// ── Đổi mật khẩu ──────────────────────────────────
function openPwModal(){
  var el=document.getElementById('modal-pw');
  if(!el) return;
  document.getElementById('pw-err').style.display='none';
  ['pw-old','pw-new','pw-c'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
  el.classList.add('open');
}
function closePwModal(){
  var el=document.getElementById('modal-pw');
  if(el) el.classList.remove('open');
}
async function savePw(){
  var oldPw = (document.getElementById('pw-old')||{}).value||'';
  var newPw = (document.getElementById('pw-new')||{}).value||'';
  var confPw= (document.getElementById('pw-c')||{}).value||'';
  var errEl = document.getElementById('pw-err');
  function showErr(msg){ errEl.textContent=msg; errEl.style.display='block'; }
  if(!oldPw||!newPw||!confPw){ showErr('Vui lòng điền đầy đủ thông tin.'); return; }
  if(newPw!==confPw){ showErr('Mật khẩu xác nhận không khớp.'); return; }
  if(newPw.length<6){ showErr('Mật khẩu mới phải có ít nhất 6 ký tự.'); return; }
  var u = users.find(function(x){return x.id===currentUser.id;});
  if(!u || u.password!==oldPw){ showErr('Mật khẩu hiện tại không đúng.'); return; }
  try {
    await sb.from('users').update({password:newPw}).eq('id',currentUser.id);
    u.password = newPw;
    closePwModal();
    alert('Đổi mật khẩu thành công!');
  } catch(e) { showErr('Lỗi: '+e.message); }
}

