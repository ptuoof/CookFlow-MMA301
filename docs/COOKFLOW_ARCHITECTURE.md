# CookFlow - Kiến trúc hệ thống

- [Kiến trúc hệ thống PlantUML](./cookflow-system-architecture.puml)

## Cách hiểu kiến trúc

- Người dùng và quản trị viên thao tác trên ứng dụng React Native/Expo (repo này, MMA301).
- Dữ liệu nằm trên **CookFlow REST API** (repo backend `SDN302/CookFlow`: Node.js, Express, MongoDB).
  App gọi API qua `src/services/api/*` với JWT trong header `Authorization: Bearer`.
- Token đăng nhập lưu trong SecureStore (iOS/Android) hoặc `localStorage` (web).
- Một số dữ liệu chỉ có ý nghĩa trên một máy nên vẫn lưu cục bộ (AsyncStorage / `localStorage`):
  timer đang chạy, phiên nấu đang dở, khóa Gemini của người dùng.
- Ảnh/video chọn từ album được tải lên API (`/api/upload/image`, `/api/upload/video`) trước khi lưu công thức.
- Tính năng AI gọi trực tiếp Google Gemini API qua HTTPS bằng khóa của người dùng.

## Phân chia trách nhiệm

| Thành phần | Vai trò |
| :--- | :--- |
| `AuthContext` | Đăng ký, xác minh email (mã 6 số), đăng nhập, quên/đổi mật khẩu, quản lý tài khoản (admin). Tự đăng xuất khi token hết hạn hoặc tài khoản bị khóa |
| `RecipeContext` | Nạp toàn bộ dữ liệu của tài khoản khi đăng nhập; mỗi thao tác gọi API. Thao tác nhỏ (yêu thích, đánh dấu đã mua, tủ lạnh, cài đặt...) cập nhật giao diện ngay rồi đồng bộ, lỗi thì hoàn tác và báo |
| Backend | Áp dụng các quy tắc nghiệp vụ (gộp danh sách đi chợ, so khớp không dấu, giới hạn, quyền xem công thức...) |

Hợp đồng API chi tiết (hàm nào của app gọi endpoint nào): `docs/FE_INTEGRATION.md` trong repo backend.

## Mô hình dữ liệu

Trên backend, mỗi thực thể là một collection MongoDB (User, Category, Recipe
với nguyên liệu/bước nấu nhúng bên trong, Favorite, ShoppingItem, PantryItem, CookHistory, MealEntry, RecipeRequest);
quan hệ được thể hiện bằng tham chiếu ObjectId. Timer và phiên nấu chỉ tồn tại trên thiết bị.

Mở file `.puml` kiến trúc bằng PlantUML hoặc extension PlantUML trong VS Code để render.
