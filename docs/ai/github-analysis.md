# GITHUB SIGNAL ASSESSMENT SPECIFICATION

Tài liệu này đặc tả Thuật toán Phân tích Tín hiệu Hỗ trợ thứ hai từ GitHub công khai (Secondary GitHub Signal Assessment Engine).

---

## 1. TỶ LỆ PHÂN BỔ NGÔN NGỮ (REPOSITORY LANGUAGE DISTRIBUTION)

* **Thuật ngữ chuẩn:** **"Repository language distribution"** (không suy diễn thành "tỷ lệ phần trăm kỹ năng lập trình viên").
* **Công thức:** Tính tổng số byte của từng ngôn ngữ lập trình từ tất cả các public repos không bị archived và xếp hạng tỷ lệ phần trăm phân bổ: `Rank #1: Java (60%)`, `Rank #2: TypeScript (30%)`, `Rank #3: HTML (10%)`.

---

## 2. NHÃN TÍN HIỆU HOẠT ĐỘNG (DETERMINISTIC ACTIVITY SIGNAL)

Hệ thống tính toán nhãn tín hiệu dựa trên timestamp sự kiện công khai gần nhất (`Latest Observable Public Activity`):
* `HIGH`: Hoạt động công khai trong vòng $\le 14$ ngày.
* `MODERATE`: Hoạt động công khai trong vòng $15 - 60$ ngày.
* `LOW`: Hoạt động công khai trong vòng $61 - 180$ ngày.
* `LIMITED_OBSERVABLE_ACTIVITY`: Hoạt động công khai trên 180 ngày hoặc không quan sát được.

---

## 3. THÔNG TIN MINH CHỨNG & TÓM TẮT TRUNG TÍNH

* Stars & Forks được lưu trữ là chỉ số ghi nhận độ phổ biến dự án công khai (`Project Popularity Signal`).
* Diễn đạt từ ngữ trung tính, tuyệt đối không suy diễn cảm tính (*"ứng viên lười biếng"*, *"chăm chỉ"*).
