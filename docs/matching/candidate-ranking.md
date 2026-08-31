# CANDIDATE RANKING & RANKING SAFETY SPECIFICATION (PHASE 4 FINAL CORRECTION BASELINE)

Tài liệu này đặc tả Thuật toán Xếp hạng Ứng viên (Candidate Ranking Engine) và Quy tắc An toàn Xếp hạng (Ranking Safety).

---

## QUY TẮC AN TOÀN XẾP HẠNG VÀ THỨ TỰ ƯU TIÊN GẮT GAO (RANKING SAFETY ORDER)

Danh sách ứng viên cho một bài tuyển dụng được sắp xếp theo đúng thứ tự ưu tiên gắt gao:
1. `requiredSkillsMissing` ASC *(Ưu tiên ứng viên có 0 kỹ năng bắt buộc bị thiếu xếp trên ứng viên thiếu kỹ năng bắt buộc)*
2. $S_{\text{overall}}$ DESC
3. $S_{\text{core}}$ DESC
4. Required Skill Score DESC
5. Relevant Experience Score DESC
6. Candidate UUID ASC *(Khóa định danh CSDL ổn định hệ thống)*

---

## CHỨNG MINH AN TOÀN XẾP HẠNG (RANKING SAFETY PROOF)

* **Candidate A:** Đủ 100% Kỹ năng Bắt buộc (`requiredSkillsMissing = 0`), Không có Kỹ năng Ưu tiên ($S_{\text{overall}} = 80.0$).
* **Candidate B:** Thiếu 1 Kỹ năng Bắt buộc (`requiredSkillsMissing = 1`), Đủ 100% Kỹ năng Ưu tiên ($S_{\text{overall}} = 85.0$).
* **Kết quả Xếp hạng:** **Candidate A** đứng thứ **#1**, **Candidate B** đứng thứ **#2** do `requiredSkillsMissing (0 < 1)`.
