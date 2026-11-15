# Hướng dẫn quản lý biểu mẫu Word (.docx)

> Dự án: QuanLyDAPrimaBay  
> Cập nhật: 2026-11-03

---

## 1. Quy trình giảm dung lượng file

### Nguyên nhân file nặng
File `.docx` nặng (1–2MB) thường do **font nhúng** (embedded fonts `.odttf`). Font nhúng được Word tự động thêm khi lưu để đảm bảo hiển thị đúng trên máy khác — nhưng không cần thiết vì biểu mẫu dùng font hệ thống (Times New Roman, Arial).

### Cấu trúc docx (ZIP)
```
document.docx/
├── word/
│   ├── document.xml          # Nội dung chính
│   ├── fontTable.xml         # Khai báo font
│   ├── fonts/
│   │   └── *.odttf           # ← Font nhúng (chiếm 90% dung lượng)
│   └── _rels/
│       ├── document.xml.rels
│       └── fontTable.xml.rels
└── [Content_Types].xml
```

### 5 bước xóa font nhúng (bắt buộc đủ cả 5)

| Bước | File cần sửa | Hành động |
|------|-------------|-----------|
| 1 | `word/fonts/*.odttf` | **Xóa** toàn bộ file font |
| 2 | `word/fontTable.xml` | Xóa các thẻ `<w:embedRegular>`, `<w:embedItalic>`, `<w:embedBold>` (mọi variant) |
| 3 | `word/_rels/fontTable.xml.rels` | Thay bằng `<Relationships/>` rỗng |
| 4 | `[Content_Types].xml` | Xóa các dòng `Override` trỏ đến font |
| 5 | `word/_rels/document.xml.rels` | Xóa các `Relationship` trỏ đến font |

> ⚠️ **Thiếu bất kỳ bước nào** → Word hiện hộp thoại "Repair" hoặc "error trying to open the file"

### Regex xóa embed tag (Bước 2)
```python
import re
content = re.sub(r'<w:embed\w+[^/]*/>', '', content)
```
Pattern này bắt mọi biến thể: `<w:embedRegular r:id="rId1" w:fontKey="..."/>`, `<w:embedItalic ... w:subsetted="1" .../>`, v.v.

### Kết quả sau khi xử lý
- Trước: 1.5–2.0 MB
- Sau: 12–51 KB (giảm 97–99%)

---

## 2. Quy trình sửa placeholder bị tách (split)

### Khái niệm placeholder
Biểu mẫu dùng cú pháp `<<TÊN_TRƯỜNG>>` để đánh dấu vị trí điền dữ liệu. Trong XML, ký tự `<` và `>` được mã hóa thành `&lt;` và `&gt;`.

### Vấn đề split
Word đôi khi tách một run thành nhiều `<w:r>` con khi edit, khiến `<<TÊN_TRƯỜNG>>` bị chia làm 2 run:

```xml
<!-- Bị split - KHÔNG hoạt động -->
<w:r><w:t>&lt;&lt;TÊN</w:t></w:r>
<w:r><w:t>_TRƯỜNG&gt;&gt;</w:t></w:r>

<!-- Đúng - hoạt động -->
<w:r><w:t>&lt;&lt;TÊN_TRƯỜNG&gt;&gt;</w:t></w:r>
```

### Cách fix — Dùng lxml merge runs

```python
from lxml import etree

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

def fix_split_placeholders(xml_bytes):
    root = etree.fromstring(xml_bytes)
    changed = True
    while changed:
        changed = False
        for para in root.iter(f'{{{W}}}p'):
            runs = para.findall(f'.//{{{W}}}r')
            for i, run in enumerate(runs[:-1]):
                t = run.find(f'{{{W}}}t')
                if t is None or t.text is None:
                    continue
                if '&lt;&lt;' in (t.text or '') or '<<' in (t.text or ''):
                    if '>>' not in (t.text or '') and '&gt;&gt;' not in (t.text or ''):
                        # Merge với run tiếp theo
                        next_run = runs[i+1]
                        next_t = next_run.find(f'{{{W}}}t')
                        if next_t is not None:
                            t.text = (t.text or '') + (next_t.text or '')
                            para.remove(next_run)
                            changed = True
                            break
    return etree.tostring(root, xml_declaration=True, encoding='UTF-8', standalone=True)
```

### Kiểm tra split
```python
import re
PH_RE = re.compile(r'<<\s*\'?\s*(.+?)\s*\'?\s*>>')

def count_splits(xml_bytes):
    text = xml_bytes.decode('utf-8', errors='ignore')
    # Placeholder hoàn chỉnh trong raw XML
    complete = len(re.findall(r'&lt;&lt;.+?&gt;&gt;', text))
    # Chỉ có mở không có đóng
    opens = len(re.findall(r'&lt;&lt;(?!.*?&gt;&gt;)', text))
    return complete, opens  # opens > 0 → còn split
```

---

## 3. Danh sách 15 biểu mẫu và trường thông tin

### Tóm tắt trạng thái (sau xử lý)

| File | Kích thước | Số trường | Split | Font embed |
|------|-----------|-----------|-------|------------|
| BM1_BCDX.docx | 49.4 KB | 110 | 0 | 0 |
| BM2_GDNVV.docx | 41.7 KB | 45 | 0 | 0 |
| BM2_HTD_QTTD_preprocessed.docx | 50.6 KB | 46 | 0 | 0 |
| BM3_BBBG.docx | 17.0 KB | 8 | 0 | 0 |
| BM3_TTHTLS_preprocessed.docx | 29.5 KB | 27 | 0 | 0 |
| BM4_BGNDK.docx | 12.6 KB | 8 | 0 | 0 |
| BM4_TTQLTS_preprocessed.docx | 31.9 KB | 28 | 0 | 0 |
| BM5_GDDB_preprocessed.docx | 20.3 KB | 7 | 0 | 0 |
| BM6_UNC_1_preprocessed.docx | 20.2 KB | 7 | 0 | 0 |
| BM7_BBKTSDVV_preprocessed.docx | 21.9 KB | 22 | 0 | 0 |
| BM9_BBGN_preprocessed.docx | 20.6 KB | 36 | 0 | 0 |
| BM10_BBDG_L1_preprocessed.docx | 20.5 KB | 45 | 0 | 0 |
| BM11_BBDG_L2_preprocessed.docx | 20.3 KB | 45 | 0 | 0 |
| BM12_BBBG_preprocessed.docx | 18.7 KB | 20 | 0 | 0 |
| BM13B_TCQTS_preprocessed.docx | 36.3 KB | 48 | 0 | 0 |

### Chi tiết trường theo biểu mẫu

#### BM1 — Bảng cân đối xuất (110 trường)
Người vay 1: `1-Họ tên`, `2-Ngày sinh`, `3-CMND/CCCD`, `4-Ngày cấp`, `5-Nơi cấp`, `6-Địa chỉ hộ khẩu`, `7-Địa chỉ liên lạc`, `8-Điện thoại`, `9-Email`, `10-Trình độ học vấn`, `11-Tình trạng hôn nhân`, `12-Số người phụ thuộc`, `13-Tên cơ quan`, `14-Địa chỉ cơ quan`, `15-ĐT cơ quan`, `16-Chức vụ`, `17-Phòng ban`, `18-Loại hợp đồng LĐ`, `19-Ngày vào làm`, `20-Thu nhập từ lương`, `21-Nguồn thu nhập khác`, `22-Tổng thu nhập`, `23-Chi phí sinh hoạt`, `24-Chi phí khác`, `25-Tổng chi phí`

Vợ/chồng: `26..50` (tương tự người vay)

Thông tin khoản vay: `51-Số tiền vay`, `52`, `53`, `54-Thời hạn`, `55-Mục đích`, `56-Tài sản bảo đảm`, `57`, `58`, `59-Ghi chú`...

Marker: `CO_BORROWER_START`, `CO_BORROWER_END` (đánh dấu vùng người vay 2)

#### BM2_GDNVV — Giấy đề nghị vay vốn (45 trường)
`1..12` thông tin cá nhân, `13-20` thông tin công việc, `21-32` khoản vay, `33-40` người vay 2 công việc, `41-45` cam kết

#### BM2_HTD_QTTD — Hợp đồng tín dụng (46 trường)
Bao gồm trường `54`, `55`, `64`, `65` (cần kiểm tra mapping trong `buildDocData`)

#### BM3_TTHTLS — Thông tin hồ sơ tài sản (27 trường)
Trường `47`, `48`, `60`, `61` — thông tin tài sản thế chấp

#### BM4_TTQLTS — Thông tin quản lý tài sản (28 trường)
Trường `49`, `50`, `59`, `62`

#### BM9_BBGN — Biên bản giao nhận (36 trường)
> ⚠️ **Lưu ý**: Trường `25 - Ngày sinh người 2v` có ký tự `v` thừa ở cuối — cần kiểm tra lại trong template

#### BM10/BM11 — Biên bản định giá L1/L2 (45 trường mỗi biểu mẫu)
Trường mới: `66`, `67`, `70`, `71` — thông tin định giá tài sản  
> ⚠️ **Cần xác nhận** `buildDocData(h)` đã có mapping cho 4 trường này chưa

#### BM12_BBBG — Biên bản bàn giao (20 trường)
> ⚠️ **Lưu ý**: Trường `- Mã CIF người 1` thiếu số thứ tự prefix — cần kiểm tra lại

---

## 4. Script xử lý tự động

Script hoàn chỉnh tại: `/tmp/fix_templates.py`

### Chạy lại khi thêm template mới
```bash
# Copy template mới vào thư mục
cp template_moi.docx /home/claude/quanlydaprimabay/templates/

# Chạy script xử lý
python3 /tmp/fix_templates.py

# Kiểm tra kết quả
ls -lh /home/claude/quanlydaprimabay/templates/
```

### Kiểm tra thủ công một file
```python
import zipfile, re

def quick_check(docx_path):
    with zipfile.ZipFile(docx_path) as z:
        names = z.namelist()
        # 1. Kiểm tra font
        fonts = [n for n in names if n.startswith('word/fonts/')]
        print(f"Font files: {fonts}")  # Phải rỗng
        
        # 2. Kiểm tra embed refs
        ft = z.read('word/fontTable.xml').decode('utf-8')
        embeds = re.findall(r'<w:embed\w+[^/]*/>', ft)
        print(f"Embed refs: {embeds}")  # Phải rỗng
        
        # 3. Đếm placeholder
        doc = z.read('word/document.xml').decode('utf-8')
        phs = re.findall(r'&lt;&lt;.+?&gt;&gt;', doc)
        print(f"Placeholders: {len(phs)}")
        
        # 4. Kiểm tra split
        opens = re.findall(r'&lt;&lt;(?!.*?&gt;&gt;)', doc)
        print(f"Split placeholders: {len(opens)}")  # Phải = 0
```

---

## 5. Lưu ý khi chỉnh sửa template trong Word

1. **Không dùng "Embed fonts"** khi lưu: File → Options → Save → bỏ chọn "Embed fonts in the file"
2. **Lưu dưới dạng "Word Document" (.docx)**, không phải `.doc`
3. **Sau khi chỉnh sửa**, chạy lại script để kiểm tra split placeholder
4. **Không copy-paste từ PDF** — dễ gây split run
5. **Dùng plain text** cho placeholder, không format (bold/italic) riêng từng ký tự `<` `>`

---

## 6. Pending / Việc cần làm

- [ ] Xác nhận `buildDocData(h)` trong `index.html` có mapping cho trường `66`, `67`, `70`, `71` (BM10/BM11)
- [ ] Kiểm tra trường `25 - Ngày sinh người 2v` trong BM9 (chữ `v` thừa)
- [ ] Kiểm tra trường `- Mã CIF người 1` trong BM12 (thiếu số thứ tự)
- [ ] Push 9 commits lên GitHub (đang bị block — cần reconnect GitHub App)
- [ ] Upload templates đã fix lên GitHub `/templates/` folder

### Cách push lên GitHub
GitHub App hiện bị 403. Để fix:
1. Truy cập: https://claude.ai/customize/connectors?auth_start=github&auth_start_force=1
2. Reconnect GitHub App
3. Quay lại session này và chạy `git push`
