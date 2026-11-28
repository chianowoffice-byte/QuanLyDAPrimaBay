var _TPL_B64 = {};var _tplCache = {};var _libsLoaded = false;var GITHUB_BASE = 'https://raw.githubusercontent.com/chianowoffice-byte/QuanLyDAPrimaBay/main/templates/';var BM_FILES = {
  BM1: {file:'BM1_BCDX_preprocessed.docx',         name:'BM1_BaoCaoDeXuatTinDung'},
  BM2: {file:'BM2_GiayDNVV_preprocessed.docx',      name:'BM2_GiayDeNghiVayVon'},
  BM3: {file:'BM3_BBBG_QTTD_preprocessed.docx',     name:'BM3_BienBanBanGiao_QTTD'},
  BM4: {file:'BM4_TTQLTS_preprocessed.docx',         name:'BM4_ThoaThuanQLTS'},
  BM5: {file:'BM5_TTHTLS_preprocessed.docx',         name:'BM5_ThoaThuanHTLS'},
  BM6: {file:'BM6_HDTD_preprocessed.docx',           name:'BM6_HopDongTinDung'},
  BM7: {file:'BM7_BKRV_preprocessed.docx',           name:'BM7_BienLaiKyRutVon'},
  BM8: {file:'BM8_HDTCQTS_preprocessed.docx',        name:'BM8_HopDongTheChap_QTSDB'},
  BM9: {file:'BM9_BBGN_vs_KH_preprocessed.docx',     name:'BM9_BB_GiaoNhan_GiayTo'},
  BM10:{file:'BM10_BBDG_L1_preprocessed.docx',       name:'BM10_BB_DinhGia_L1'},
  BM11:{file:'BM11_BBDG_L2_preprocessed.docx',       name:'BM11_BB_DinhGia_L2'},
  BM12:{file:'BM12_BBKTSDVV_preprocessed.docx',      name:'BM12_BB_KiemTra_SDVV'},
  BM13:{file:'BM13_DKGDDB_preprocessed.docx',        name:'BM13_GiayDangKy_GDDB'},
  BM14:{file:'BM14_ThuCamKet_preprocessed.docx',     name:'BM14_ThuCamKetChoVay'}
};var _bidvSelected = new Set();


function isQTTD() { return currentUser && (currentUser.role==='qttd'||currentUser.role==='admin'); }

async function saveHDGN() {
  var h = hsList.find(function(x){return x.id===currentHSId;});
  if (!h) { showNotif('Không tìm thấy hồ sơ!'); return; }
  var pn = function(id){
    var el=document.getElementById(id); if(!el)return null;
    var v=(el.value||'').replace(/[.,\s]/g,''); return parseInt(v)||null;
  };
  var gv3=function(id){ var el=document.getElementById(id); return el?(el.value.trim()||null):null; };
  h.pca_code=gv3('f-pca'); h.hdtd_code=gv3('f-hdtd'); h.mortgage_code=gv3('f-mortgage');
  var htlsEl=document.getElementById('f-htls'), qltsEl=document.getElementById('f-qlts');
  h.htls_agreement = gv3('f-htls') || (htlsEl ? htlsEl.placeholder : null) || null;
  h.qlts_agreement = gv3('f-qlts') || (qltsEl ? qltsEl.placeholder : null) || null;
  h.area_construction=pn('f-areaconstruct');
  h.hdmb_value_with_mgt=pn('f-hdmbwithmgt');
  h.kyHan=pn('f-loanmonths')||pn('f-kh')||h.kyHan; h.grace_period_months=pn('f-graceperiod');
  h.disbursement_1=pn('f-disb1'); h.equity_amount=pn('f-equity');
  h.collateral_value_ratio=pn('f-collratio'); h.vtc_5pct=pn('f-vtc5pct');
  h.payment_account=gv3('f-payacct'); h.min_account_balance=pn('f-minbal');
  h.valuation_1=pn('f-val1'); h.valuation_2=pn('f-val2');
  h.income_salary=pn('f-inc-salary'); h.income_business=pn('f-inc-biz');
  h.income_rental=pn('f-inc-rent'); h.income_other=pn('f-inc-other');
  h.expense_living=pn('f-exp-living'); h.expense_debt=pn('f-exp-debt');
  var lfu = {
    pca_code:h.pca_code, hdtd_code:h.hdtd_code, mortgage_code:h.mortgage_code,
    htls_agreement:h.htls_agreement, qlts_agreement:h.qlts_agreement,
    payment_account:h.payment_account, min_account_balance:h.min_account_balance,
    disbursement_1:h.disbursement_1, equity_amount:h.equity_amount,
    collateral_value_ratio:h.collateral_value_ratio, vtc_5pct:h.vtc_5pct,
    valuation_1:h.valuation_1, valuation_2:h.valuation_2,
    loan_term_months:parseInt(h.kyHan)||null, grace_period_months:h.grace_period_months,
    hdmb_value_with_mgt:h.hdmb_value_with_mgt,
    income_salary:h.income_salary, income_business:h.income_business,
    income_rental:h.income_rental, income_other:h.income_other,
    expense_living:h.expense_living, expense_debt:h.expense_debt,
    updated_at:new Date().toISOString()
  };
  h.updatedAt = nowStr();
  persist(); renderHSTable();
  var r=await sb.from('loan_files').update(lfu).eq('id',h.id);
  if(r.error && (r.error.code==='PGRST204' || (r.error.message&&r.error.message.indexOf('column')>=0))) {
    // Có column không tồn tại — fallback chỉ lưu loan_term_months (chắc chắn có)
    console.warn('[saveHDGN] Schema error, fallback:', r.error.message);
    var lfuCore = { loan_term_months: parseInt(h.kyHan)||null, updated_at: new Date().toISOString() };
    r = await sb.from('loan_files').update(lfuCore).eq('id',h.id);
  }
  if(r.error){
    console.error('saveHDGN error:', r.error);
    showNotif('❌ Lỗi lưu HĐ&GN: '+r.error.message); return;
  }
  if(h.area_usable||h.area_construction){
    var aptU={};
    if(h.area_usable) aptU.area_usable=h.area_usable;
    if(h.area_construction) aptU.area_construction=h.area_construction;
    var aptRow=hsList.find(function(x){return x.id===h.id;});
    if(aptRow&&aptRow.apartmentId) await sb.from('apartments').update(aptU).eq('id',aptRow.apartmentId);
  }
  showNotif('✅ Đã lưu Hợp đồng & Giải ngân!');
}

// Xuất hồ sơ từ màn hình chi tiết (1 hồ sơ duy nhất)
function exportSingleHS(hsId) {
  var h = hsList.find(function(x){return x.id===hsId;});
  if (!h) { showNotif('Không tìm thấy hồ sơ!'); return; }
  // Kiểm tra quyền: CB chỉ xuất hồ sơ của mình; QL/QTTD/Admin xuất tất cả
  if (!isQL() && !isQTTD() && !isAdmin()) {
    if (h.canBoId !== currentUser.id) { showNotif('⛔ Bạn không có quyền xuất hồ sơ này!'); return; }
  }
  _bidvSelected.clear();
  _bidvSelected.add(hsId);
  openExportModal();
}

// (Các hàm cũ — giữ để không lỗi nếu có link cũ)
function exportBMQLKH(){ exportSingleHS(currentHSId); }
function exportBMQTTD(){ exportSingleHS(currentHSId); }

function numToWords(n) {
  if (!n) return '';
  n = parseInt(String(n).replace(/[^0-9]/g,''));
  if (isNaN(n) || n === 0) return 'Không đồng';
  var units  = ['','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
  var teens  = ['mười','mười một','mười hai','mười ba','mười bốn','mười lăm','mười sáu','mười bảy','mười tám','mười chín'];
  var tens   = ['','','hai mươi','ba mươi','bốn mươi','năm mươi','sáu mươi','bảy mươi','tám mươi','chín mươi'];
  var groups = ['','nghìn','triệu','tỷ'];

  function readGroup(num) {
    if (num === 0) return '';
    var h = Math.floor(num/100);
    var t = Math.floor((num%100)/10);
    var u = num%10;
    var result = '';
    if (h > 0) result += units[h] + ' trăm ';
    if (t === 1) result += teens[u] + ' ';
    else if (t > 1) { result += tens[t] + ' '; if(u>0) result += (u===5?'lăm':units[u]) + ' '; }
    else if (u > 0 && h > 0) result += 'linh ' + units[u] + ' ';
    else if (u > 0) result += units[u] + ' ';
    return result;
  }

  var parts = [];
  var i = 0;
  while (n > 0) {
    var g = n % 1000;
    if (g > 0) parts.unshift(readGroup(g).trim() + (groups[i] ? ' ' + groups[i] : ''));
    n = Math.floor(n/1000);
    i++;
  }
  // Nối bằng dấu phẩy + khoảng trắng giữa các nhóm
  var result = parts.join(', ').trim();
  // In hoa chữ đầu
  result = result.charAt(0).toUpperCase() + result.slice(1);
  return result + ' đồng';
}




async function fillTemplate(key, data) {
  console.log('[Fill] START:', key);
  var ab = await loadTemplate(key);
  var zip2 = new PizZip(ab);

  var hasCo = !!(data['22 - Họ và tên người 2'] && data['22 - Họ và tên người 2'].trim());

  function normKey(k){
    return k
      .replace(/^[\s'"]+|[\s'"]+$/g,'').trim();
  }
  var dataMap = {};
  Object.keys(data).forEach(function(k){ dataMap[normKey(k)] = data[k]; });
  function findVal(raw) {
    var k = normKey(raw);
    if (k.indexOf('64')===0||k.indexOf('65')===0) console.log('[findVal]',JSON.stringify(k),'hasOwn='+dataMap.hasOwnProperty(k),'val='+dataMap[k]);
    if (dataMap.hasOwnProperty(k)) return dataMap[k];
    var numM = k.match(/^(\d+)/);
    if (numM) {
      var num = numM[1]; var found = null;
      Object.keys(dataMap).forEach(function(dk){
        if (!found && dk.match(new RegExp('^'+num+'[\\s\\-]'))) found = dataMap[dk];
      });
      return found;
    }
    return null;
  }

  var CO_S  = 'CO_BORROWER_START';
  var CO_E  = 'CO_BORROWER_END';
  var CO_IS = 'CO_BORROWER_INLINE_START';
  var CO_IE = 'CO_BORROWER_INLINE_END';
  var PH_RE = /(?:&lt;&lt;|<<)[\s‘’“”’”]*(.+?)[\s‘’“”’”]*(?:&gt;&gt;|>>)/g;

  // ── Escape value để an toàn trong XML ──
  function escXml(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&apos;');
  }

  // ── Xử lý XML bằng regex trực tiếp — không dùng DOMParser/XMLSerializer
  //    để tránh namespace/declaration issues làm hỏng file Word ──
  function processXmlStr(xmlStr) {
    if (!xmlStr) return xmlStr;

    // 1. Xử lý CO_BORROWER block-level: xóa toàn bộ <w:p> chứa CO_S/CO_E
    //    Nếu không có người vay 2: xóa tất cả w:p giữa CO_S và CO_E (kể cả marker)
    if (!hasCo) {
      // Xóa đoạn từ CO_BORROWER_START đến CO_BORROWER_END (kể cả thẻ <w:p> chứa marker)
      // Dùng cách an toàn: tìm vị trí start/end của <w:p> chứa marker, rồi slice
      function removeMarkerPara(xml, marker) {
        var idx = xml.indexOf(marker);
        if (idx === -1) return xml;
        // Tìm <w:p ...> bắt đầu trước marker (tìm ngược)
        var pStart = xml.lastIndexOf('<w:p', idx);
        if (pStart === -1) pStart = idx;
        // Tìm </w:p> kết thúc sau marker
        var pEnd = xml.indexOf('</w:p>', idx);
        if (pEnd === -1) return xml;
        pEnd += '</w:p>'.length;
        return xml.slice(0, pStart) + xml.slice(pEnd);
      }
      // Xóa đoạn giữa START và END marker (kể cả nội dung giữa)
      var csIdx = xmlStr.indexOf('CO_BORROWER_START');
      var ceIdx = xmlStr.indexOf('CO_BORROWER_END');
      if (csIdx !== -1 && ceIdx !== -1) {
        // Tìm <w:p> chứa START
        var pCS = xmlStr.lastIndexOf('<w:p', csIdx);
        if (pCS === -1) pCS = csIdx;
        // Tìm </w:p> chứa END
        var pCE = xmlStr.indexOf('</w:p>', ceIdx);
        if (pCE !== -1) {
          pCE += '</w:p>'.length;
          xmlStr = xmlStr.slice(0, pCS) + xmlStr.slice(pCE);
        }
      } else {
        // Fallback: xóa từng marker paragraph riêng
        xmlStr = removeMarkerPara(xmlStr, 'CO_BORROWER_START');
        xmlStr = removeMarkerPara(xmlStr, 'CO_BORROWER_END');
      }
      // Xóa toàn bộ content giữa CO_BORROWER_INLINE_START và CO_BORROWER_INLINE_END
      xmlStr = xmlStr.replace(/CO_BORROWER_INLINE_START[\s\S]*?CO_BORROWER_INLINE_END/g, '');
    } else {
      // Giữ content, chỉ xóa marker text
      xmlStr = xmlStr.replace(/CO_BORROWER_START/g,'').replace(/CO_BORROWER_END/g,'');
      xmlStr = xmlStr.replace(/CO_BORROWER_INLINE_START/g,'').replace(/CO_BORROWER_INLINE_END/g,'');
    }

    // 1b. Sửa <w:p...> rỗng thừa sinh ra do CO_BORROWER processing:
    //     Nếu có 2 <w:p...> liên tiếp mà không có </w:p> ở giữa → paragraph đầu bị unclosed
    //     → thêm </w:p> giữa chúng để fix XML
    xmlStr = xmlStr.replace(/(<w:p(?:\s[^>]*)?>)(<w:p[ >])/g, '$1</w:p>$2');
    // Xóa <w:p></w:p> rỗng hoàn toàn (kể cả có attributes)
    xmlStr = xmlStr.replace(/<w:p(?:\s[^>]*)?>[\s]*<\/w:p>/g, '');
    // Xóa <w:p> ngay trước closing tags của table cell/row/table (invalid position)
    xmlStr = xmlStr.replace(/<w:p(?:\s[^>]*)?>(<\/w:tc>|<\/w:tr>|<\/w:tbl>)/g, '$1');

    // 2. Fill placeholders: thay <<KEY>> bằng giá trị (đã escape XML)
    PH_RE.lastIndex = 0;
    xmlStr = xmlStr.replace(PH_RE, function(m, k) {
      var val = findVal(k);
      return (val !== null && val !== undefined) ? escXml(String(val)) : '';
    });

    return xmlStr;
  }

  // Áp dụng fill vào các file XML trong docx
  ['word/document.xml','word/header1.xml','word/footer1.xml','word/header2.xml','word/footer2.xml'].forEach(function(fname){
    if (!zip2.files[fname]) return;
    var xml2 = processXmlStr(zip2.files[fname].asText());
    zip2.file(fname, xml2);
  });

  var output = zip2.generate({type:'arraybuffer',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  console.log('[Fill] DONE:', key, output.byteLength, 'bytes');
  return output;
}


async function loadExportLibs(){
  if(_libsLoaded)return;
  var libs=[
    'https://cdn.jsdelivr.net/npm/pizzip@3.1.4/dist/pizzip.min.js',
    'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
    'https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js'
  ];
  for(var i=0;i<libs.length;i++){
    await new Promise(function(resolve,reject){
      var s=document.createElement('script');s.src=libs[i];s.onload=resolve;s.onerror=reject;
      document.head.appendChild(s);
    });
  }
  _libsLoaded=true;
}

async function loadTemplate(key){
  if(_tplCache[key]){console.log('[Template] cache:',key);return _tplCache[key];}
  // Ưu tiên base64 nếu có (dùng cho BM đã preprocessed local, vd BM6)
  if(_TPL_B64[key]){
    var b64=_TPL_B64[key];
    var bin=atob(b64);
    var ab=new ArrayBuffer(bin.length);
    var view=new Uint8Array(ab);
    for(var i=0;i<bin.length;i++)view[i]=bin.charCodeAt(i);
    console.log('[Template] b64 loaded:',key,ab.byteLength,'bytes');
    _tplCache[key]=ab;
    return ab;
  }
  // Fallback: fetch từ GitHub repo
  var url=GITHUB_BASE+BM_FILES[key].file;
  console.log('[Template] fetch:',url);
  var res=await fetch(url);
  if(!res.ok)throw new Error('Không tải được '+key+' (HTTP '+res.status+')');
  var ab=await res.arrayBuffer();
  console.log('[Template] loaded:',key,ab.byteLength,'bytes');
  _tplCache[key]=ab;
  return ab;
}

// Bổ sung các trường tự tính nếu chưa có (không thay đổi hsList gốc)
function enrichH(h) {
  var yr = new Date().getFullYear();
  var r = Object.assign({}, h);
  // Ưu tiên lấy từ form nếu đang mở hồ sơ này
  var hdtdEl   = document.getElementById('f-hdtd');
  var mortEl   = document.getElementById('f-mortgage');
  var htlsEl   = document.getElementById('f-htls');
  var qltsEl   = document.getElementById('f-qlts');
  var sohdmbEl = document.getElementById('f-sohdmb');
  var cifEl    = document.getElementById('f-cif');
  if (cifEl   && cifEl.value.trim())    r.cif    = cifEl.value.trim();
  if (sohdmbEl && sohdmbEl.value.trim()) r.soHDMB = sohdmbEl.value.trim();
  if (hdtdEl  && hdtdEl.value.trim())   r.hdtd_code    = hdtdEl.value.trim();
  if (mortEl  && mortEl.value.trim())   r.mortgage_code = mortEl.value.trim();
  if (htlsEl  && htlsEl.value.trim())   r.htls_agreement = htlsEl.value.trim();
  if (qltsEl  && qltsEl.value.trim())   r.qlts_agreement = qltsEl.value.trim();
  // Fallback: tính từ công thức
  if (!r.hdtd_code    && r.cif)    r.hdtd_code    = '01/'+yr+'/'+r.cif+'/HĐTD';
  if (!r.mortgage_code && r.cif)   r.mortgage_code = '01/'+yr+'/'+r.cif+'/HĐTC';
  if (!r.htls_agreement && r.soHDMB) {
    var hdmbFull = buildHDMBCode(r.soHDMB, r.maCanHo);
    r.htls_agreement = hdmbFull.replace('/HĐMB/PRIMA BAY', '/TTHTLS/PRIMA BAY');
  }
  if (!r.qlts_agreement && r.soHDMB) {
    var hdmbFull2 = buildHDMBCode(r.soHDMB, r.maCanHo);
    r.qlts_agreement = hdmbFull2.replace('/HĐMB/PRIMA BAY', '/TTQLTS/PRIMA BAY');
  }
  console.log('[enrichH]', r.tenKH, 'hdtd='+r.hdtd_code, 'mort='+r.mortgage_code, 'htls='+r.htls_agreement, 'qlts='+r.qlts_agreement);
  return r;
}

function buildDocData(h){
  var fD=function(v){return fmtDateVN(v)||'';};
  return {
    '1 - Danh xưng người 1':h.salutation||'',
    '2 - Họ và tên người 1':h.tenKH||'',
    '3 - Email người 1':h.email||'',
    '4- Mã CIF người 1':h.cif||'',
    '5 - Ngày tháng năm sinh người 1':fD(h.ngaySinh),
    '7 - Số CCCD/CC người 1':h.cccd||'',
    '8- Nơi cấp CCCD/CC người 1':h.id_issue_place||'',
    '9- Ngày cấp CCCD/CC người 1':fD(h.id_issue_date),
    '10- Địa chỉ thường trú người 1':h.permanent_address||'',
    '11 - Địa chỉ liên hệ người 1':h.diaChi||'',
    '12 - ĐT liên hệ người 1':h.sdt||'',
    '13-Đơn vị công tác 1 người 1':h.workplace||'',
    '14-Địa chỉ công tác 1 người 1':h.workplace_address||'',
    '15-Số điện thoại - nơi công tác 1 người 1':h.workplace_phone||'',
    '16- Chức vụ 1 người 1':h.job_title||'',
    '17-Đơn vị công tác 2 người 1':h.workplace2||'',
    '18-Địa chỉ công tác 2 người 1':h.workplace2_address||'',
    '19-Số điện thoại - nơi công tác 2 người 1':h.workplace2_phone||'',
    '20- Chức vụ 2 người 1':h.job_title2||'',
    '21 - Danh xưng người 2':h.co_salutation||'',
    '22 - Họ và tên người 2':h.tenVC||'',
    '23 - Email người 2':h.emailVC||'',
    '24 - mã CIF người 2':h.cifVC||'',
    '25 - Ngày sinh người 2':fD(h.ngaySinhVC),
    '27 - Số CCCD/CC người 2':h.cccdVC||'',
    '28- Nơi cấp CCCD/CC người 2':h.co_id_issue_place||'',
    '29- Ngày cấp CCCD/CC người 2':fD(h.co_id_issue_date),
    '30 - Địa chỉ thường trú người 2':h.co_permanent_address||'',
    '31 - Địa chỉ liên hệ người 2':h.diaChiVC||'',
    '32 - ĐT liên hệ người 2':h.sdtVC||'',
    '33-Đơn vị công tác 1 người 2':h.co_workplace||'',
    '34-Địa chỉ công tác 1 người 2':h.co_workplace_address||'',
    '35-Số điện thoại - nơi công tác 1 người 2':h.co_workplace_phone||'',
    '36- Chức vụ 1 người 2':h.co_job_title||'',
    '37-Đơn vị công tác 2 người 2':h.co_workplace2||'',
    '38-Địa chỉ công tác 2 người 2':h.co_workplace2_address||'',
    '39-Số điện thoại - nơi công tác 2 người 2':h.co_workplace2_phone||'',
    '40- Chức vụ 2 người 2':h.co_job_title2||'',
    '41 - Số hợp đồng mua bán căn hộ':h.soHDMB||'',
    '42 - Ngày ký hợp đồng mua bán căn hộ':fD(h.ngayKyHDMB),
    '43 - số Căn hộ số':h.maCanHo||'',
    '44- Tầng căn hộ':h.tang||'',
    '45 - Diện tích sử dụng căn hộ':String(h.area_usable||h.dienTich||''),
    '46 - Diện tích sàn Xây dựng căn hộ':String(h.area_construction||''),
    '47- Trị giá HDMB căn hộ (bao gồm kinh phí bảo trì)':fmt(h.hdmb_value_with_mgt||h.giaHDMB),
    '49 - Trị giá HDMB căn hộ (Không bao gồm kinh phí bảo trì)':fmt(h.giaHDMB),
    '51 - Giá trị đã quy đổi theo hệ số (70%) căn hộ':fmt(h.collateral_value_ratio),
    '52 - Số tiền/ Hạn mức vay':fmt(h.soTienVay),
    '53 - Bằng Chữ Số tiền/ Hạn mức vay':numToWords(h.soTienVay),
    '53- ST 5% Căn hộ số':fmt(h.vtc_5pct),
    '54 - CDT HTLS + NH GN lần 1':fmt(h.disbursement_1),
    '55 - Bằng chữ NH GN lần 1':numToWords(h.disbursement_1),
    '56 - TK thanh toán của KH vay':h.payment_account||'',
    '57 - Số tiền duy trì TK TT':fmt(h.min_account_balance),
    '58 - Thời gian vay':(h.kyHan||h.loan_term_months||''),
    '59 - Số hợp đồng thế chấp':h.mortgage_code||'',
    '60 - Số hợp đồng tín dụng':h.hdtd_code||'',
    '61 - Thỏa thuận HTLS':h.htls_agreement||(h.soHDMB?(function(){var f=buildHDMBCode(h.soHDMB,h.maCanHo);return f.replace('/HĐMB/PRIMA BAY','/TTHTLS/PRIMA BAY');})():''),
    '62 - Thỏa thuận QLTS':h.qlts_agreement||(h.soHDMB?(function(){var f=buildHDMBCode(h.soHDMB,h.maCanHo);return f.replace('/HĐMB/PRIMA BAY','/TTQLTS/PRIMA BAY');})():''),
    '64- Lịch trả nợ từ kì 31 đến kỳ n-1':(function(){
      // Tổng kỳ trả nợ = kyHan - anHan (vd: 240-30=210)
      // Mỗi kỳ đều = floor(stv / 210), áp dụng cho 209 kỳ (kỳ 31 → kỳ 239)
      var stv=parseVND(h.soTienVay)||parseVND(h.hanMucDuocDuyet)||0;
      var kh=parseInt(h.kyHan)||parseInt(h.loan_term_months)||0;
      var anHan=parseInt(h.grace_period_months)||30;
      var soKyTong=kh-anHan; // 210
      if(!stv||soKyTong<=1) return '';
      var kyDeu=Math.floor(stv/soKyTong); // chia cho 210, làm tròn xuống đơn vị
      console.log('[BM6-64] stv='+stv+' kh='+kh+' anHan='+anHan+' soKyTong='+soKyTong+' kyDeu='+kyDeu);
      return fmt(kyDeu);
    })(),
    '65 - kỳ thứ n':(function(){
      // Kỳ cuối (kỳ 240) = stv - 209 × kyDeu
      var stv=parseVND(h.soTienVay)||parseVND(h.hanMucDuocDuyet)||0;
      var kh=parseInt(h.kyHan)||parseInt(h.loan_term_months)||0;
      var anHan=parseInt(h.grace_period_months)||30;
      var soKyTong=kh-anHan; // 210
      if(!stv||soKyTong<=1) return '';
      var kyDeu=Math.floor(stv/soKyTong);
      var soKyDeu=soKyTong-1; // 209 kỳ đều
      var kyConLai=stv-kyDeu*soKyDeu; // stv - 209 × kyDeu
      console.log('[BM6-65] kyDeu='+kyDeu+' soKyDeu='+soKyDeu+' kyConLai='+kyConLai);
      return fmt(kyConLai);
    })(),
    '66 - Vốn tự có':fmt(h.equity_amount||h.vtcDaNop),
    '48 - Bằng chữ Giá trị HDMB căn':numToWords(h.giaHDMB),
    '48 - Bằng chữ Giá trị HDMB căn hộ  (bao gồm kinh phí bảo trì)':numToWords(h.hdmb_value_with_mgt||h.giaHDMB),
    '50 - Bằng chữ Giá trị HDMB căn hộ (Không bao gồm kinh phí bảo trì)':numToWords(h.giaHDMB),
    '67 - Bằng chữ - VTC/ định gíá lần 1':numToWords(h.equity_amount||h.vtcDaNop),
    '70 - Định giá lần 2':fmt(h.valuation_2),
    '71 - Bằng chữ -Định giá lần 2':numToWords(h.valuation_2)
  };
}

async function doExportContracts(){
  var btn=document.getElementById('btn-do-export');
  btn.disabled=true;btn.textContent='⏳ Đang tải thư viện...';
  try{await loadExportLibs();}catch(e){showNotif('❌ Lỗi tải thư viện: '+e.message);btn.disabled=false;btn.textContent='📥 Tạo & Tải về';return;}
  btn.textContent='⏳ Đang tạo file...';
  var selectedBM=[];
  document.querySelectorAll('.bm-bm:checked').forEach(function(el){selectedBM.push({key:el.value});});
  if(selectedBM.length===0){showNotif('Vui lòng chọn ít nhất 1 mẫu!');btn.disabled=false;btn.textContent='📥 Tạo & Tải về';return;}
  var fmtVal=document.querySelector('input[name="export-fmt"]:checked').value;
  var hsList_=Array.from(_bidvSelected).map(function(id){return hsList.find(function(x){return x.id===id;});}).filter(Boolean);
  try{
    if(fmtVal==='each'){
      for(var i=0;i<hsList_.length;i++){
        var h=enrichH(hsList_[i]);btn.textContent='⏳ ('+(i+1)+'/'+hsList_.length+')...';
        var zip=new JSZip();
        var dd=buildDocData(h);
        var fn=(h.tenKH||'KH').replace(/\s+/g,'_')+'_'+(h.cccd||'');
        for(var j=0;j<selectedBM.length;j++){
          try{var ab=await fillTemplate(selectedBM[j].key,dd);zip.file(BM_FILES[selectedBM[j].key].name+'_'+fn.replace(/\s+/g,'_')+'.docx',ab);}
          catch(e){console.error(e);showNotif('⚠️ Lỗi '+selectedBM[j].key+': '+e.message);}
        }
        saveAs(await zip.generateAsync({type:'blob'}),fn+'.zip');
        await new Promise(function(r){setTimeout(r,300);});
      }
    }else{
      var zip=new JSZip();
      for(var i=0;i<hsList_.length;i++){
        var h=enrichH(hsList_[i]);btn.textContent='⏳ ('+(i+1)+'/'+hsList_.length+')...';
        var dd=buildDocData(h);
        var fn=(h.tenKH||'KH').replace(/\s+/g,'_')+'_'+(h.cccd||'');
        for(var j=0;j<selectedBM.length;j++){
          try{var ab=await fillTemplate(selectedBM[j].key,dd);zip.file(fn+'/'+BM_FILES[selectedBM[j].key].name+'.docx',ab);}
          catch(e){console.error(e);}
        }
      }
      var today=new Date();
      saveAs(await zip.generateAsync({type:'blob'}),'HoSo_PrimaBay_'+today.getFullYear()+String(today.getMonth()+1).padStart(2,'0')+String(today.getDate()).padStart(2,'0')+'.zip');
    }
    showNotif('✅ Đã xuất '+hsList_.length+' hồ sơ!');
    closeModal('modal-export');
  }catch(e){showNotif('❌ Lỗi: '+e.message);console.error(e);}
  btn.disabled=false;btn.textContent='📥 Tạo & Tải về';
}

function getWhoName(id){
  if(!id)return'';
  var u=(typeof users!=='undefined'?users:[]).find(function(u){return u.id===id;});
  return u?(u.name||u.full_name||u.email||''):'';
}

function renderBIDVTable(){
  if(!window.currentUser) return;
  var wrap=document.getElementById('bidv-table-wrap');
  if(!wrap)return;
  var stFilter=(document.getElementById('bidv-filter-st')||{}).value||'';
  var cbFilter=(document.getElementById('bidv-filter-cb')||{}).value||'';
  var list=(hsList||[]).filter(function(h){
    if(!h)return false;
    if(deriveHSStatus(h)==='tuchoi') return false; // Ẩn hồ sơ từ chối
    if(!isQL()&&!isQTTD()&&!isAdmin()&&!isCDT()){if(!currentUser||h.canBoId!==currentUser.id)return false;}
    if(stFilter){
      var stMap={moi:'no_answer',dang:'contacted',cho:'docs_complete',choky:'approved_loan',chogn:'appointment',xong:'da_gn',tuchoi:'rejected_kh'};
      var st=deriveHSStatus(h);
      if(st!==stMap[stFilter]&&st!==stFilter)return false;
    }
    if(cbFilter&&h.canBoId!==cbFilter)return false;
    return true;
  });
  var cbSel=document.getElementById('bidv-filter-cb');
  if(cbSel&&cbSel.options.length<=1){
    var cbIds=[];
    list.forEach(function(h){if(h.canBoId&&cbIds.indexOf(h.canBoId)===-1)cbIds.push(h.canBoId);});
    cbIds.forEach(function(id){
      var u=(users||[]).find(function(u){return u.id===id;});
      if(u){var opt=document.createElement('option');opt.value=id;opt.textContent=u.name||u.full_name||u.email;cbSel.appendChild(opt);}
    });
  }
  if(!list.length){wrap.innerHTML='<div style="padding:32px;text-align:center;color:var(--txt3)">Không có hồ sơ nào</div>';updateExportBtn();return;}
  var html='<table><thead><tr><th style="width:36px"><input type="checkbox" onchange="toggleAllBIDV(this.checked)"></th><th>STT</th><th>Mã căn</th><th>Họ tên KH</th><th>CCCD</th><th>Hạn mức vay</th><th>CB phụ trách</th><th>Trạng thái</th></tr></thead><tbody>';
  list.forEach(function(h,i){
    var chk=_bidvSelected.has(h.id)?'checked':'';
    var stKey=deriveHSStatus(h);
    var st=SC_VN[stKey]||(stKey||'');
    var stColor=stKey==='da_gn'?'color:#166534;font-weight:600':['rejected_kh','rejected_income'].indexOf(stKey)!==-1?'color:#991B1B':['approved_loan','appointment','rejected_cic'].indexOf(stKey)!==-1?'color:#92400E;font-weight:600':'';
    html+='<tr><td><input type="checkbox" class="bidv-chk" data-id="'+h.id+'" '+chk+' onchange="onBIDVChk(this)"></td><td style="text-align:center">'+(i+1)+'</td><td><b style="color:var(--blue)">'+(h.maCanHo||'')+'</b></td><td>'+(h.tenKH||'')+'</td><td style="font-size:12px;color:var(--txt3)">'+(h.cccd||'')+'</td><td style="text-align:right">'+(h.soTienVay?fmt(h.soTienVay):'')+'</td><td>'+(getWhoName(h.canBoId)||'—')+'</td><td style="'+stColor+'">'+st+'</td></tr>';
  });
  html+='</tbody></table>';
  wrap.innerHTML=html;
  updateExportBtn();
}

function onBIDVChk(el){
  var id=el.dataset.id;
  if(el.checked)_bidvSelected.add(id);else _bidvSelected.delete(id);
  updateExportBtn();
}
function toggleAllBIDV(checked){
  document.querySelectorAll('.bidv-chk').forEach(function(el){
    el.checked=checked;
    if(checked)_bidvSelected.add(el.dataset.id);else _bidvSelected.delete(el.dataset.id);
  });
  updateExportBtn();
}
function updateExportBtn(){
  var n=_bidvSelected.size;
  var btn=document.getElementById('btn-export-modal');
  if(btn){btn.style.display=n>0?'':'none';var ec=document.getElementById('export-count');if(ec)ec.textContent=n;}
}
function openExportModal(){
  if(_bidvSelected.size===0){showNotif('Vui lòng chọn ít nhất 1 hồ sơ!');return;}
  var khList=Array.from(_bidvSelected).map(function(id){
    var h=hsList.find(function(x){return x.id===id;});
    return h?'• '+h.tenKH+' — '+h.maCanHo:'';
  }).join('<br>');
  var kl=document.getElementById('export-kh-list');
  if(kl)kl.innerHTML='<b>Đã chọn '+_bidvSelected.size+' hồ sơ:</b><br>'+khList;
  var mel=document.getElementById('modal-export');
  if(mel)mel.setAttribute('style','display:flex !important;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9999;align-items:flex-start;justify-content:center;padding:40px 20px;overflow-y:auto');
}
function closeModal(id){
  var el=document.getElementById(id);
  if(el){el.removeAttribute('style');el.classList.remove('open');}
}
function selectAllBM(group,checked){
  document.querySelectorAll('.bm-'+group).forEach(function(el){el.checked=checked;});
}
// Permission check in BIDV table: CB chỉ thấy hồ sơ mình quản lý
function canExportHS(h){
  if(isQL()||isQTTD()||isAdmin())return true;
  return h&&h.canBoId===currentUser.id;
}

