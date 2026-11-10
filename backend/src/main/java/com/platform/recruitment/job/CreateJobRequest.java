package com.platform.recruitment.job;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.AssertTrue;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CreateJobRequest {

    @NotBlank(message = "Vui lòng nhập tiêu đề vị trí tuyển dụng.")
    private String title;
    @jakarta.validation.constraints.Size(max = 30, message = "Chỉ được chọn tối đa 30 vị trí chuyên môn.")
    private List<String> occupationCodes;

    @NotBlank(message = "Vui lòng chọn lĩnh vực hoạt động.")
    private String industry;

    private String industryOther;

    @NotBlank(message = "Vui lòng chọn cấp bậc tuyển dụng.")
    private String seniority;

    private String seniorityOther;

    @DecimalMin(value = "0.00", message = "Lương tối thiểu không được là số âm.")
    @Digits(integer = 10, fraction = 2, message = "Lương tối thiểu chỉ hỗ trợ tối đa 10 chữ số nguyên và 2 chữ số thập phân.")
    private BigDecimal minSalary;

    @DecimalMin(value = "0.00", message = "Lương tối đa không được là số âm.")
    @Digits(integer = 10, fraction = 2, message = "Lương tối đa chỉ hỗ trợ tối đa 10 chữ số nguyên và 2 chữ số thập phân.")
    private BigDecimal maxSalary;

    private Boolean salaryNegotiable = false;

    private String salaryCurrency = "VND";

    @AssertTrue(message = "Đơn vị tiền tệ không được hệ thống hỗ trợ.")
    public boolean isSalaryCurrencyValid() {
        return salaryCurrency == null || java.util.Set.of("VND", "USD", "EUR", "GBP", "JPY", "CNY", "KRW", "SGD", "AUD", "CAD").contains(salaryCurrency);
    }

    @AssertTrue(message = "Lương tối thiểu không được cao hơn lương tối đa; nếu chọn Thỏa thuận thì phải để trống cả hai mức lương.")
    public boolean isSalaryRangeValid() {
        if (Boolean.TRUE.equals(salaryNegotiable)) return minSalary == null && maxSalary == null;
        return minSalary == null || maxSalary == null || minSalary.compareTo(maxSalary) <= 0;
    }

    private String location;

    private String employmentType;

    private String employmentTypeOther;

    @AssertTrue(message = "Giá trị tùy chỉnh chỉ được nhập khi chọn Khác và không được vượt quá 80 ký tự.")
    public boolean isCustomClassificationValid() {
        return validCustom(industry, industryOther) && validCustom(seniority, seniorityOther)
                && validCustom(employmentType, employmentTypeOther);
    }

    private boolean validCustom(String canonical, String custom) {
        boolean other = "OTHER".equalsIgnoreCase(canonical);
        return other ? custom != null && !custom.isBlank() && custom.trim().length() <= 80
                : custom == null || custom.isBlank();
    }

    @NotBlank(message = "Vui lòng nhập mô tả công việc.")
    private String description;

    @jakarta.validation.constraints.Size(max = 100000)
    private String descriptionHtml;

    @jakarta.validation.constraints.Size(max = 100000)
    private String candidateRequirements;

    @jakarta.validation.constraints.Size(max = 100000)
    private String benefitsContent;

    @jakarta.validation.constraints.Size(max = 100000)
    private String workAddress;

    @jakarta.validation.constraints.Size(max = 100000)
    private String workingTime;

    @jakarta.validation.constraints.Size(max = 100000)
    private String applicationInstructions;
    private java.time.LocalDate applicationDeadline;


    @jakarta.validation.constraints.Size(max = 100)
    private List<@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 2000) String> responsibilities;

    @jakarta.validation.Valid
    private List<RequirementItem> requirements;

    @Data
    public static class RequirementItem {
        @NotBlank(message = "Tên kỹ năng không được để trống.")
        private String skillName;
        private RequirementType type; // REQUIRED or PREFERRED
        @jakarta.validation.constraints.Min(0)
        private Integer minYearsExp;
    }
}
