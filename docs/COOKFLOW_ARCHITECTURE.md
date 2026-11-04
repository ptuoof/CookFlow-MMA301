# CookFlow - ERD và kiến trúc hệ thống

Các sơ đồ phản ánh **frontend hiện tại** trong `CookFlow-MMA301`, không phải kiến trúc giả định có backend:

- [ERD PlantUML](./cookflow-erd.puml)
- [Kiến trúc hệ thống PlantUML](./cookflow-system-architecture.puml)

## Cách hiểu ERD

Frontend hiện không dùng cơ sở dữ liệu quan hệ. `RecipeContext` lưu các mảng/đối tượng JSON qua AsyncStorage trên Android/iOS và `localStorage` trên web. ERD là mô hình logic chuẩn hóa để trình bày miền dữ liệu hoặc làm cơ sở thiết kế backend sau này; các quan hệ và khóa ngoại trong sơ đồ **chưa phải constraint đang được thực thi trong app**.

Các cấu trúc được thể hiện gồm công thức, nguyên liệu/bước nấu, yêu thích, kho nguyên liệu, danh sách mua sắm, phiên nấu, timer, lịch sử nấu và cài đặt/dị ứng. Ứng dụng hiện chỉ có hồ sơ cục bộ, không có User/Account.

## Cách hiểu kiến trúc

- Người dùng thao tác trên ứng dụng React Native/Expo.
- Ứng dụng đọc và ghi dữ liệu trên thiết bị bằng AsyncStorage (Android/iOS) hoặc localStorage (web).
- Tính năng AI gọi trực tiếp Google Gemini API qua HTTPS.
- Sơ đồ không có backend riêng vì frontend hiện tại không gọi REST server.

Mở file `.puml` bằng PlantUML hoặc extension PlantUML trong VS Code để render.
