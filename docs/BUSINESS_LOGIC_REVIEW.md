# Rà soát luồng nghiệp vụ CookFlow — 31/10/2026

Phạm vi: toàn bộ `src/` trên nhánh `main` (commit `54040d2`). Mỗi lỗi bên dưới đã được sửa trong bản vá kèm theo.
Mức độ: **Cao** = sai dữ liệu / kẹt luồng; **TB** = hành vi sai lệch nghiệp vụ; **Thấp** = giao diện, trải nghiệm.

## 1. Lỗi đã sửa

| # | Mức | Khu vực | Vấn đề | Cách sửa |
|---|---|---|---|---|
| 1 | Cao | Web (mọi màn hình) | `Alert.alert` của React Native Web không làm gì → trên web **không thoát được Cooking Mode, không xóa được công thức**, mọi thông báo bị nuốt | `src/utils/dialog.js`: `showAlert` / `confirmAction` dùng `window.alert/confirm` trên web, `Alert` trên mobile; thay ở mọi màn hình |
| 2 | Cao | Timer | Chuyển sang bước khác **ghi đè/xóa timer đang chạy** của bước trước; chỉ xem bước không có timer cũng tạo timer 180s đè lên | Timer toàn cục gắn `recipeId + stepIndex`; `TimerCircle` chỉ hiển thị timer của đúng bước, bước khác muốn chạy phải xác nhận thay thế |
| 3 | Cao | Timer | Đếm bằng `secondsLeft - 1` mỗi giây → lệch khi app chạy nền / tab bị throttle, hết giờ khi đã đóng Cooking Mode thì **không báo** | Tính theo đồng hồ thực (`endAt`), lắng nghe `AppState`; phát hiện hết giờ ở `RecipeContext` (rung + đọc giọng nói + thông báo) kể cả khi đã đóng màn hình nấu; timer được lưu và khôi phục sau khi mở lại app |
| 4 | Cao | Lưu trữ | Ghi storage bằng giá trị cũ của closure; thao tác trước khi tải xong dữ liệu sẽ **ghi đè dữ liệu đã lưu** bằng dữ liệu mẫu | Cờ `isHydrated`; mọi thay đổi dùng functional update, chỉ ghi storage sau khi tải xong |
| 5 | Cao | Phân quầy đi chợ | So khớp chuỗi con: "nư**ớc** tương/mắm" bị xếp vào **Hải sản** (khớp "ốc"), "dầu ăn" vào Rau củ, "trứng gà" vào Thịt; NFD không đổi "đ" nên "đường", "đậu" không bao giờ khớp | So khớp theo **từ nguyên vẹn** + chuẩn hóa "đ→d" (`src/utils/text.js`), sắp lại thứ tự luật, có test |
| 6 | TB | Chi tiết món | Checklist nguyên liệu dùng id `i1, i2…` trùng giữa các món → mở món khác vẫn hiện tick của món trước | Reset checklist khi đổi món; id nguyên liệu được chuẩn hóa duy nhất trong mỗi món |
| 7 | TB | Đi chợ | Nút thêm vào giỏ luôn thêm **toàn bộ** nguyên liệu kể cả món đã tick "có sẵn"; bấm 2 lần thì nhân đôi dòng | Chỉ thêm nguyên liệu **chưa có**; gộp dòng trùng tên + đơn vị (cộng dồn số lượng, ghi nhiều nguồn công thức) |
| 8 | TB | Xóa công thức | Xóa món nhưng còn trong Yêu thích, timer và phiên nấu của món đó vẫn chạy | `deleteRecipe` dọn favorites, timer, phiên nấu; sửa món đang nấu thì đồng bộ phiên nấu |
| 9 | TB | Tạo / sửa món | Bước trống được điền chữ giả "Thực hiện công đoạn này theo ý thích"; thời gian `0` bị đổi thành 10; hẹn giờ nhập chữ → `NaN`; số âm/thập phân lọt qua | Kiểm tra dữ liệu đầy đủ (số phút 0–1440, tổng > 0, khẩu phần 1–50, hẹn giờ 1–600 phút, nguyên liệu không trùng, ≥1 bước có nội dung), báo lỗi gộp; hỏi trước khi bỏ form đang nhập |
| 10 | TB | Pantry | So khớp phải trùng tên tuyệt đối ("Thịt bò" ≠ "Thịt bò phi lê"); muối/đường/nước luôn bị tính là "thiếu" nên gần như không món nào "đủ để nấu"; không nhập được nguyên liệu tự do dù tài liệu có ghi | Khớp theo cụm từ, tùy chọn coi gia vị cơ bản là có sẵn, thêm nguyên liệu tự do bằng ô tìm kiếm, sắp xếp theo số nguyên liệu còn thiếu |
| 11 | TB | QR | Quét lại cùng mã → tạo bản trùng; ảnh/video chọn từ máy (`file://`) vẫn bị nhét vào QR dù người nhận không xem được; payload quá lớn làm thư viện QR **crash** | Cảnh báo trùng (tên + bộ nguyên liệu); bỏ media cục bộ; quá 2.900 byte thì không vẽ QR mà hướng dẫn gửi mã văn bản; cờ "đã rút gọn" báo đúng cả khi chỉ bỏ video |
| 12 | TB | Cài đặt | 3 công tắc (giữ sáng, chuông, rung) chỉ là state giả, không lưu, không có tác dụng | Lưu trong `RecipeContext`; giữ sáng màn hình bằng `expo-keep-awake` khi nấu, rung/đọc giọng nói khi hết giờ |
| 13 | TB | Khám phá | Tìm kiếm phân biệt dấu ("pho" không ra "Phở"), không tìm theo danh mục | Tìm không dấu, theo từng từ, gồm tên/mô tả/danh mục/nguyên liệu; nút "Xóa bộ lọc" khi không có kết quả |
| 14 | Thấp | Giao diện | Widget timer nổi `bottom: 24` **đè lên thanh tab**; timer tạm dừng thì widget biến mất | Widget nằm trên thanh tab, hiện cả trạng thái tạm dừng / hết giờ, có nút tắt; mở lại đúng bước sở hữu timer |
| 15 | Thấp | Giao diện | Nhãn "🎥 VIDEO", "⏱ ĐẾM GIỜ" hiện ở mọi món kể cả món không có; badge giỏ đếm cả món đã mua; "GIAI ĐOẠN 010" khi ≥10 bước; hàng nút timer tràn trên màn hình hẹp | Nhãn theo dữ liệu thật, badge chỉ đếm món còn cần mua, đánh số 2 chữ số, hàng nút tự xuống dòng, vùng chạm ≥ 44pt |
| 16 | Thấp | iOS | Mở Cooking Mode / Onboarding ngay khi modal khác đang đóng → iOS không hiển thị modal mới | Trì hoãn 450ms trên iOS |
| 17 | Thấp | Đi chợ | "Xuất / Gửi danh sách" chỉ hiện Alert, không gửi được | Dùng hộp thoại chia sẻ của hệ điều hành (web: Web Share hoặc sao chép), nhóm theo quầy; hỏi trước khi xóa món đã mua |
| 18 | Thấp | Onboarding | Hiện chớp nhoáng với người dùng cũ trước khi tải xong trạng thái | Chỉ hiển thị sau khi hydrate |
| 19 | Thấp | Định lượng | `scaleAmount` lỗi khi amount là số (dữ liệu QR/AI), không hiểu "2,5", "1 1/2"; giảm khẩu phần có thể làm tròn về 0 | `src/utils/quantity.js` xử lý số, dấu phẩy thập phân, hỗn số, phân số unicode, không bao giờ về 0 |

## 2. Quy tắc nghiệp vụ mới (cập nhật cho tài liệu đặc tả)

- **Timer:** mỗi lúc chỉ một timer, gắn với một bước của một món. Bắt đầu timer bước khác khi đang có timer → hỏi xác nhận. Timer vẫn chạy và báo hết giờ khi đóng Cooking Mode; được lưu cục bộ (`@cookflow_timer_v1`) và khôi phục khi mở lại app (nếu đã quá giờ thì hiện là "Hết giờ").
- **Rời Cooking Mode** giữ nguyên bước đang nấu; **Hoàn thành món** xóa timer của món và kết thúc phiên.
- **Checklist chi tiết món** = "đã có sẵn". Thêm vào giỏ chỉ đưa nguyên liệu chưa tick, đã nhân theo khẩu phần đang chọn (1–50).
- **Shopping list:** dòng chưa mua cùng tên + đơn vị (không phân biệt dấu/hoa thường) được gộp; số lượng dạng số được cộng dồn, dạng chữ giống nhau thì giữ nguyên; nguồn công thức được nối thêm.
- **Pantry:** nguyên liệu trong tủ khớp nếu là cụm từ nằm trong tên nguyên liệu công thức; mặc định coi muối, đường, tiêu, dầu ăn, hạt nêm, bột ngọt, nước lọc là có sẵn (có công tắc tắt).
- **Công thức:** mọi nguồn (form, QR, AI, storage) đi qua `normalizeRecipe` — id nguyên liệu duy nhất, bước đánh số lại, số liệu trong giới hạn.
- **Nhập QR:** trùng tên + bộ nguyên liệu với món đã có → hỏi trước khi lưu bản mới.
- **Cài đặt** lưu ở `@cookflow_settings_v1`: giữ sáng màn hình khi nấu, đọc thông báo hết giờ, rung khi hết giờ.

## 3. Kiểm thử

- `npm run test:logic` — 7 nhóm test cho định lượng, tìm kiếm tiếng Việt, phân quầy, chuẩn hóa công thức, mã hóa/giải mã QR (đều đạt).
- Đã parse toàn bộ `src/` và kiểm tra không còn tham chiếu biến chưa khai báo.
- Chưa chạy được ESLint / bundle Metro trong phiên rà soát → cần chạy `npx expo start` và thử tay các luồng ở mục 4.

## 4. Kịch bản thử tay đề xuất

1. Web: vào Cooking Mode → ✕ ĐÓNG → hộp xác nhận hiện và thoát được; Của tôi → Tự tạo → XÓA hỏi xác nhận.
2. Chạy timer bước 1, chuyển bước 2 → timer bước 1 vẫn chạy (thông báo "Đang có timer khác"), bấm Bắt đầu ở bước 2 → hỏi thay thế.
3. Đóng Cooking Mode khi timer chạy → widget nằm trên thanh tab, chờ hết giờ → có thông báo; bấm widget → mở đúng bước.
4. Mở món A tick vài nguyên liệu, mở món B → checklist trống. Thêm vào giỏ 2 lần → số lượng cộng dồn, không nhân dòng.
5. Giỏ đi chợ: "Nước mắm", "Dầu ăn" nằm ở Đồ khô & gia vị; "Trứng gà" ở Sữa & trứng.
6. Tạo món với thời gian "abc", hẹn giờ "-1", bước trống → báo lỗi gộp; thời gian sơ chế 0 được giữ nguyên.
7. Quét lại QR của món vừa nhập → cảnh báo trùng.

## 5. Còn để ngỏ (ngoài phạm vi bản vá)

- Thông báo hệ thống khi app bị đóng hẳn cần `expo-notifications` (đặt lịch local notification theo `endAt`).
- Âm thanh chuông thật cần `expo-audio`; hiện dùng giọng đọc TTS.
- Shopping list chưa quy đổi đơn vị (300 g + 0,5 kg vẫn là 2 dòng).
- Gemini API key nằm trong bundle nếu dùng `EXPO_PUBLIC_GEMINI_API_KEY` — chỉ phù hợp demo đồ án.
