# 🍳 CookFlow - Trợ Lý Nấu Ăn Di Động Thông Minh (iOS Aesthetic)
> **Đồ án môn học:** MMA301 - Multiplatform Mobile App Development (FPT University)  
> **Framework:** React Native (Expo SDK 57, JavaScript ES6+ / JSX)  
> **Phong cách UI:** Chuẩn Apple iOS Human Interface Guidelines (Cozy Pastel, Bo tròn Squircle 24-32px, Đổ bóng mềm Soft Shadow, Animation mượt mà, Thẻ nổi)

---

## 🌟 1. Điểm nổi bật của dự án

1. **Giao diện chuẩn iOS Apple & Dễ thương (Cute Aesthetic):**
   * Gam màu pastel ấm cúng ẩm thực: Coral hồng đào ấm (`#FF6B6B`), Mint tươi mát (`#38D9A9`), Vàng mật ong (`#FFD43B`), Tím oải hương (`#9775FA`), nền trắng kem ấm (`#FBF9F6`).
   * Component bo góc tròn trịa (Radius 24-32px), đổ bóng mềm chuẩn iOS, hiệu ứng bấm phản hồi thu nhỏ (Scale feedback 0.94 - 0.97).
   * Floating Tab Bar bo tròn nổi ở chân màn hình cực kỳ hiện đại.

2. **Chế độ Nấu ăn tập trung (Cooking Mode Wizard):**
   * Toàn màn hình (Full-screen Immersive).
   * Chia nhỏ công thức thành từng bước rõ ràng, hiển thị font chữ to dễ đọc khi đứng cách 1-2 mét trong bếp.
   * Thanh tiến trình phần trăm (%) hoàn thành mượt mà.
   * Hộp gợi ý mẹo nấu ăn (Cooking Tips) màu vàng ấm áp.
   * Màn hình chúc mừng (Celebration Modal) khi hoàn thành món ăn!

3. **Bộ đếm giờ thông minh (Interactive Step Timer):**
   * Vòng đếm ngược to bản kiểu Apple Clock.
   * Nút bấm Bắt đầu, Tạm dừng, Đặt lại, Cộng thêm 1 phút.
   * Đổi màu sinh động theo trạng thái (Sẵn sàng ➡️ Đang đếm lửa bập bùng 🔥 ➡️ Đã hết giờ rung chuông 🔔).

4. **Quản lý dữ liệu CRUD & Local Storage:**
   * Sử dụng Mock Data phong phú (6 món ăn chi tiết, có sẵn các bước hẹn giờ thực tế).
   * Kết hợp `@react-native-async-storage/async-storage` + React Context API.
   * Hỗ trợ đầy đủ 4 thao tác:
     * **Create:** Tạo công thức mới với form động (thêm bớt nguyên liệu & bước có timer).
     * **Read:** Tìm kiếm, lọc theo danh mục, xem chi tiết món kèm checklist nguyên liệu.
     * **Update:** Chỉnh sửa công thức cá nhân đã tạo.
     * **Delete:** Xóa công thức cá nhân (có Alert xác nhận).
     * **Favorite:** Thả tim lưu món yêu thích tức thì.

---

## 🚀 2. Hướng dẫn khởi chạy trên Máy ảo (Android Emulator / VS Code)

### Bước 1: Mở terminal tại thư mục dự án
```bash
cd CookFlow
```

### Bước 2: Chạy máy chủ API (repo backend `SDN302/CookFlow`)
Dữ liệu (tài khoản, công thức, danh mục, đi chợ, tủ lạnh, lịch sử, kế hoạch bữa ăn, yêu cầu) nằm trên máy chủ.
```bash
cd ../../SDN302/Project/CookFlow   # thư mục repo backend
npm install
cp .env.example .env               # đổi JWT_SECRET
npm run seed                       # tài khoản demo + 5 danh mục + 6 món mẫu
npm run dev                        # http://0.0.0.0:9999
```

### Bước 3: Cấu hình địa chỉ API cho app (tùy chọn)
`cp .env.example .env` rồi đặt `EXPO_PUBLIC_API_URL`. Để trống thì dùng mặc định:
* Android Emulator: `http://10.0.2.2:9999`
* iOS Simulator / web: `http://localhost:9999`
* Điện thoại thật cùng Wi-Fi: IP LAN của máy tính, ví dụ `http://192.168.1.10:9999`

### Bước 4: Khởi động máy ảo Android
* Bật máy ảo Android (Pixel 6/7/8 qua Android Studio hoặc Visual Studio).

### Bước 5: Chạy ứng dụng
```bash
npm run android
```
*(Hoặc gõ `npx expo start` rồi nhấn phím `a` để mở trên Android Emulator).*

### Tài khoản demo (do `npm run seed` tạo)
| Vai trò | Email | Mật khẩu |
| :--- | :--- | :--- |
| Quản trị | `admin@cookflow.demo` | `Admin123!` |
| Người dùng | `chef@cookflow.demo` | `Chef123!` |

Tài khoản mới phải xác minh email bằng mã 6 chữ số. Khi chưa cấu hình máy chủ mail, mã hiện trong console của backend
và ngay trên màn hình xác minh (chỉ ở môi trường phát triển).

### Kiểm thử
```bash
npm run test:logic                                            # logic thuần (không cần máy chủ)
COOKFLOW_BACKEND_DIR=../../SDN302/Project/CookFlow npm run test:api   # gọi API thật (MongoDB in-memory)
```

---

## 📂 3. Cấu trúc thư mục mã nguồn

```
CookFlow/
├── src/
│   ├── app/
│   │   ├── _layout.jsx           # Root layout bọc RecipeProvider & StatusBar
│   │   ├── index.jsx             # Màn hình chính (Header, Search, Filters, Grid món, Floating TabBar)
│   │   └── explore.jsx           # Redirect route
│   ├── components/
│   │   ├── ui/
│   │   │   ├── AppleButton.jsx   # Nút bấm chuẩn Apple (nhiều màu, scale touch)
│   │   │   ├── AppleBadge.jsx    # Pill badges xinh xắn
│   │   │   └── TimerCircle.jsx   # Vòng đếm giờ Timer đếm ngược
│   │   ├── RecipeDetailModal.jsx # Modal chi tiết món ăn & checklist nguyên liệu
│   │   ├── CookingModeModal.jsx  # Chế độ nấu ăn từng bước + màn hình chúc mừng
│   │   ├── CreateRecipeModal.jsx # Form tạo / sửa công thức động (CRUD)
│   │   ├── MyRecipesView.jsx     # Quản lý món yêu thích & món tự tạo (Sửa/Xóa)
│   │   └── SettingsModal.jsx     # Cài đặt âm thanh, rung, giữ sáng màn hình & thông tin đồ án
│   ├── constants/
│   │   └── theme.js              # Bảng màu AppleColors, Radius, AppleShadow
│   ├── context/
│   │   ├── AuthContext.jsx       # Đăng nhập / xác minh email / quản lý tài khoản qua API (JWT)
│   │   └── RecipeContext.jsx     # State toàn cục, đồng bộ dữ liệu với API; timer & phiên nấu lưu trên máy
│   ├── services/
│   │   └── api/                  # Client REST API (client.js) + mỗi tài nguyên một module
│   ├── data/
│   │   └── mockRecipes.js        # 6 món mẫu (nguồn của seed backend, dùng trong test logic)
│   └── types/
│       └── recipe.js             # Danh mục và hằng số hỗ trợ
├── package.json
└── app.json
```
