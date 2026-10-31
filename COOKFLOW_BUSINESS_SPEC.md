# Tài liệu nghiệp vụ CookFlow

> Phiên bản rà soát: 31/10/2026  
> Phạm vi: mô tả nghiệp vụ dựa trên mã nguồn hiện có trong nhánh `main` tại thời điểm rà soát. Đây là tài liệu mô tả trạng thái sản phẩm, không xem nội dung phân công là bằng chứng tính năng đã hoàn thành.

## 1. Tổng quan sản phẩm

CookFlow là ứng dụng trợ lý nấu ăn đa nền tảng, hướng tới người nấu tại gia. Ứng dụng hỗ trợ khám phá và quản lý công thức, chuẩn bị nguyên liệu, nấu theo từng bước có hẹn giờ, tham khảo trợ lý AI và trao đổi công thức qua mã QR hoặc ảnh chia sẻ.

Ứng dụng hiện là client Expo/React Native với giao diện web, trạng thái và dữ liệu cá nhân lưu cục bộ trên thiết bị/trình duyệt. Trợ lý AI gọi Google Gemini qua Internet khi người dùng cấu hình API key. Mã nguồn được kiểm tra không cho thấy backend nghiệp vụ hoặc tài khoản đồng bộ giữa nhiều thiết bị.

## 2. Mục tiêu và giá trị nghiệp vụ

- Giảm công sức tìm công thức phù hợp với thời gian, khẩu vị hoặc nguyên liệu sẵn có.
- Giúp người dùng theo đúng định lượng và trình tự chế biến trong lúc nấu.
- Gom nguyên liệu cần mua thành danh sách có thể đánh dấu và phân nhóm theo quầy.
- Cho phép cá nhân hóa công thức bằng cách tạo/sửa công thức hoặc lưu biến thể từ gợi ý AI.
- Hỗ trợ chia sẻ công thức trực tiếp giữa người dùng bằng QR và ảnh thẻ công thức.

## 3. Đối tượng và vai trò

| Vai trò | Nhu cầu | Quyền/tác vụ trong ứng dụng |
|---|---|---|
| Người nấu | Tìm món, nấu theo hướng dẫn, theo dõi thời gian | Tìm kiếm/lọc/xem công thức, điều chỉnh khẩu phần, checklist nguyên liệu, Cooking Mode, timer, TTS |
| Người quản lý bếp gia đình | Theo dõi nguyên liệu và việc cần mua | Chọn nguyên liệu trong pantry, xem món phù hợp, thêm/sửa/xóa/đánh dấu mục trong shopping list |
| Người đóng góp công thức | Lưu công thức cá nhân và chia sẻ | Tạo/sửa/xóa công thức cá nhân, xuất story/QR, quét hoặc dán mã để nhập công thức |
| Người dùng AI | Cần gợi ý thay thế hoặc tư vấn chế biến | Cấu hình API key, chat theo ngữ cảnh công thức, chọn áp dụng thay đổi, lưu biến thể hoặc đưa nguyên liệu vào danh sách mua |

Không có phân quyền tài khoản hoặc vai trò máy chủ trong phiên bản được rà soát; các vai trò trên là cách mô tả mục đích sử dụng, không phải quyền truy cập được xác thực.

## 4. Phạm vi chức năng hiện có

### 4.1 Khám phá và xem công thức

Người dùng vào màn hình chính, có thể tìm theo từ khóa, lọc theo danh mục và mở chi tiết công thức. Dữ liệu mẫu được khởi tạo từ `src/data/mockRecipes.js`; người dùng cũng có thể tạo công thức của riêng mình. Mỗi công thức có thể chứa tên, mô tả, ảnh/video, danh mục, thời gian chuẩn bị/nấu, số khẩu phần, độ khó, năng lượng, nguyên liệu và các bước (có thể kèm timer, mẹo hoặc video).

**Quy tắc nghiệp vụ:**

- Danh mục gồm Tất cả, Món nhanh, Món chính, Ăn kiêng, Tráng miệng và Thức uống.
- Công thức chi tiết có danh sách nguyên liệu dạng checklist.
- Người dùng có thể tăng/giảm số khẩu phần; các định lượng dạng số hoặc phân số ở đầu chuỗi được nhân theo tỷ lệ khẩu phần hiện tại so với gốc và làm tròn đến một chữ số thập phân. Định lượng dạng chữ hoặc không khớp định dạng số giữ nguyên.
- Có thao tác yêu thích/bỏ yêu thích; trạng thái yêu thích lưu theo ID công thức.
- Có luồng thêm nguyên liệu của công thức vào shopping list.

### 4.2 Công thức cá nhân (CRUD)

Người dùng có thể tạo công thức bằng biểu mẫu, thêm/xóa nhiều nguyên liệu và bước nấu, khai báo khẩu phần, thời gian, ảnh/video và các trường mô tả. Có thể mở danh sách công thức/yêu thích cá nhân để chỉnh sửa hoặc xóa; thao tác xóa có xác nhận.

Khi nhận công thức từ QR, ứng dụng tạo một bản công thức cá nhân mới. Khi AI tạo biến thể, ứng dụng lưu bản riêng có liên kết nguồn/ghi chú thay đổi; công thức gốc không bị thay đổi bởi quá trình tạo biến thể.

### 4.3 Pantry Finder – nguyên liệu đang có

Người dùng mở “Tủ lạnh nhà tôi”, chọn nguyên liệu phổ biến bằng chip hoặc nhập tên tùy ý. Ứng dụng so khớp danh sách đã chọn với nguyên liệu trong công thức để sắp xếp/gợi ý món có thể nấu hoặc món còn thiếu nguyên liệu.

Danh sách pantry được lưu cục bộ. Việc so khớp mang tính hỗ trợ, không phải kiểm kê định lượng: mô hình dữ liệu pantry là tên nguyên liệu dạng chuỗi, không lưu số lượng, hạn sử dụng hoặc đơn vị.

### 4.4 Shopping List – danh sách đi chợ

Người dùng có thể tạo mục tự do, thêm nguyên liệu từ công thức hoặc gợi ý AI, đánh dấu đã mua, xóa từng dòng, xóa các mục đã mua và chia sẻ danh sách dạng văn bản. Danh sách được nhóm theo các quầy như rau củ/trái cây, thịt/gia cầm, hải sản, sữa/trứng, bánh/ngũ cốc, đồ khô/gia vị và khác.

Mỗi dòng gồm tên, lượng, đơn vị, nguồn/công thức tham chiếu và trạng thái đã mua. Phân loại quầy dựa trên quy tắc từ khóa tiếng Việt trong `src/utils/groceryAisles.js`; tên không nhận diện được sẽ vào nhóm “Khác”. Danh sách hiện không tự gộp các mặt hàng trùng tên.

### 4.5 Cooking Mode – hướng dẫn nấu

Từ chi tiết món, người dùng bắt đầu chế độ nấu toàn màn hình. Màn hình trình bày từng bước, cho phép chuyển bước trước/sau, xem tiến độ, mẹo và nội dung video nếu có; hoàn tất quy trình sẽ hiển thị trạng thái chúc mừng.

Người dùng có thể bật/tắt đọc hướng dẫn bằng TTS tiếng Việt, dừng đọc và nghe lại bước hiện tại. Khi chuyển bước, nếu TTS đang bật, ứng dụng đọc số bước, tiêu đề và chỉ dẫn. Không thấy triển khai nhận diện lệnh thoại để điều khiển bước nấu.

### 4.6 Timer nấu và timer nổi

Timer gắn với công thức/bước nấu, hỗ trợ bắt đầu/tạm dừng, đặt lại và cộng thêm một phút. Trạng thái timer được quản lý toàn cục trong phiên ứng dụng; khi đóng Cooking Mode, widget nổi cho phép mở lại ngữ cảnh timer đang chạy.

Timer hiện đếm bằng bộ lặp mỗi giây trong trạng thái ứng dụng. Không thấy dữ liệu timer được lưu qua lần khởi động ứng dụng, cũng không thấy cơ chế thông báo nền/chuông hệ thống đảm bảo khi ứng dụng bị đóng hoặc hệ điều hành tạm dừng.

### 4.7 AI Sous-Chef

Người dùng mở chat AI từ ngữ cảnh công thức/nấu, gửi câu hỏi tự do hoặc chọn câu hỏi gợi ý. Hệ thống gửi nội dung công thức, nguyên liệu, bước nấu và bước hiện tại (nếu có) tới Gemini để nhận tư vấn tiếng Việt. Hỗ trợ hủy yêu cầu, hiển thị lỗi API key/mạng/giới hạn và giữ lịch sử hội thoại gần nhất trong phiên modal.

AI có thể phân tích câu trả lời thành đề xuất thay thế/điều chỉnh nguyên liệu theo cấu trúc. Người dùng chọn thay đổi muốn áp dụng rồi có thể lưu thành biến thể cá nhân hoặc đưa nguyên liệu được đề xuất vào shopping list. Việc gọi Gemini cần Internet và API key; key có thể lấy từ cấu hình cục bộ hoặc biến môi trường `EXPO_PUBLIC_GEMINI_API_KEY`.

### 4.8 Chia sẻ và nhập công thức

Trong luồng chia sẻ, người dùng có thể tạo ảnh Story dọc, chia sẻ công thức dạng văn bản hoặc tạo QR mã hóa dữ liệu công thức. QR dùng định dạng compact có tiền tố `CF1:` để giảm kích thước, có giới hạn byte và rút gọn một số nội dung dài. Người nhận quét bằng camera hoặc dán chuỗi mã; ứng dụng kiểm tra và chuẩn hóa dữ liệu trước khi hiển thị xác nhận nhập. Khi xác nhận, công thức được thêm vào danh sách cá nhân.

Chia sẻ QR là truyền nội dung trực tiếp, không cần server. Những trường quá dài có thể bị rút gọn theo cấp độ để vừa kích thước QR. Camera cần quyền truy cập; chế độ dán mã là phương án thay thế.

### 4.9 Onboarding và cài đặt

Ứng dụng có hướng dẫn ban đầu và màn hình cài đặt. Trạng thái đã xem onboarding được lưu cục bộ. Tài liệu README đề cập cấu hình trải nghiệm như âm thanh, rung và giữ sáng màn hình; cần xác nhận từng tùy chọn trên thiết bị nếu lập kế hoạch nghiệm thu vì hành vi phụ thuộc nền tảng.

## 5. Luồng nghiệp vụ tiêu biểu

### Luồng A – tìm món và nấu

1. Người dùng mở khám phá, tìm từ khóa hoặc chọn danh mục.
2. Mở món, xem thông tin và đánh dấu nguyên liệu đã chuẩn bị.
3. Điều chỉnh số khẩu phần; ứng dụng tính lại định lượng phù hợp.
4. Chọn bắt đầu nấu để mở Cooking Mode.
5. Đọc từng bước, bật TTS nếu muốn, chạy timer tại bước có thời lượng.
6. Hoàn thành bước/món; timer vẫn có thể được mở lại qua widget khi modal nấu đóng.

### Luồng B – nấu từ nguyên liệu sẵn có

1. Mở Pantry Finder và chọn/nhập nguyên liệu đang có.
2. Xem danh sách công thức khớp hoặc gần khớp.
3. Mở công thức phù hợp và bắt đầu nấu; nguyên liệu thiếu có thể thêm vào shopping list.

### Luồng C – nhận và lưu công thức từ bạn bè

1. Người gửi mở chia sẻ công thức và hiển thị QR hoặc gửi chuỗi mã.
2. Người nhận quét QR hoặc dán mã.
3. Ứng dụng giải mã, kiểm tra cấu trúc cơ bản và hiển thị bản xem trước.
4. Người nhận xác nhận để thêm bản công thức vào danh sách cá nhân.

### Luồng D – xin AI gợi ý thay thế

1. Mở AI trong ngữ cảnh công thức, cấu hình key nếu chưa có.
2. Hỏi nguyên liệu nào có thể thay thế hoặc điều chỉnh định lượng.
3. AI trả lời; ứng dụng có thể trích xuất đề xuất có cấu trúc.
4. Người dùng chọn đề xuất, xem thay đổi và lưu thành biến thể cá nhân hoặc thêm nguyên liệu vào danh sách mua.

## 6. Quy tắc dữ liệu và lưu trữ

| Nhóm dữ liệu | Nội dung | Lưu trữ hiện tại |
|---|---|---|
| Công thức | Công thức mẫu và công thức cá nhân | AsyncStorage trên native; `localStorage` trên web |
| Yêu thích | Danh sách ID công thức | Cục bộ |
| Shopping list | Tên, lượng, đơn vị, nguồn, đã mua | Cục bộ |
| Pantry | Danh sách tên nguyên liệu | Cục bộ |
| Onboarding | Đã hoàn tất hay chưa | Cục bộ |
| Gemini API key | Key do người dùng cấu hình | Cục bộ; hoặc lấy từ biến môi trường build |
| Timer đang chạy | Công thức/bước, số giây còn lại, trạng thái | State trong bộ nhớ của phiên ứng dụng |

Các khóa lưu trữ hiện có trong `RecipeContext`: `@cookflow_recipes_v2`, `@cookflow_favs_v2`, `@cookflow_shopping_v2`, `@cookflow_pantry_v1`, `@cookflow_onboarding_v2`; key AI là `@cookflow_gemini_key`.

## 7. Ngoại lệ và hành vi lỗi cần biết

- Không có mạng hoặc Gemini lỗi: người dùng không nhận được gợi ý AI; ứng dụng ánh xạ một số lỗi API key, hạn mức, máy chủ và timeout sang thông báo.
- Không cấp quyền camera: không quét được QR bằng camera; có thể dán mã thủ công.
- Chuỗi QR hỏng/không phải công thức: từ chối nhập và báo mã không hợp lệ.
- Lưu trữ cục bộ không khả dụng: helper lưu trữ bắt lỗi và trả về giá trị rỗng/không lưu; không có đồng bộ dự phòng trên máy chủ.
- Tên nguyên liệu không khớp bộ quy tắc quầy: xếp vào “Khác”; gợi ý pantry có thể không nhận diện từ đồng nghĩa hoặc biến thể chính tả.
- Ảnh/video cần tải ngoài hoặc chọn từ thiết bị; khả năng xem phụ thuộc nguồn media và nền tảng.

## 8. Phạm vi chưa được xác nhận hoặc chưa thấy triển khai

Các điểm sau có trong `TEAM_TASK_ASSIGNMENT.md` hoặc README/kế hoạch nhưng chưa có bằng chứng tương ứng trong code đang rà soát:

- Nhánh/tính năng `feat/web-responsive-pwa`: dashboard desktop 3 cột, manifest cài đặt PWA và offline service worker chưa thấy trong danh sách file.
- Nhận diện lệnh thoại “tiếp tục/qua bước” chưa thấy; hiện có đọc TTS.
- Timer chạy chính xác qua việc chuyển tab trình duyệt/đóng ứng dụng hoặc phát thông báo nền chưa thấy.
- Đồng bộ dữ liệu, tài khoản, phân quyền, sao lưu và khôi phục liên thiết bị chưa thấy.
- Pantry chưa quản lý số lượng, ngày hết hạn hoặc cảnh báo sắp hết.
- Shopping list chưa hợp nhất hàng trùng hoặc xác nhận giá/địa điểm mua.
- Chưa có bằng chứng rằng chất lượng, an toàn hoặc độ chính xác dinh dưỡng của gợi ý AI được kiểm chứng chuyên môn.

## 9. Ranh giới hệ thống và phụ thuộc

- Client: Expo, React Native, Expo Router; có mục tiêu Android, iOS và web.
- Lưu trữ: AsyncStorage / `localStorage`.
- Dịch vụ bên ngoài: Google Gemini REST API; nguồn ảnh/video từ URL hoặc thư viện media.
- Tích hợp thiết bị: camera (quét QR/chụp media), TTS.
- Thư viện nghiệp vụ nổi bật: `expo-camera`, `expo-speech`, `expo-sharing`, `expo-image-picker`, `react-native-qrcode-svg`, `react-native-view-shot`, `expo-video`.

## 10. Tiêu chí nghiệm thu nghiệp vụ đề xuất

1. Tìm kiếm và lọc trả về đúng tập công thức theo dữ liệu hiện có; mở chi tiết đúng món.
2. Tăng/giảm khẩu phần cập nhật nguyên liệu số và giữ nguyên các lượng dạng chữ.
3. Tạo, sửa và xóa công thức cá nhân; dữ liệu vẫn còn sau khi tải lại ứng dụng/trang.
4. Pantry lưu lựa chọn sau khi khởi động lại và hiển thị gợi ý phù hợp với dữ liệu mẫu.
5. Shopping list thêm, đánh dấu, xóa, xóa mục hoàn tất, nhóm quầy và chia sẻ văn bản đúng nội dung.
6. Cooking Mode chuyển bước chính xác; TTS đọc bước khi bật; timer bắt đầu/tạm dừng/đặt lại/cộng phút đúng.
7. Đóng modal nấu không làm mất timer còn chạy trong phiên; widget mở lại ngữ cảnh timer.
8. Gemini không có key/mạng hoặc trả lỗi thì hiển thị thông báo có thể xử lý; gợi ý chỉ được áp dụng sau khi người dùng chọn.
9. QR hợp lệ xem trước và nhập được; QR lỗi bị từ chối; camera bị từ chối vẫn có luồng dán mã.
10. Ảnh story và nội dung chia sẻ chứa đúng công thức được chọn.

Các tiêu chí trên là đề xuất nghiệm thu từ luồng sản phẩm; tài liệu này không khẳng định chúng đã được kiểm thử tự động hoặc nghiệm thu trên mọi nền tảng.

## 11. Tình trạng Git và đối chiếu phân công

Tại thời điểm kiểm tra, workspace đang ở `main` và trạng thái làm việc sạch. Các ref nhìn thấy gồm `main`, local `feat/smart-kitchen-assistant`, remote `feat/smart-kitchen-assistant`, `feat/pantry-grocery-manager`, `feat/ai-souschef-qr-share`. So với bốn nhánh trong tài liệu phân công, chưa thấy `feat/web-responsive-pwa`.

Việc một remote branch xuất hiện trong danh sách `git branch -r --merged origin/main` cho thấy commit của nhánh nằm trong lịch sử `origin/main`; nó không tự chứng minh mọi tiêu chí DoD đã được kiểm thử. Các phần triển khai được mô tả ở trên dựa trên file và hành vi thể hiện trong mã nguồn tại nhánh `main`, không dựa riêng vào tên nhánh.

## 12. Tài liệu tham chiếu trong repository

- `README.md`: giới thiệu ứng dụng, hướng dẫn chạy và cấu trúc dự án.
- `TEAM_TASK_ASSIGNMENT.md`: phân công bốn nhánh tính năng và tiêu chí DoD dự kiến.
- `src/app/index.jsx`: màn hình khám phá và điều phối modal.
- `src/context/RecipeContext.jsx`: state nghiệp vụ và lưu trữ cục bộ.
- `src/components/`: các màn hình nghiệp vụ và modal.
- `src/services/`: tích hợp Gemini, biến thể công thức và mã QR.
- `src/utils/groceryAisles.js`: phân nhóm mặt hàng theo quầy.
