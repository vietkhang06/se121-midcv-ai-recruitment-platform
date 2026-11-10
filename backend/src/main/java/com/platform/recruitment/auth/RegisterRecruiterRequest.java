package com.platform.recruitment.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRecruiterRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters long")
    private String password;

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Company name is required")
    private String companyName;

    @NotBlank(message = "Tax code is required")
    @jakarta.validation.constraints.Pattern(regexp = "[0-9]{10}(-[0-9]{3})?", message = "Mã số thuế gồm 10 số hoặc 10 số-3 số")
    private String companyTaxCode;
    @NotBlank(message = "Company address is required")
    @Size(max = 2000)
    private String companyAddress;
    @NotBlank(message = "Representative phone is required")
    @jakarta.validation.constraints.Pattern(regexp = "[+0-9 ()-]{9,20}", message = "Invalid phone number")
    private String phone;

    private String companyWebsite;

    private String companyIndustry;
}
