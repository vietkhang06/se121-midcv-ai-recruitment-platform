# 19. ĐẶC TẢ MÔ HÌNH TÍNH ĐIỂM CHẤM ĐIỂM ĐỐI SÁNH (MATCHING SCORING FORMULA SPEC)

Tài liệu này đặc tả chi tiết công thức toán học tính điểm `Match Score` tổng hợp, phân bổ trọng số tiêu chí, phương pháp chuẩn hóa sub-scores và xử lý trường hợp ngoại lệ.

---

## 1. CÔNG THỨC TỔNG QUÁT (OVERALL MATCH SCORE FORMULA)

Điểm phù hợp tổng thể ($\text{Overall Score} \in [0, 100]$) được tính bằng tổng có trọng số của 5 điểm thành phần (Sub-scores):

$$\text{Overall Score} = W_{\text{skill}} \cdot S_{\text{skill}} + W_{\text{exp}} \cdot S_{\text{exp}} + W_{\text{edu}} \cdot S_{\text{edu}} + W_{\text{proj}} \cdot S_{\text{proj}} + W_{\text{sem}} \cdot S_{\text{sem}}$$

### Bảng Phân bổ Trọng số Tiêu chuẩn (Weight Distribution Matrix)
| Ký hiệu | Tên Thành phần (Sub-score Component) | Trọng số ($W_i$) | Tỷ trọng (%) |
| :--- | :--- | :---: | :---: |
| $W_{\text{skill}}$ | Điểm Kỹ năng (Required vs Preferred Skill Score) | **0.40** | **40%** |
| $W_{\text{exp}}$ | Điểm Số năm Kinh nghiệm (Experience Score) | **0.25** | **25%** |
| $W_{\text{edu}}$ | Điểm Học vấn & Chứng chỉ (Education & Cert Score) | **0.10** | **10%** |
| $W_{\text{proj}}$ | Điểm Tương đồng Dự án (Project Context Score) | **0.10** | **10%** |
| $W_{\text{sem}}$ | Điểm Tương đồng Ngữ nghĩa Vector (Semantic Embedding Score) | **0.15** | **15%** |
| **TỔNG** | | **1.00** | **100%** |

---

## 2. CHI TIẾT CÔNG THỨC TÍNH CÁC SUB-SCORES

### 2.1 Điểm Kỹ năng ($S_{\text{skill}} \in [0, 100]$)
Điểm kỹ năng kết hợp giữa **Required Skills Match** ($80\%$ trọng số $S_{\text{skill}}$) và **Preferred Skills Match** ($20\%$ trọng số $S_{\text{skill}}$):

$$S_{\text{skill}} = 80 \times \left( \frac{\text{Số Required Skills CV khớp}}{\text{Tổng số Required Skills JD}} \right) + 20 \times \left( \frac{\text{Số Preferred Skills CV khớp}}{\text{Tổng số Preferred Skills JD}} \right)$$

* **Penalty Rule for Missing Required Skills:** 
  Nếu tỷ lệ khớp Required Skills $< 50\%$, $S_{\text{skill}}$ tự động bị phạt giảm $20\%$ trên tổng số điểm $S_{\text{skill}}$ đạt được.

### 2.2 Điểm Số năm Kinh nghiệm ($S_{\text{exp}} \in [0, 100]$)
So sánh giữa số năm kinh nghiệm ứng viên có ($Y_{\text{cand}}$) và số năm tối thiểu JD yêu cầu ($Y_{\text{req}}$):

$$S_{\text{exp}} = \begin{cases} 
100 & \text{nếu } Y_{\text{cand}} \ge Y_{\text{req}} \\
100 \times \left( \frac{Y_{\text{cand}}}{Y_{\text{req}}} \right) & \text{nếu } Y_{\text{cand}} < Y_{\text{req}} 
\end{cases}$$

### 2.3 Điểm Học vấn & Chứng chỉ ($S_{\text{edu}} \in [0, 100]$)
* **Bằng cấp (Degree):**
  * Tiến sĩ / Thạc sĩ: $100\%$
  * Đại học (Bachelor): $90\%$
  * Cao đẳng / Chứng chỉ nghề: $70\%$
  * Không ghi rõ: $50\%$ (Default fallback)
* Cộng thêm $10\%$ nếu ứng viên có chứng chỉ chuyên môn quốc tế phù hợp (VD: AWS Certified, PMP, OCA Java).

### 2.4 Điểm Tương đồng Ngữ nghĩa Vector ($S_{\text{sem}} \in [0, 100]$)
Sử dụng giá trị Cosine Similarity $S_{\text{cosine}} \in [0.0, 1.0]$ tính từ Pgvector:

$$S_{\text{sem}} = S_{\text{cosine}} \times 100$$

---

## 3. VÍ DỤ TÍNH TOÁN MINH HỌA (CALCULATION EXAMPLE)

**Thông tin JD:**
* Required Skills: Java, Spring Boot, PostgreSQL (3 skills)
* Preferred Skills: Docker, AWS (2 skills)
* Required Exp: 2 năm

**Thông tin CV Ứng viên A:**
* CV có: Java, Spring Boot, PostgreSQL (Khớp 3/3 Required $\rightarrow 100\%$)
* CV có: Docker (Khớp 1/2 Preferred $\rightarrow 50\%$)
* Kinh nghiệm thực tế: 3 năm ($3 \ge 2 \rightarrow 100\%$)
* Học vấn: Đại học ($90\%$)
* Cosine Similarity Vector: $0.88 \rightarrow S_{\text{sem}} = 88.0\%$

**Kết quả tính:**
* $S_{\text{skill}} = 80 \times (3/3) + 20 \times (1/2) = 80 + 10 = 90.0\%$
* $S_{\text{exp}} = 100.0\%$
* $S_{\text{edu}} = 90.0\%$
* $S_{\text{proj}} = 85.0\%$
* $S_{\text{sem}} = 88.0\%$

$$\text{Overall Score} = (0.40 \times 90.0) + (0.25 \times 100.0) + (0.10 \times 90.0) + (0.10 \times 85.0) + (0.15 \times 88.0) = 36.0 + 25.0 + 9.0 + 8.5 + 13.2 = \mathbf{91.70\%}$$
$\Rightarrow$ Phân loại: **HIGH MATCH** (Xếp hạng Top ưu tiên).
