# Kịch bản test thủ công CookFlow

> Phiên bản: 02/11/2026 — sau các đợt P0, P1, P2 trên nhánh `fix/business-logic-hardening`.
> Cách dùng: đi lần lượt từ phần 0. Mỗi ca có **Bước** và **Kỳ vọng**; đánh dấu `[x]` khi đạt, ghi lỗi ngay dưới ca nếu không đạt.
> Ký hiệu: 📱 chỉ cần test trên điện thoại · 🌐 chỉ trên web · ⚠ ca âm (dữ liệu sai / thao tác lỗi).

---

## 0. Chuẩn bị

- [ ] **0.1 Môi trường**: Node ≥ 20.19.4, chạy `npm install` rồi `npx expo start`. Test trên 1 điện thoại Android hoặc iOS (Expo Go hoặc dev build) và trình duyệt web (`w`).
- [ ] **0.2 Dữ liệu sạch**: gỡ cài đặt app / xóa dữ liệu Expo Go (web: xóa localStorage của trang) để bắt đầu như người dùng mới.
- [ ] **0.3 Gemini API key** (cho phần M): lấy key miễn phí tại aistudio.google.com/apikey.
- [ ] **0.4 Thiết bị thứ hai** (cho phần O, quét QR) — hoặc dùng web để hiển thị QR và điện thoại để quét.
- [ ] **0.5 Ảnh/video trong album điện thoại** (cho phần D).

Dữ liệu mẫu có sẵn (dùng xuyên suốt):

| Món | Danh mục | Khẩu phần | Thời gian | Timer theo bước | Có thể chứa |
|---|---|---|---|---|---|
| Trứng Ngâm Tương Lòng Đào | Món nhanh | 4 | 16 phút | 3p, 6p, 5p, – | Trứng, Gluten, Đậu nành, Mè |
| Sườn Non Rim Chua Ngọt | Món chính | 3 | 40 phút | 3p, 15p, 5p, 10p | Hải sản (nước mắm) |
| Salad Bơ Ức Gà Xốt Mè Rang | Ăn kiêng | 2 | 18 phút | 5p, 8p, – | Mè |
| Bò Bít Tết Áp Chảo Bơ Tỏi | Món chính (Khó) | 2 | 16 phút | 5p, 4p, 2p, 5p | Sữa (bơ lạt) |
| Trà Đào Cam Sả | Thức uống | 2 | 15 phút | 5p, 5p, – | – |
| Pudding Xoài Sữa Dừa | Tráng miệng | 4 | 20 phút | 10p, 3p, – | Sữa |

---

## A. Khởi động & Onboarding

- [ ] **A-01 Lần đầu mở app** — Bước: mở app với dữ liệu sạch. Kỳ vọng: hiện tour 4 trang (Kho món ăn → Chế độ nấu & Timer → Đi chợ 1-Click → Viết công thức); không bị "chớp" màn hình chính trước.
- [ ] **A-02 Lướt tour** — Bước: bấm nút tiếp tục qua cả 4 trang, bấm hoàn tất. Kỳ vọng: vào màn chính.
- [ ] **A-03 Bỏ qua tour** — Bước: dữ liệu sạch, mở app, bấm "Bỏ qua ✕". Kỳ vọng: đóng tour.
- [ ] **A-04 Không hiện lại** — Bước: tắt hẳn app, mở lại. Kỳ vọng: không hiện tour nữa.
- [ ] **A-05 Xem lại tour** — Bước: ⚙ Cài đặt → "Xem lại Tour Hướng Dẫn". Kỳ vọng: Cài đặt đóng, tour mở lại (trên iOS có trễ ~0,5 giây, không bị kẹt).
- [ ] **A-06 Dữ liệu mặc định người dùng mới** — Kỳ vọng: 6 món mẫu; tab Của tôi → ĐÃ LƯU có 2 món (Trứng Ngâm Tương, Salad); giỏ đi chợ có 2 dòng (Thịt bò phi lê 300 g chưa mua, Ớt chuông 2 quả đã mua); badge 🛒 hiện **1**.

---

## B. Khám phá (Read)

### B1. Tìm kiếm
- [ ] **B-01 Tìm không dấu** — Bước: gõ `trung ngam`. Kỳ vọng: ra "Trứng Ngâm Tương Lòng Đào"; tiêu đề mục đổi thành "KẾT QUẢ TÌM KIẾM", số đếm `[1]`.
- [ ] **B-02 Tìm theo nguyên liệu** — Bước: gõ `xoai`. Kỳ vọng: ra Pudding Xoài.
- [ ] **B-03 Tìm theo "đ"** — Bước: gõ `duong`. Kỳ vọng: ra các món có "Đường" trong nguyên liệu.
- [ ] **B-04 Tìm nhiều từ** — Bước: gõ `bo toi`. Kỳ vọng: ra Bò Bít Tết (mọi từ đều phải khớp).
- [ ] **B-05 Không có kết quả** ⚠ — Bước: gõ `pizza`. Kỳ vọng: hiện "Không tìm thấy công thức" + nút "Xóa bộ lọc"; bấm nút → ô tìm kiếm trống, đủ 6 món.
- [ ] **B-06 Nút ✕ xóa nhanh** — Bước: gõ chữ bất kỳ, bấm ✕ trong ô tìm. Kỳ vọng: ô trống.

### B2. Danh mục & bộ lọc
- [ ] **B-07 Lọc danh mục** — Bước: chọn "Món chính 🍲". Kỳ vọng: còn 2 món (Sườn, Bò); tiêu đề mục là "MÓN CHÍNH 🍲"; thẻ "Món nổi bật" ẩn.
- [ ] **B-08 Lọc thời gian** — Bước: về "Tất cả", chọn chip `⏱ ≤ 15 phút`. Kỳ vọng: chỉ còn Trà Đào (15 phút). Bấm lại chip → bỏ lọc.
- [ ] **B-09 Lọc ≤ 30 phút** — Kỳ vọng: 5 món (trừ Sườn 40 phút).
- [ ] **B-10 Lọc độ khó** — Bước: chọn `🎯 Khó`. Kỳ vọng: chỉ Bò Bít Tết.
- [ ] **B-11 Lọc tag** — Bước: chọn `🏷 Chay`. Kỳ vọng: trống (món mẫu chưa có tag) → nút "Xóa bộ lọc" xóa cả chip thời gian/độ khó/tag.
- [ ] **B-12 Kết hợp lọc** — Bước: "Món chính" + `≤ 30 phút`. Kỳ vọng: chỉ Bò Bít Tết.

### B3. Món nổi bật & thẻ món
- [ ] **B-13 Món nổi bật** — Kỳ vọng: khi không lọc có thẻ lớn "MÓN NỔI BẬT HÔM NAY"; bấm vào mở đúng món. (Đổi ngày trên máy → món nổi bật đổi.)
- [ ] **B-14 Nhãn thẻ** — Kỳ vọng: thẻ món chỉ hiện "🎥 VIDEO" / "⏱ ĐẾM GIỜ" khi món thực sự có video / timer.

### B4. Yêu thích
- [ ] **B-15 Thả tim** — Bước: bấm 🤍 trên thẻ Bò Bít Tết. Kỳ vọng: thành ❤️, không mở chi tiết món; Của tôi → ĐÃ LƯU tăng lên 3.
- [ ] **B-16 Bỏ tim** — Bước: bấm lại ❤️. Kỳ vọng: thành 🤍, món biến mất khỏi ĐÃ LƯU.
- [ ] **B-17 Tim trong chi tiết** — Bước: mở món, bấm tim ở thanh trên. Kỳ vọng: đồng bộ với thẻ ngoài danh sách.

---

## C. Chi tiết món

- [ ] **C-01 Mở chi tiết** — Bước: bấm Trứng Ngâm Tương. Kỳ vọng: ảnh, tiêu đề, mô tả, thời gian 16 phút, khẩu phần 4 người, độ khó, calories, danh sách nguyên liệu, tóm tắt các bước (bước có timer hiện badge số phút).
- [ ] **C-02 Cảnh báo dị ứng (chưa khai báo)** — Kỳ vọng: khung vàng "⚠ CÓ THỂ CHỨA CHẤT GÂY DỊ ỨNG" liệt kê Trứng, Gluten, Đậu nành, Mè và nguyên liệu tương ứng; dòng chú thích "Nhận diện tự động…".
- [ ] **C-03 Tăng/giảm khẩu phần** — Bước: bấm + lên 8 người. Kỳ vọng: Trứng 6 → 12 quả, Nước tương 150 → 300 ml; "Vừa đủ" giữ nguyên.
- [ ] **C-04 Giới hạn khẩu phần** ⚠ — Bước: giảm về 1 rồi bấm − tiếp. Kỳ vọng: nút − mờ, không xuống 0. Tăng tới 50 → nút + mờ.
- [ ] **C-05 Phân số không về 0** — Bước: món Trứng Ngâm, giảm về 1 người. Kỳ vọng: "1 muỗng cà phê" mè → "0,3"; không có lượng nào hiện 0.
- [ ] **C-06 Tick sẵn gia vị cơ bản** — Bước: tủ lạnh trống, cài đặt mặc định, mở Trứng Ngâm Tương. Kỳ vọng: "Nước lọc" và "Đường phèn hoặc mật ong" được tick sẵn, đếm "2/6 ĐÃ CÓ", dòng xanh "Đã tick sẵn 2 nguyên liệu có trong tủ lạnh / gia vị cơ bản…". (Sườn và Trà Đào không có gì tick sẵn; Salad và Bò tick sẵn dòng muối/tiêu.)
- [ ] **C-07 Checklist "đã có"** — Bước: tick thêm "Trứng gà ta" và "Nước tương ngon". Kỳ vọng: "4/6 ĐÃ CÓ"; nút đổi thành "THÊM 2 NGUYÊN LIỆU CÒN THIẾU VÀO DANH SÁCH". Bỏ tick một mục tick sẵn → số thiếu tăng.
- [ ] **C-08 Checklist không dính sang món khác** — Bước: đóng, mở món Sườn. Kỳ vọng: checklist của Sườn không mang theo tick của món trước (0/5).
- [ ] **C-09 Thêm phần thiếu vào giỏ** — Bước: món Trứng, khẩu phần 8, giữ checklist như C-07, bấm nút thêm. Kỳ vọng: thông báo "Thêm mới 2 nguyên liệu"; trong giỏ "Hành boaro, tỏi, ớt sừng — Vừa đủ phần" và "Mè trắng rang thơm — 2 muỗng cà phê" (đã nhân theo 8 người).
- [ ] **C-10 Bấm thêm lần 2** — Kỳ vọng: thông báo "Cộng dồn 2…"; giỏ **không** nhân đôi dòng; mè thành 4 muỗng cà phê, dòng "Vừa đủ" giữ nguyên.
- [ ] **C-11 Đủ nguyên liệu** — Bước: tick hết. Kỳ vọng: nút "ĐÃ ĐỦ NGUYÊN LIỆU ✓"; bấm → thông báo không cần mua thêm.
- [ ] **C-12 Nút Sửa / Tạo bản sao** — Kỳ vọng: món mẫu chỉ có "⧉ Tạo bản sao để chỉnh"; món tự tạo có thêm "✎ Sửa công thức" (xem D).
- [ ] **C-13 Món không có bước** ⚠ — (Chỉ xảy ra với dữ liệu lỗi) — bấm "Bắt đầu nấu" → báo "Chưa có bước nấu".

---

## D. CRUD công thức của tôi

### D1. Create
- [ ] **D-01 Mở form** — Bước: bấm nút **+** giữa thanh dưới. Kỳ vọng: form "Tạo Món Ăn Mới", danh mục mặc định "Món nhanh ⚡", 10 + 15 phút, 2 người, độ khó Dễ.
- [ ] **D-02 Lưu form trống** ⚠ — Bước: bấm "Lưu ➔" ngay. Kỳ vọng: một hộp thoại gộp lỗi: thiếu tên, thiếu nguyên liệu, thiếu bước.
- [ ] **D-03 Số liệu sai** ⚠ — Bước: sơ chế `abc`, nấu `-5`, khẩu phần `60`, timer bước `0`. Kỳ vọng: báo đủ 4 lỗi (phút 0–1440, khẩu phần 1–50, hẹn giờ 1–600 phút).
- [ ] **D-04 Tổng thời gian 0** ⚠ — Bước: sơ chế 0, nấu 0. Kỳ vọng: báo tổng phải > 0. (Sơ chế 0 + nấu 10 thì hợp lệ.)
- [ ] **D-05 Nguyên liệu trùng** ⚠ — Bước: 2 dòng "Hành tây" và "hanh tay". Kỳ vọng: báo nhập trùng.
- [ ] **D-06 Bước chỉ có tiêu đề** ⚠ — Bước: 1 bước có tiêu đề nhưng trống hướng dẫn. Kỳ vọng: không được tính là bước.
- [ ] **D-07 Tạo món hợp lệ** — Bước: tên "Canh Chua Cá Lóc", danh mục Món chính, 15/20 phút, 4 người, độ khó Vừa, tag **Ít đường**; nguyên liệu: "Cá lóc 500 gram", "Cà chua 2 quả", "Thơm 1/2 quả", "Me chua 30 gr"; 2 bước, bước 2 hẹn giờ 10 phút, có mẹo. Kỳ vọng: báo "Thành công"; món xuất hiện đầu danh sách và trong Của tôi → TỰ TẠO.
- [ ] **D-08 Đơn vị được chuẩn hóa** — Bước: mở món vừa tạo. Kỳ vọng: "500 g", "30 g" (không còn "gram", "gr").
- [ ] **D-09 Nhận diện dị ứng khi nhập** — Bước: trong form, gõ nguyên liệu "Cá lóc". Kỳ vọng: dưới mục Chế độ ăn hiện "⚠ … có thể chứa: Hải sản". Gõ "Cà chua", "Me chua" → không thêm cảnh báo (cà ≠ cá, me ≠ mè).
- [ ] **D-10 Thêm/bớt dòng** — Bước: thêm 2 dòng nguyên liệu, xóa 1; thêm bước, xóa bước. Kỳ vọng: luôn còn ít nhất 1 dòng mỗi loại.
- [ ] **D-11 Ảnh từ album** 📱 — Bước: tạo món, chọn ảnh từ album, lưu. **Tắt hẳn app, mở lại.** Kỳ vọng: ảnh vẫn hiển thị (đã copy vào bộ nhớ app). Nút "Lưu" hiện "Đang lưu…" trong lúc copy.
- [ ] **D-12 Ảnh bằng link** — Bước: chọn "DÙNG LINK URL", dán link ảnh https. Kỳ vọng: xem trước và lưu được.
- [ ] **D-13 Video bước** 📱 — Bước: gắn video từ album cho 1 bước, lưu, vào Cooking Mode bước đó. Kỳ vọng: phát được video.
- [ ] **D-14 Từ chối quyền album** 📱 ⚠ — Bước: từ chối quyền khi được hỏi. Kỳ vọng: thông báo cần quyền, app không crash.
- [ ] **D-15 Cảnh báo trùng khi tạo** ⚠ — Bước: tạo lại đúng "Canh Chua Cá Lóc" với cùng bộ nguyên liệu. Kỳ vọng: hỏi "Món này đã có trong danh sách"; "Xem lại" → không lưu; "Vẫn lưu" → có 2 món.

### D2. Hủy form (không mất dữ liệu ngoài ý muốn)
- [ ] **D-16 Hủy form trống** — Bước: mở form, bấm Hủy. Kỳ vọng: đóng ngay, không hỏi.
- [ ] **D-17 Hủy khi đã nhập** — Bước: gõ tên, bấm Hủy. Kỳ vọng: hỏi "Bỏ thay đổi?"; "Tiếp tục sửa" giữ nội dung; "Bỏ thay đổi" đóng.
- [ ] **D-18 Hủy khi chỉ sửa định lượng** — Bước: sửa món tự tạo, **chỉ** đổi lượng 1 nguyên liệu, bấm Hủy. Kỳ vọng: vẫn hỏi xác nhận.
- [ ] **D-19 Nút Back Android** 📱 — Kỳ vọng: giống bấm Hủy (hỏi khi có thay đổi).

### D3. Read / Update
- [ ] **D-20 Sửa từ Của tôi** — Bước: Của tôi → TỰ TẠO → **SỬA** trên món. Kỳ vọng: form "Sửa Công Thức" điền sẵn đủ dữ liệu, tag, timer (phút), mẹo, media.
- [ ] **D-21 Sửa từ chi tiết** — Bước: mở chi tiết món tự tạo → "✎ Sửa công thức". Kỳ vọng: chi tiết đóng, form sửa mở.
- [ ] **D-22 Lưu sửa** — Bước: đổi tên, thêm bước, lưu. Kỳ vọng: báo "đã cập nhật"; danh sách và chi tiết hiện dữ liệu mới; số món không tăng.

### D4. Delete
- [ ] **D-23 Xóa có xác nhận** — Bước: TỰ TẠO → **XÓA**. Kỳ vọng: hỏi "Xóa công thức?" (nhắc lịch sử nấu vẫn giữ); "Hủy" giữ món.
- [ ] **D-24 Xóa dọn dẹp** — Bước: thả tim món tự tạo, chạy 1 timer của nó, rồi xóa. Kỳ vọng: món biến mất khỏi ĐÃ LƯU, timer biến mất, thẻ "Đang nấu dở" (nếu có) biến mất.
- [ ] **D-25 Món mẫu không xóa được** — Kỳ vọng: món mẫu không có nút Sửa/Xóa.

### D5. Tạo bản sao
- [ ] **D-26 Bản sao món mẫu** — Bước: chi tiết Bò Bít Tết → "⧉ Tạo bản sao để chỉnh". Kỳ vọng: form "Tạo Bản Sao", tên "Bò Bít Tết … (bản sao)", đủ nguyên liệu/bước.
- [ ] **D-27 Hủy bản sao không sửa gì** — Bước: bấm Hủy ngay. Kỳ vọng: đóng không hỏi, **không** sinh món mới.
- [ ] **D-28 Lưu bản sao** — Bước: đổi lượng bơ thành 50, lưu. Kỳ vọng: báo "Đã tạo bản sao"; món gốc vẫn 30 g; bản sao nằm trong TỰ TẠO, sửa/xóa được.

---

## E. Giỏ đi chợ (CRUD)

- [ ] **E-01 Mở giỏ** — Bước: bấm 🛒. Kỳ vọng: tiêu đề "x / y nguyên liệu đã mua", thanh tiến độ, nhóm theo quầy (Rau củ, Thịt, Hải sản, Sữa & trứng, Bánh & ngũ cốc, Đồ khô & gia vị, Khác).
- [ ] **E-02 Phân quầy đúng** — Bước: thêm tự do "Nước mắm", "Dầu ăn", "Trứng gà", "Ốc hương", "Đậu hũ". Kỳ vọng: Nước mắm, Dầu ăn → Đồ khô & gia vị; Trứng gà → Sữa & trứng; Ốc hương → Hải sản; Đậu hũ → Rau củ.
- [ ] **E-03 Thêm tự do (Create)** — Bước: tên "Hành lá", SL `2`, đơn vị `bó`, bấm +. Kỳ vọng: dòng mới, nguồn "Mua tự do".
- [ ] **E-04 Thiếu tên** ⚠ — Bước: để trống tên, bấm +. Kỳ vọng: báo thiếu tên.
- [ ] **E-05 Số lượng sai** ⚠ — Bước: SL `abc`. Kỳ vọng: báo số lượng chưa hợp lệ. (`0,5` và `1/2` hợp lệ.)
- [ ] **E-06 Gộp cùng đơn vị** — Bước: thêm "Hành lá 1 bó" lần nữa. Kỳ vọng: báo "Đã cộng dồn", dòng thành 3 bó.
- [ ] **E-07 Gộp khác đơn vị cùng nhóm** — Bước: thêm "Thịt heo 300 gram", rồi "thit heo 0,5 kg". Kỳ vọng: 1 dòng **800 g**.
- [ ] **E-08 Quy đổi lên kg/lít** — Bước: thêm "Gạo 600 g" rồi "Gạo 600 g". Kỳ vọng: **1,2 kg**. "Sữa 1 lít" + "Sữa 250 ml" → **1250 ml** (không làm tròn sai thành 1,3 lít).
- [ ] **E-09 Không gộp đơn vị khác loại** ⚠ — Bước: "Thịt heo 1 miếng" khi đã có "Thịt heo 800 g". Kỳ vọng: 2 dòng riêng.
- [ ] **E-10 Không gộp vào dòng đã mua** — Bước: tick đã mua dòng Hành lá, thêm "Hành lá 1 bó". Kỳ vọng: dòng mới riêng.
- [ ] **E-11 Sửa dòng (Update)** — Bước: bấm ✎ (hoặc nhấn giữ) một dòng, đổi tên/SL, chọn chip đơn vị `kg`, Lưu. Kỳ vọng: dòng cập nhật; đơn vị gõ "gram" được lưu thành "g".
- [ ] **E-12 Sửa sai dữ liệu** ⚠ — Bước: trong form sửa, xóa tên → Lưu; SL `x` → Lưu. Kỳ vọng: báo lỗi, không lưu; "Hủy" đóng không đổi gì.
- [ ] **E-13 Đánh dấu đã mua** — Bước: chạm dòng. Kỳ vọng: gạch ngang, xuống cuối nhóm; tiến độ và badge 🛒 cập nhật (badge chỉ đếm món **chưa** mua).
- [ ] **E-14 Xóa + hoàn tác (Delete)** — Bước: bấm ✕ một dòng. Kỳ vọng: xóa ngay, hiện thanh "Đã xóa “…” · HOÀN TÁC"; bấm HOÀN TÁC trong 5 giây → dòng quay lại đúng vị trí. Chờ quá 5 giây → thanh tự ẩn.
- [ ] **E-15 Xóa món đã mua** — Bước: có ≥ 1 dòng đã mua, bấm "🧹 Xóa món đã mua". Kỳ vọng: hỏi xác nhận kèm số lượng; đồng ý → chỉ xóa dòng đã mua.
- [ ] **E-16 Chia sẻ danh sách** — Bước: "📋 Xuất / Gửi danh sách". Kỳ vọng: 📱 mở hộp thoại chia sẻ hệ thống; 🌐 Web Share hoặc báo "Đã sao chép". Nội dung nhóm theo quầy, ☐/☑, dòng "Còn cần mua x/y".
- [ ] **E-17 Giỏ trống** — Bước: xóa hết. Kỳ vọng: màn trống 🧺; bấm chia sẻ không có (ẩn nút).

---

## F. Tủ lạnh (Pantry Finder)

- [ ] **F-01 Mở tủ** — Bước: bấm biểu tượng tủ lạnh ở góc trên. Kỳ vọng: danh sách chip nguyên liệu lấy từ mọi công thức, sắp theo ABC.
- [ ] **F-02 Chọn nguyên liệu** — Bước: chọn "Trứng gà ta", "Nước tương ngon". Kỳ vọng: xuất hiện gợi ý món; Trứng Ngâm Tương lên đầu, ghi "x/y nguyên liệu có sẵn · Thiếu n".
- [ ] **F-03 Khớp theo cụm từ** — Bước: gõ "Thăn bò" vào ô tìm, bấm chip `+ Thêm “Thăn bò”`. Kỳ vọng: Bò Bít Tết được tính là có "Thăn bò Úc (Ribeye)" (cụm từ nằm trong tên). Ngược lại nhập "Thịt bò" thì **không** khớp món này (khác từ).
- [ ] **F-04 Nhập tự do** — Bước: gõ "Rau muống" (không có trong danh sách), bấm chip `+ Thêm “Rau muống”` hoặc Enter. Kỳ vọng: thành chip đã chọn, bấm lại để bỏ.
- [ ] **F-05 Gia vị cơ bản** — Bước: tắt công tắc "Coi gia vị cơ bản là có sẵn". Kỳ vọng: số "Thiếu" của các món tăng (muối, đường… bị tính thiếu). Công tắc này đồng bộ với Cài đặt.
- [ ] **F-06 Thêm phần thiếu vào giỏ** — Bước: bấm nút thêm ở một món "Thiếu n". Kỳ vọng: báo thêm mới / cộng dồn; giỏ có các dòng đó, nguồn là tên món.
- [ ] **F-07 Mở món từ gợi ý** — Bước: bấm vào món gợi ý. Kỳ vọng: tủ đóng, mở chi tiết món.
- [ ] **F-08 Xóa hết** ⚠ — Bước: bấm "Xóa hết". Kỳ vọng: hỏi xác nhận kèm số nguyên liệu; "Hủy" giữ nguyên.
- [ ] **F-09 Lưu sau khởi động lại** — Bước: chọn vài nguyên liệu, tắt app, mở lại. Kỳ vọng: vẫn còn.

---

## G. Vòng Đi chợ → Tủ lạnh → Nấu (tích hợp)

- [ ] **G-01 Đã mua → vào tủ** — Bước: giỏ có "Trứng gà ta" (thêm từ món Trứng Ngâm); tick đã mua. Kỳ vọng: dòng hiện "• đã cất vào tủ"; mở tủ lạnh thấy "Trứng gà ta" được chọn.
- [ ] **G-02 Bỏ tick → ra khỏi tủ** — Bước: bỏ tick dòng đó. Kỳ vọng: tủ lạnh không còn "Trứng gà ta".
- [ ] **G-03 Không gỡ thứ vốn có** — Bước: chọn "Mè trắng rang thơm" trong tủ trước, rồi trong giỏ tick/bỏ tick dòng mè. Kỳ vọng: mè vẫn còn trong tủ.
- [ ] **G-04 Tắt tự cất** — Bước: Cài đặt → tắt "Tự cất vào tủ lạnh khi đã mua", tick 1 dòng. Kỳ vọng: tủ không thay đổi.
- [ ] **G-05 Tủ → tick sẵn ở chi tiết** — Bước: tủ có "Trứng gà ta", "Nước tương ngon"; mở Trứng Ngâm Tương. Kỳ vọng: 4 nguyên liệu tick sẵn (2 từ tủ + nước lọc + đường), "Đã tick sẵn 4…"; nút chỉ thêm 2 phần còn thiếu.
- [ ] **G-06 Nấu xong → trừ tủ** — xem K-04.

---

## H. Chế độ nấu (Cooking Mode) & phiên nấu

- [ ] **H-01 Bắt đầu nấu** — Bước: chi tiết Trứng Ngâm, chọn 8 người, "BẮT ĐẦU NẤU…". Kỳ vọng: toàn màn hình, "GIAI ĐOẠN 01 // 04", thanh tiến độ 25 %.
- [ ] **H-02 Nguyên liệu theo khẩu phần** — Bước: bấm "🧾 NGUYÊN LIỆU CHO 8 NGƯỜI (GỐC 4)". Kỳ vọng: Trứng 12 quả; có ghi chú định lượng trong lời hướng dẫn là của bản gốc.
- [ ] **H-03 Chuyển bước** — Bước: "BƯỚC TIẾP THEO ›" / "‹ BƯỚC TRƯỚC". Kỳ vọng: số giai đoạn, %, nội dung đổi; nút trước mờ ở bước 1; bước cuối hiện "HOÀN THÀNH MÓN ĂN ✓".
- [ ] **H-04 Mẹo & video** — Kỳ vọng: bước có mẹo hiện khung ghi chú; bước có video phát được (hoặc ảnh dự phòng nếu link lỗi).
- [ ] **H-05 Đọc tự động (TTS)** 📱 — Bước: bấm "🔊 ĐỌC TỰ ĐỘNG", chuyển bước. Kỳ vọng: đọc tiếng Việt "Bước n: …"; "Dừng đọc" dừng; "Nghe lại" đọc lại bước hiện tại; "TẮT ĐỌC" tắt.
- [ ] **H-06 Giữ sáng màn hình** 📱 — Bước: để yên ở Cooking Mode quá thời gian khóa màn hình. Kỳ vọng: màn hình không tắt (khi bật trong Cài đặt). Tắt cài đặt → màn hình tắt bình thường.
- [ ] **H-07 Rời chế độ nấu** — Bước: "✕ ĐÓNG". Kỳ vọng: hỏi "Tạm rời chế độ nấu?" nói tiến độ được lưu; "Tiếp tục nấu" ở lại; "Rời đi" về màn chính. 📱 Nút Back Android cũng hỏi.
- [ ] **H-08 Thẻ "Đang nấu dở"** — Kỳ vọng: sau khi rời ở bước 3, màn Khám phá có thẻ đen "ĐANG NẤU DỞ · Trứng Ngâm… · Bước 3/4 • 8 người"; bấm → mở lại đúng bước 3.
- [ ] **H-09 Nấu dở qua khởi động lại** — Bước: tắt hẳn app ở bước 3, mở lại. Kỳ vọng: thẻ "Đang nấu dở" vẫn có, đúng bước và khẩu phần.
- [ ] **H-10 Kết thúc phiên** — Bước: bấm ✕ trên thẻ "Đang nấu dở". Kỳ vọng: hỏi xác nhận; đồng ý → thẻ biến mất.
- [ ] **H-11 Mở lại cùng món** — Bước: đang dở bước 3, vào chi tiết cùng món bấm "Bắt đầu nấu". Kỳ vọng: hỏi "Tiếp tục món đang nấu?" — "Tiếp tục" về bước 3 (khẩu phần theo lựa chọn mới); "Nấu lại từ đầu" về bước 1.
- [ ] **H-12 Nấu món khác khi đang dở** ⚠ — Bước: đang dở món A, bắt đầu món B. Kỳ vọng: hỏi "Đang nấu dở món khác"; "Giữ nguyên" không đổi; "Nấu món mới" chuyển sang B.
- [ ] **H-13 Sửa món đang nấu** — Bước: đang ở bước 3, sửa món chèn 1 bước lên đầu, lưu, mở lại. Kỳ vọng: vẫn đúng bước cũ (giờ là bước 4).

---

## I. Timer (song song, thông báo)

- [ ] **I-01 Bắt đầu / tạm dừng / tiếp tục** — Bước: Cooking Mode bước 1 (3 phút), "Bắt đầu" → "Tạm dừng" → "Tiếp tục". Kỳ vọng: nhãn "● ĐANG NẤU" / "TẠM DỪNG"; thời gian dừng đúng lúc tạm dừng.
- [ ] **I-02 +1 phút & Đặt lại** — Kỳ vọng: +1 phút cộng 60 giây; "Đặt lại" về thời gian mặc định, nút mờ khi chưa chạy.
- [ ] **I-03 Tab đếm giờ bước không có timer** — Bước: bước không có timer, chọn "⏱ ĐẾM GIỜ BƯỚC NÀY". Kỳ vọng: vòng timer 3 phút mặc định.
- [ ] **I-04 Chạy 2 timer song song** — Bước: chạy timer bước 2, sang bước 3 chạy timer bước 3. Kỳ vọng: **cả hai cùng chạy**; dưới timer hiện "Đang chạy song song: …".
- [ ] **I-05 Giới hạn 4 timer** ⚠ — Bước: chạy timer ở 4 bước (dùng món Sườn hoặc Bò có 4 bước timer), thử bước thứ 5 (món khác). Kỳ vọng: báo "Đã đủ timer" (tối đa 4). Timer đã "Hết giờ" không chiếm chỗ.
- [ ] **I-06 Sang bước khi timer đang chạy** — Bước: timer bước hiện tại đang chạy, bấm "BƯỚC TIẾP THEO". Kỳ vọng: hỏi "Timer bước này vẫn đang chạy"; "Ở lại" / "Sang bước tiếp" (timer vẫn chạy).
- [ ] **I-07 Hết giờ trong app** — Bước: đặt timer 1 phút (sửa món tự tạo với timer 1 phút). Kỳ vọng: khi hết giờ — hộp thoại "⏰ ĐÃ HẾT GIỜ!" ghi món + bước; 📱 rung; đọc "Hết giờ bước…" (nếu bật chuông). 2 timer hết cùng lúc → 1 hộp thoại liệt kê cả hai.
- [ ] **I-08 Timer khi đã rời Cooking Mode** — Bước: chạy timer, rời Cooking Mode. Kỳ vọng: widget nổi phía trên thanh dưới "⏱ mm:ss • tên bước"; vẫn báo hết giờ khi đang ở màn khác.
- [ ] **I-09 Widget nhiều timer** — Bước: 2 timer chạy, rời Cooking Mode. Kỳ vọng: widget hiện timer **sắp hết nhất** kèm "+1"; bấm → mở đúng bước của timer đó.
- [ ] **I-10 Widget tạm dừng / hết giờ** — Kỳ vọng: timer tạm dừng hiện ⏸ + nút ✕ để tắt; hết giờ hiện "✓ Hết giờ" nền xanh + ✕.
- [ ] **I-11 Đếm đúng khi chạy nền** 📱 — Bước: chạy timer 3 phút, về màn hình chính điện thoại 1 phút, quay lại. Kỳ vọng: còn ~2 phút (không bị đứng).
- [ ] **I-12 Thông báo hệ thống** 📱 — Bước: lần đầu bắt đầu timer → cho phép thông báo; chạy timer 1 phút, **đóng app**. Kỳ vọng: thông báo "⏰ Hết giờ! — món — Bước n: …" hiện đúng giờ.
- [ ] **I-13 Thông báo bị hủy khi dừng** 📱 — Bước: chạy timer 1 phút, tạm dừng hoặc Đặt lại, đóng app chờ quá 1 phút. Kỳ vọng: **không** có thông báo.
- [ ] **I-14 Tắt thông báo** 📱 — Bước: Cài đặt → tắt "Thông báo khi hết giờ", lặp I-12. Kỳ vọng: không có thông báo.
- [ ] **I-15 Timer sau khởi động lại** — Bước: chạy timer 5 phút, tắt hẳn app, mở lại sau 1 phút. Kỳ vọng: widget vẫn chạy, còn ~4 phút. Mở lại sau khi đã quá giờ → hiện "✓ Hết giờ".
- [ ] **I-16 Timer sau khi sửa món** — Bước: chạy timer bước 2 của món tự tạo, sửa món chèn bước lên đầu. Kỳ vọng: timer vẫn gắn với bước đó (nay là bước 3, đúng tên). Xóa chính bước đó → timer dừng.

---

## K. Hoàn thành món & lịch sử nấu

- [ ] **K-01 Màn hoàn thành** — Bước: tới bước cuối, "HOÀN THÀNH MÓN ĂN ✓". Kỳ vọng: thẻ "MÓN ĂN ĐÃ HOÀN THÀNH", số bước + phút; cuộn được trên màn hình nhỏ.
- [ ] **K-02 Quay lại bước cuối** — Bước: "‹ Quay lại bước cuối". Kỳ vọng: đóng thẻ, chưa ghi lịch sử.
- [ ] **K-03 Đánh giá & ghi chú** — Bước: chọn 4 sao (bấm lại sao đang chọn để bỏ), ghi chú "bớt đường". Kỳ vọng: sao tô vàng đúng số; ghi chú tối đa 200 ký tự.
- [ ] **K-04 Trừ tủ lạnh** — Bước: tủ có "Trứng gà ta" + "Mè trắng rang thơm"; ở màn hoàn thành chọn "Trứng gà ta" là đã dùng hết. Kỳ vọng: xác nhận → tủ chỉ còn mè.
- [ ] **K-05 Xác nhận** — Bước: "XÁC NHẬN & QUAY VỀ TRANG CHỦ". Kỳ vọng: về màn chính; timer của món bị xóa; thẻ "Đang nấu dở" biến mất.
- [ ] **K-06 Tab ĐÃ NẤU** — Bước: Của tôi → ĐÃ NẤU. Kỳ vọng: dòng "Trứng Ngâm Tương… · Hôm nay • 8 người • ★★★★☆" + ghi chú.
- [ ] **K-07 Thống kê ở chi tiết** — Bước: mở lại món. Kỳ vọng: "🍳 Đã nấu 1 lần • gần nhất hôm nay • ★ 4". Nấu lần 2 cho 2 sao → "2 lần • ★ 3".
- [ ] **K-08 Mở món từ lịch sử** — Bước: bấm dòng lịch sử. Kỳ vọng: mở chi tiết món.
- [ ] **K-09 Xóa lần nấu** — Bước: bấm ✕ (hoặc nhấn giữ) trên dòng. Kỳ vọng: hỏi xác nhận; đồng ý → dòng biến mất, thống kê ở chi tiết giảm.
- [ ] **K-10 Lịch sử của món đã xóa** — Bước: nấu xong món tự tạo, rồi xóa món đó. Kỳ vọng: lịch sử vẫn còn, ghi "• món đã bị xóa", bấm không mở gì.

---

## L. Dị ứng & chế độ ăn

- [ ] **L-01 Khai báo dị ứng** — Bước: Cài đặt → DỊ ỨNG CỦA TÔI → chọn **Trứng**. Kỳ vọng: chip có ✓.
- [ ] **L-02 Ẩn món ở Khám phá** — Kỳ vọng: Trứng Ngâm Tương biến mất; dải cam "Đã ẩn 1 món có thể chứa chất bạn dị ứng · HIỆN".
- [ ] **L-03 Hiện lại** — Bước: bấm HIỆN. Kỳ vọng: món hiện lại với dòng "⚠ Có thể chứa: Trứng" trên thẻ; dải ghi "Đang hiện cả…" + "ẨN LẠI".
- [ ] **L-04 Cảnh báo đỏ ở chi tiết** — Bước: mở món. Kỳ vọng: khung đỏ "⚠ CÓ THỂ CHỨA CHẤT BẠN DỊ ỨNG: TRỨNG".
- [ ] **L-05 Không ẩn** — Bước: Cài đặt → tắt "Ẩn các món đó ở trang Khám phá". Kỳ vọng: món luôn hiện, vẫn có cảnh báo trên thẻ.
- [ ] **L-06 Món nổi bật né dị ứng** — Bước: chọn Sữa + Mè + Trứng + Hải sản. Kỳ vọng: "Món nổi bật" chỉ là món không chứa các chất đó (ví dụ Trà Đào).
- [ ] **L-07 Tag ở chi tiết & lọc** — Bước: món D-07 có tag "Ít đường". Kỳ vọng: chi tiết hiện badge "Ít đường"; Khám phá chọn `🏷 Ít đường` → chỉ món đó.

---

## M. AI Sous-Chef (cần Internet + API key)

- [ ] **M-01 Chưa có key** — Bước: mở chi tiết món → nút AI. Kỳ vọng: màn "🔑 Kết nối Google Gemini", link mở trang lấy key; nút lưu mờ khi ô trống.
- [ ] **M-02 Key sai** ⚠ — Bước: lưu key `abc`, hỏi 1 câu. Kỳ vọng: tin nhắn lỗi "API key Gemini không hợp lệ…" (không crash).
- [ ] **M-03 Lưu key đúng** — Bước: nút 🔑 → nhập key đúng → "LƯU & BẮT ĐẦU HỎI". Kỳ vọng: vào màn chat.
- [ ] **M-04 Key lưu an toàn** 📱 — Bước: tắt hẳn app, mở lại, mở AI. Kỳ vọng: không phải nhập lại key. (Key nằm trong keychain/keystore.)
- [ ] **M-05 Câu hỏi gợi ý** — Bước: chip "Thay thế gia vị" ở màn chi tiết. Kỳ vọng: mở chat và tự gửi câu hỏi; trả lời tiếng Việt, không có ký tự markdown `**`, `#`.
- [ ] **M-06 Chat tự do & lịch sử** — Bước: hỏi tiếp "vậy cho 2 người thì sao?". Kỳ vọng: AI hiểu ngữ cảnh câu trước.
- [ ] **M-07 Khẩu phần truyền sang AI** — Bước: chi tiết đặt 8 người, hỏi "cần bao nhiêu trứng?". Kỳ vọng: AI trả lời theo 8 người (12 quả).
- [ ] **M-08 Dị ứng truyền sang AI** — Bước: khai báo dị ứng Đậu nành, hỏi về món Trứng Ngâm Tương. Kỳ vọng: AI cảnh báo nước tương và gợi ý thay thế.
- [ ] **M-09 "Cứu bước này"** — Bước: trong Cooking Mode bấm 🤖 AI. Kỳ vọng: có thêm chip "Cứu bước này"; AI biết người dùng đang ở bước nào.
- [ ] **M-10 Câu hỏi ngoài lề** — Bước: hỏi "thời tiết hôm nay". Kỳ vọng: AI lịch sự kéo về chủ đề nấu ăn.
- [ ] **M-11 Mất mạng** ⚠ — Bước: tắt mạng, hỏi. Kỳ vọng: lỗi "Không kết nối được tới Gemini…".
- [ ] **M-12 Đóng khi đang chờ** — Bước: gửi câu hỏi rồi đóng chat ngay. Kỳ vọng: không lỗi, không hiện câu trả lời "ma" khi mở lại.
- [ ] **M-13 Áp dụng gợi ý** — Bước: sau câu trả lời thay thế gia vị, bấm "✨ Áp dụng vào giỏ / công thức". Kỳ vọng: "Đang phân tích…" rồi hiện bảng "Chọn thay đổi muốn áp dụng" (mỗi dòng: cũ → mới). Câu trả lời không có thay đổi cụ thể → ghi chú "không có thay đổi…".
- [ ] **M-14 Thêm vào giỏ từ gợi ý** — Bước: bỏ chọn 1 thay đổi, bấm "🛒 Thêm vào giỏ đi chợ". Kỳ vọng: chỉ nguyên liệu mới của thay đổi đã chọn vào giỏ; nút thành "✓ Đã thêm".
- [ ] **M-15 Lưu biến thể** — Bước: "📝 Lưu thành bản của tôi". Kỳ vọng: món mới "… (bản của tôi)" trong TỰ TẠO, có khung "✨ BẢN CỦA TÔI // ĐÃ ĐIỀU CHỈNH THEO GỢI Ý AI"; món gốc không đổi.
- [ ] **M-16 Áp dụng lần 2** — Bước: áp dụng thêm gợi ý khác trên món gốc. Kỳ vọng: cập nhật vào biến thể đã có (không tạo bản thứ hai); thay đổi đã áp dụng rồi → báo "Đã áp dụng trước đó".
- [ ] **M-17 Xóa key** — Bước: nút 🔑 → "Xoá key đã lưu". Kỳ vọng: quay về màn nhập key (hoặc tự dùng key trong `.env` nếu có).

---

## N. Chia sẻ công thức

- [ ] **N-01 Mở chia sẻ** — Bước: chi tiết món → nút chia sẻ. Kỳ vọng: 2 tab "📸 ẢNH STORY" và "▦ MÃ QR".
- [ ] **N-02 Ảnh Story** — Bước: chờ ảnh tải xong, "XUẤT ẢNH & CHIA SẺ". Kỳ vọng: 📱 hộp thoại chia sẻ ảnh PNG dọc; 🌐 tải về tệp `cookflow-<ten-mon>.png`. Nút mờ khi ảnh chưa tải.
- [ ] **N-03 Chia sẻ văn bản** — Bước: "Chia sẻ dạng văn bản". Kỳ vọng: nội dung gồm tên món, nguyên liệu, các bước.
- [ ] **N-04 Mã QR** — Bước: tab MÃ QR. Kỳ vọng: hiện QR; món dài có thông báo "✂ Mã QR đã rút gọn…"; món quá lớn không vẽ QR mà hướng dẫn gửi mã văn bản (không crash).
- [ ] **N-05 Gửi mã văn bản** — Bước: "Gửi mã dạng văn bản". Kỳ vọng: chia sẻ chuỗi bắt đầu `CF1:`.
- [ ] **N-06 Ảnh từ máy không đi kèm** — Bước: chia sẻ QR của món có ảnh chọn từ album. Kỳ vọng: có ghi chú ảnh/video từ máy không được gửi kèm; bên nhận thấy ảnh mặc định.

---

## O. Nhận công thức qua QR

- [ ] **O-01 Mở máy quét** — Bước: Khám phá → "📷 QUÉT QR". Kỳ vọng: 2 tab "📷 QUÉT CAMERA" và "📋 DÁN MÃ".
- [ ] **O-02 Quyền camera** 📱 — Bước: lần đầu → "CHO PHÉP CAMERA". Kỳ vọng: hiện khung ngắm. Từ chối vĩnh viễn → hướng dẫn mở cài đặt, tab DÁN MÃ vẫn dùng được.
- [ ] **O-03 Quét QR hợp lệ** 📱 — Bước: quét QR của N-04 trên máy khác. Kỳ vọng: thẻ xem trước (tên, số nguyên liệu, số bước); "LƯU VÀO MÓN CỦA TÔI" → báo "Đã nhận món!" và chuyển sang tab Của tôi.
- [ ] **O-04 Dán mã** — Bước: dán chuỗi `CF1:` từ N-05. Kỳ vọng: giống O-03.
- [ ] **O-05 Mã hỏng** ⚠ — Bước: dán `CF1:{abc` hoặc chữ bất kỳ. Kỳ vọng: báo "Mã này không phải công thức CookFlow hợp lệ…".
- [ ] **O-06 Nhập trùng** ⚠ — Bước: quét lại đúng mã đã nhập. Kỳ vọng: hỏi đã có món giống; có thể hủy hoặc vẫn lưu.
- [ ] **O-07 Dữ liệu sau khi nhập** — Kỳ vọng: món nhập vào TỰ TẠO, sửa/xóa được; tag, danh mục hợp lệ (danh mục lạ → "Món chính 🍲"); khẩu phần > 50 bị hạ về 50; đơn vị chuẩn hóa.
- [ ] **O-08 Quét mã khác** — Bước: sau khi xem trước, "Quét mã khác". Kỳ vọng: quay lại camera.

---

## P. Cài đặt

- [ ] **P-01 Mở Cài đặt** — Bước: nút ⚙. Kỳ vọng: các nhóm: Trợ lý nấu ăn, Dị ứng của tôi, Tủ lạnh & đi chợ, Dữ liệu trên máy, Hướng dẫn ứng dụng.
- [ ] **P-02 Giữ sáng màn hình** — xem H-06.
- [ ] **P-03 Chuông báo Timer** — Bước: tắt, chạy timer ngắn. Kỳ vọng: hết giờ không đọc giọng nói (vẫn có hộp thoại).
- [ ] **P-04 Rung** 📱 — Bước: tắt rung, chạy timer ngắn. Kỳ vọng: không rung.
- [ ] **P-05 Thông báo khi hết giờ** 📱 — xem I-14. (🌐 không có mục này.)
- [ ] **P-06 Tự cất vào tủ / Gia vị cơ bản** — xem G-04, F-05; đổi trong Cài đặt phải đồng bộ với công tắc trong tủ lạnh.
- [ ] **P-07 Cài đặt được lưu** — Bước: đổi vài công tắc, tắt app, mở lại. Kỳ vọng: giữ nguyên.

---

## Q. Dữ liệu: sao lưu, khôi phục, xóa

- [ ] **Q-01 Xuất sao lưu** — Bước: Cài đặt → "Xuất bản sao lưu". Kỳ vọng: 📱 hộp thoại chia sẻ tệp `cookflow-backup-YYYY-MM-DD.json` (lưu vào Files/Drive hoặc gửi cho chính mình); 🌐 tải tệp về + thông báo số món / lần nấu.
- [ ] **Q-02 Nội dung tệp** — Mở tệp bằng trình xem văn bản. Kỳ vọng: có `"format": "cookflow-backup"`, chỉ có món **tự tạo** (không có 6 món mẫu), **không** có API key.
- [ ] **Q-03 Xóa toàn bộ** ⚠ — Bước: "Xóa toàn bộ dữ liệu" → xác nhận. Kỳ vọng: còn 6 món mẫu; không có món tự tạo, yêu thích, giỏ, tủ, lịch sử, phiên nấu, timer; cài đặt về mặc định; tour **không** hiện lại. "Hủy" thì không đổi gì.
- [ ] **Q-04 Khôi phục** — Bước: "Khôi phục từ bản sao lưu" → chọn tệp Q-01. Kỳ vọng: hộp thoại tóm tắt (số món, mục đi chợ, nguyên liệu trong tủ, lần nấu) + cảnh báo THAY THẾ; đồng ý → dữ liệu quay lại đầy đủ, báo "Đã khôi phục ✓".
- [ ] **Q-05 Hủy chọn tệp** — Bước: mở trình chọn tệp rồi hủy. Kỳ vọng: không có thông báo lỗi, không đổi gì.
- [ ] **Q-06 Tệp sai** ⚠ — Bước: chọn 1 tệp .json bất kỳ không phải sao lưu. Kỳ vọng: báo "Tệp không phải bản sao lưu CookFlow"; dữ liệu không đổi.
- [ ] **Q-07 Ảnh từ máy cũ** — Bước: sao lưu có món dùng ảnh album, khôi phục trên máy khác. Kỳ vọng: cảnh báo "n món dùng ảnh từ máy cũ có thể không hiển thị ảnh".

---

## R. Lưu trữ bền (sau khi tắt hẳn app)

Làm mỗi thao tác, tắt hẳn app (vuốt khỏi đa nhiệm / tải lại trang web), mở lại và kiểm tra:

- [ ] **R-01** Món tự tạo / đã sửa / đã xóa.
- [ ] **R-02** Yêu thích.
- [ ] **R-03** Giỏ đi chợ (cả trạng thái đã mua, đơn vị đã sửa).
- [ ] **R-04** Tủ lạnh.
- [ ] **R-05** Cài đặt + dị ứng.
- [ ] **R-06** Phiên nấu dở (bước + khẩu phần).
- [ ] **R-07** Timer đang chạy / tạm dừng / đã hết giờ.
- [ ] **R-08** Lịch sử nấu.
- [ ] **R-09** Trạng thái đã xem tour.
- [ ] **R-10 Không ghi đè khi vừa mở** — Bước: mở app và **ngay lập tức** thả tim / thêm vào giỏ. Kỳ vọng: dữ liệu cũ không bị mất (không bị thay bằng dữ liệu mẫu).

---

## S. Riêng trên web 🌐

- [ ] **S-01 Hộp thoại** — Kỳ vọng: mọi xác nhận (rời Cooking Mode, xóa món, xóa đã mua, xóa hết tủ, khôi phục…) hiện bằng `confirm` của trình duyệt và **thực sự** hoạt động.
- [ ] **S-02 Timer khi đổi tab** — Bước: chạy timer 1 phút, chuyển sang tab khác 2 phút, quay lại. Kỳ vọng: hiện hết giờ, thời gian không bị chậm.
- [ ] **S-03 Lưu localStorage** — Bước: tải lại trang. Kỳ vọng: giống phần R.
- [ ] **S-04 Không có tính năng chỉ dành cho máy** — Kỳ vọng: không có công tắc thông báo; QR camera có thể không dùng được → dùng DÁN MÃ.

---

## T. Ca biên & lỗi chung ⚠

- [ ] **T-01 iOS mở modal liên tiếp** 📱 — Bước: từ chi tiết bấm "Bắt đầu nấu", "Sửa", "Tạo bản sao". Kỳ vọng: màn tiếp theo luôn mở (không kẹt do modal cũ đang đóng).
- [ ] **T-02 Tên rất dài** — Bước: tạo món tên 200 ký tự. Kỳ vọng: thẻ cắt bằng "…", không vỡ giao diện.
- [ ] **T-03 Màn hình nhỏ** — Kỳ vọng: hàng nút timer tự xuống dòng; vùng chạm ≥ 44pt; thẻ hoàn thành cuộn được.
- [ ] **T-04 Bấm nhanh liên tục** — Bước: bấm "Thêm vào giỏ" 5 lần thật nhanh. Kỳ vọng: không mất dòng, không nhân dòng (chỉ cộng dồn).
- [ ] **T-05 Xoay ngang** 📱 — Kỳ vọng: app khóa dọc (portrait).

---

## Ghi nhận kết quả

| Phần | Số ca | Đạt | Lỗi | Ghi chú |
|---|---|---|---|---|
| A Khởi động | 6 | | | |
| B Khám phá | 17 | | | |
| C Chi tiết món | 13 | | | |
| D CRUD công thức | 28 | | | |
| E Giỏ đi chợ | 17 | | | |
| F Tủ lạnh | 9 | | | |
| G Vòng tích hợp | 6 | | | |
| H Cooking Mode | 13 | | | |
| I Timer | 16 | | | |
| K Hoàn thành & lịch sử | 10 | | | |
| L Dị ứng & tag | 7 | | | |
| M AI Sous-Chef | 17 | | | |
| N Chia sẻ | 6 | | | |
| O Nhận QR | 8 | | | |
| P Cài đặt | 7 | | | |
| Q Sao lưu/khôi phục | 7 | | | |
| R Lưu trữ bền | 10 | | | |
| S Web | 4 | | | |
| T Ca biên | 5 | | | |
