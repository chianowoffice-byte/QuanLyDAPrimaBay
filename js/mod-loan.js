// ==================================================
// NAV
// ==================================================
// showPage: delegate sang showProjPage (pages nằm trong mod-project)
function showPage(p){
  if(typeof showProjPage === 'function') showProjPage(p);
}

// ==================================================
// DASHBOARD
// ==================================================
function renderDB(){
  if(!window.currentUser) return;
  var list = myHS();
  renderAlertPanels(list);
  var c = {moi:0,dang:0,cho:0,choky:0,xong:0,tuchoi:0};
  list.forEach(function(h){ if(c[h.status]!==undefined) c[h.status]++; });
  var scope = (isQL()||isViewer()) ? 'Toàn chi nhánh' : 'Của tôi';
  var s = '';
  s += '<div class="stat-card bl"><div class="stat-lbl">Tổng hồ sơ</div><div class="stat-val">'+list.length+'</div><div class="stat-sub">'+scope+'</div></div>';
  s += '<div class="stat-card am"><div class="stat-lbl">Đang xử lý</div><div class="stat-val">'+(c.dang+c.cho)+'</div><div class="stat-sub">Cần chú ý</div></div>';
  s += '<div class="stat-card pu"><div class="stat-lbl">Chờ ký</div><div class="stat-val">'+c.choky+'</div><div class="stat-sub">Đã hẹn lịch</div></div>';
  s += '<div class="stat-card gr"><div class="stat-lbl">Hoàn thành</div><div class="stat-val">'+c.xong+'</div><div class="stat-sub">Tháng này</div></div>';
  s += '<div class="stat-card rd"><div class="stat-lbl">Từ chối</div><div class="stat-val">'+c.tuchoi+'</div><div class="stat-sub">Tháng này</div></div>';
  var dbStats = document.getElementById('p-db-stats'); if(dbStats) dbStats.innerHTML = s;

  if(isQL()||isViewer()){
    var cbs = users.filter(function(u){ return u.active && (u.role==='cb'||u.role==='ql'); });
    var html = '';
    cbs.forEach(function(cb){
      var n = hsList.filter(function(h){ return h.canBoId===cb.id && h.status!=='xong' && h.status!=='tuchoi'; }).length;
      html += '<div style="display:flex;justify-content:space-between;margin-bottom:4px">';
      html += '<span style="font-size:13px;font-weight:500">'+cb.name+'</span>';
      html += '<span style="font-size:13px;color:var(--blue);font-weight:600">'+n+' HS</span></div>';
      html += '<div class="prog-wrap" style="margin-bottom:10px"><div class="prog-bar" style="width:'+Math.min(100,n*8)+'%"></div></div>';
    });
    var cbLoadEl = document.getElementById('p-cb-load-list'); if(cbLoadEl) cbLoadEl.innerHTML = html || '<div class="text-sm">Chưa có cán bộ</div>';
  }

  var logs = (isQL()||isViewer()) ? actLog : actLog.filter(function(a){return currentUser && a.who===currentUser.name;});
  var aHtml = '';
  logs.slice(0,6).forEach(function(a){
    aHtml += '<div class="tl-item"><div class="tl-dot '+(a.type||'')+'"></div>';
    aHtml += '<span class="tl-time">'+a.time+'</span><span>'+a.msg+'</span></div>';
  });
  var actEl = document.getElementById('p-act-list'); if(actEl) actEl.innerHTML = aHtml || '<div class="text-sm" style="padding:8px 0">Chưa có hoạt động</div>';

  var up = list.filter(function(h){ return h.ngayHen && h.status==='choky'; });
  var uHtml = '';
  if(up.length){
    uHtml = '<table style="width:100%;font-size:13px;border-collapse:collapse">';
    up.forEach(function(h){
      uHtml += '<tr style="border-bottom:1px solid var(--bdr)">';
      uHtml += '<td style="padding:7px 0;font-weight:500">'+h.tenKH+'</td>';
      uHtml += '<td style="padding:7px 8px;color:var(--txt2)">'+( h.maCanHo||'—')+'</td>';
      uHtml += '<td style="padding:7px 8px;color:var(--purple);font-weight:600">'+fmtDateVN(h.ngayHen)+'</td>';
      uHtml += '<td data-id="'+h.id+'" ><button class="btn btn-sm" onclick="openHS(this.dataset.id)">Mở</button></td></tr>';
    });
    uHtml += '</table>';
  } else { uHtml = '<div class="text-sm" style="padding:8px 0">Không có hồ sơ nào.</div>'; }
  var upEl = document.getElementById('p-upcoming-list'); if(upEl) upEl.innerHTML = uHtml;
}

// ==================================================
// HS TABLE
// ==================================================
function renderHSFilterCB(){
  if(!isQL() && !isViewer()) return;
  var sel = document.getElementById('p-s-cb');
  if(!sel) return;
  var html = '<option value="">Tất cả cán bộ</option>';
  users.filter(function(u){ return u.active && (u.role==='cb'||u.role==='ql'); }).forEach(function(u){
    html += '<option value="'+u.id+'">'+u.name+'</option>';
  });
  sel.innerHTML = html;
}

function alertBadge(h) {
  var lastDate = null;
  var wrs=(h.weeklyReports||[]).filter(function(r){return r.type!=='cdt_feedback';});
  if(wrs.length){wrs.sort(function(a,b){return new Date(b.time)-new Date(a.time);}); lastDate=new Date(wrs[0].time);}
  else{lastDate=new Date(h.createdAt||h.created_at);}
  if(!lastDate||isNaN(lastDate)) return '<span style="color:var(--txt3)">—</span>';
  var today=new Date(); today.setHours(0,0,0,0);
  var diff=Math.floor((today-lastDate)/86400000);
  if(diff>=7) return '<span class="b-deadline b-over">🔴 '+diff+' ngày trước</span>';
  if(diff>=3) return '<span class="b-deadline b-warn">🟡 '+diff+' ngày trước</span>';
  if(diff===0) return '<span class="b-deadline b-ok">🟢 Hôm nay</span>';
  return '<span class="b-deadline b-ok">🟢 '+diff+' ngày trước</span>';
}

function renderHSTable(){
  var q   = (document.getElementById('p-s-q')||{value:''}).value.toLowerCase();
  var st  = (document.getElementById('p-s-st')||{value:''}).value;
  var cb  = (document.getElementById('p-s-cb')||{value:''}).value;
  var src = (isQL()||isCDT()||isViewer()) ? hsList : hsList.filter(function(h){ return h.canBoId===currentUser.id; });
  var f   = src.filter(function(h){
    var matchQ  = !q || (h.tenKH||'').toLowerCase().indexOf(q)>=0 || (h.sdt||'').indexOf(q)>=0 || (h.maCanHo||'').toLowerCase().indexOf(q)>=0;
    var matchSt = !st || deriveHSStatus(h)===st;
    var matchCb = !cb || h.canBoId===cb;
    return matchQ && matchSt && matchCb;
  });
  // Sort: CĐT → mới nhất trên; CB/QL → cũ nhất trên (quá hạn lên đầu)
  f.sort(function(a, b){
    var ta = new Date(a.lastContactAt || a.updatedAt || a.createdAt || 0).getTime();
    var tb = new Date(b.lastContactAt || b.updatedAt || b.createdAt || 0).getTime();
    if (isCDT()) {
      return tb - ta; // mới nhất trên
    } else {
      // CB/QL: quá hạn (cũ nhất) lên đầu
      return ta - tb; // cũ nhất trên
    }
  });
  var hsCntEl = document.getElementById('p-hs-count'); if(hsCntEl) hsCntEl.textContent = f.length + ' / ' + src.length + ' hồ sơ';
  var html = '';
  if(!f.length){
    html = '<tr><td colspan="10"><div class="empty-st">📭<br>Không có hồ sơ phù hợp</div></td></tr>';
  } else {
    f.forEach(function(h){
      var prog = ckProgress(h);
      var progHtml = '<div style="display:flex;align-items:center;gap:6px">';
      progHtml += '<div class="prog-wrap" style="width:50px"><div class="prog-bar '+(prog.pct===100?'full':'')+'" style="width:'+prog.pct+'%"></div></div>';
      progHtml += '<span style="font-size:11px;color:'+(prog.pct===100?'var(--green)':'var(--txt3)')+'">'+prog.done+'/'+prog.total+'</span></div>';
      var cicHtml;
      if(!h.cic){ cicHtml = '<span style="color:var(--txt3);font-size:12px">Chưa tra</span>'; }
      else if(h.cic.nhomNo===1){ cicHtml = '<span class="badge b-xong">✅ Nhóm 1</span>'; }
      else if(h.cic.nhomNo===2){ cicHtml = '<span class="badge b-tuchoi">❌ Nhóm 2</span>'; }
      else if(h.cic.nhomNo>=3){ cicHtml = '<span class="badge b-tuchoi">❌ Nợ xấu ('+h.cic.nhomNo+')</span>'; }
      else { cicHtml = '<span style="color:var(--txt3);font-size:12px">Chưa tra</span>'; }
      html += '<tr data-id="'+h.id+'" style="cursor:pointer" onclick="openHS(this.dataset.id)">';
      html += '<td style="font-weight:500">'+( h.tenKH||'—')+(h.locked?' 🔒':'')+'</td>';
      html += '<td>'+(h.sdt||'—')+'</td>';
      html += '<td>'+(h.maCanHo||'—')+'</td>';
      html += '<td>'+alertBadge(h)+'</td>';
      html += '<td>'+progHtml+'</td>';
      html += '<td>'+cicHtml+'</td>';
      html += '<td>'+getUserName(h.canBoId)+'</td>';
      var lastKQText = '';
      if (h.weeklyReports && h.weeklyReports.length) {
        var lwr = null;
        for (var wi=h.weeklyReports.length-1;wi>=0;wi--) {
          if (h.weeklyReports[wi].type !== 'cdt_feedback') { lwr=h.weeklyReports[wi]; break; }
        }
        if (lwr) lastKQText = '<div style="font-size:10px;color:var(--txt3);margin-top:2px;line-height:1.3">' + getStatusLabel(lwr.ketQua) + '</div>';
      }
      var displayStatus = deriveHSStatus(h);
      html += '<td>'+sBadge(displayStatus)+lastKQText+'</td>';
      html += '<td style="font-size:11px;color:var(--txt3)">'+fmtDate(h.updatedAt||h.createdAt||'')+'</td>';
      html += '<td onclick="event.stopPropagation()"><button class="btn btn-sm" onclick="openHS(this.dataset.id)">Mở</button></td>';
      html += '</tr>';
    });
  }
  var hsTbody = document.getElementById('p-hs-tbody'); if(hsTbody) hsTbody.innerHTML = html;
}

// ==================================================
// HS MODAL - BUILD WITHOUT NESTED TEMPLATE LITERALS
// ==================================================
function openNewHS(){
  currentHSId = null;
  document.getElementById('mhs-title').textContent = 'Tạo hồ sơ mới';
  document.getElementById('mhs-badge').innerHTML = sBadge('moi');
  document.getElementById('mhs-lock').style.display = 'none';
  buildHSForm(null);
  document.getElementById('modal-hs').classList.add('open');
}
async function openHS(id){
  currentHSId = id;
  var h = hsList.find(function(x){ return x.id===id; });
  if(!h) return;
  window._curHS = h;
  document.getElementById('mhs-title').textContent = 'Hồ sơ — ' + (h.tenKH||id);
  document.getElementById('mhs-badge').innerHTML = sBadge(h.status);
  document.getElementById('mhs-lock').style.display = h.locked ? 'inline' : 'none';
  // Hiển thị form ngay với dữ liệu có sẵn (nhanh)
  buildHSForm(h);
  document.getElementById('modal-hs').classList.add('open');
  // Lazy load chi tiết (weekly_reports, checklist, cic) nếu chưa có
  if (!h._detailLoaded && sb) {
    try {
      var detail = await sbLoadHSDetail(id);
      if (detail) {
        var idx = hsList.findIndex(function(x){ return x.id===id; });
        if (idx !== -1) {
          var merged = mapDbHS(detail);
          merged._detailLoaded = true;
          hsList[idx] = merged;
          // Chỉ rebuild nếu modal vẫn đang mở hồ sơ này
          if (currentHSId === id) {
            document.getElementById('mhs-title').textContent = 'Hồ sơ — ' + (merged.tenKH||id);
            buildHSForm(merged);
          }
        }
      }
    } catch(e) { console.warn('openHS lazy load error:', e); }
  }
}
function closeHS(){ document.getElementById('modal-hs').classList.remove('open'); currentHSId=null; }


function swTab(el, tid){
  document.querySelectorAll('#mhs-body .tab').forEach(function(t){ t.classList.remove('active'); });
  document.querySelectorAll('#mhs-body [id^="t-"]').forEach(function(t){ t.style.display='none'; });
  el.classList.add('active');
  var t = document.getElementById(tid);
  if(t) t.style.display = 'block';
}

// CHECKLIST
function renderCKGrid(h, locked){
  var el = document.getElementById('ck-grid'); if(!el) return;
  var ck = h ? (h.ck||{}) : {};
  var html = '';
  CK_GROUPS.forEach(function(g){
    var done = g.items.every(function(it){ return ck[it.id]; });
    html += '<div class="ck-card">';
    html += '<div class="ck-hd '+(done?'done':'')+'">';
    html += '<span>'+g.label.toUpperCase()+'</span>';
    html += '<span style="font-size:11px">'+g.items.filter(function(it){return ck[it.id];}).length+'/'+g.items.length+'</span></div>';
    html += '<div class="ck-body">';
    g.items.forEach(function(it){
      var ch = ck[it.id] ? 'checked' : '';
      var cls = ck[it.id] ? 'ck-item checked' : 'ck-item';
      var dis = locked ? 'disabled' : '';
      html += '<div class="'+cls+'" onclick="'+(locked?'':'toggleCK(this.dataset.ckid)')+'">'; 
      html += '<input type="checkbox" id="ck-'+it.id+'" '+ch+' '+dis+' onclick="event.stopPropagation()">';
      html += '<span class="ck-lbl">'+it.label+'</span></div>';
    });
    html += '</div>';
    // Bỏ nút tích tất cả theo yêu cầu
    html += '</div>';
  });
  el.innerHTML = html;
  updateCKPct();
}
function updateCKPct(){
  var total=0, done=0;
  CK_GROUPS.forEach(function(g){ g.items.forEach(function(it){ total++; var cb=document.getElementById('ck-'+it.id); if(cb&&cb.checked) done++; }); });
  var el=document.getElementById('ck-pct');
  if(el) el.textContent = done+'/'+total+' mục — '+Math.round(done/total*100)+'%';
}
function toggleCK(id){
  var cb=document.getElementById('ck-'+id); if(!cb) return;
  cb.checked=!cb.checked;
  var item=cb.closest('.ck-item'); if(item) item.classList.toggle('checked',cb.checked);
  updateCKPct();
}
function toggleCKGroup(gid){
  var g=CK_GROUPS.find(function(x){return x.id===gid;}); if(!g) return;
  var allDone=g.items.every(function(it){ var cb=document.getElementById('ck-'+it.id); return cb&&cb.checked; });
  g.items.forEach(function(it){ var cb=document.getElementById('ck-'+it.id); if(cb){ cb.checked=!allDone; var item=cb.closest('.ck-item'); if(item) item.classList.toggle('checked',!allDone); } });
  updateCKPct();
}
function collectCK(){
  var ck={};
  CK_GROUPS.forEach(function(g){ g.items.forEach(function(it){ var cb=document.getElementById('ck-'+it.id); ck[it.id]=!!(cb&&cb.checked); }); });
  return ck;
}

// ================================================
// BUILD HS FORM - 5 TAB REDESIGN
// ================================================

// Tạo số HĐMB đầy đủ từ số thứ tự
// VD: "389" → "389/2026/P1-10-06/01/HĐMB/PRIMA BAY"
// Nếu đã là full code (chứa 'PRIMA BAY') → normalize về dạng chuẩn
function buildHDMBCode(input, maCanHo) {
  if (!input) return '';
  var s = String(input).trim();
  var yr = new Date().getFullYear();
  var ma = maCanHo || (window._curHS && window._curHS.maCanHo) || 'mã căn';
  if (s.indexOf('PRIMA BAY') !== -1) {
    // Normalize: bỏ /TTHTLS/ và /TTQLTS/ nếu lẫn vào
    s = s.replace(/\/TTHTLS\//g, '/').replace(/\/TTQLTS\//g, '/');
    s = s.replace(/\/(TTHTLS|TTQLTS)\/PRIMA BAY$/, '/PRIMA BAY');
    // Đảm bảo có /HĐMB/ trước PRIMA BAY
    if (s.indexOf('/HĐMB/PRIMA BAY') === -1) {
      s = s.replace('/PRIMA BAY', '/HĐMB/PRIMA BAY');
    }
    return s;
  }
  // Lấy phần số đầu tiên trước '/' nếu có, hoặc toàn bộ chuỗi
  var prefix = s.split('/')[0].trim();
  return prefix + '/' + yr + '/' + ma + '/01/HĐMB/PRIMA BAY';
}

function fmt(val) {
  if (val === '' || val === null || val === undefined) return '';
  var s = String(val).trim();
  // Strip dấu chấm (VN) và dấu phẩy rồi parse
  var cleaned = s.replace(/\./g,'').replace(/,/g,'');
  var n = parseInt(cleaned);
  if (isNaN(n)) return val;
  // Format dùng dấu CHẤM ngăn cách hàng nghìn kiểu VN: 123.000.000
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Parse số VN về integer (bỏ dấu chấm/phẩy)
function parseVND(val) {
  if (!val && val !== 0) return null;
  var s = String(val).trim().replace(/\./g,'').replace(/,/g,'');
  var n = parseInt(s);
  return isNaN(n) ? null : n;
}
// Parse lại khi lưu — bỏ dấu phẩy
function unFmt(val) {
  if (!val && val !== 0) return '';
  // Bỏ dấu chấm/phẩy VN, trả về số nguyên dạng string
  return String(val).replace(/\./g,'').replace(/,/g,'');
}
// Cho input number dạng text với dấu phẩy
function numInput(id, val, dis, extra) {
  var v = fmt(val);
  var d = dis ? ' ' + dis : '';
  var x = extra ? ' ' + extra : '';
  return '<input type="text" inputmode="numeric" id="' + id + '" value="' + v + '"' + d + x
       + ' onFocus="this.value=this.value.replace(/,/g,\'\')"'
       + ' onBlur="this.value=fmt(this.value.replace(/[^0-9]/g,\'\'))"'
       + ' onInput="this.value=this.value.replace(/[^0-9]/g,\'\')"'
       + ' style="font-variant-numeric:tabular-nums">';
}

function fld(label, id, val, dis, placeholder, type, full, extra) {
  var cls = full ? 'fg ffull' : 'fg';
  var t = type || 'text';
  var p = placeholder ? ' placeholder="' + placeholder + '"' : '';
  var d = dis ? ' ' + dis : '';
  var x = extra ? ' ' + extra : '';
  var safeVal = (t==='date') ? toISODate(val) : (val||'');
  return '<div class="' + cls + '"><label>' + label + '</label><input type="' + t + '" id="' + id + '" value="' + safeVal + '"' + p + d + x + '></div>';
}

function buildHSForm(h) {
  var locked  = h && h.locked;
  var kLocked = h && h.kLocked;
  var body    = document.getElementById('mhs-body');

  // Phân quyền
  var isCDTUser    = isCDT();
  var isCDTAdmin   = currentUser && (currentUser.db_role === 'cdt_admin' || currentUser.role === 'cdt_admin');
  var isQLAdmin    = isQL();
  var isQLOwner    = isQL() && !isAdmin() && h && h.canBoId === currentUser.id;
  var isViewerUser = isViewer(); // khai báo trước isCBOwner
  var isCBOwner    = !isCDTUser && !isViewerUser && !isQLAdmin && h && h.canBoId === currentUser.id;
  var isCBOther    = !isQLAdmin && !isCDTUser && !isViewerUser && !(h && h.canBoId === currentUser.id);

  // CB không phải phân công: không được xem
  if (isCBOther && !isViewerUser) {
    body.innerHTML = '<div class="perm-banner">Bạn không có quyền xem hồ sơ này.</div>';
    document.getElementById('mhs-fl').innerHTML = '';
    document.getElementById('mhs-fr').innerHTML = '<button class="btn" onclick="closeHS()">Đóng</button>';
    return;
  }

  var dv = function(f) { return h ? (h[f] || '') : ''; };
  var html = '';

  // ── Banner khoá ──
  if (locked) {
    html += '<div class="lock-banner">🔒 Hồ sơ đã chốt. ';
    html += isQLAdmin ? 'Nhấn <b>Mở lại</b> để chỉnh sửa.' : 'Liên hệ Quản lý để mở lại.';
    html += '</div>';
  }
  if (kLocked && !locked) {
    html += '<div class="lock-banner" style="background:var(--surf2);border-color:var(--bdr2);color:var(--txt2)">🔒 Thông tin KH đã chốt. ';
    html += isQLAdmin ? '<button class="btn btn-sm" style="margin-left:8px" onclick="unlockKH()">Mở lại</button>' : 'Liên hệ Quản lý để mở lại.';
    html += '</div>';
  }

  // ── TABS ──
  // Dự án & Căn hộ: tất cả thấy
  // Hồ sơ/CIC/Tiến độ: CB + QL + Admin + CĐT thấy (ẩn với nobody)
  // Phân công: chỉ QL/Admin
  html += '<div class="tabs">';
  html += '<div class="tab active" onclick="swTab(this,\'t-proj\')">🏢 Dự án & Căn hộ</div>';
  html += '<div class="tab" onclick="swTab(this,\'t-docs\')">📋 Hồ sơ & Tài liệu</div>';
  html += '<div class="tab" onclick="swTab(this,\'t-cic\')">🔍 CIC</div>';
  if (!isCDTUser) html += '<div class="tab" onclick="swTab(this,\'t-hdgn\')">📋 HĐ & GN</div>';
  html += '<div class="tab" onclick="swTab(this,\'t-prog\')">📞 Cập nhật tiến độ</div>';
  if (isQLAdmin || isQTTD()) {
    html += '<div class="tab" onclick="swTab(this,\'t-adm\')">⚙️ Phân công</div>';
  }
  html += '</div>';

  // ════════════════════════════════════════════
  // TAB 1: DỰ ÁN & CĂN HỘ
  // ════════════════════════════════════════════
  html += '<div id="t-proj">';

  // ── Thông tin KH chính ──
  // CB (hồ sơ mình) + QL + Admin sửa | QTTD / CĐT chỉ xem
  var khEditable = (isCBOwner || isQLAdmin || isAdmin()) && !kLocked && !locked;
  var khDim = khEditable ? '' : 'disabled';
  var khDimClass = khEditable ? '' : 'cdt-section-dim';
  html += '<div class="fsec ' + khDimClass + '">';
  html += '<div class="fsec-title" style="display:flex;align-items:center;justify-content:space-between">';
  html += '<span>Thông tin khách hàng chính</span>';
  // Nút chốt KH: chỉ CB/QL/Admin (không phải CĐT)
  if ((isCBOwner || isQLAdmin || isAdmin()) && !locked && !kLocked) {
    html += '<button class="btn btn-sm btn-amber" onclick="lockKH()">🔒 Chốt thông tin KH</button>';
  }
  html += '</div>';
  html += '<div class="fgrid">';
  html += '<div class="fg"><label>Nhân xưng</label><select id="f-sal" '+(khDim||'')+' style="height:34px;border:1px solid var(--border);border-radius:6px;padding:0 8px;background:var(--card);color:var(--txt);width:100%"><option value="">-- Chọn --</option><option value="Ông"'+(dv('salutation')==='Ông'?' selected':'')+'>Ông</option><option value="Bà"'+(dv('salutation')==='Bà'?' selected':'')+'>Bà</option></select></div>';
  html += fld('Họ và tên *','f-tenKH',dv('tenKH'),khDim,'Nguyễn Văn A');
  html += fld('CCCD / CMND','f-cccd',dv('cccd'),khDim);
  html += fld('Nơi cấp CCCD','f-idplace',dv('id_issue_place'),khDim,'VD: Cục CS ĐKQL cư trú và DLQG về dân cư');
  html += fld('Ngày cấp CCCD','f-iddate',dv('id_issue_date'),khDim,'','date');
  html += fld('Số điện thoại','f-sdt',dv('sdt'),khDim);
  html += fld('Email','f-email',dv('email'),khDim,'vd: nguyenvana@gmail.com');
  html += fld('Số CIF','f-cif',dv('cif'),khDim,'VD: 1234567890','','','oninput="(function(el){var yr=new Date().getFullYear();var cif=el.value.trim();var hdtd=document.getElementById(\'f-hdtd\');var mort=document.getElementById(\'f-mortgage\');if(hdtd&&!hdtd.dataset.manualEdit)hdtd.value=cif?\'01/\'+yr+\'/\'+cif+\'/HĐTD\':\'\';if(mort&&!mort.dataset.manualEdit)mort.value=cif?\'01/\'+yr+\'/\'+cif+\'/HĐTC\':\'\'})(this)"');
  html += fld('Ngày sinh','f-ns',dv('ngaySinh'),khDim,'','date');
  html += fld('Địa chỉ thường trú','f-permaddr',dv('permanent_address'),khDim,'','','ffull');
  html += fld('Địa chỉ liên hệ','f-dc',dv('diaChi'),khDim,'','','ffull');
  html += fld('Nghề nghiệp','f-nn',dv('ngheNghiep'),khDim);
  html += '<div class="fg"><label>Thu nhập/tháng (tr.đ)</label>' + numInput('f-tn',dv('thuNhap'),khDim) + '</div>';
  html += '</div></div>';

  // ── Nơi công tác người 1 ──
  html += '<div class="fsec ' + khDimClass + '">';
  html += '<div class="fsec-title">Nơi công tác — Người vay 1</div>';
  html += '<div style="font-size:12px;font-weight:700;color:var(--blue);margin-bottom:6px;margin-top:4px">Nơi công tác 1</div>';
  html += '<div class="fgrid">';
  html += fld('Đơn vị công tác','f-wk1',dv('workplace'),khDim,'VD: Công ty TNHH ABC','','ffull');
  html += fld('Địa chỉ','f-wk1addr',dv('workplace_address'),khDim,'','','ffull');
  html += fld('Số điện thoại','f-wk1phone',dv('workplace_phone'),khDim);
  html += fld('Chức vụ','f-wk1title',dv('job_title'),khDim,'VD: Trưởng phòng');
  html += '</div>';
  html += '<div style="font-size:12px;font-weight:700;color:var(--blue);margin-bottom:6px;margin-top:10px">Nơi công tác 2 (nếu có)</div>';
  html += '<div class="fgrid">';
  html += fld('Đơn vị công tác','f-wk2',dv('workplace2'),khDim,'','','ffull');
  html += fld('Địa chỉ','f-wk2addr',dv('workplace2_address'),khDim,'','','ffull');
  html += fld('Số điện thoại','f-wk2phone',dv('workplace2_phone'),khDim);
  html += fld('Chức vụ','f-wk2title',dv('job_title2'),khDim);
  html += '</div></div>';

  // ── Vợ/chồng ──
  var hasVC = h && h.coVoChong;
  html += '<div class="fsec ' + khDimClass + '">';
  html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0">';
  var canToggle = (isCBOwner || isQLAdmin || isAdmin()) && !kLocked && !locked;
  html += '<div id="vc-track" style="width:38px;height:22px;border-radius:11px;background:'+(hasVC?'var(--blue)':'var(--bdr2)')+';position:relative;'+(canToggle?'cursor:pointer;':'')+'" onclick="'+(canToggle?'toggleVC()':'')+'">';
  html += '<div id="vc-dot" style="width:16px;height:16px;border-radius:50%;background:#fff;position:absolute;top:3px;left:'+(hasVC?'19px':'3px')+';transition:.2s"></div></div>';
  html += '<span style="font-size:13px;font-weight:500'+(canToggle?';cursor:pointer':'')+'" onclick="'+(canToggle?'toggleVC()':'')+'" >Có vợ / chồng đồng vay</span>';
  html += '<input type="checkbox" id="f-coVC" '+(hasVC?'checked':'')+' style="display:none">';
  html += '</div>';
  html += '<div id="sec-vc" style="display:'+(hasVC?'block':'none')+'">';
  html += '<div class="vc-section">';
  html += '<div style="font-size:12px;font-weight:700;color:var(--blue);margin-bottom:10px">THÔNG TIN VỢ / CHỒNG ĐỒNG VAY</div>';
  html += '<div class="fgrid">';
  html += '<div class="fg"><label>Nhân xưng</label><select id="f-salVC" '+(khDim||'')+' style="height:34px;border:1px solid var(--border);border-radius:6px;padding:0 8px;background:var(--card);color:var(--txt);width:100%"><option value="">-- Chọn --</option><option value="Ông"'+(dv('co_salutation')==='Ông'?' selected':'')+'>Ông</option><option value="Bà"'+(dv('co_salutation')==='Bà'?' selected':'')+'>Bà</option></select></div>';
  html += fld('Họ và tên','f-tenVC',dv('tenVC'),khDim);
  html += fld('CCCD / CMND','f-cccdVC',dv('cccdVC'),khDim);
  html += fld('Nơi cấp CCCD','f-idplaceVC',dv('co_id_issue_place'),khDim,'VD: Cục CS ĐKQL cư trú và DLQG về dân cư');
  html += fld('Ngày cấp CCCD','f-iddateVC',dv('co_id_issue_date'),khDim,'','date');
  html += fld('Số điện thoại','f-sdtVC',dv('sdtVC'),khDim);
  html += fld('Email','f-emailVC',dv('emailVC'),khDim,'vd: email@gmail.com');
  html += fld('Số CIF','f-cifVC',dv('cifVC'),khDim,'VD: 1234567890');
  html += fld('Ngày sinh','f-nsVC',dv('ngaySinhVC'),khDim,'','date');
  html += fld('Địa chỉ thường trú','f-permaddrVC',dv('co_permanent_address'),khDim,'','','ffull');
  html += fld('Địa chỉ liên hệ','f-dcVC',dv('diaChiVC'),khDim,'VD: 123 Nguyễn Trãi, Hà Nội','','ffull');
  html += fld('Nghề nghiệp','f-nnVC',dv('ngheNghiepVC'),khDim);
  html += '<div class="fg"><label>Thu nhập/tháng (tr.đ)</label>' + numInput('f-tnVC',dv('thuNhapVC'),khDim) + '</div>';
  html += '</div>';
  // Nơi công tác người 2
  html += '<div style="font-size:12px;font-weight:700;color:var(--blue);margin:12px 0 6px">Nơi công tác 1</div>';
  html += '<div class="fgrid">';
  html += fld('Đơn vị công tác','f-cowk1',dv('co_workplace'),khDim,'','','ffull');
  html += fld('Địa chỉ','f-cowk1addr',dv('co_workplace_address'),khDim,'','','ffull');
  html += fld('Số điện thoại','f-cowk1phone',dv('co_workplace_phone'),khDim);
  html += fld('Chức vụ','f-cowk1title',dv('co_job_title'),khDim);
  html += '</div>';
  html += '<div style="font-size:12px;font-weight:700;color:var(--blue);margin:10px 0 6px">Nơi công tác 2 (nếu có)</div>';
  html += '<div class="fgrid">';
  html += fld('Đơn vị công tác','f-cowk2',dv('co_workplace2'),khDim,'','','ffull');
  html += fld('Địa chỉ','f-cowk2addr',dv('co_workplace2_address'),khDim,'','','ffull');
  html += fld('Số điện thoại','f-cowk2phone',dv('co_workplace2_phone'),khDim);
  html += fld('Chức vụ','f-cowk2title',dv('co_job_title2'),khDim);
  html += '</div></div></div></div>';

  // ── Căn hộ & HĐMB ──
  // Diện tích / giá + Số HĐMB: CB + QL + QTTD + CDT admin + Admin sửa
  var canEditHDMBData = (isCBOwner || isQLAdmin || isQTTD() || isCDTAdmin || isAdmin());
  var canEditHDCode   = (isCBOwner || isQTTD() || isCDTAdmin || isQL() || isAdmin());
  var hdmbDataDim  = canEditHDMBData ? (locked ? 'disabled' : '') : 'disabled';
  var hdmbCodeDim  = canEditHDCode   ? (locked ? 'disabled' : '') : 'disabled';
  var hdmbDimClass = (!canEditHDMBData && !canEditHDCode) ? 'cdt-section-dim' : '';
  // legacy alias dùng cho saveProjQL / saveProjCDT check
  var hdmbDim = hdmbDataDim;
  html += '<div class="fsec ' + hdmbDimClass + '">';
  html += '<div class="fsec-title">Căn hộ & Hợp đồng mua bán</div>';
  html += '<div class="fgrid fgrid3">';
  html += fld('Mã căn hộ','f-mach',dv('maCanHo'),hdmbDataDim);
  html += fld('Đại lý','f-daily',dv('daiLy'),hdmbDataDim,'VD: An Việt Homes');
  html += fld('Tầng','f-tang',dv('tang'),hdmbDataDim);
  html += fld('Diện tích sử dụng (m²)','f-dt',dv('dienTich'),hdmbDataDim);
  html += fld('Diện tích sàn XD (m²)','f-areaconstruct',dv('area_construction'),hdmbDataDim);
  html += '<div class="fg"><label>Giá HĐMB không KPBT (VNĐ)</label>' + numInput('f-giahdmb',dv('giaHDMB'),hdmbDataDim) + '</div>';
  html += '<div class="fg"><label>Giá HĐMB có KPBT (VNĐ)</label>' + numInput('f-hdmbwithmgt',dv('hdmb_value_with_mgt'),hdmbDataDim) + '</div>';
  html += fld('Số HĐMB','f-sohdmb',dv('soHDMB'),hdmbCodeDim,'VD: 389 → tự tạo 389/'+new Date().getFullYear()+'/mã căn/01/PRIMA BAY','','',
    'onblur="(function(el){' +
      'var raw=el.value.trim();' +
      'if(!raw)return;' +
      'var full=buildHDMBCode(raw,null);' +
      'el.value=full;' +
      'var yr=new Date().getFullYear();' +
      'var maCanHo=(window._curHS&&window._curHS.maCanHo)||\'mã căn\';' +
      'var htls=document.getElementById(\'f-htls\');' +
      'var qlts=document.getElementById(\'f-qlts\');' +
      'if(htls&&!htls.dataset.manualEdit)htls.value=full?(full.replace(\'/HĐMB/PRIMA BAY\',\'/TTHTLS/PRIMA BAY\')):\'\';' +
      'if(qlts&&!qlts.dataset.manualEdit)qlts.value=full?(full.replace(\'/HĐMB/PRIMA BAY\',\'/TTQLTS/PRIMA BAY\')):\'\'' +
    '})(this)"');
  html += fld('Ngày ký HĐMB','f-ngayky',dv('ngayKyHDMB'),hdmbCodeDim,'','date','','onchange="onNgayKyChange()"');
  html += '</div></div>';

  // ── VTC & Nhu cầu vay ──
  // CB (hồ sơ mình) + QL + QTTD + CDT admin + Admin sửa
  var canEditVTC = (isCBOwner || isQLAdmin || isQTTD() || isCDTAdmin || isAdmin());
  var vtcDim = canEditVTC ? (locked ? 'disabled' : '') : 'disabled';
  var vtcDimClass = !canEditVTC ? 'cdt-section-dim' : '';
  html += '<div class="fsec ' + vtcDimClass + '">';
  html += '<div class="fsec-title">Vốn tự có (VTC) & Nhu cầu vay</div>';
  html += '<div class="fgrid fgrid3">';
  html += '<div class="fg"><label>VTC phải nộp (VNĐ)</label>' + numInput('f-vtcphai',dv('vtcPhaiNop'),vtcDim) + '</div>';
  html += '<div class="fg"><label>VTC đã nộp hiện tại (VNĐ)</label>' + numInput('f-vtcdanop',dv('vtcDaNop'),vtcDim) + '</div>';
  html += '<div class="fg"><label>Số tiền vay đề xuất (VNĐ)</label>' + numInput('f-stv',dv('soTienVay'),vtcDim) + '</div>';
  html += '<div class="fg"><label>Hình thức vay (thời gian HTLS)</label>';
  html += '<input id="f-hthucvay" value="'+(dv('hinhThucVay')||'30 tháng HTLS')+'" '+(vtcDim ? 'disabled' : '')+' placeholder="VD: 30 tháng HTLS"></div>';
  html += '<div class="fg"><label>CSBH áp dụng</label>';
  html += '<input id="f-csbh" value="'+dv('csChinhSach')+'" '+(vtcDim ? 'disabled' : '')+' placeholder="VD: 20260617_Prima_vay"></div>';
  html += fld('Kỳ hạn vay (tháng)','f-kh',dv('kyHan'),vtcDim);
  html += '</div></div>';

  // ── Phê duyệt & Giải ngân ──
  // CB phân công sửa | QL/Admin/CĐT xem (dim)
  // Điều kiện: đủ HS (3 nhóm gt+tn+tsbd)
  var ckObj = h ? (h.ck || {}) : {};
  var reqGrps = ['gt','tn','tsbd'];
  var ckOK = isQLAdmin || reqGrps.every(function(gid){
    var grp=CK_GROUPS.find(function(g){return g.id===gid;});
    return grp && grp.items.every(function(it){return ckObj[it.id];});
  });
  var gnCanEdit = isCBOwner && !locked && ckOK && !isViewerUser;
  var gnDim = gnCanEdit ? '' : 'disabled';
  var gnDimClass = (!isCBOwner && !isQLAdmin) ? 'cdt-section-dim' : (isCBOwner && !ckOK ? 'cdt-section-dim' : '');
  html += '<div class="fsec ' + gnDimClass + '">';
  html += '<div class="fsec-title">Phê duyệt & Giải ngân';
  if (isCBOwner && !ckOK) {
    html += '<span style="font-size:11px;font-weight:400;color:var(--amber);margin-left:8px">⚠️ Cần đủ Giấy tờ CN + Thu nhập + TSBĐ</span>';
  }
  html += '</div>';
  html += '<div class="fgrid fgrid3">';
  html += '<div class="fg"><label>Phê duyệt hạn mức vay (VNĐ)</label>' + numInput('f-hmduyet',dv('hanMucDuocDuyet'),gnDim) + '</div>';
  html += fld('Ngày giải ngân','f-ngaygn',dv('ngayGiaiNgan'),gnDim,'','date');
  html += '<div class="fg"><label>Số tiền giải ngân (VNĐ)</label>' + numInput('f-stgn',dv('soTienGiaiNgan'),gnDim) + '</div>';
  var hanGNVal = dv('hanGiaiNgan') || calcHanGN(dv('ngayKyHDMB'));
  // Hạn GN: QL + CDT + CB owner + Admin + QTTD
  var hanGNDis = (isQL() || isCDTUser || isCBOwner || isQTTD()) && !locked ? '' : 'disabled';
  html += '<div class="fg"><label>Hạn giải ngân (tối đa)</label>';
  html += '<input type="date" id="f-hangn" value="'+hanGNVal+'" '+hanGNDis+' placeholder="= Ngày ký HĐMB + 45 ngày"></div>';
  html += '<div class="fg ffull"><div style="font-size:11px;color:var(--txt3);margin-top:2px">Mặc định = Ngày ký HĐMB + 45 ngày. CĐT / Quản lý / Admin có thể điều chỉnh.</div></div>';
  html += '</div></div>';

  // Nút lưu — hiện khi có quyền sửa ít nhất một phần
  var canSaveAny = !locked && (isCBOwner || isAdmin() || isQTTD() || (isQL() && !isAdmin()));
  html += '<div class="save-bar" id="proj-save-bar" style="display:'+(canSaveAny?'flex':'none')+'">';
  html += '<button class="btn btn-primary" onclick="saveAll()">💾 Lưu tất cả</button>';
  if (isQL() && !isAdmin()) html += '<span style="font-size:12px;color:var(--txt3);margin-left:8px">Lưu toàn bộ thông tin hồ sơ</span>';
  if (isQTTD()) html += '<span style="font-size:12px;color:var(--txt3);margin-left:8px">Lưu căn hộ & HĐMB (không sửa thông tin KH)</span>';
  html += '</div>';
  html += '</div>'; // t-proj

  // ════════════════════════════════════════════
  // TAB 2: HỒ SƠ & TÀI LIỆU
  // Tất cả thấy | CB nhập | QL/Admin/CĐT xem (dim)
  // ════════════════════════════════════════════
  var docLocked = locked || (!isCBOwner && !isQLAdmin);
  html += '<div id="t-docs" style="display:none">';
  if (isCDTUser || isViewerUser || (isQLAdmin && locked)) {
    html += '<div class="info-banner">📋 Chỉ xem — chỉ Cán bộ phụ trách được cập nhật hồ sơ tài liệu.</div>';
  }
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">';
  html += '<span style="font-size:13px;font-weight:500">Trạng thái thu thập giấy tờ:</span>';
  html += '<span id="ck-pct" style="font-size:13px;font-weight:600;color:var(--blue)"></span></div>';
  html += '<div id="docs-grid"></div>';
  html += '<div class="save-bar" style="display:'+(isCBOwner && !locked?'flex':'none')+'">';
  html += '<button class="btn btn-success btn-sm" onclick="saveCK()">💾 Lưu checklist</button>';
  html += '<span id="ck-saved" style="font-size:12px;color:var(--green);display:none;margin-left:8px">✓ Đã lưu</span>';
  html += '</div>';
  html += '</div>';

  // ════════════════════════════════════════════
  // TAB 3: CIC
  // Tất cả thấy | CB nhập | QL/Admin/CĐT xem (dim)
  // ════════════════════════════════════════════
  var cic = h && h.cic ? h.cic : {};
  var cicDim = (!isCBOwner || locked || isViewerUser) ? 'disabled' : '';
  var cicDimClass = (!isCBOwner || isViewerUser) ? 'cdt-section-dim' : '';
  html += '<div id="t-cic" style="display:none">';
  if (isCDTUser || isQLAdmin) {
    html += '<div class="info-banner">🔍 Chỉ xem — chỉ Cán bộ phụ trách được nhập kết quả CIC.</div>';
  }
  html += '<div class="cic-box ' + cicDimClass + '">';

  // ── KH CHÍNH ────────────────────────────────
  html += '<div style="font-size:13px;font-weight:700;color:var(--blue);margin-bottom:10px">CIC — Khách hàng chính: ' + (dv('tenKH')||'—') + '</div>';
  html += '<div class="fgrid fgrid3" style="margin-bottom:14px">';
  html += fld('Mã số CIC','cic-masocic',cic.maSoCIC||'',cicDim,'VD: 0100001234');
  html += fld('Tổng dư nợ (VNĐ)','cic-dn',String(cic.tongDuNo||''),cicDim,'','number');
  html += fld('Dư nợ thẻ tín dụng (VNĐ)','cic-the',String(cic.duNoThe||''),cicDim,'','number');
  html += '<div class="fg"><label>Nhóm nợ cao nhất</label>';
  html += '<select id="cic-nn" '+(cicDim?'disabled':'')+' onchange="onCICGroupChange()">';
  html += '<option value="">-- Chọn --</option>';
  for (var n=1;n<=5;n++){
    var sel2=(cic.nhomNo==n)?'selected':'';
    var lbl=n===1?' (✅ Đủ tiêu chuẩn)':' (❌ Sẽ từ chối tự động)';
    html+='<option value="'+n+'" '+sel2+'>Nhóm '+n+lbl+'</option>';
  }
  html+='</select>';
  html+='<div id="cic-nn-warn" style="display:'+(cic.nhomNo>=2?'block':'none')+';margin-top:5px;padding:6px 10px;background:#FDEAEA;border-radius:6px;font-size:12px;color:#8A1F1F;font-weight:600">';
  html+='❌ Điều kiện KHÔNG ĐẠT: Nhóm nợ ≥ 2 → Tự động Từ chối hồ sơ!</div></div>';
  html += fld('Ngày tra CIC','cic-ngay',cic.ngay||'',cicDim,'','date');
  html += '</div>';
  html += '<div style="font-size:13px;font-weight:600;margin-bottom:8px">Dư nợ từng TCTD — KH chính:</div>';
  html += '<div id="cic-tctd-list"></div>';
  if (isCBOwner && !locked && !isViewerUser) {
    html += '<button class="btn btn-sm" style="margin-top:8px" onclick="addCICRow()">+ Thêm TCTD</button>';
  }

  // ── VỢ/CHỒNG (nếu có) ────────────────────────
  var hasVCNow = (h && h.coVoChong) || (document.getElementById('f-coVC') && document.getElementById('f-coVC').checked);
  if (hasVCNow || (cic.vcTongDuNo || cic.vcNhomNo)) {
    html += '<div class="divider" style="margin:14px 0"></div>';
    html += '<div style="font-size:13px;font-weight:700;color:var(--blue);margin-bottom:10px">CIC — Vợ / Chồng: ' + (dv('tenVC')||'—') + '</div>';
    html += '<div class="fgrid fgrid3" style="margin-bottom:14px">';
    html += fld('Mã số CIC','cic-vcmasocic',cic.vcMaSoCIC||'',cicDim,'VD: 0100001234');
    html += fld('Tổng dư nợ (VNĐ)','cic-vcdn',String(cic.vcTongDuNo||''),cicDim,'','number');
    html += fld('Dư nợ thẻ tín dụng (VNĐ)','cic-vcthe',String(cic.vcDuNoThe||''),cicDim,'','number');
    html += '<div class="fg"><label>Nhóm nợ cao nhất</label>';
    html += '<select id="cic-vcnn" '+(cicDim?'disabled':'')+' onchange="onCICVCGroupChange()">';
    html += '<option value="">-- Chọn --</option>';
    for (var n2=1;n2<=5;n2++){
      var sel3=(cic.vcNhomNo==n2)?'selected':'';
      var lbl2=n2===1?' (✅ Đủ tiêu chuẩn)':' (❌ Sẽ từ chối tự động)';
      html+='<option value="'+n2+'" '+sel3+'>Nhóm '+n2+lbl2+'</option>';
    }
    html += '</select>';
    html += '<div id="cic-vcnn-warn" style="display:'+(cic.vcNhomNo>=2?'block':'none')+';margin-top:5px;padding:6px 10px;background:#FDEAEA;border-radius:6px;font-size:12px;color:#8A1F1F;font-weight:600">';
    html += '❌ Vợ/Chồng: Nhóm nợ ≥ 2 → Tự động Từ chối!</div></div>';
    html += fld('Ngày tra CIC vợ/chồng','cic-vcngay',cic.vcNgay||'',cicDim,'','date');
    html += '</div>';
    html += '<div style="font-size:13px;font-weight:600;margin-bottom:8px">Dư nợ từng TCTD — Vợ/Chồng:</div>';
    html += '<div id="cic-vc-tctd-list"></div>';
    if (isCBOwner && !locked) {
      html += '<button class="btn btn-sm" style="margin-top:8px" onclick="addCICVCRow()">+ Thêm TCTD vợ/chồng</button>';
    }
  }

  if (isCBOwner && !locked) {
    if (!isViewerUser) html += '<div class="save-bar"><button class="btn btn-primary btn-sm" onclick="saveCIC()">💾 Lưu kết quả CIC</button></div>';
  }
  html += '</div></div>';

  // ════════════════════════════════════════════
  // TAB 4: CẬP NHẬT TIẾN ĐỘ
  // CĐT + CB + QL/Admin đều thấy
  // CB nhập báo cáo | CĐT nhập phản hồi
  // ════════════════════════════════════════════
  html += '<div id="t-hdgn" style="display:none">';
  var hdgnDis = (!isCBOwner && !isQLAdmin && !isQTTD()) ? 'disabled' : '';
  var fmtN = function(v){ return (v||v===0) ? parseInt(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.') : ''; };
  var _yr = new Date().getFullYear();
  var sugHDTD     = h.cif ? ('01/'+_yr+'/'+h.cif+'/HĐTD') : '';
  var sugMortgage = h.cif ? ('01/'+_yr+'/'+h.cif+'/HĐTC') : '';
  var _hdmbFull = h.soHDMB ? buildHDMBCode(h.soHDMB, h.maCanHo) : '';
  var sugHTLS = _hdmbFull ? _hdmbFull.replace('/HĐMB/PRIMA BAY','/TTHTLS/PRIMA BAY') : 'số TT/'+_yr+'/mã căn/01/TTHTLS/PRIMA BAY';
  var sugQLTS = _hdmbFull ? _hdmbFull.replace('/HĐMB/PRIMA BAY','/TTQLTS/PRIMA BAY') : 'số TT/'+_yr+'/mã căn/01/TTQLTS/PRIMA BAY';
  // Giá trị hiển thị: nếu đã có giá trị lưu → dùng; chưa có → dùng gợi ý tự động
  var valHDTD     = h.hdtd_code     || sugHDTD;
  var valMortgage = h.mortgage_code || sugMortgage;
  html += '<div class="info-section"><div class="section-title">📄 Hợp đồng tín dụng</div><div class="fgrid">';
  html += fld('Mã PCA','f-pca',h.pca_code||'',hdgnDis,'VD: PCA-001');
  html += fld('Số HĐTD','f-hdtd',valHDTD,hdgnDis,'01/'+_yr+'/CIF/HĐTD','','','oninput="this.dataset.manualEdit=\'1\'"');
  html += fld('Số HĐ thế chấp','f-mortgage',valMortgage,hdgnDis,'01/'+_yr+'/CIF/HĐTC','','','oninput="this.dataset.manualEdit=\'1\'"');
  html += '</div></div>';
  html += '<div class="info-section"><div class="section-title">📝 Thỏa thuận</div><div class="fgrid">';
  var valHTLS = h.htls_agreement || sugHTLS;
  var valQLTS = h.qlts_agreement || sugQLTS;
  html += fld('Thỏa thuận HTLS','f-htls',valHTLS,hdgnDis,sugHTLS,'','','oninput="this.dataset.manualEdit=\'1\'"');
  html += fld('Thỏa thuận QLTS','f-qlts',valQLTS,hdgnDis,sugQLTS,'','','oninput="this.dataset.manualEdit=\'1\'"');
  html += '</div></div>';
  html += '<div class="info-section"><div class="section-title">💰 Tài chính giải ngân</div><div class="fgrid">';
  html += '<div class="fg"><label>Giải ngân lần 1 (VNĐ)</label>'+numInput('f-disb1',h.disbursement_1,hdgnDis)+'</div>';
  html += '<div class="fg"><label>Vốn tự có (VNĐ) <span style="font-size:11px;color:var(--txt3)">(gợi ý = VTC đã nộp)</span></label>'+numInput('f-equity',h.equity_amount||h.vtcDaNop,hdgnDis)+'</div>';
  html += '<div class="fg"><label>Giá trị quy đổi 70% (VNĐ) <span style="font-size:11px;color:var(--txt3)">(gợi ý = Giá HĐMB × 70%)</span></label>'+numInput('f-collratio',h.collateral_value_ratio||(h.giaHDMB?Math.round(parseInt(h.giaHDMB)*0.7):''),hdgnDis)+'</div>';
  html += '<div class="fg"><label>ST 5% căn hộ (VNĐ)</label>'+numInput('f-vtc5pct',h.vtc_5pct,hdgnDis)+'</div>';
  html += fld('TK thanh toán KH','f-payacct',h.payment_account||'',hdgnDis,'Số tài khoản');
  html += '<div class="fg"><label>Số tiền duy trì TK TT (VNĐ) <span style="font-size:11px;color:var(--txt3)">(mặc định 10tr)</span></label>'+numInput('f-minbal',h.min_account_balance||10000000,hdgnDis)+'</div>';
  html += '</div></div>';
  html += '<div class="info-section"><div class="section-title">🏦 Định giá tài sản</div><div class="fgrid">';
  html += '<div class="fg"><label>Định giá lần 1 (VNĐ)</label>'+numInput('f-val1',h.valuation_1,hdgnDis)+'</div>';
  html += '<div class="fg"><label>Định giá lần 2 (VNĐ)</label>'+numInput('f-val2',h.valuation_2,hdgnDis)+'</div>';
  html += '</div></div>';
  html += '<div class="info-section"><div class="section-title">📋 Kỳ hạn vay & Ân hạn</div><div class="fgrid">';
  html += '<div class="fg"><label>Kỳ hạn vay (tháng)</label>'+numInput('f-loanmonths',h.kyHan||h.loan_term_months,hdgnDis)+'</div>';
  html += '<div class="fg"><label>Thời gian ân hạn (tháng)</label>'+numInput('f-graceperiod',h.grace_period_months,hdgnDis)+'</div>';
  html += '</div></div>';
  html += '<div class="info-section"><div class="section-title">💼 Thu nhập & Chi phí (thẩm định)</div><div class="fgrid">';
  html += '<div class="fg"><label>Thu nhập lương (VNĐ/tháng)</label>'+numInput('f-inc-salary',h.income_salary,hdgnDis)+'</div>';
  html += '<div class="fg"><label>Thu nhập kinh doanh (VNĐ/tháng)</label>'+numInput('f-inc-biz',h.income_business,hdgnDis)+'</div>';
  html += '<div class="fg"><label>Thu nhập cho thuê (VNĐ/tháng)</label>'+numInput('f-inc-rent',h.income_rental,hdgnDis)+'</div>';
  html += '<div class="fg"><label>Thu nhập khác (VNĐ/tháng)</label>'+numInput('f-inc-other',h.income_other,hdgnDis)+'</div>';
  html += '<div class="fg"><label>Chi phí sinh hoạt (VNĐ/tháng)</label>'+numInput('f-exp-living',h.expense_living,hdgnDis)+'</div>';
  html += '<div class="fg"><label>Nghĩa vụ nợ hiện tại (VNĐ/tháng)</label>'+numInput('f-exp-debt',h.expense_debt,hdgnDis)+'</div>';
  html += '</div></div>';
  var canExp = ['da_phe_duyet','soan_hs','cho_gn','da_gn','da_thong_bao'].indexOf(deriveHSStatus(h))!==-1;
  html += '<div style="padding:12px 0;display:flex;flex-wrap:wrap;gap:8px">';
  if (isCBOwner||isQLAdmin||isQTTD()) html += '<button class="btn btn-primary" onclick="saveHDGN()">💾 Lưu HĐ & GN</button>';
  if (canExp && (isCBOwner||isQLAdmin||isQTTD())) {
    html += '<button class="btn" style="background:#1F4E79;color:#fff" onclick="exportSingleHS(\''+h.id+'\')">📄 Xuất hồ sơ hợp đồng</button>';
  }
  html += '</div>';
  html += '</div>';

  html += '<div id="t-prog" style="display:none">';
  if (locked) {
    html += '<div class="lock-banner">🔒 Hồ sơ đã chốt. Không thể cập nhật tiến độ.</div>';
  } else {
    try { html += buildProgTab(h); }
    catch(err2) {
      html += '<div class="perm-banner">Lỗi hiển thị: '+err2.message+'</div>';
      console.error('buildProgTab error:', err2);
    }
  }
  html += '</div>';

  // ════════════════════════════════════════════
  // TAB 5: PHÂN CÔNG — chỉ QL/Admin
  // ════════════════════════════════════════════
  if (isQLAdmin || isQTTD()) {
    html += '<div id="t-adm" style="display:none">';
    var cbOpts = '<option value="">-- Chọn cán bộ --</option>';
    users.filter(function(u){return u.active&&(u.role==='officer'||u.role==='manager'||u.role==='cb'||u.role==='ql');})
      .forEach(function(u){
        cbOpts+='<option value="'+u.id+'"'+(h&&h.canBoId===u.id?' selected':'')+'>'+u.name+'</option>';
      });
    html += '<div class="fgrid" style="gap:12px">';
    var cbDis = isQTTD() ? 'disabled' : '';
    html += '<div class="fg ffull"><label>Cán bộ phụ trách</label><select id="f-cbid" '+cbDis+'>'+cbOpts+'</select></div>';
    html += '<div class="fg ffull"><label>Ghi chú nội bộ</label><textarea id="f-gc" '+cbDis+'>'+dv('ghiChu')+'</textarea></div>';
    html += '</div>';
    if (h) {
      html += '<div class="divider"></div>';
      html += '<div class="text-sm" style="line-height:2">Tạo: <b>'+(fmtDateVN(h.createdAt)||h.createdAt||'')+'</b>';
      if (h.lockedBy) html += ' · Chốt: <b>'+h.lockedBy+'</b> lúc '+(fmtDateVN(h.lockedAt)||h.lockedAt||'');
      html += '</div>';
    }
    if (isQLAdmin) html += '<div style="margin-top:12px"><button class="btn btn-primary btn-sm" onclick="saveAdm()">💾 Lưu phân công</button></div>';
    html += '</div>';
  }

  body.innerHTML = html;
  try { renderDocsGrid(h, docLocked); } catch(e1){ console.error('renderDocsGrid:', e1); }
  try {
    renderCICTCTDs(h&&h.cic?h.cic.tctds||[]:[]);
    var vcTctdEl=document.getElementById('cic-vc-tctd-list');
    if(vcTctdEl) renderCICVCTCTDs(h&&h.cic?h.cic.vcTctds||[]:[]);
  } catch(e2){ console.error('renderCICTCTDs:', e2); }
  buildHSFooter(h, locked);
}

function onNgayKyChange() {
  var ngayKy = document.getElementById('f-ngayky');
  var hanGN  = document.getElementById('f-hangn');
  if (!ngayKy || !hanGN || hanGN.disabled) return;
  if (ngayKy.value) {
    hanGN.value = calcHanGN(ngayKy.value);
  }
}

function calcHanGN(ngayKy) {
  if (!ngayKy) return '';
  try {
    var d = new Date(ngayKy);
    d.setDate(d.getDate() + 45);
    return d.toISOString().slice(0,10);
  } catch(e) { return ''; }
}


// Helper: build a form field

// Format số có dấu (,) ngăn cách hàng nghìn
function toggleVC() {
  var cb = document.getElementById('f-coVC'); if (!cb) return;
  cb.checked = !cb.checked;
  document.getElementById('sec-vc').style.display = cb.checked ? 'block' : 'none';
  document.getElementById('vc-track').style.background = cb.checked ? 'var(--blue)' : 'var(--bdr2)';
  document.getElementById('vc-dot').style.left = cb.checked ? '19px' : '3px';
}

// Docs grid: checklist + upload combined per group
function renderDocsGrid(h, locked) {
  var el = document.getElementById('docs-grid'); if (!el) return;
  var ck = h ? (h.ck || {}) : {};
  var files = h ? (h.files || {}) : {};
  var html = '<div class="ck-grid">';
  CK_GROUPS.forEach(function(g) {
    if (!g || !g.id) return;
    var done = g.items.every(function(it) { return ck[it.id]; });
    html += '<div class="ck-card">';
    html += '<div class="ck-hd ' + (done ? 'done' : '') + '">';
    html += '<span>' + g.label.toUpperCase() + '</span>';
    html += '<span style="font-size:11px">' + g.items.filter(function(it) { return ck[it.id]; }).length + '/' + g.items.length + '</span>';
    html += '</div>';
    html += '<div class="ck-body">';
    g.items.forEach(function(it) {
      var chk = ck[it.id] ? 'checked' : '';
      var cls2 = ck[it.id] ? 'ck-item checked' : 'ck-item';
      var dattr = 'data-ckid="' + it.id + '"';
      html += '<div class="' + cls2 + '" ' + dattr + ' onclick="' + (locked ? '' : 'toggleCK(this.dataset.ckid)') + '">';
      html += '<input type="checkbox" id="ck-' + it.id + '" ' + chk + (locked ? ' disabled' : '') + ' onclick="event.stopPropagation()">';
      html += '<span class="ck-lbl">' + it.label + '</span></div>';
    });
    html += '</div>';
    // Upload zone in same card
    html += '<div style="padding:8px 14px;border-top:1px solid var(--bdr);background:var(--surf2)">';
    if (!locked) {
      var gid = g.id;
      html += '<div class="upload-zone" data-upid="' + gid + '" onclick="triggerUpload(this.dataset.upid)">&#128206; Upload PDF / Anh</div>';
      html += '<input type="file" id="upl-' + gid + '" style="display:none" multiple accept=".pdf,image/*" data-gid="' + gid + '" onchange="handleUploadEvt(event)">';
    }
    html += '<div class="file-list" id="fl-' + g.id + '">';
    (files[g.id] || []).forEach(function(f, i) {
      html += '<div class="file-item"><span class="fi-name">&#128196; ' + f.name + '</span>';
      if (!locked) html += '<span class="fi-del" data-gid="' + g.id + '" data-idx="' + i + '" onclick="delFileEvt(this.dataset.gid,this.dataset.idx)">&#10005;</span>';
      html += '</div>';
    });
    html += '</div></div>';
    // Tick all
    html += '<div class="ck-all" data-gid="' + g.id + '" onclick="' + (locked ? '' : 'toggleCKGroup(this.dataset.gid)') + '">';
    html += '<input type="checkbox" ' + (done ? 'checked' : '') + (locked ? ' disabled' : '') + ' onclick="event.stopPropagation()">';
    html += '<span>' + (done ? '&#10003; Du nhom nay' : 'Tich tat ca nhom nay') + '</span></div>';
    html += '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
  updateCKPct();
}

function triggerUpload(gid) {
  var el = document.getElementById('upl-' + gid);
  if (el) el.click();
}
function handleUploadEvt(e) {
  var gid = e.target.dataset.gid;
  handleUpload(e, gid);
}
function delFileEvt(gid, idx) {
  delFile(gid, parseInt(idx));
}

// Progress tab

function buildProgTab(h) {
  var contacts = h && h.contacts ? h.contacts : [];
  var lv = hsAlertLevel(h || {});
  var html2 = '';
  if (lv === 'over') html2 += '<div class="perm-banner">Quá hạn cập nhật! Cần báo cáo tình trạng ngay.</div>';
  else if (lv === 'warn') html2 += '<div class="lock-banner">Sắp đến hạn cập nhật 7 ngày. Vui lòng cập nhật báo cáo tuần.</div>';

  // Countdown
  if (h) {
    var dA = h.lastContactAt ? daysSince(h.lastContactAt) : null;
    var dL = dA !== null ? Math.max(0, 7 - dA) : null;
    var dGN = h.ngayGiaiNgan ? daysUntil(h.ngayGiaiNgan) : null;
    var cCls = lv==='over'?'dc-over':lv==='warn'?'dc-warn':lv==='new'?'dc-new':'dc-ok';
    html2 += '<div style="display:flex;gap:12px;margin-bottom:14px;align-items:center;flex-wrap:wrap">';
    if (dA !== null) {
      html2 += '<div class="days-circle ' + cCls + '">' + dA + '<span style="font-size:9px">ngày</span></div>';
      html2 += '<div><div style="font-size:13px;font-weight:600">Cập nhật gần nhất: ' + fmtDate(h.lastContactAt || '') + '</div>';
      html2 += '<div class="text-sm">Còn ' + (dL !== null ? dL : '--') + ' ngày đến hạn (chu kỳ 7 ngày)</div></div>';
    } else {
      html2 += '<div class="days-circle dc-new">?</div>';
      html2 += '<div><div style="font-size:13px;font-weight:600">Chưa có báo cáo lần nào</div>';
      html2 += '<div class="text-sm">Hãy tạo báo cáo đầu tiên bên dưới</div></div>';
    }
    if (h.ngayGiaiNgan) {
      var gCls = dGN !== null ? (dGN<=3?'dc-over':dGN<=7?'dc-warn':'dc-ok') : 'dc-ok';
      html2 += '<div style="margin-left:auto;text-align:center">';
      html2 += '<div class="days-circle ' + gCls + '" style="margin:0 auto 4px">' + (dGN !== null ? dGN : '--') + '</div>';
      html2 += '<div style="font-size:11px;color:var(--txt3)">ngày đến GN</div></div>';
    }
    // Latest status badge
    if (h.ketQuaKhaiThac) {
      html2 += '<div style="margin-left:8px">';
      html2 += '<div style="font-size:11px;color:var(--txt3);margin-bottom:4px">Tình trạng hiện tại</div>';
      html2 += '<span class="badge b-dang">' + (CT_STATUS_LABELS_FULL[h.ketQuaKhaiThac]||h.ketQuaKhaiThac) + '</span>';
      html2 += '</div>';
    }
    html2 += '</div>';
  }

  // Thong tin giai ngan hien tai (if set)
  if (h && (h.hanMucDuocDuyet || h.ngayGiaiNgan || h.soTienGiaiNgan)) {
    html2 += '<div style="background:var(--purple-l);border:1px solid #C9BEEE;border-radius:var(--r);padding:10px 14px;margin-bottom:14px;display:flex;gap:16px;flex-wrap:wrap">';
    if (h.hanMucDuocDuyet) html2 += '<div><div class="text-sm">Han muc duoc duyet</div><div style="font-weight:600;color:var(--purple)">' + Number(h.hanMucDuocDuyet).toLocaleString('vi-VN') + ' tr.d</div></div>';
    if (h.ngayGiaiNgan) html2 += '<div><div class="text-sm">Ngay giai ngan</div><div style="font-weight:600;color:var(--purple)">' + (fmtDateVN(h.ngayGiaiNgan)||h.ngayGiaiNgan) + '</div></div>';
    if (h.soTienGiaiNgan) html2 += '<div><div class="text-sm">So tien GN</div><div style="font-weight:600;color:var(--green)">' + Number(h.soTienGiaiNgan).toLocaleString('vi-VN') + ' tr.d</div></div>';
    html2 += '</div>';
  }

  // Weekly report form
  html2 += buildWeeklyReportForm(h);
  return html2;
}

function renderOutcomeOpts(h) {
  var CB_OUTCOMES = [
    { v: 'cho_bs', l: 'Chờ KH bổ sung hồ sơ', cls: '' },
    { v: 'du_hs', l: 'Hồ sơ đã đầy đủ', cls: 'sel-yes' },
    { v: 'kh_tu_choi', l: 'KH từ chối không tiếp tục', cls: 'sel-no' },
    { v: 'khong_du_tn', l: 'Không đủ thu nhập', cls: 'sel-no' },
    { v: 'kh_nghe', l: 'KH không liên lạc được', cls: 'sel-no' },
    { v: 'khac', l: 'Lý do khác', cls: '' }
  ];
  var el = document.getElementById('outcome-opts'); if (!el) return;
  var cur = h ? h.outcome : null;
  selOutcome = cur;
  var html = '';
  CB_OUTCOMES.forEach(function(o, i) {
    var active = cur === o.v ? o.cls : '';
    html += '<div class="outcome-opt ' + active + '" data-v="' + o.v + '" data-cls="' + o.cls + '" onclick="selectOutcome(this.dataset.v, this.dataset.cls)">' + o.l + '</div>';
  });
  el.innerHTML = html;
  // QL outcomes
  var elQL = document.getElementById('outcome-opts-ql');
  if (elQL) {
    var QL_OUTCOMES = [
      { v: 'duoc_vay', l: '✅ Chính thức: ĐƯỢC VAY', cls: 'sel-yes' },
      { v: 'tuchoi_ql', l: '❌ Chính thức: TỪ CHỐI', cls: 'sel-no' }
    ];
    var qlHtml = '';
    QL_OUTCOMES.forEach(function(o) {
      var active = cur === o.v ? o.cls : '';
      qlHtml += '<div class="outcome-opt ' + active + '" data-v="' + o.v + '" data-cls="' + o.cls + '" onclick="selectOutcome(this.dataset.v, this.dataset.cls)">' + o.l + '</div>';
    });
    elQL.innerHTML = qlHtml;
  }
}

function saveCBOutcome() {
  if (!currentHSId) return;
  var note = document.getElementById('f-out-note');
  var idx = hsList.findIndex(function(x) { return x.id === currentHSId; });
  hsList[idx].outcome = selOutcome;
  hsList[idx].outcomeNote = note ? note.value : '';
  hsList[idx].updatedAt = nowStr();
  var lbl = selOutcome || 'khong xac dinh';
  addLog('De xuat: ' + lbl + ' / ' + hsList[idx].tenKH, 'amber', currentHSId);
  persist(); renderHSTable(); alert('Đã lưu đề xuất!');
}

function saveQLOutcome() {
  if (!isQL() || !currentHSId) return;
  var note = document.getElementById('f-out-note');
  var idx = hsList.findIndex(function(x) { return x.id === currentHSId; });
  if (selOutcome === 'duoc_vay') {
    hsList[idx].status = 'choky';
    hsList[idx].outcome = 'duoc_vay';
  } else if (selOutcome === 'tuchoi_ql') {
    hsList[idx].status = 'tuchoi';
    hsList[idx].outcome = 'tuchoi_ql';
    hsList[idx].locked = true;
    hsList[idx].lockedBy = currentUser.name;
    hsList[idx].lockedAt = nowStr();
  }
  hsList[idx].outcomeNote = note ? note.value : '';
  hsList[idx].updatedAt = nowStr();
  addLog('Xac nhan chinh thuc: ' + (selOutcome || '') + ' / ' + hsList[idx].tenKH, 'green', currentHSId);
  persist(); renderHSTable(); renderDB(); alert('Đã xác nhận kết quả chính thức!');
  openHS(currentHSId);
}


function saveAll() {
  // 1. CĐT — riêng
  if (isCDT()) { saveProjCDT(); return; }

  // 2. CB Owner — lưu toàn bộ (KH + HĐMB + VTC)
  if (!isQL() && !isQTTD()) {
    if (document.getElementById('f-tenKH') && !document.getElementById('f-tenKH').value.trim()) {
      alert('Vui lòng nhập họ tên KH!'); return;
    }
    if (document.getElementById('f-tenKH')) saveProj();
    return;
  }

  // 3. QL — lưu toàn bộ như CB (saveProj kiểm tra disabled từng field)
  if (isQL() && !isAdmin()) {
    if (document.getElementById('f-tenKH') && !document.getElementById('f-tenKH').value.trim()) {
      alert('Vui lòng nhập họ tên KH!'); return;
    }
    if (document.getElementById('f-tenKH')) saveProj();
    return;
  }

  // 4. Admin — lưu toàn bộ như CB
  if (isAdmin()) {
    if (document.getElementById('f-tenKH') && !document.getElementById('f-tenKH').value.trim()) {
      alert('Vui lòng nhập họ tên KH!'); return;
    }
    if (document.getElementById('f-tenKH')) saveProj();
    return;
  }

  // 5. QTTD — lưu HĐMB + VTC (không lưu KH)
  if (isQTTD()) { saveProjQTTD(); return; }

  // 3. Lưu phê duyệt & GN (CB phân công / QL / Admin)
  if (document.getElementById('f-hmduyet') && !document.getElementById('f-hmduyet').disabled) {
    saveGiaiNganInfo();
  }
}

function saveProj() {
  var gv = function(id) { var el=document.getElementById(id); return el?el.value:''; };
  var gvn = function(id) {
    var el = document.getElementById(id);
    if (!el) return '';
    return el.value.replace(/\./g,'').replace(/,/g,'');
  };

  if (!gv('f-tenKH').trim()) { alert('Vui lòng nhập họ tên KH!'); return; }
  var data = {
    salutation: gv('f-sal'),
    tenKH: gv('f-tenKH'), cccd: gv('f-cccd'),
    id_issue_place: gv('f-idplace'), id_issue_date: gv('f-iddate'),
    sdt: gv('f-sdt'), ngaySinh: gv('f-ns'),
    permanent_address: gv('f-permaddr'), diaChi: gv('f-dc'),
    email: gv('f-email'),
    cif:   gv('f-cif'),
    ngheNghiep: gv('f-nn'), thuNhap: gv('f-tn'),
    workplace: gv('f-wk1'), workplace_address: gv('f-wk1addr'),
    workplace_phone: gv('f-wk1phone'), job_title: gv('f-wk1title'),
    workplace2: gv('f-wk2'), workplace2_address: gv('f-wk2addr'),
    workplace2_phone: gv('f-wk2phone'), job_title2: gv('f-wk2title'),
    coVoChong: document.getElementById('f-coVC')?document.getElementById('f-coVC').checked:false,
    co_salutation: gv('f-salVC'),
    tenVC: gv('f-tenVC'), cccdVC: gv('f-cccdVC'),
    co_id_issue_place: gv('f-idplaceVC'), co_id_issue_date: gv('f-iddateVC'),
    ngaySinhVC: gv('f-nsVC'),
    co_permanent_address: gv('f-permaddrVC'),
    sdtVC: gv('f-sdtVC'), emailVC: gv('f-emailVC'), cifVC: gv('f-cifVC'), diaChiVC: gv('f-dcVC'), ngheNghiepVC: gv('f-nnVC'), thuNhapVC: gv('f-tnVC'),
    co_workplace: gv('f-cowk1'), co_workplace_address: gv('f-cowk1addr'),
    co_workplace_phone: gv('f-cowk1phone'), co_job_title: gv('f-cowk1title'),
    co_workplace2: gv('f-cowk2'), co_workplace2_address: gv('f-cowk2addr'),
    co_workplace2_phone: gv('f-cowk2phone'), co_job_title2: gv('f-cowk2title'),
    updatedAt: nowStr()
  };
  // Căn hộ & HĐMB — chỉ ghi khi field không bị disabled
  var dtEl = document.getElementById('f-dt');
  if (dtEl && !dtEl.disabled) {
    data.maCanHo = gv('f-mach'); data.daiLy = gv('f-daily'); data.tang = gv('f-tang');
    data.dienTich = gv('f-dt'); data.area_construction = gvn('f-areaconstruct');
    data.giaHDMB = gvn('f-giahdmb'); data.hdmb_value_with_mgt = gvn('f-hdmbwithmgt');
  }
  // Số HĐMB / ngày ký
  var soHDMBEl = document.getElementById('f-sohdmb');
  if (soHDMBEl && !soHDMBEl.disabled) {
    data.soHDMB = gv('f-sohdmb'); data.ngayKyHDMB = gv('f-ngayky');
    var hanGNEl2 = document.getElementById('f-hangn');
    data.hanGiaiNgan = hanGNEl2 && hanGNEl2.value ? hanGNEl2.value : calcHanGN(gv('f-ngayky'));
  }
  // VTC & Nhu cầu vay
  var vtcEl = document.getElementById('f-vtcphai');
  if (vtcEl && !vtcEl.disabled) {
    data.vtcPhaiNop = gvn('f-vtcphai'); data.vtcDaNop = gvn('f-vtcdanop');
    data.soTienVay = gvn('f-stv'); data.kyHan = gv('f-kh');
    data.hinhThucVay = gv('f-hthucvay'); data.csChinhSach = gv('f-csbh');
  }
  // Phê duyệt & Giải ngân: chỉ ghi nếu field KHÔNG bị disabled
  var hmEl = document.getElementById('f-hmduyet');
  if (hmEl && !hmEl.disabled) data.hanMucDuocDuyet = gvn('f-hmduyet');
  var gnEl = document.getElementById('f-ngaygn');
  if (gnEl && !gnEl.disabled) data.ngayGiaiNgan = gnEl.value;
  var stgnEl = document.getElementById('f-stgn');
  if (stgnEl && !stgnEl.disabled) data.soTienGiaiNgan = gvn('f-stgn');
  // Đồng bộ HTLS/QLTS/HĐTD/HĐTC từ form
  var yr2 = new Date().getFullYear();
  var soHDMB2 = gv('f-sohdmb'); var maCanHo2 = gv('f-mach') || (hsList.find(function(x){return x.id===currentHSId;})||{}).maCanHo || '';
  var cif2 = gv('f-cif');
  var htlsEl2 = document.getElementById('f-htls'); var qltsEl2 = document.getElementById('f-qlts');
  var hdtdEl2 = document.getElementById('f-hdtd'); var mortEl2 = document.getElementById('f-mortgage');
  if (htlsEl2) { var _hfull2=soHDMB2?buildHDMBCode(soHDMB2,maCanHo2):''; data.htls_agreement = htlsEl2.value || (_hfull2?_hfull2.replace('/HĐMB/PRIMA BAY','/TTHTLS/PRIMA BAY'):''); }
  if (qltsEl2) { var _qfull2=soHDMB2?buildHDMBCode(soHDMB2,maCanHo2):''; data.qlts_agreement = qltsEl2.value || (_qfull2?_qfull2.replace('/HĐMB/PRIMA BAY','/TTQLTS/PRIMA BAY'):''); }
  // Lưu full HĐMB code
  if (soHDMB2) data.soHDMB = buildHDMBCode(soHDMB2, maCanHo2);
  if (hdtdEl2) data.hdtd_code = hdtdEl2.value || (cif2 ? '01/'+yr2+'/'+cif2+'/HĐTD' : '');
  if (mortEl2) data.mortgage_code = mortEl2.value || (cif2 ? '01/'+yr2+'/'+cif2+'/HĐTC' : '');
  if (currentHSId) {
    var idx=hsList.findIndex(function(x){return x.id===currentHSId;});
    Object.assign(hsList[idx], data);
    addLog('Cập nhật TT KH: '+data.tenKH, 'amber', currentHSId);
  } else {
    var hs=Object.assign({id:genId(),createdAt:nowStr(),status:'moi',locked:false,kLocked:false,ck:{}},data);
    hs.canBoId=currentUser.id;
    hsList.unshift(hs); currentHSId=hs.id;
    addLog('Tạo hồ sơ mới: '+hs.tenKH,'green',hs.id);
  }
  persist(); renderHSTable(); renderDB();
  var _h = hsList.find(function(x){return x.id===currentHSId;});
  console.log('[SAVE] currentHSId:', currentHSId, '_h:', _h ? 'found' : 'NOT FOUND', 'customerId:', _h && _h.customerId);
  if(_h) saveAndSync(function(){ return dbSaveLoanFile(_h); }, 'Đã lưu thông tin!');
}


// Helper: đồng bộ HTLS/QLTS từ form vào hsList khi lưu
function syncHDMBDependents(idx, gv) {
  var yr = new Date().getFullYear();
  var soHDMB = gv('f-sohdmb');
  var maCanHo = hsList[idx].maCanHo || '';
  var htlsEl = document.getElementById('f-htls');
  var qltsEl = document.getElementById('f-qlts');
  var hdmbFull = soHDMB ? buildHDMBCode(soHDMB, maCanHo) : '';
  if (soHDMB) hsList[idx].soHDMB = hdmbFull;
  if (htlsEl) hsList[idx].htls_agreement = htlsEl.value || (hdmbFull ? hdmbFull.replace('/HĐMB/PRIMA BAY','/TTHTLS/PRIMA BAY') : '');
  if (qltsEl) hsList[idx].qlts_agreement = qltsEl.value || (hdmbFull ? hdmbFull.replace('/HĐMB/PRIMA BAY','/TTQLTS/PRIMA BAY') : '');
  var hdtdEl = document.getElementById('f-hdtd');
  var mortEl = document.getElementById('f-mortgage');
  var cif = hsList[idx].cif || '';
  if (hdtdEl) hsList[idx].hdtd_code = hdtdEl.value || (cif ? '01/'+yr+'/'+cif+'/HĐTD' : '');
  if (mortEl) hsList[idx].mortgage_code = mortEl.value || (cif ? '01/'+yr+'/'+cif+'/HĐTC' : '');
}

function saveProjQL() {
  // QL được lưu: số HĐMB / ngày ký + tab Giải ngân (HĐTD, HTLS, QLTS, số tiền GN...)
  if (!isQL() || !currentHSId) return;
  var gv=function(id){var el=document.getElementById(id);return el?el.value:'';};
  var idx=hsList.findIndex(function(x){return x.id===currentHSId;});
  hsList[idx].soHDMB      = gv('f-sohdmb');
  hsList[idx].ngayKyHDMB  = gv('f-ngayky');
  syncHDMBDependents(idx, gv);
  var hanGNEl = document.getElementById('f-hangn');
  hsList[idx].hanGiaiNgan = hanGNEl && hanGNEl.value ? hanGNEl.value : calcHanGN(gv('f-ngayky'));
  hsList[idx].updatedAt   = nowStr();
  addLog('QL cập nhật số HĐMB: '+hsList[idx].tenKH,'amber',currentHSId);
  persist(); renderHSTable();
  saveAndSync(function(){ return dbSaveLoanFile(hsList[idx]); }, 'Đã lưu số HĐMB!');
  // Lưu thêm tab Giải ngân nếu QL có quyền (canSetGiaiNgan)
  if (canSetGiaiNgan() && document.getElementById('f-hmduyet') && !document.getElementById('f-hmduyet').disabled) {
    saveGiaiNganInfo();
  }
}

function saveProjQTTD() {
  // QTTD được lưu: diện tích, giá HĐMB, số HĐMB, ngày ký, VTC, số tiền vay
  if (!isQTTD() || !currentHSId) return;
  var gv=function(id){var el=document.getElementById(id);return el?el.value:'';};
  var gvn=function(id){var el=document.getElementById(id);return el?(el.value.replace(/\./g,'').replace(/,/g,'')):''};
  var idx=hsList.findIndex(function(x){return x.id===currentHSId;});
  hsList[idx].maCanHo             = gv('f-mach');
  hsList[idx].daiLy               = gv('f-daily');
  hsList[idx].tang                = gv('f-tang');
  hsList[idx].dienTich            = gv('f-dt');
  hsList[idx].area_construction   = gvn('f-areaconstruct');
  hsList[idx].giaHDMB             = gvn('f-giahdmb');
  hsList[idx].hdmb_value_with_mgt = gvn('f-hdmbwithmgt');
  hsList[idx].soHDMB              = gv('f-sohdmb');
  hsList[idx].ngayKyHDMB          = gv('f-ngayky');
  var hanGNEl = document.getElementById('f-hangn');
  hsList[idx].hanGiaiNgan = hanGNEl && hanGNEl.value ? hanGNEl.value : calcHanGN(gv('f-ngayky'));
  if (document.getElementById('f-vtcphai'))  hsList[idx].vtcPhaiNop  = gvn('f-vtcphai');
  if (document.getElementById('f-vtcdanop')) hsList[idx].vtcDaNop    = gvn('f-vtcdanop');
  if (document.getElementById('f-stv'))      hsList[idx].soTienVay   = gvn('f-stv');
  if (document.getElementById('f-hthucvay')) hsList[idx].hinhThucVay = gv('f-hthucvay');
  if (document.getElementById('f-csbh'))     hsList[idx].csChinhSach = gv('f-csbh');
  if (document.getElementById('f-kh'))       hsList[idx].kyHan       = gv('f-kh');
  syncHDMBDependents(idx, gv);
  hsList[idx].updatedAt = nowStr();
  addLog('QTTD cập nhật căn hộ & HĐMB: '+hsList[idx].tenKH,'amber',currentHSId);
  persist(); renderHSTable();
  saveAndSync(function(){ return dbSaveLoanFile(hsList[idx]); }, 'Đã lưu căn hộ & HĐMB!');
}

function saveProjCDT() {
  if (!isCDT() || !currentHSId) return; // isCDT() đã bao gồm cả cdt_admin
  var gv=function(id){var el=document.getElementById(id);return el?el.value:'';};
  var gvn=function(id){var el=document.getElementById(id);return el?(el.value.replace(/\./g,'').replace(/,/g,'')):''};
  var idx=hsList.findIndex(function(x){return x.id===currentHSId;});
  hsList[idx].maCanHo    = gv('f-mach');
  hsList[idx].daiLy      = gv('f-daily');
  hsList[idx].tang        = gv('f-tang');
  hsList[idx].dienTich           = gv('f-dt');
  hsList[idx].area_construction  = gvn('f-areaconstruct');
  hsList[idx].giaHDMB            = gvn('f-giahdmb');
  hsList[idx].hdmb_value_with_mgt= gvn('f-hdmbwithmgt');
  hsList[idx].soHDMB             = gv('f-sohdmb');
  hsList[idx].ngayKyHDMB  = gv('f-ngayky');
  var hanGNInput = document.getElementById('f-hangn');
  hsList[idx].hanGiaiNgan = hanGNInput && hanGNInput.value ? hanGNInput.value : calcHanGN(gv('f-ngayky'));
  // VTC & Nhu cầu vay — CĐT được phép lưu
  if (document.getElementById('f-vtcphai'))  hsList[idx].vtcPhaiNop = gvn('f-vtcphai');
  if (document.getElementById('f-vtcdanop')) hsList[idx].vtcDaNop  = gvn('f-vtcdanop');
  if (document.getElementById('f-stv'))      hsList[idx].soTienVay = gvn('f-stv');
  if (document.getElementById('f-hthucvay')) hsList[idx].hinhThucVay = gv('f-hthucvay');
  if (document.getElementById('f-csbh'))     hsList[idx].csChinhSach = gv('f-csbh');
  syncHDMBDependents(idx, gv);
  hsList[idx].updatedAt   = nowStr();
  addLog('CĐT cập nhật căn hộ: '+hsList[idx].tenKH,'amber',currentHSId);
  persist(); renderHSTable();
  saveAndSync(function(){ return dbSaveLoanFile(hsList[idx]); }, 'Đã lưu thông tin căn hộ!');
}


function lockKH() {
  if (!currentHSId) return;
  var gv = function(id){ var el=document.getElementById(id); return el?el.value.trim():''; };
  var errors = [];

  // Thông tin KH chính — bắt buộc đủ
  if (!gv('f-tenKH')) errors.push('Họ và tên KH');
  if (!gv('f-cccd'))  errors.push('CCCD / CMND');
  if (!gv('f-sdt'))   errors.push('Số điện thoại');
  if (!gv('f-ns'))    errors.push('Ngày sinh');
  if (!gv('f-dc'))    errors.push('Địa chỉ thường trú');
  if (!gv('f-nn'))    errors.push('Nghề nghiệp');
  if (!gv('f-tn'))    errors.push('Thu nhập/tháng');

  // Nếu có vợ/chồng: bắt buộc đủ thông tin vợ/chồng
  var coVC = document.getElementById('f-coVC');
  if (coVC && coVC.checked) {
    if (!gv('f-tenVC'))  errors.push('Họ và tên vợ/chồng');
    if (!gv('f-cccdVC')) errors.push('CCCD vợ/chồng');
    if (!gv('f-sdtVC'))  errors.push('Số điện thoại vợ/chồng');
    if (!gv('f-nsVC'))   errors.push('Ngày sinh vợ/chồng');
    if (!gv('f-nnVC'))   errors.push('Nghề nghiệp vợ/chồng');
    if (!gv('f-tnVC'))   errors.push('Thu nhập vợ/chồng');
  }

  if (errors.length) {
    alert('Vui lòng nhập đủ thông tin trước khi chốt:\n• ' + errors.join('\n• '));
    return;
  }

  showConf('Chốt thông tin KH?',
    'Sau khi chốt, thông tin KH và vợ/chồng sẽ không chỉnh sửa được (chỉ Quản lý / Admin mới mở lại).',
    function() {
      var idx = hsList.findIndex(function(x) { return x.id === currentHSId; });
      hsList[idx].kLocked   = true;
      hsList[idx].kLockedBy = currentUser.name;
      hsList[idx].kLockedAt = nowStr();
      hsList[idx].updatedAt = nowStr();
      addLog('Chốt TT KH: ' + hsList[idx].tenKH, 'default', currentHSId);
      persist(); openHS(currentHSId); renderHSTable();
      saveAndSync(function(){ return dbSaveLoanFile(hsList[idx]); }, 'Đã chốt thông tin KH!');
    });
}

function unlockKH() {
  if (!isQL() || !currentHSId) return;
  showConf('Mở lại thông tin KH?', 'Hành động sẽ được ghi log.', function() {
    var idx = hsList.findIndex(function(x) { return x.id === currentHSId; });
    hsList[idx].kLocked = false;
    hsList[idx].updatedAt = nowStr();
    addLog('Mở lại TT KH: ' + hsList[idx].tenKH, 'amber', currentHSId);
    persist(); openHS(currentHSId);
  });
}

function saveCK(){
  var ck=collectCK();
  var total=0,done=0; CK_GROUPS.forEach(function(g){g.items.forEach(function(it){total++;if(ck[it.id])done++;});});
  if(currentHSId){
    var idx=hsList.findIndex(function(x){return x.id===currentHSId;});
    hsList[idx].ck=ck; hsList[idx].updatedAt=nowStr();
    addLog('Cap nhat checklist ('+done+'/'+total+' muc)', 'green', currentHSId);
    persist(); renderHSTable();
    var _ckH = hsList.find(function(x){return x.id===currentHSId;});
    if(_ckH) saveAndSync(function(){ return Promise.all([dbSaveLoanFile(_ckH), dbSaveCK(_ckH, ck)]); }, 'Checklist đã lưu!');
    var s=document.getElementById('ck-saved'); if(s){s.style.display='inline';setTimeout(function(){s.style.display='none';},2000);}
  }
}

// UPLOAD
function renderUploadGrid(h, locked){
  var el=document.getElementById('upload-grid'); if(!el) return;
  var files=h&&h.files ? h.files : {};
  var html='';
  CK_GROUPS.forEach(function(g){
    html+='<div class="upload-card"><div class="upload-hd">'+g.label+'</div><div class="upload-body">';
    if(!locked){
      html+='<div class="upload-zone" onclick="trigUpload2(this.dataset.gid)">📎 Thêm file PDF / Ảnh</div>';
      html+='<input type="file" id="upl-'+g.id+'" style="display:none" multiple accept=".pdf,image/*" onchange="handleUploadEvt(event)">';
    }
    html+='<div class="file-list" id="fl-'+g.id+'">';
    (files[g.id]||[]).forEach(function(f,i){
      html+='<div class="file-item"><span class="fi-name">📄 '+f.name+'</span>';
      if(!locked) html+='<span class="fi-del" onclick="delFileEvt(this.dataset.gid,'+i+')">✕</span>';
      html+='</div>';
    });
    html+='</div></div></div>';
  });
  el.innerHTML=html;
}
function handleUpload(e, gid){
  var newFiles=Array.from(e.target.files).map(function(f){return{name:f.name,size:f.size,uploadedAt:nowStr()};});
  if(!currentHSId) return;
  var idx=hsList.findIndex(function(x){return x.id===currentHSId;});
  if(!hsList[idx].files) hsList[idx].files={};
  if(!hsList[idx].files[gid]) hsList[idx].files[gid]=[];
  hsList[idx].files[gid]=hsList[idx].files[gid].concat(newFiles);
  hsList[idx].updatedAt=nowStr();
  addLog('Upload '+newFiles.length+' file ('+CK_GROUPS.find(function(g){return g.id===gid;}).label+')', 'green', currentHSId);
  persist(); renderUploadGrid(hsList[idx], hsList[idx].locked);
}
function delFile(gid, i){
  if(!currentHSId) return;
  var idx=hsList.findIndex(function(x){return x.id===currentHSId;});
  hsList[idx].files[gid].splice(i,1); hsList[idx].updatedAt=nowStr();
  persist(); renderUploadGrid(hsList[idx], hsList[idx].locked);
}

// OUTCOME
var OUTCOMES = [
  {v:'duoc_vay',      l:'✅ Được vay',              cls:'sel-yes'},
  {v:'khong_du_tn',   l:'❌ Không đủ thu nhập',      cls:'sel-no'},
  {v:'no_xau',        l:'❌ Nợ xấu CIC',             cls:'sel-no'},
  {v:'kh_nghe',       l:'📵 KH không nghe điện',     cls:'sel-no'},
  {v:'kh_khong_hop',  l:'🚫 KH không phối hợp',      cls:'sel-no'},
  {v:'thieu_ho_so',   l:'📂 Thiếu hồ sơ',            cls:'sel-no'},
  {v:'khac',          l:'📝 Lý do khác',              cls:''}
];
function selectOutcome(v, cls){
  selOutcome=v;
  document.querySelectorAll('.outcome-opt').forEach(function(el){ el.classList.remove('sel-yes','sel-no'); });
  var els=document.querySelectorAll('.outcome-opt');
  var oc=OUTCOMES.find(function(o){return o.v===v;});
  var idx2=OUTCOMES.indexOf(oc);
  if(idx2>=0 && els[idx2] && cls) els[idx2].classList.add(cls);
}
function saveOutcome(){
  if(!currentHSId) return;
  var note=document.getElementById('f-out-note')?document.getElementById('f-out-note').value:'';
  var idx=hsList.findIndex(function(x){return x.id===currentHSId;});
  hsList[idx].outcome=selOutcome; hsList[idx].outcomeNote=note; hsList[idx].updatedAt=nowStr();
  if(selOutcome==='duoc_vay') hsList[idx].status='choky';
  else if(selOutcome && selOutcome!=='duoc_vay' && selOutcome!=='thieu_ho_so') hsList[idx].status='tuchoi';
  var lbl=OUTCOMES.find(function(o){return o.v===selOutcome;}); 
  addLog('Ket qua: '+(lbl?lbl.l:selOutcome), selOutcome==='duoc_vay'?'green':'amber', currentHSId);
  persist(); renderHSTable(); renderDB();
  alert('Đã lưu kết quả xử lý!');
}

// CIC TCTD

function renderCICVCTCTDs(tctds) {
  var el = document.getElementById('cic-vc-tctd-list'); if(!el) return;
  if(!tctds||!tctds.length){ el.innerHTML='<div class="text-sm" style="color:var(--txt3);padding:4px 0">Chưa có dư nợ TCTD nào của vợ/chồng.</div>'; return; }
  var h2='';
  tctds.forEach(function(t,i){
    h2+='<div class="cic-row">'
      +'<input id="vc-tctd-name-'+i+'" value="'+(t.name||'')+'" placeholder="Tên TCTD"> '
      +'<input id="vc-tctd-dn-'+i+'" type="number" value="'+(t.duNo||'')+'" placeholder="Dư nợ (VNĐ)" style="width:130px"> '
      +'<select id="vc-tctd-grp-'+i+'"><option value="">Nhóm</option>'
      +[1,2,3,4,5].map(function(n){return '<option value="'+n+'"'+(t.group==n?' selected':'')+'>Nhóm '+n+'</option>';}).join('')
      +'</select> '
      +'<button class="btn btn-sm" style="padding:3px 8px;background:#fee" onclick="this.parentNode.remove()">✕</button>'
      +'</div>';
  });
  el.innerHTML=h2;
}

function renderCICTCTDs(tctds){
  var el=document.getElementById('cic-tctd-list'); if(!el) return;
  var html='';
  tctds.forEach(function(t,i){
    html+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:end;margin-bottom:8px" id="ctctd-'+i+'">';
    html+='<div class="fg"><label>Tên TCTD</label><input id="ct-name-'+i+'" value="'+(t.name||'')+'"></div>';
    html+='<div class="fg"><label>Dư nợ (tr.đ)</label><input type="number" id="ct-dn-'+i+'" value="'+(t.duNo||'')+'"></div>';
    html+='<div class="fg"><label>Nhóm nợ</label><input type="number" id="ct-nn-'+i+'" value="'+(t.nhomNo||'')+'" min="1" max="5" onchange="onTCTDGroupChange(this)" style="'+(parseInt(t.nhomNo||0)>=2?'border:2px solid #8A1F1F;background:#FDEAEA':'')+'" ></div>';
    html+='<button class="btn btn-sm btn-danger" onclick="delCICRow('+i+')" style="margin-bottom:4px">✕</button>';
    html+='</div>';
  });
  el.innerHTML=html;
}
function collectCICTCTDs(){
  var rows=document.querySelectorAll('[id^="ctctd-"]');
  return Array.from(rows).map(function(_,i){
    return {name:document.getElementById('ct-name-'+i)?document.getElementById('ct-name-'+i).value:'',
            duNo:document.getElementById('ct-dn-'+i)?document.getElementById('ct-dn-'+i).value:'',
            nhomNo:document.getElementById('ct-nn-'+i)?document.getElementById('ct-nn-'+i).value:''};
  });
}
function addCICRow(){
  var tctds=collectCICTCTDs(); tctds.push({name:'',duNo:'',nhomNo:''});
  renderCICTCTDs(tctds);
}
function delCICRow(i){
  var tctds=collectCICTCTDs(); tctds.splice(i,1); renderCICTCTDs(tctds);
}
function saveCIC(){
  if(!currentHSId) return;
  var gv=function(id){var el=document.getElementById(id);return el?el.value:'';};
  var nhomNo = parseInt(gv('cic-nn'))||0;
  var vcNhomNo = parseInt(gv('cic-vcnn'))||0;
  var worstGroup = Math.max(nhomNo||0, vcNhomNo||0);
  var cic = {
    maSoCIC:    gv('cic-masocic'),
    tongDuNo:   gv('cic-dn'),
    duNoThe:    gv('cic-the'),
    nhomNo:     nhomNo,
    ngay:       gv('cic-ngay'),
    tctds:      collectCICTCTDs(),
    // Vợ/chồng
    vcMaSoCIC:  gv('cic-vcmasocic'),
    vcTongDuNo: gv('cic-vcdn'),
    vcDuNoThe:  gv('cic-vcthe'),
    vcNhomNo:   vcNhomNo,
    vcNgay:     gv('cic-vcngay'),
    vcTctds:    collectCICVCTCTDs()
  };
  // Validate: phải có ít nhất 1 thông tin CIC
  // Cho phép lưu khi có bất kỳ thông tin nào: mã CIC, nhóm nợ, hoặc ngày tra
  var hasCIC = cic.maSoCIC || nhomNo || cic.ngay || vcNhomNo || cic.vcMaSoCIC || cic.vcNgay;
  if (!hasCIC) { alert('Vui lòng nhập ít nhất 1 thông tin CIC (mã số hoặc nhóm nợ)!'); return; }
  var idx=hsList.findIndex(function(x){return x.id===currentHSId;});
  hsList[idx].cic=cic;
  hsList[idx].updatedAt=nowStr();
  addLog('Cập nhật CIC: nhóm nợ '+worstGroup, 'amber', currentHSId);

  // Hard stop: nhóm nợ >= 2 (KH hoặc vợ/chồng)
  if(worstGroup >= 2){
    hsList[idx].status='tuchoi';
    hsList[idx].locked=true;
    hsList[idx].lockedBy='Hệ thống';
    hsList[idx].lockedAt=nowStr();
    addLog('TỪ CHỐI tự động - Nợ nhóm '+worstGroup, 'red', currentHSId);
    persist(); renderHSTable(); openHS(currentHSId);
    alert('❌ ĐIỀU KIỆN KHÔNG ĐẠT!\nNhóm nợ '+(nhomNo>=2?'KH chính':'vợ/chồng')+' = '+worstGroup+'\nHệ thống tự động Từ chối và khoá hồ sơ.');
    return;
  }
  persist(); renderHSTable();
  var _cicH = hsList.find(function(x){return x.id===currentHSId;});
  // Lưu cic vào hsList trước để openHS hiển thị đúng
  if (_cicH) _cicH.cic = cic;
  saveAndSync(function(){
    return dbSaveCIC(_cicH, cic).then(function(ok){
      if (!ok) showNotif('⚠️ Lỗi lưu CIC - kiểm tra Console F12');
      return ok;
    });
  }, 'CIC đã lưu! Nhóm nợ: '+worstGroup);
}


// HS LOG
function renderHSLog(h){
  var el=document.getElementById('hs-log'); if(!el) return;
  var logs=actLog.filter(function(a){return a.hsId===currentHSId;});
  if(!logs.length){ el.innerHTML='<div class="text-sm">Chưa có lịch sử</div>'; return; }
  var html='';
  logs.forEach(function(a){
    html+='<div class="tl-item"><div class="tl-dot '+(a.type||'')+'"></div>';
    html+='<span class="tl-time">'+a.time+'</span>';
    html+='<span>'+a.msg+' <span style="color:var(--txt3)">— '+a.who+'</span></span></div>';
  });
  el.innerHTML=html;
}

// SAVE DA
function saveDA(){
  var gv=function(id){var el=document.getElementById(id);return el?el.value:'';};
  if(!gv('f-tenKH').trim()){alert('Vui lòng nhập họ tên KH!');return;}
  var data={
    tenKH:gv('f-tenKH'),cccd:gv('f-cccd'),sdt:gv('f-sdt'),ngaySinh:gv('f-ns'),
    diaChi:gv('f-dc'),ngheNghiep:gv('f-nn'),thuNhap:gv('f-tn'),
    maCanHo:gv('f-mach'),tang:gv('f-tang'),dienTich:gv('f-dt'),
    giaHDMB:gv('f-giahdmb'),soHDMB:gv('f-sohdmb'),daDongCDT:gv('f-dong'),
    soTienVay:gv('f-stv'),kyHan:gv('f-kh'),laiSuat:gv('f-ls'),
    updatedAt:nowStr()
  };
  if(currentHSId){
    var idx=hsList.findIndex(function(x){return x.id===currentHSId;});
    Object.assign(hsList[idx], data);
    addLog('Cap nhat thong tin KH: '+data.tenKH, 'amber', currentHSId);
  } else {
    var cbSel=document.getElementById('f-cbid');
    var hs=Object.assign({id:genId(),createdAt:nowStr(),status:'moi',locked:false,ck:{}}, data);
    hs.canBoId = cbSel ? cbSel.value : currentUser.id;
    hsList.unshift(hs); currentHSId=hs.id;
    addLog('Tạo hồ sơ mới: '+hs.tenKH, 'green', hs.id);
  }
  persist(); renderHSTable(); renderDB();
  var _h = hsList.find(function(x){return x.id===currentHSId;});
  console.log('[SAVE] currentHSId:', currentHSId, '_h:', _h ? 'found' : 'NOT FOUND', 'customerId:', _h && _h.customerId);
  if(_h) saveAndSync(function(){ return dbSaveLoanFile(_h); }, 'Đã lưu thông tin!');
}

// SAVE ADM
function saveCBNote(){
  // CB thuong chi duoc luu ghi chu va ngay hen, KHONG duoc doi canBoId / status
  if(!currentHSId) return;
  var idx=hsList.findIndex(function(x){return x.id===currentHSId;});
  var ngayen=document.getElementById('f-ngayen');
  var gc=document.getElementById('f-gc');
  if(ngayen) hsList[idx].ngayHen=ngayen.value||'';
  if(gc) hsList[idx].ghiChu=gc.value||'';
  hsList[idx].updatedAt=nowStr();
  addLog('Cap nhat ghi chu va ngay hen: '+hsList[idx].tenKH, 'amber', currentHSId);
  persist(); renderHSTable(); renderDB(); alert('Da luu ghi chu va ngay hen!');
}
function saveAdm(){
  if(!isQL()) return;
  var idx=hsList.findIndex(function(x){return x.id===currentHSId;});
  var gv=function(id){var el=document.getElementById(id);return el?el.value:null;};
  var cb=gv('f-cbid'); if(cb) hsList[idx].canBoId=cb;
  hsList[idx].ghiChu=gv('f-gc')||'';
  hsList[idx].updatedAt=nowStr();
  addLog('Cập nhật phân công: '+hsList[idx].tenKH,'amber',currentHSId);
  persist(); renderHSTable(); renderDB();
  saveAndSync(function(){ return dbSaveAssignment(hsList[idx]); }, 'Đã lưu phân công!');
}

// FOOTER BUTTONS
function deleteHS(){
  showConf('Xoá hồ sơ?','Không thể khôi phục.', function(){
    var h=hsList.find(function(x){return x.id===currentHSId;});
    hsList=hsList.filter(function(x){return x.id!==currentHSId;});
    addLog('Xoa ho so: '+(h?h.tenKH:''), 'red');
    persist(); closeHS(); renderHSTable(); renderDB();
  });
}
function exportHS(){
  var h=hsList.find(function(x){return x.id===currentHSId;}); if(!h) return;
  var prog=ckProgress(h);
  var lines=[
    '=== NGAN HANG TMCP DAU TU VA PHAT TRIEN VIET NAM ===',
    '=== CHI NHANH TRANG TIEN – HA NOI ===',
    '=== HO SO VAY VON – DU AN PRIMABAY HA LONG ===',
    'Ma ho so : '+h.id+'   Tao: '+(fmtDateVN(h.createdAt)||h.createdAt||'')+'   CB: '+getUserName(h.canBoId),
    '',
    '--- KHACH HANG ---',
    'Ho ten   : '+(h.tenKH||'')+'   CCCD: '+(h.cccd||''),
    'SDT      : '+(h.sdt||'')+'   Ngay sinh: '+(fmtDateVN(h.ngaySinh)||h.ngaySinh||''),
    'Dia chi  : '+(h.diaChi||''),
    'Nghe nghiep: '+(h.ngheNghiep||'')+'   Thu nhap: '+(h.thuNhap||'')+'tr/thang',
    '',
    '--- CAN HO ---',
    'Ma can ho: '+(h.maCanHo||'')+'   Tang: '+(h.tang||'')+'   DT: '+(h.dienTich||'')+'m2',
    'Gia HDMB : '+(h.giaHDMB||'')+'   So HDMB: '+(h.soHDMB||''),
    'Da dong CĐT: '+(h.daDongCDT||'')+'tr',
    '',
    '--- NHU CAU VAY ---',
    'So tien vay: '+(h.soTienVay||'')+'tr   Ky han: '+(h.kyHan||'')+'th   Lai suat: '+(h.laiSuat||'')+'%/nam',
    '',
    '--- CHECKLIST ('+prog.done+'/'+prog.total+') ---'
  ];
  CK_GROUPS.forEach(function(g){
    lines.push('['+( ckGroupDone(h,g.id)?'OK':'...')+'] '+g.label);
    g.items.forEach(function(it){ lines.push('  '+(h.ck&&h.ck[it.id]?'[x]':'[ ]')+' '+it.label); });
  });
  if(h.cic){
    lines.push('','--- CIC ---');
    lines.push('Nhom no cao nhat: '+h.cic.nhomNo+'   Tong du no: '+h.cic.tongDuNo+'tr   Ngay tra: '+(h.cic.ngay||''));
    (h.cic.tctds||[]).forEach(function(t){ lines.push('  '+t.name+': '+t.duNo+'tr, nhom '+t.nhomNo); });
  }
  lines.push('','--- KET QUA: '+(h.outcome||'Chua co')+' ---', h.outcomeNote||'');
  lines.push('Ngay hen ky: '+(h.ngayHen||'—'));
  lines.push('Chot boi: '+(h.lockedBy||'—')+' luc '+(h.lockedAt||'—'));
  var blob=new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'});
  var a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='HoSo_'+h.id+'_'+(h.tenKH||'kh').replace(/\s/g,'_')+'.txt';
  a.click(); addLog('Xuat ho so: '+h.tenKH, 'green', currentHSId);
}

// ==================================================
// IMPORT
// ==================================================
function renderImpCBSel(){
  var sel=document.getElementById('p-imp-cb-sel'); if(!sel) return;
  var html='<option value="auto">Tự động (chia đều)</option>';
  users.filter(function(u){return u.active&&(u.role==='cb'||u.role==='ql');}).forEach(function(u){
    html+='<option value="'+u.id+'">'+u.name+'</option>';
  });
  sel.innerHTML=html;
}
function handleImpFile(e){
  var file=e.target.files[0]; if(!file) return;
  var reader=new FileReader();
  reader.onload=function(ev){
    var lines=ev.target.result.split('\n').filter(function(l){return l.trim();});
    impRows=lines.slice(1).map(function(l){return l.split(',').map(function(c){return c.trim().replace(/^"|"$/g,'');});});
    var headers=lines[0].split(',').map(function(c){return c.trim().replace(/^"|"$/g,'');});
    document.getElementById('p-imp-info').textContent='Doc duoc '+impRows.length+' KH tu "'+file.name+'"';
    var thead=document.querySelector('#imp-tbl thead');
    var tbody=document.querySelector('#imp-tbl tbody');
    thead.innerHTML='<tr>'+headers.map(function(h){return '<th>'+h+'</th>';}).join('')+'</tr>';
    tbody.innerHTML=impRows.slice(0,4).map(function(r){return '<tr>'+r.map(function(c){return '<td>'+c+'</td>';}).join('')+'</tr>';}).join('')+
      (impRows.length>4?'<tr><td colspan="'+headers.length+'" style="text-align:center;color:var(--txt3)">... +'+( impRows.length-4)+' dong</td></tr>':'');
    document.getElementById('p-imp-preview').style.display='block';
    document.getElementById('p-imp-result').style.display='none';
  };
  reader.readAsText(file,'UTF-8');
}
function doImport(){
  var cbSel=document.getElementById('p-imp-cb-sel')?document.getElementById('p-imp-cb-sel').value:'auto';
  var cbs=users.filter(function(u){return u.active&&(u.role==='cb'||u.role==='ql');});
  var count=0, dupes=[];
  impRows.forEach(function(row,i){
    if(!row[0]) return;
    var cccd=row[2]||'', mach=row[3]||'';
    if(cccd && hsList.find(function(h){return h.cccd===cccd;})){ dupes.push(row[0]+' (CCCD trung)'); return; }
    if(mach && hsList.find(function(h){return h.maCanHo===mach;})){ dupes.push(row[0]+' (ma CH trung)'); return; }
    var assignTo=cbSel==='auto'?(cbs[i%cbs.length]?cbs[i%cbs.length].id:''):cbSel;
    hsList.unshift({id:genId(),createdAt:nowStr(),status:'moi',locked:false,source:'import',
      tenKH:row[0]||'',sdt:row[1]||'',cccd:row[2]||'',
      maCanHo:row[3]||'',tang:row[4]||'',dienTich:row[5]||'',
      giaHDMB:row[6]||'',soHDMB:row[7]||'',daDongCDT:row[8]||'',
      canBoId:assignTo,ck:{}});
    count++;
  });
  addLog('Nhap '+count+' ho so tu BIM'+(dupes.length?' (bo qua '+dupes.length+' trung)':''), 'green');
  persist();
  var msg='Nhap thanh cong '+count+' ho so.';
  if(dupes.length) msg+=' Bo qua: '+dupes.slice(0,3).join(', ')+(dupes.length>3?'...':'');
  document.getElementById('p-imp-result').textContent=msg;
  document.getElementById('p-imp-result').style.display='block';
  document.getElementById('p-imp-preview').style.display='none';
  impRows=[];
}
function cancelImp(){ document.getElementById('p-imp-preview').style.display='none'; document.getElementById('p-imp-file').value=''; impRows=[]; }

// ==================================================
// CĐT
// ==================================================
function handleCDTFile(e){
  var file=e.target.files[0]; if(!file) return;
  var reader=new FileReader();
  reader.onload=function(ev){
    var lines=ev.target.result.split('\n').filter(function(l){return l.trim();});
    cdtRows=lines.slice(1).map(function(l){return l.split(',').map(function(c){return c.trim().replace(/^"|"$/g,'');});});
    var headers=lines[0].split(',').map(function(c){return c.trim().replace(/^"|"$/g,'');});
    var warns=[]; var seenC={}, seenM={};
    cdtRows.forEach(function(row,i){
      var cccd=row[2]||'', mach=row[3]||'';
      if(cccd&&seenC[cccd]) warns.push('Dong '+(i+2)+': CCCD trung trong file');
      if(cccd) seenC[cccd]=true;
      if(mach&&seenM[mach]) warns.push('Dong '+(i+2)+': Ma can ho trung trong file');
      if(mach) seenM[mach]=true;
      if(mach&&hsList.find(function(h){return h.maCanHo===mach;})) warns.push('Dong '+(i+2)+': Ma can ho "'+mach+'" da ton tai trong he thong');
    });
    document.getElementById('p-cdt-info').textContent=cdtRows.length+' khach hang tu "'+file.name+'"';
    var wEl=document.getElementById('p-cdt-warn');
    if(warns.length){ wEl.innerHTML='⚠️ Cảnh báo:<br>'+warns.slice(0,5).map(function(w){return '• '+w;}).join('<br>'); wEl.style.display='flex'; }
    else wEl.style.display='none';
    var thead=document.querySelector('#cdt-tbl thead');
    var tbody=document.querySelector('#cdt-tbl tbody');
    thead.innerHTML='<tr>'+headers.map(function(h){return '<th>'+h+'</th>';}).join('')+'</tr>';
    tbody.innerHTML=cdtRows.slice(0,4).map(function(r){return '<tr>'+r.map(function(c){return '<td>'+c+'</td>';}).join('')+'</tr>';}).join('');
    document.getElementById('p-cdt-preview').style.display='block';
  };
  reader.readAsText(file,'UTF-8');
}
function doCDTSubmit(){
  var count=0;
  cdtRows.forEach(function(row){
    if(!row[0]) return;
    if(row[3]&&hsList.find(function(h){return h.maCanHo===row[3];})) return;
    hsList.unshift({id:genId(),createdAt:nowStr(),status:'moi',locked:false,source:'cdt',
      tenKH:row[0]||'',sdt:row[1]||'',cccd:row[2]||'',
      maCanHo:row[3]||'',tang:row[4]||'',dienTich:row[5]||'',
      giaHDMB:row[6]||'',soHDMB:row[7]||'',daDongCDT:row[8]||'',
      ngayGiaiNgan:(document.getElementById('p-cdt-ngayGN')?document.getElementById('p-cdt-ngayGN').value:''),
      canBoId:'',ck:{}});
    count++;
  });
  addLog('CDT gui '+count+' KH moi len he thong', 'green');
  persist();
  document.getElementById('p-cdt-result').textContent='Da gui '+count+' khach hang len BIDV. Vui long cho phan cong.';
  document.getElementById('p-cdt-result').style.display='block';
  document.getElementById('p-cdt-preview').style.display='none';
  cdtRows=[];
}
function cancelCDT(){ document.getElementById('p-cdt-preview').style.display='none'; document.getElementById('p-cdt-file').value=''; cdtRows=[]; }

function renderCDTDash(){
  var total=hsList.length;
  var approved=hsList.filter(function(h){return h.outcome==='duoc_vay';}).length;
  var waiting=hsList.filter(function(h){return h.status==='moi'||h.status==='dang';}).length;
  var done=hsList.filter(function(h){return h.status==='xong';}).length;
  var pct=total?Math.round(approved/total*100):0;
  var html='';
  html+='<div class="stat-card bl"><div class="stat-lbl">Tổng KH</div><div class="stat-val">'+total+'</div></div>';
  html+='<div class="stat-card am"><div class="stat-lbl">Đang xử lý</div><div class="stat-val">'+waiting+'</div></div>';
  html+='<div class="stat-card gr"><div class="stat-lbl">Được vay</div><div class="stat-val">'+approved+'</div></div>';
  html+='<div class="stat-card rd"><div class="stat-lbl">Hoàn thành</div><div class="stat-val">'+done+'</div></div>';
  html+='<div class="stat-card pu"><div class="stat-lbl">Tỷ lệ duyệt</div><div class="stat-val">'+pct+'%</div></div>';
  var cdtStatsEl = document.getElementById('p-cdt-stats'); if(cdtStatsEl) cdtStatsEl.innerHTML=html;
  renderCDTTable();
}
function renderCDTTable(){
  var q=(document.getElementById('p-cdt-q')||{value:''}).value.toLowerCase();
  var st=(document.getElementById('p-cdt-st')||{value:''}).value;
  var f=hsList.filter(function(h){
    var mQ=!q||(h.tenKH||'').toLowerCase().indexOf(q)>=0||(h.maCanHo||'').toLowerCase().indexOf(q)>=0;
    var mS=!st||(st==='full'&&ckProgress(h).pct===100)||(st==='approved'&&h.outcome==='duoc_vay')||(st==='rejected'&&h.outcome&&h.outcome!=='duoc_vay');
    return mQ&&mS;
  });
  var outMap={'duoc_vay':'✅ Được vay','khong_du_tn':'❌ Không đủ TN','no_xau':'❌ Nợ xấu',
    'kh_nghe':'📵 Không nghe','kh_khong_hop':'🚫 Không HT','thieu_ho_so':'📂 Thiếu HS','khac':'📝 Lý do khác'};
  var html='';
  if(!f.length){
    html='<tr><td colspan="9"><div class="empty-st">📊<br>Chưa có dữ liệu</div></td></tr>';
  } else {
    f.forEach(function(h){
      var prog=ckProgress(h);
      html+='<tr>';
      html+='<td style="font-weight:600">'+(h.maCanHo||'—')+'</td>';
      html+='<td>'+(h.tenKH||'—')+'</td>';
      ['gt','tn','tsbd','kv'].forEach(function(gid){
        var done=ckGroupDone(h,gid);
        html+='<td style="text-align:center"><span class="dot-ind '+(done?'dot-done':'dot-no')+'">'+(done?'✓':'·')+'</span></td>';
      });
      html+='<td><div style="display:flex;align-items:center;gap:6px">';
      html+='<div class="prog-wrap" style="width:48px"><div class="prog-bar '+(prog.pct===100?'full':'')+'" style="width:'+prog.pct+'%"></div></div>';
      html+='<span style="font-size:12px;font-weight:600;color:'+(prog.pct===100?'var(--green)':'var(--blue)')+'">'+prog.pct+'%</span></div></td>';
      html+='<td>'+gnBadge(h)+'</td>';
      html+='<td>'+(h.outcome?(outMap[h.outcome]||h.outcome):'<span style="color:var(--txt3);font-size:12px">Chưa có</span>')+'</td>';
      html+='<td style="font-size:11px;color:var(--txt3)">'+(fmtDateVN(h.updatedAt||h.createdAt)||h.updatedAt||h.createdAt||'—')+'</td>';
      html+='</tr>';
    });
  }
  var cdtTbody = document.getElementById('p-cdt-tbody'); if(cdtTbody) cdtTbody.innerHTML=html;
}

// ==================================================
// USERS
// ==================================================
function renderUsrTable(){
  var html='';
  users.forEach(function(u){
    var active=hsList.filter(function(h){return h.canBoId===u.id&&h.status!=='xong'&&h.status!=='tuchoi';}).length;
    html += '<tr>';
    html += '<td style="font-weight:500">'+u.name+'</td>';
    html += '<td><code style="font-size:12px">'+u.login+'</code></td>';
    html += '<td>'+rBadge(u.role)+'</td>';
    html += '<td>'+active+' HS</td>';
    html += '<td><span class="badge '+(u.active?'b-xong':'b-tuchoi')+'">'+(u.active?'Hoat dong':'Ngung')+'</span></td>';
    html += '<td style="display:flex;gap:4px">';
    html += '<button class="btn btn-sm" data-uid="'+u.id+'" onclick="openEditUser(this.dataset.uid)">Sua</button>';
    html += '<button class="btn btn-sm '+(u.active?'btn-danger':'btn-success')+'" data-uid="'+u.id+'" onclick="toggleUsr(this.dataset.uid)">'+(u.active?'Tam ngung':'Kich hoat')+'</button>';
    if(u.id!=='u1') html += '<button class="btn btn-sm btn-danger" data-uid="'+u.id+'" onclick="delUsr(this.dataset.uid)">X</button>';
    html += '</td></tr>';
  });
  var usrTbody = document.getElementById('p-usr-tbody'); if(usrTbody) usrTbody.innerHTML=html;
}

function openAddUser(){ editUserId=null; document.getElementById('musr-title').textContent='Thêm người dùng'; ['u-name','u-login','u-pw'].forEach(function(id){document.getElementById(id).value='';}); document.getElementById('u-role').value='cb'; document.getElementById('modal-usr').classList.add('open'); }
function openEditUser(id){
  editUserId=id;
  var u=users.find(function(x){return x.id===id;});
  if(!u) return;
  document.getElementById('musr-title').textContent='Sửa: '+u.name;
  document.getElementById('u-name').value=u.name;
  document.getElementById('u-login').value=u.login;
  document.getElementById('u-pw').value=''; // Không hiện mật khẩu cũ — để trống = giữ nguyên
  document.getElementById('u-pw').placeholder='Để trống = giữ mật khẩu hiện tại';
  document.getElementById('u-role').value=u.role;
  document.getElementById('modal-usr').classList.add('open');
}

async function delUsr(id){
  showConf('Xoá người dùng?','Không thể khôi phục.',async function(){
    var { error }=await sb.from('users').delete().eq('id',id);
    if(error){ console.error('[DB] delUsr:', error); alert('Lỗi xoá: '+error.message); return; }
    users=users.filter(function(u){return u.id!==id;});
    persist(); renderUsrTable();
    showNotif('✅ Đã xoá người dùng');
  });
}

function closeUsrModal(){ document.getElementById('modal-usr').classList.remove('open'); editUserId=null; }
async function saveUser(){
  var name  = document.getElementById('u-name').value.trim();
  var login = document.getElementById('u-login').value.trim().toLowerCase();
  var pw    = document.getElementById('u-pw').value;
  var role  = document.getElementById('u-role').value;

  // Khi thêm mới: bắt buộc pw; khi sửa: pw để trống = giữ nguyên
  if(!name || !login) { alert('Vui lòng điền họ tên và tên đăng nhập!'); return; }
  if(!editUserId && !pw) { alert('Vui lòng nhập mật khẩu!'); return; }
  if(!editUserId && users.find(function(u){return u.login===login;})){
    alert('Tên đăng nhập đã tồn tại!'); return;
  }

  // Ghép email từ login
  var email = login.indexOf('@') !== -1 ? login :
              (login === 'bim1' ? 'bim1@bimgroup.vn' :
               login === 'bim2' ? 'bim2@bimgroup.vn' :
               login + '@bidv.com.vn');

  // Map role app → DB role
  var dbRole = role === 'cb'    ? 'officer' :
               role === 'ql'    ? 'manager' :
               role === 'admin' ? 'admin'   :
               role === 'cdt'   ? 'cdt_view':
               role === 'viewer'? 'viewer'  :
               role === 'qttd'  ? 'qttd'   : role;

  var saveBtn = document.querySelector('#modal-usr .btn-primary');
  if(saveBtn){ saveBtn.textContent='⏳ Đang lưu...'; saveBtn.disabled=true; }

  try {
    if(editUserId) {
      // Sửa user hiện có
      var u = users.find(function(x){return x.id===editUserId;});
      if(u) {
        u.name  = name;
        u.login = login;
        u.role  = role;
        if(pw) u.pw = pw; // Chỉ update pw nếu nhập mới

        // Cập nhật DB
        var updateData = { full_name: name, email: email, role: dbRole, updated_at: new Date().toISOString() };
        if(pw) updateData.ma_cb = pw; // Dùng ma_cb làm password

        var { error } = await sb.from('users').update(updateData).eq('id', editUserId);
        if(error) {
          console.error('[DB] saveUser update:', error);
          alert('⚠️ Lưu local OK nhưng lỗi DB: ' + error.message);
        } else {
          showNotif('✅ Đã cập nhật người dùng: ' + name);
        }
      }
    } else {
      // Thêm user mới
      var newUser = { id: 'u'+Date.now(), name:name, login:login, pw:pw, role:role, active:true, email:email };
      users.push(newUser);

      var insertData = {
        full_name: name, email: email, role: dbRole,
        ma_cb: pw, is_active: true, created_at: new Date().toISOString()
      };
      var { data: inserted, error: insErr } = await sb.from('users').insert(insertData).select().single();
      if(insErr) {
        console.error('[DB] saveUser insert:', insErr);
        alert('⚠️ Lưu local OK nhưng lỗi DB: ' + insErr.message);
      } else {
        if(inserted) newUser.id = inserted.id; // Dùng UUID từ DB
        showNotif('✅ Đã thêm người dùng: ' + name);
      }
    }
  } catch(e) {
    console.error('[DB] saveUser exception:', e);
    alert('⚠️ Lỗi: ' + e.message);
  } finally {
    if(saveBtn){ saveBtn.textContent='Lưu'; saveBtn.disabled=false; }
  }

  persist(); closeUsrModal(); renderUsrTable();
}
async function toggleUsr(id){
  var u=users.find(function(x){return x.id===id;});
  if(!u) return;
  u.active=!u.active;
  var { error }=await sb.from('users').update({is_active:u.active}).eq('id',id);
  if(error) console.error('[DB] toggleUsr:', error);
  else showNotif((u.active?'✅ Kích hoạt: ':'🚫 Tạm ngừng: ')+u.name);
  persist(); renderUsrTable();
}

// ==================================================
// CONFIRM
// ==================================================
function showConf(title, msg, fn){
  document.getElementById('conf-title').textContent=title;
  document.getElementById('conf-msg').textContent=msg;
  confFn=fn;
  document.getElementById('conf-ok').onclick=function(){ closeConf(); if(confFn) confFn(); };
  document.getElementById('modal-conf').classList.add('open');
}
function closeConf(){ document.getElementById('modal-conf').classList.remove('open'); confFn=null; }

// Close overlays on bg click
document.querySelectorAll('.overlay').forEach(function(el){
  el.addEventListener('click', function(e){ if(e.target===el) el.classList.remove('open'); });
});

// ==================================================
// DEADLINE / ALERT SYSTEM
// ==================================================
function daysSince(dStr){
  if(!dStr) return 9999;
  var now = new Date(); now.setHours(0,0,0,0);
  var then;
  // ISO format: 2026-07-16T... hoặc 2026-07-16
  if(dStr.indexOf('-')===4 || dStr.indexOf('T')!==-1){
    then = new Date(dStr); then.setHours(0,0,0,0);
  } else {
    // dd/MM hoặc dd/MM/yyyy
    var sp = dStr.split(' ')[0].split('/');
    var d,m,y;
    if(sp.length===3){ d=parseInt(sp[0]); m=parseInt(sp[1])-1; y=parseInt(sp[2]); }
    else { d=parseInt(sp[0]); m=parseInt(sp[1])-1; y=now.getFullYear(); }
    then = new Date(y,m,d,0,0,0);
  }
  if(isNaN(then)) return 9999;
  return Math.max(0, Math.floor((now-then)/86400000));
}
function daysUntil(iso){
  if(!iso) return null;
  var now=new Date(); now.setHours(0,0,0,0);
  var then=new Date(iso); then.setHours(0,0,0,0);
  return Math.floor((then-now)/86400000);
}
function hsAlertLevel(h){
  if(!h) return 'ok';
  // Dùng deriveHSStatus để lấy trạng thái thực (bao gồm từ weekly reports)
  var _st = deriveHSStatus(h);
  if(_st==='xong'||_st==='tuchoi'||h.status==='disbursed'||h.status==='rejected'||h.status==='cancelled') return 'done';
  if(ckProgress(h).pct===100) return 'done';
  var dGN = h.ngayGiaiNgan ? daysUntil(h.ngayGiaiNgan) : null;
  if(dGN !== null && dGN <= 3) return 'over';
  if(dGN !== null && dGN <= 7) return 'warn';
  // Tính từ lastContactAt (hoặc ngày tạo HS nếu chưa có báo cáo)
  if(!h.lastContactAt) return 'new';
  var days = daysSince(h.lastContactAt);
  if(days > 7) return 'over';
  if(days >= 5) return 'warn';
  return 'ok';
}
function alertBadge(h){
  var lv = hsAlertLevel(h);
  var days = h.lastContactAt ? daysSince(h.lastContactAt) : null;
  var dGN = h.ngayGiaiNgan ? daysUntil(h.ngayGiaiNgan) : null;
  // Kết quả khai thác gần nhất
  var lastKQ = '';
  if (h.weeklyReports && h.weeklyReports.length) {
    var lastWR = h.weeklyReports[h.weeklyReports.length-1];
    if (lastWR && lastWR.type !== 'cdt_feedback') {
      lastKQ = getStatusLabel(lastWR.ketQua);
    }
  }
  var sp = '<span class="dl-badge ';
  if(lv==='done')  return sp+'dl-ok">\u2713 Ho\u00e0n t\u1ea5t</span>';
  if(lv==='over'){
    if(dGN!==null && dGN<=3) return sp+'dl-over">\uD83D\uDD34 GN c\u00f2n '+dGN+' ng\u00e0y!</span>';
    if(days!==null) return sp+'dl-over">\uD83D\uDD34 Qu\u00e1 h\u1ea1n '+(days-7)+' ng\u00e0y</span>';
    return sp+'dl-over">\uD83D\uDD34 Qu\u00e1 h\u1ea1n</span>';
  }
  if(lv==='warn'){
    if(dGN!==null && dGN<=7) return sp+'dl-warn">\uD83D\uDFE1 GN c\u00f2n '+dGN+' ng\u00e0y</span>';
    if(days!==null) return sp+'dl-warn">\uD83D\uDFE1 C\u1eadp nh\u1eadt ('+days+'/7ng)</span>';
    return sp+'dl-warn">\uD83D\uDFE1 S\u1eafp h\u1ea1n</span>';
  }
  if(lv==='new') return sp+'dl-new">\uD83C\uDD95 Ch\u01b0a c\u1eadp nh\u1eadt</span>';
  if(days!==null) return sp+'dl-ok">\uD83D\uDFE2 '+days+' ng\u00e0y tr\u01b0\u1edbc</span>';
  return sp+'dl-ok">\uD83D\uDFE2 OK</span>';
}
function gnBadge(h){
  var dGN = h.ngayGiaiNgan ? daysUntil(h.ngayGiaiNgan) : null;
  if(dGN===null) return '<span style="color:var(--txt3);font-size:12px">\u2014</span>';
  var cls = dGN<=3 ? 'dl-over' : dGN<=7 ? 'dl-warn' : 'dl-ok';
  var lbl = dGN<0 ? '\u0110\u00e3 qua' : dGN===0 ? 'H\u00f4m nay' : dGN+' ng\u00e0y';
  return '<span class="dl-badge '+cls+'">'+lbl+'</span>';
}
function sortHSByAlert(list){
  var ord = {over:0,warn:1,new:2,ok:3,done:4};
  return list.slice().sort(function(a,b){
    return (ord[hsAlertLevel(a)]||3)-(ord[hsAlertLevel(b)]||3);
  });
}
function renderAlertPanels(list){
  var overL = list.filter(function(h){ return hsAlertLevel(h)==='over'; });
  var warnL = list.filter(function(h){ return hsAlertLevel(h)==='warn'; });
  var html = '';
  function makeRows(arr){
    var r='';
    arr.slice(0,5).forEach(function(h){
      r += '<div class="alert-row" data-id="'+h.id+'" onclick="openHS(this.dataset.id)">';
      r += '<span style="font-weight:500;min-width:150px;flex-shrink:0">'+(h.tenKH||'')+'</span>';
      r += '<span style="color:var(--txt2);font-size:12px;margin-right:6px">'+(h.maCanHo||'')+'</span>';
      r += alertBadge(h);
      r += '<span style="color:var(--txt3);margin-left:auto;font-size:12px">'+getUserName(h.canBoId)+'</span>';
      r += '</div>';
    });
    return r;
  }
  if(overL.length){
    html += '<div class="alert-panel"><div class="alert-panel-hd red">';
    html += '<span style="font-weight:700;font-size:13px">\uD83D\uDD34 Qu\u00e1 h\u1ea1n c\u1eadp nh\u1eadt ('+overL.length+' h\u1ed3 s\u01a1)</span>';
    html += '<button class="btn btn-sm btn-danger" onclick="showPage(this.dataset.pg)" data-pg="hs">Xem t\u1ea5t c\u1ea3</button></div>';
    html += makeRows(overL)+'</div>';
  }
  if(warnL.length){
    html += '<div class="alert-panel"><div class="alert-panel-hd amber">';
    html += '<span style="font-weight:700;font-size:13px">\uD83D\uDFE1 S\u1eafp \u0111\u1ebfn h\u1ea1n ('+warnL.length+' h\u1ed3 s\u01a1)</span></div>';
    html += makeRows(warnL)+'</div>';
  }
  var el = document.getElementById('p-db-alerts');
  if(el) el.innerHTML = html;
}

// ==================================================
// CONTACT UPDATE
// ==================================================
var CT_STATUS_LBL = {
  da_lh:'\u2705 \u0110\u00e3 li\u00ean h\u1ec7, KH \u0111ang chu\u1ea9n b\u1ecb HS',
  hen_gap:'\uD83D\uDCC5 \u0110\u00e3 h\u1eb9n g\u1eb7p tr\u1ef1c ti\u1ebfp',
  cho_bs:'\u23F3 \u0110ang ch\u1edd KH b\u1ed5 sung gi\u1ea5y t\u1edd',
  kh_nghe:'\uD83D\uDCF5 Kh\u00f4ng nghe m\u00e1y',
  kh_bao_luu:'\u23F8 KH xin b\u1ea3o l\u01b0u',
  da_nop:'\uD83D\uDCE6 KH \u0111\u00e3 n\u1ed9p \u0111\u1ee7 h\u1ed3 s\u01a1',
  khac:'\uD83D\uDCDD Kh\u00e1c'
};
function onTCTDGroupChange(el){
  var val = parseInt(el.value)||0;
  if(val >= 2){
    el.style.border = '2px solid #8A1F1F';
    el.style.background = '#FDEAEA';
  } else {
    el.style.border = '';
    el.style.background = '';
  }
}


function onCICVCGroupChange() {
  var sel = document.getElementById('cic-vcnn');
  var warn = document.getElementById('cic-vcnn-warn');
  if (!sel || !warn) return;
  warn.style.display = parseInt(sel.value) >= 2 ? 'block' : 'none';
}

function addCICVCRow() {
  var el = document.getElementById('cic-vc-tctd-list');
  if (!el) return;
  var idx = el.querySelectorAll('.cic-row').length;
  var row = document.createElement('div');
  row.className = 'cic-row';
  row.innerHTML = '<input placeholder="Tên TCTD" id="vc-tctd-name-'+idx+'"> '
    + '<input placeholder="Dư nợ (VNĐ)" id="vc-tctd-dn-'+idx+'" type="number" style="width:130px"> '
    + '<select id="vc-tctd-grp-'+idx+'"><option value="">Nhóm</option>'
    + [1,2,3,4,5].map(function(n){return '<option value="'+n+'">Nhóm '+n+'</option>';}).join('')
    + '</select> '
    + '<button class="btn btn-sm" style="padding:3px 8px;background:#fee" onclick="this.parentNode.remove()">✕</button>';
  el.appendChild(row);
}

function collectCICVCTCTDs() {
  var el = document.getElementById('cic-vc-tctd-list'); if (!el) return [];
  var rows = el.querySelectorAll('.cic-row'); var result = [];
  rows.forEach(function(r, i) {
    var n=document.getElementById('vc-tctd-name-'+i);
    var d=document.getElementById('vc-tctd-dn-'+i);
    var g=document.getElementById('vc-tctd-grp-'+i);
    if(n&&n.value) result.push({name:n.value, duNo:d?d.value:'', group:g?g.value:''});
  });
  return result;
}

function onCICGroupChange(){
  var nn = document.getElementById('cic-nn');
  var warn = document.getElementById('cic-nn-warn');
  if(!nn || !warn) return;
  var val = parseInt(nn.value)||0;
  if(val >= 2){
    warn.style.display = 'block';
    nn.style.border = '2px solid #8A1F1F';
  } else {
    warn.style.display = 'none';
    nn.style.border = '';
  }
}


// ==================================================
// WEEKLY REPORT - 6 TRUONG BIM
// ==================================================



// Map DB enum → nhãn tiếng Việt (cho weekly_reports load từ DB)
var DB_STATUS_LABELS = {
  'no_answer':       'Chưa liên hệ được với KH',
  'contacted':       'KH đang cân nhắc phương án vay',
  'waiting_docs':    'KH đồng ý vay. Đang cung cấp hồ sơ',
  'rejected_kh':     'KH từ chối vay',
  'rejected_income': 'Đã Giải ngân',
  'other':           'Khác',
  'docs_complete':   'KH đồng ý vay. Đã nộp đủ hồ sơ, chờ thẩm định',
  'approved_loan':   'Đã phê duyệt cho vay',
  'appointment':     'Đã soạn hồ sơ và check file mềm',
  'rejected_cic':    'Đã kí hồ sơ chờ GN',
  'on_hold':         'Chuyển sang TT bằng vốn tự có/ Thanh lý HĐMB',
  'cdt_feedback':    'Phản hồi CĐT',
  'nh_tu_choi':      'NH từ chối cho vay'
};


// Derive trạng thái HS từ kết quả báo cáo gần nhất (ưu tiên hơn status DB)
var KT_TO_STATUS = {
  'chua_lh':          'dang',
  'dang_can_nhac':    'dang',
  'dong_y_cung_cap':  'dang',
  'kh_tu_choi':       'tuchoi',
  'nh_tu_choi':       'tuchoi',
  'von_tu_co':        'tuchoi',
  'nop_du':           'cho',
  'da_phe_duyet':     'choky',
  'soan_hs':          'choky',
  'cho_gn':           'chogn',
  'da_gn':            'xong',
  'da_thong_bao':     'choky',
  'khac':             'dang',
  // Legacy
  'da_lh':            'dang',
  'hen_gap':          'dang',
  'cho_bs':           'dang',
  'kh_nghe':          'dang',
  'kh_bao_luu':       'dang',
  'duoc_vay':         'choky',
  'tu_choi_tn':       'tuchoi',
  'tu_choi_cic':      'tuchoi',
  'tu_choi_kh':       'tuchoi',
  // DB enum values
  'contacted':        'dang',
  'appointment':      'dang',
  'waiting_docs':     'dang',
  'no_answer':        'dang',
  'on_hold':          'dang',
  'docs_complete':    'cho',
  'approved_loan':    'choky',
  'rejected_income':  'tuchoi',
  'rejected_cic':     'tuchoi',
  'rejected_kh':      'tuchoi',
  'other':            'dang'
};

function deriveHSStatus(h) {
  // Tìm báo cáo gần nhất (không phải CDT feedback)
  var wrs = (h.weeklyReports || []).filter(function(r){ return r.type !== 'cdt_feedback'; });
  if (!wrs.length) return h.status || 'moi'; // Chưa có báo cáo → giữ nguyên
  var last = wrs[wrs.length - 1];
  var kt   = last.ketQua || '';
  return KT_TO_STATUS[kt] || h.status || 'moi';
}

function getStatusLabel(val) {
  if (!val) return '—';
  var clean = (val||'').replace(/^\[KQ:([^\]]+)\].*$/, '$1').trim();
  return CT_STATUS_LABELS_FULL[clean] || DB_STATUS_LABELS[clean] || clean;
}


function buildWeeklyReportForm(h) {
  var reports = h && h.weeklyReports ? h.weeklyReports : [];
  var html2 = '';

  // Cập nhật báo cáo: CB/QL/Admin nhập | CĐT xem
  var canReport = !isCDT() && !isViewer();
  html2 += '<div class="contact-form-box" style="margin-bottom:16px">';
  html2 += '<div style="font-size:12px;font-weight:700;color:var(--blue);margin-bottom:8px">Cập nhật báo cáo (gửi CĐT)</div>';
  if (!canReport) {
    html2 += '<div class="info-banner" style="margin-bottom:8px">📋 Chỉ Cán bộ / Quản lý / Admin được cập nhật báo cáo.</div>';
  }
  html2 += '<div class="fgrid" style="gap:10px;margin-bottom:12px">';
  html2 += '<div class="fg ffull"><label>Kết quả khai thác hiện tại</label>';
  html2 += '<select id="wr-ketqua" '+(canReport?'':'disabled')+'><option value="">-- Chọn tình trạng --</option>';
  Object.keys(CT_STATUS_LABELS_FULL).forEach(function(k) {
    html2 += '<option value="' + k + '">' + CT_STATUS_LABELS_FULL[k] + '</option>';
  });
  html2 += '</select></div>';
  html2 += '<div class="fg ffull"><label>Chi tiết</label>';
  html2 += '<textarea id="wr-chitiet" rows="2" '+(canReport?'':'disabled')+' placeholder="Mô tả chi tiết tình trạng..."></textarea></div>';
  html2 += '<div class="fg ffull"><label>Đề xuất hỗ trợ từ CĐT</label>';
  html2 += '<textarea id="wr-dexuat" rows="2" '+(canReport?'':'disabled')+' placeholder="Đề xuất hỗ trợ từ CĐT nếu cần..."></textarea></div>';
  html2 += '</div>';
  html2 += '<div class="save-bar" style="display:'+(canReport?'flex':'none')+'">';
  html2 += '<button class="btn btn-primary btn-sm" onclick="saveWeeklyReport()">💾 Lưu cập nhật báo cáo</button>';
  html2 += '</div>';
  html2 += '</div>';

  // Phản hồi CĐT: CĐT nhập | CB/QL/Admin xem
  html2 += '<div class="divider"></div>';
  html2 += '<div style="font-size:12px;font-weight:700;color:var(--teal);margin-bottom:10px">PHẢN HỒI CỦA CHỦ ĐẦU TƯ</div>';
  html2 += '<div class="contact-form-box" style="background:var(--teal-l);border-color:#9DD5E0">';
  if (isCDT()) {
    html2 += '<div class="fg" style="margin-bottom:8px"><label>Nội dung phản hồi</label>';
    html2 += '<textarea id="cdt-feedback" rows="2" placeholder="Nhập phản hồi, yêu cầu hỗ trợ từ CĐT..."></textarea></div>';
    html2 += '<button class="btn btn-sm" style="background:var(--teal);color:#fff;border-color:var(--teal)" onclick="saveCDTFeedback()">💬 Gửi phản hồi</button>';
  } else {
    html2 += '<div style="font-size:12px;color:var(--txt3)">👀 Phần này Chủ đầu tư sẽ nhập phản hồi. Xem lịch sử bên dưới.</div>';
  }
  html2 += '</div>';

  // Lịch sử báo cáo
  html2 += '<div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--txt3);margin-bottom:8px">Lịch sử cập nhật (' + reports.length + ' lần)</div>';
  if (!reports.length) {
    html2 += '<div class="text-sm" style="padding:8px 0">Chưa có báo cáo nào. Cập nhật đầu tiên sẽ hiển thị ở đây.</div>';
  } else {
    html2 += '<div style="max-height:260px;overflow-y:auto;border:1px solid var(--bdr);border-radius:6px;background:#F0F8FF"><table style="width:100%;font-size:12px;border-collapse:collapse">';
    html2 += '<thead style="background:var(--surf2)"><tr>';
    html2 += '<th style="padding:7px 10px;text-align:left;border-bottom:1px solid var(--bdr)">Ngày cập nhật</th>';
    html2 += '<th style="padding:7px 10px;text-align:left;border-bottom:1px solid var(--bdr)">Kết quả khai thác</th>';
    html2 += '<th style="padding:7px 10px;text-align:left;border-bottom:1px solid var(--bdr)">Chi tiết</th>';
    html2 += '<th style="padding:7px 10px;text-align:left;border-bottom:1px solid var(--bdr)">Đề xuất hỗ trợ CĐT</th>';
    html2 += '<th style="padding:7px 10px;text-align:left;border-bottom:1px solid var(--bdr)">CB cập nhật</th>';
    html2 += '</tr></thead><tbody>';
    reports.slice().reverse().forEach(function(r2) {
      if (r2.type === 'cdt_feedback') {
        html2 += '<tr style="border-bottom:1px solid var(--bdr);background:#FFF;color:#B8860B">';
        html2 += '<td style="padding:6px 10px;white-space:nowrap">' + fmtDate(r2.time) + '</td>';
        html2 += '<td style="padding:6px 10px;font-weight:600;color:#B8860B" colspan="3">💬 CĐT: ' + (r2.chiTiet || '') + '</td>';
        html2 += '<td style="padding:6px 10px;color:var(--txt3)">' + getWhoName(r2.who) + '</td>';
        html2 += '</tr>';
      } else {
        var lbl = getStatusLabel(r2.ketQua);
        html2 += '<tr style="border-bottom:1px solid var(--bdr);background:#E8F4FD;color:#000">';
        html2 += '<td style="padding:6px 10px;white-space:nowrap">' + fmtDate(r2.time) + '</td>';
        html2 += '<td style="padding:6px 10px;font-weight:500">' + lbl + '</td>';
        html2 += '<td style="padding:6px 10px;color:var(--txt2)">' + (r2.chiTiet || '') + '</td>';
        html2 += '<td style="padding:6px 10px;color:var(--txt2)">' + (r2.deXuat || '') + '</td>';
        html2 += '<td style="padding:6px 10px;color:var(--txt3)">' + getWhoName(r2.who) + '</td>';
        html2 += '</tr>';
      }
    });
    html2 += '</tbody></table></div>';
  }
  return html2;
}


function saveCDTFeedback() {
  if (!currentHSId || !isCDT()) return;
  var el = document.getElementById('cdt-feedback');
  if (!el || !el.value.trim()) { alert('Vui lòng nhập nội dung phản hồi!'); return; }
  var idx = hsList.findIndex(function(x){ return x.id===currentHSId; });
  if (!hsList[idx].weeklyReports) hsList[idx].weeklyReports = [];
  var today2 = new Date().toISOString().slice(0,10);
  var cdtEntry = {
    time:    nowStr(),
    type:    'cdt_feedback',
    ketQua:  'cdt_feedback',
    chiTiet: el.value.trim(),
    deXuat:  '',
    who:     currentUser.name,
    weekNum: getWeekNum()
  };
  // Ghi đè phản hồi CĐT cùng ngày
  var cdtIdx = -1;
  hsList[idx].weeklyReports.forEach(function(r, i){
    if (r.type === 'cdt_feedback' && (r.time||'').slice(0,10) === today2) cdtIdx = i;
  });
  if (cdtIdx >= 0) {
    cdtEntry.dbId = hsList[idx].weeklyReports[cdtIdx].dbId;
    hsList[idx].weeklyReports[cdtIdx] = cdtEntry;
  } else {
    hsList[idx].weeklyReports.push(cdtEntry);
  }
  hsList[idx].updatedAt = nowStr();
  el.value = '';
  addLog('CĐT phản hồi: ' + hsList[idx].tenKH, 'teal', currentHSId);
  persist();
  var _cdtH = hsList[idx];
  var _lastEntry = _cdtH.weeklyReports[_cdtH.weeklyReports.length-1];
  saveAndSync(function(){ return dbSaveWeeklyReport(_cdtH, _lastEntry); }, 'Đã gửi phản hồi CĐT!');
  setTimeout(function(){ var tabs=document.querySelectorAll('#mhs-body .tab'); if(tabs[3]) swTab(tabs[3],'t-prog'); },60);
}

function saveWeeklyReport() {
  if (!currentHSId) return;
  var kq = document.getElementById('wr-ketqua');
  var ct = document.getElementById('wr-chitiet');
  var dx = document.getElementById('wr-dexuat');
  if (!kq || !kq.value) { alert('Vui lòng chọn kết quả khai thác!'); return; }
  var idx = hsList.findIndex(function(x) { return x.id === currentHSId; });
  if (!hsList[idx].weeklyReports) hsList[idx].weeklyReports = [];
  var today = new Date().toISOString().slice(0,10);
  var entry = {
    time:    nowStr(),
    ketQua:  kq.value,
    chiTiet: ct ? ct.value : '',
    deXuat:  dx ? dx.value : '',
    who:     currentUser.name,
    weekNum: getWeekNum()
  };
  // Kiểm tra đã có báo cáo hôm nay chưa (không phải CDT feedback)
  var todayIdx = -1;
  hsList[idx].weeklyReports.forEach(function(r, i){
    if (r.type !== 'cdt_feedback' && (r.time||'').slice(0,10) === today) todayIdx = i;
  });
  if (todayIdx >= 0) {
    // Ghi đè báo cáo cũ trong ngày
    entry.dbId = hsList[idx].weeklyReports[todayIdx].dbId; // giữ id DB để update
    hsList[idx].weeklyReports[todayIdx] = entry;
  } else {
    hsList[idx].weeklyReports.push(entry);
  }
  // Update latest values on HS record
  hsList[idx].ketQuaKhaiThac = kq.value;
  hsList[idx].chiTiet = ct ? ct.value : '';
  hsList[idx].deXuatHoTro = dx ? dx.value : '';
  hsList[idx].lastContactAt = nowStr();
  hsList[idx].updatedAt = nowStr();
  // Auto update status based on result
  // Tự động cập nhật trạng thái hồ sơ theo kết quả khai thác
  var ktMap = {
    'chua_lh':       'dang',   // Chưa liên hệ được → Đang xử lý (đã tiếp cận)
    'dang_can_nhac': 'dang',   // Đang cân nhắc → Đang xử lý
    'dong_y_cung_cap':'dang',  // Đồng ý - đang cung cấp HS → Đang xử lý
    'kh_tu_choi':    'tuchoi', // KH từ chối → Từ chối
    'nh_tu_choi':    'tuchoi', // NH từ chối → Từ chối
    'von_tu_co':     'tuchoi', // Chuyển vốn tự có → Từ chối
    'nop_du':        'cho',    // Đã nộp đủ HS → Chờ phê duyệt
    'da_phe_duyet':  'choky',  // Đã phê duyệt → Chờ ký
    'soan_hs':       'choky',  // Đã soạn HS → Chờ ký
    'cho_gn':        'choky',  // Đã ký - chờ GN → Chờ ký
    'da_gn':         'xong',   // Đã giải ngân → Hoàn thành
    'da_thong_bao':  'choky',  // Đã ra thông báo cấp tín dụng → Chờ ký
    // Legacy values
    'duoc_vay':      'choky',
    'tu_choi_tn':    'tuchoi',
    'tu_choi_cic':   'tuchoi',
    'tu_choi_kh':    'tuchoi',
    'da_lh':         'dang',
    'hen_gap':       'dang',
    'cho_bs':        'dang',
  };
  if (ktMap[kq.value]) hsList[idx].status = ktMap[kq.value];
  addLog('BC tuan: ' + (CT_STATUS_LABELS_FULL[kq.value]||kq.value) + ' - ' + hsList[idx].tenKH, 'green', currentHSId);
  persist(); renderHSTable(); renderDB();
  // Reset form + save DB + reload
  if(kq) kq.value=''; if(ct) ct.value=''; if(dx) dx.value='';
  var _wrH = hsList[idx];
  var _now = new Date().toISOString();
  saveAndSync(
    async function(){
      var ok = await dbSaveWeeklyReport(_wrH, entry);
      // Cập nhật last_contact_date vào loan_files để sbLoadHS() có thể đọc mà không cần join weekly_reports
      if (ok && sb && _wrH.id) {
        await sb.from('loan_files').update({ last_contact_date: _now }).eq('id', _wrH.id);
      }
      return ok;
    },
    'Đã lưu báo cáo!'
  ).then(function(){
    setTimeout(function(){
      var tabs=document.querySelectorAll('#mhs-body .tab');
      if(tabs[3]) swTab(tabs[3],'t-prog');
    },60);
  });
}

function saveGiaiNganInfo() {
  if (!canSetGiaiNgan() || !currentHSId) return;
  var hm = document.getElementById('f-hmduyet');
  var ng = document.getElementById('f-ngaygn');
  var st = document.getElementById('f-stgn');
  var idx = hsList.findIndex(function(x) { return x.id === currentHSId; });
  if (hm) hsList[idx].hanMucDuocDuyet = parseFloat(hm.value) || 0;
  if (ng) hsList[idx].ngayGiaiNgan = ng.value || '';
  if (st) hsList[idx].soTienGiaiNgan = parseFloat(st.value) || 0;
  hsList[idx].updatedAt = nowStr();
  addLog('Cap nhat thong tin giai ngan: ' + hsList[idx].tenKH, 'green', currentHSId);
  persist(); renderHSTable();
  var _gnH = hsList[idx];
  saveAndSync(function() {
    return sb.from('loan_files').update({
      loan_amount_approved: parseInt(_gnH.hanMucDuocDuyet) || null,
      disbursement_date: _gnH.ngayGiaiNgan || null,
      disbursement_amount: parseInt(_gnH.soTienGiaiNgan) || null,
      updated_at: new Date().toISOString()
    }).eq('id', _gnH.id).then(function(r) { return !r.error; });
  }, 'Đã lưu thông tin giải ngân!');
}

function getWeekNum() {
  var d = new Date();
  var start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
}

function saveContact(){
  if(!currentHSId){ alert('Luu ho so truoc!'); return; }
  var st = document.getElementById('ct-status');
  var note = document.getElementById('ct-note');
  if(!st || !st.value){ alert('Vui long chon tinh trang!'); return; }
  var idx = hsList.findIndex(function(x){ return x.id===currentHSId; });
  if(!hsList[idx].contacts) hsList[idx].contacts=[];
  hsList[idx].contacts.push({time:nowStr(), status:st.value, note:note?note.value:'', who:currentUser.name});
  hsList[idx].lastContactAt = nowStr();
  hsList[idx].updatedAt = nowStr();
  addLog('Cap nhat tinh trang KH: '+(CT_STATUS_LBL[st.value]||st.value)+' / '+hsList[idx].tenKH,'green',currentHSId);
  persist(); renderHSTable();
  openHS(currentHSId);
  setTimeout(function(){
    var tabs=document.querySelectorAll('#mhs-body .tab');
    if(tabs[1]) swTab(tabs[1],'t-contact');
  },50);
}


function buildHSFooter(h, locked) {
  var fl=document.getElementById('mhs-fl');
  var fr=document.getElementById('mhs-fr');
  if (!fl || !fr) return;
  var leftHtml='', rightHtml='';
  if (h) {
  }
  rightHtml += '<button class="btn" onclick="closeHS()">Đóng</button>';
  // CB được chốt hồ sơ (khi chưa chốt)
  if (h && !locked && !isCDT() && !isViewer()) {
    rightHtml += ' <button class="btn btn-amber" onclick="lockHS()">🔒 Chốt hồ sơ</button>';
  }
  // QL/Admin mở lại
  if (h && locked && isQL() && !isViewer()) {
    rightHtml += ' <button class="btn btn-success" onclick="unlockHS()">🔓 Mở lại hồ sơ</button>';
  }
  fl.innerHTML = leftHtml;
  fr.innerHTML = rightHtml;
}

function lockHS() {
  if (!currentHSId) return;
  var h = hsList.find(function(x){ return x.id===currentHSId; });
  if (!h) return;
  var gv = function(id){ var el=document.getElementById(id); return el?el.value.trim():''; };
  var errors = [];

  // 1. Kiểm tra checklist 3 nhóm bắt buộc (gt + tn + tsbd)
  var ck = h.ck || {};
  var reqGroups = [
    {id:'gt',   label:'Giấy tờ cá nhân'},
    {id:'tn',   label:'Chứng minh thu nhập'},
    {id:'tsbd', label:'Hồ sơ tài sản bảo đảm'}
  ];
  reqGroups.forEach(function(rg){
    var grp = CK_GROUPS.find(function(g){return g.id===rg.id;});
    if(!grp) return;
    var allChecked = grp.items.every(function(it){return ck[it.id];});
    if(!allChecked) errors.push('Chưa tích đủ mục "' + rg.label + '"');
  });

  // 2. Kiểm tra đủ trường TSBĐ (Căn hộ & HĐMB)
  if (!gv('f-mach') && !h.maCanHo)       errors.push('Mã căn hộ');
  if (!(h.giaHDMB || gv('f-giahdmb')))   errors.push('Giá HĐMB');
  if (!gv('f-sohdmb') && !h.soHDMB)      errors.push('Số HĐMB');
  if (!gv('f-ngayky') && !h.ngayKyHDMB)  errors.push('Ngày ký HĐMB');

  if (errors.length) {
    alert('Chưa đủ điều kiện chốt hồ sơ:\n• ' + errors.join('\n• '));
    return;
  }

  showConf('Chốt hồ sơ?',
    'Sau khi chốt, toàn bộ hồ sơ sẽ không chỉnh sửa được. Chỉ Quản lý / Admin mới mở lại.',
    function(){
      var idx=hsList.findIndex(function(x){return x.id===currentHSId;});
      hsList[idx].locked    = true;
      hsList[idx].lockedBy  = currentUser.name;
      hsList[idx].lockedAt  = nowStr();
      hsList[idx].updatedAt = nowStr();
      addLog('Chốt hồ sơ: '+hsList[idx].tenKH, 'green', currentHSId);
      persist(); openHS(currentHSId); renderHSTable();
      saveAndSync(function(){ return dbSaveLoanFile(hsList[idx]); }, 'Đã chốt hồ sơ!');
    });
}

function unlockHS() {
  if (!isQL() || !currentHSId) return;
  showConf('Mở lại hồ sơ?', 'Thao tác sẽ được ghi log.', function(){
    var idx=hsList.findIndex(function(x){return x.id===currentHSId;});
    hsList[idx].locked=false; hsList[idx].updatedAt=nowStr();
    addLog('Mở lại hồ sơ: '+hsList[idx].tenKH,'amber',currentHSId);
    persist(); openHS(currentHSId); renderHSTable();
  });
}

// ════════════════════════════════════════════════════════
// RESTORE SESSION KHI RELOAD TRANG
// ════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async function() {
  if (!restoreSession()) return; // Không có session hoặc đã hết hạn → ở lại màn hình login

  // Có session hợp lệ → load dữ liệu và vào app
  try {
    var btn = document.getElementById('login-btn');
    if (btn) { btn.textContent = '⏳ Đang khôi phục...'; btn.disabled = true; }

    var [dbUsers, dbHS] = await Promise.all([sbLoadUsers(), sbLoadHS()]);
    if (dbUsers && dbUsers.length) users  = dbUsers.map(mapDbUser);
    if (dbHS    && dbHS.length)    hsList = dbHS.map(mapDbHS);
    persist();

    // Hiển thị app
    document.getElementById('login-wrap').style.display = 'none';
    document.getElementById('app-wrap').classList.add('show');
    applyPerms();
    showPage(isCDT() ? 'cdt-view' : 'db');
    initIdleWatcher();
    showNotif('✅ Đã khôi phục phiên đăng nhập');
  } catch(e) {
    console.error('Restore session failed:', e);
    // Nếu load DB thất bại → ở lại login
    currentUser = null;
    localStorage.removeItem('pb5_session');
  }
});



function exportCDT() { exportCDTExcel(); }

async function exportCDTExcel() {
  if (typeof XLSX === 'undefined') {
    await new Promise(function(resolve,reject){
      var s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
      s.onload=resolve; s.onerror=reject; document.head.appendChild(s);
    });
  }

  // Load weekly_reports cho tất cả hồ sơ (cần để xuất cột AD, AE, AF, AG)
  var wrMap = {}; // loan_file_id → [weekly_reports]
  if (sb) {
    try {
      var { data: allWR, error: wrErr } = await sb
        .from('weekly_reports')
        .select('*')
        .order('created_at', { ascending: true });
      if (!wrErr && allWR) {
        allWR.forEach(function(wr) {
          if (!wrMap[wr.loan_file_id]) wrMap[wr.loan_file_id] = [];
          wrMap[wr.loan_file_id].push({
            dbId:    wr.id,
            time:    wr.created_at || wr.report_date || '',
            ketQua:  wr.contact_status || '',
            chiTiet: wr.detail || '',
            deXuat:  wr.support_request || '',
            who:     wr.officer_id || '',
            type:    wr.type || 'report'
          });
        });
      }
    } catch(e) { console.warn('exportCDT: load weekly_reports error', e); }
  }
  // Merge vào hsList (ưu tiên data fresh từ DB, fallback sang cache)
  hsList.forEach(function(h) {
    if (wrMap[h.id] && wrMap[h.id].length) {
      h._exportWR = wrMap[h.id];
    } else {
      h._exportWR = h.weeklyReports || [];
    }
  });

  function toISO(v){return toISODate(v)||'';}
  function fmtD(v){var iso=toISO(v);if(!iso)return '';var p=iso.split('-');return p[2]+'/'+p[1]+'/'+p[0];}
  function fmtShort(v){
    if(!v)return '';
    try{var d=new Date(v);if(isNaN(d)){var iso=toISO(v);if(iso)d=new Date(iso);else return v;}
    return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0');}catch(e){return v;}
  }

  // ── Colors theo mẫu BIM ──────────────────────────────────
  var FILL = {
    orange: 'F79646',  // Thông tin SP-KH
    red:    'C00000',  // Ngân hàng nguyện vọng (S-U)
    navy:   '1F497D',  // NH tư vấn KH
    purple: '7030A0',  // Giải ngân
    status: '4BACC6',  // Tình trạng
    gray:   'D9D9D9',  // Đánh số row 4
  };

  function mkS(fg, fc, bold, ha, wrap) {
    return {
      fill: {patternType:'solid', fgColor:{rgb: fg||'FFFFFF'}},
      font: {name:'Arial', sz:9, bold:!!bold, color:{rgb: fc||'000000'}},
      alignment: {horizontal:ha||'center', vertical:'center', wrapText:!!wrap},
      border: {
        top:{style:'thin',color:{rgb:'000000'}}, bottom:{style:'thin',color:{rgb:'000000'}},
        left:{style:'thin',color:{rgb:'000000'}}, right:{style:'thin',color:{rgb:'000000'}}
      }
    };
  }
  function mkData(ha, wrap) {
    return {
      font: {name:'Arial', sz:9},
      alignment: {horizontal:ha||'left', vertical:'center', wrapText:!!wrap},
      border: {
        top:{style:'thin',color:{rgb:'000000'}}, bottom:{style:'thin',color:{rgb:'000000'}},
        left:{style:'thin',color:{rgb:'000000'}}, right:{style:'thin',color:{rgb:'000000'}}
      }
    };
  }
  var S = {
    hOrange: mkS(FILL.orange,'FFFFFF',true,'center',true),
    hRed:    mkS(FILL.red,   'FFFFFF',true,'center',true),
    hNavy:   mkS(FILL.navy,  'FFFFFF',true,'center',true),
    hStatus: mkS(FILL.status,'FFFFFF',true,'center',true),
    hPurple: mkS(FILL.purple,'FFFFFF',true,'center',true),
    hNum:    mkS(FILL.gray,  '000000',false,'center',false),
    dL:      mkData('left',  true),
    dC:      mkData('center',false),
    dR:      Object.assign(mkData('right',false), {numFmt:'#,##0'}),
    dWrap:   mkData('left',  true),
  };

  function enc(r,c2){return XLSX.utils.encode_cell({r:r,c:c2});}

  var wb = XLSX.utils.book_new();
  var wsData = [];

  // ── ROW 1: Group headers ─────────────────────────────────
  // A1: STT (merge A1:A3)
  // B1:U1: Thông tin SP-KH (20 cột: index 1-20)
  // V1:AC1: Thông tin NH tư vấn KH (8 cột: 21-28)
  // AD1:AH1: Tình trạng hồ sơ vay (5 cột: 29-33)
  // AI1:AJ1: Thông tin giải ngân (2 cột: 34-35)
  var r1 = new Array(36).fill('');
  r1[0]  = 'STT';
  r1[1]  = 'Thông tin sản phẩm - khách hàng vay';
  r1[21] = 'Thông tin Ngân hàng tư vấn KH';
  r1[29] = 'Tình trạng hồ sơ vay';
  r1[34] = 'Thông tin giải ngân';
  wsData.push(r1);

  // ── ROW 2: Sub-group ─────────────────────────────────────
  var r2 = new Array(36).fill('');
  r2[23] = 'CBBH tư vấn KH';    // X2:Z2
  r2[26] = 'CB quản lý trực tiếp'; // AA2:AC2
  wsData.push(r2);

  // ── ROW 3: Column headers ────────────────────────────────
  var r3 = [
    'STT',                                                    // A  0
    'Dự án',                                                  // B  1
    'Mã căn',                                                 // C  2
    'Tên KH',                                                 // D  3
    'Đại lý',                                                 // E  4
    'Địa chỉ liên hệ',                                        // F  5
    'Vùng',                                                   // G  6
    'CCCD',                                                   // H  7
    'Số điện thoại',                                          // I  8
    'Giá trị HĐMB\n(gồm VAT - không gồm phí)',               // J  9
    'Hạn mức vay đề xuất',                                    // K  10
    'Số tiền VTC phải nộp',                                   // L  11
    'Số tiền VTC đã nộp hiện tại',                           // M  12
    'Tỷ lệ VTC đã nộp hiện tại',                            // N  13
    'CSBH áp dụng',                                          // O  14
    'Hình thức vay\n(Thời gian HTLS)',                       // P  15
    'Ngày ký HĐMB',                                          // Q  16
    'Hạn giải ngân',                                         // R  17
    'Ngân hàng nguyện vọng 1\ncủa KH',                      // S  18
    'Ngân hàng nguyện vọng 2\ncủa KH',                      // T  19
    'Ngày gửi thông tin\ncho Ngân hàng',                     // U  20
    'Ngân hàng',                                             // V  21
    'Chi nhánh',                                             // W  22
    'Họ tên',                                                // X  23 CBBH
    'SĐT',                                                   // Y  24
    'Email',                                                 // Z  25
    'Họ tên',                                                // AA 26 CB QL
    'SĐT',                                                   // AB 27
    'Email',                                                 // AC 28
    'Ngày bank cập nhật',                                    // AD 29
    'Kết quả khai thác hiện tại',                            // AE 30
    'Chi tiết',                                              // AF 31
    'Đề xuất hỗ trợ',                                       // AG 32
    'Hạn mức vay được duyệt vay',                           // AH 33
    'Ngày giải ngân',                                        // AI 34
    'Số tiền giải ngân',                                     // AJ 35
  ];
  wsData.push(r3);

  // ── ROW 4: Đánh số (1)→(36) ─────────────────────────────
  var r4 = r3.map(function(_,i){ return '('+String(i+1)+')'; });
  wsData.push(r4);

  // ── DATA ROWS ────────────────────────────────────────────
  hsList.forEach(function(h, i) {
    var cbU = users.find(function(u){return u.id===h.canBoId;})||{};
    var vtcR = '';
    if (h.vtcPhaiNop && parseFloat(h.vtcPhaiNop)>0) {
      vtcR = ((parseFloat(h.vtcDaNop||0)/parseFloat(h.vtcPhaiNop))*100).toFixed(1)+'%';
    }

    // Weekly reports - dedupe by day, last record each day
    // Dùng _exportWR (đã load fresh từ DB khi export, bao gồm cả hồ sơ chưa mở)
    var wrs = (h._exportWR||h.weeklyReports||[])
      .filter(function(r){return r.type!=='cdt_feedback';})
      .sort(function(a,b){return new Date(a.time)-new Date(b.time);});
    var byDay = {};
    wrs.forEach(function(r){byDay[fmtShort(r.time)]=r;});
    var dayKeys = Object.keys(byDay).sort(function(a,b){
      var pa=a.split('/'),pb=b.split('/');
      return (parseInt(pa[1])*100+parseInt(pa[0]))-(parseInt(pb[1])*100+parseInt(pb[0]));
    });
    var lwr = dayKeys.length ? byDay[dayKeys[dayKeys.length-1]] : null;

    var chiTiet = dayKeys.map(function(day){
      var r=byDay[day];
      var nd=(r.chiTiet||'').trim();
      if(!nd) nd=getStatusLabel(r.ketQua);
      return day+': '+nd;
    }).join('\n');

    var deXuat = dayKeys.filter(function(day){
      return (byDay[day].deXuat||'').trim();
    }).map(function(day){
      return day+': '+byDay[day].deXuat.trim();
    }).join('\n');

    var dataRow = [
      i+1,                              // A  0  STT
      'Prima Bay - Hạ Long',            // B  1  Dự án
      h.maCanHo   || '',                // C  2  Mã căn
      h.tenKH     || '',                // D  3  Tên KH
      h.daiLy     || '',                // E  4  Đại lý
      h.diaChi    || '',                // F  5  Địa chỉ
      h.vung      || '',                // G  6  Vùng
      h.cccd      || '',                // H  7  CCCD
      h.sdt       || '',                // I  8  SĐT
      parseInt(h.giaHDMB)    || null,   // J  9  Giá HĐMB
      parseInt(h.soTienVay)  || null,   // K  10 Hạn mức đề xuất
      parseInt(h.vtcPhaiNop) || null,   // L  11 VTC phải nộp
      parseInt(h.vtcDaNop)   || null,   // M  12 VTC đã nộp
      null,                             // N  13 Tỷ lệ VTC (công thức)
      h.csChinhSach  || '',             // O  14 CSBH
      h.hinhThucVay  || '',             // P  15 Hình thức vay
      fmtD(h.ngayKyHDMB),              // Q  16 Ngày ký HĐMB
      fmtD(h.hanGiaiNgan),             // R  17 Hạn GN
      '',                               // S  18 NH nguyện vọng 1
      '',                               // T  19 NH nguyện vọng 2
      '',                               // U  20 Ngày gửi TT
      'BIDV',                           // V  21 Ngân hàng
      'Tràng Tiền - Hà Nội',           // W  22 Chi nhánh
      cbU.name  || '',                  // X  23 CBBH Họ tên
      cbU.phone || '',                  // Y  24 SĐT
      cbU.email || '',                  // Z  25 Email
      cbU.name  || '',                  // AA 26 CB QL Họ tên
      cbU.phone || '',                  // AB 27 SĐT
      cbU.email || '',                  // AC 28 Email
      lwr ? fmtShort(lwr.time) : '',   // AD 29 Ngày cập nhật
      lwr ? getStatusLabel(lwr.ketQua) : '', // AE 30 Kết quả
      chiTiet,                          // AF 31 Chi tiết
      deXuat,                           // AG 32 Đề xuất
      parseInt(h.hanMucDuocDuyet)||null,// AH 33 Hạn mức duyệt
      fmtD(h.ngayGiaiNgan),            // AI 34 Ngày GN
      parseInt(h.soTienGiaiNgan)||null, // AJ 35 Số tiền GN
    ];
    wsData.push(dataRow);
  });

  // ── Create worksheet ─────────────────────────────────────
  var ws = XLSX.utils.aoa_to_sheet(wsData);

  // Merges theo mẫu BIM
  ws['!merges'] = [
    {s:{r:0,c:0},  e:{r:2,c:0}},   // A1:A3 STT
    {s:{r:0,c:1},  e:{r:1,c:20}},  // B1:U2 Thông tin SP-KH
    {s:{r:0,c:21}, e:{r:0,c:28}},  // V1:AC1 NH tư vấn
    {s:{r:1,c:23}, e:{r:1,c:25}},  // X2:Z2 CBBH
    {s:{r:1,c:26}, e:{r:1,c:28}},  // AA2:AC2 CB QL
    {s:{r:0,c:29}, e:{r:1,c:33}},  // AD1:AH2 Tình trạng
    {s:{r:0,c:34}, e:{r:1,c:35}},  // AI1:AJ2 Giải ngân
  ];

  // Col widths theo mẫu BIM
  var colWidths = [6.7,9.3,12.8,26.6,11.3,39.9,9.3,18.8,15.4,20,12.2,18.3,18.9,11.1,17.6,14,13.7,14.2,10.4,13,11.4,9.1,15.1,21.9,18.9,15.6,23.2,15.1,16.1,11.2,22.9,49.3,32.7,12.7,11.6,13];
  ws['!cols'] = colWidths.map(function(w){return{wch:w};});

  // Row heights
  ws['!rows'] = [{hpt:25},{hpt:25},{hpt:52.8},{hpt:41.4}];

  // Apply header styles
  // Row 1: group labels
  ws[enc(0,0)] = {v:'STT', s:S.hOrange};
  ws[enc(0,1)] = {v:'Thông tin sản phẩm - khách hàng vay', s:S.hOrange};
  ws[enc(0,21)]= {v:'Thông tin Ngân hàng tư vấn KH', s:S.hNavy};
  ws[enc(0,29)]= {v:'Tình trạng hồ sơ vay', s:S.hStatus};
  ws[enc(0,34)]= {v:'Thông tin giải ngân', s:S.hPurple};

  // Row 2: sub-group
  ws[enc(1,23)]= {v:'CBBH tư vấn KH', s:S.hNavy};
  ws[enc(1,26)]= {v:'CB quản lý trực tiếp', s:S.hNavy};

  // Row 3: column headers
  var hStyles = [];
  hStyles.push(S.hOrange); // A
  for(var i=1;i<=17;i++)  hStyles.push(S.hOrange); // B-R
  hStyles.push(S.hRed);   // S
  hStyles.push(S.hRed);   // T
  hStyles.push(S.hRed);   // U
  hStyles.push(S.hNavy);  // V
  hStyles.push(S.hNavy);  // W
  hStyles.push(S.hNavy);  hStyles.push(S.hNavy); hStyles.push(S.hNavy); // X-Z CBBH
  hStyles.push(S.hNavy);  hStyles.push(S.hNavy); hStyles.push(S.hNavy); // AA-AC CB QL
  for(var i=0;i<5;i++) hStyles.push(S.hStatus); // AD-AH
  hStyles.push(S.hPurple); hStyles.push(S.hPurple); // AI-AJ

  r3.forEach(function(h2,ci){
    ws[enc(2,ci)] = {v:h2, s:hStyles[ci]||S.hOrange};
  });

  // Row 4: numbering
  r4.forEach(function(h2,ci){
    ws[enc(3,ci)] = {v:h2, s:S.hNum};
  });

  // Data rows - apply styles + công thức cột N
  var NUM_COLS  = {9:true,10:true,11:true,12:true,33:true,35:true}; // J,K,L,M,AH,AJ
  var WRAP_COLS = {31:true,32:true}; // AF,AG
  var PCT_FMT   = '0.0%';
  var NUM_FMT   = '#,##0';

  for(var ri=4; ri<wsData.length; ri++){
    wsData[ri].forEach(function(val,ci){
      var cellRef = enc(ri,ci);
      var st;
      if (NUM_COLS[ci]) {
        st = Object.assign({}, S.dR);
        ws[cellRef] = {v: val||0, t:'n', s: st};
      } else if (ci===13) {
        // Cột N: công thức =M/J (VTC đã nộp / Giá HĐMB)
        var colJ = 'J'+(ri+1); // J = index 9 = Giá HĐMB
        var colM = 'M'+(ri+1); // M = index 12 = VTC đã nộp
        ws[cellRef] = {
          f: 'IF('+colJ+'=0,"",'+colM+'/'+colJ+')',
          t: 'n',
          s: Object.assign({}, S.dC, {numFmt: PCT_FMT})
        };
      } else if (WRAP_COLS[ci]) {
        st = S.dWrap;
        ws[cellRef] = {v: val||'', s: st};
      } else {
        st = S.dC;
        ws[cellRef] = {v: val||'', s: st};
      }
    });
    // Set numFmt cho các cột số
    Object.keys(NUM_COLS).forEach(function(ci){
      var cellRef = enc(ri, parseInt(ci));
      if (ws[cellRef]) ws[cellRef].s = Object.assign({}, S.dR, {numFmt: NUM_FMT});
    });
  }

  ws['!freeze'] = {xSplit:3, ySplit:4};

  XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo CĐT');
  var t=new Date();
  XLSX.writeFile(wb, 'BaoCao_PrimaBay_CĐT_'+t.getFullYear()+String(t.getMonth()+1).padStart(2,'0')+String(t.getDate()).padStart(2,'0')+'.xlsx');
  showNotif('✅ Đã xuất báo cáo '+hsList.length+' hồ sơ theo mẫu BIM!');
}

