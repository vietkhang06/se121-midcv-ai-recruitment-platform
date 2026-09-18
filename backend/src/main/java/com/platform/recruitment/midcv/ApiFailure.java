package com.platform.recruitment.midcv;

public class ApiFailure extends RuntimeException {
  public final int status;
  public final String code;

  public ApiFailure(int status, String code, String message) {
    super(message);
    this.status = status;
    this.code = code;
  }

  public ApiFailure(int status, String code, String message, Throwable cause) {
    super(message, cause);
    this.status = status;
    this.code = code;
  }

  public static ApiFailure bad(String code, String message) {
    return new ApiFailure(400, code, message);
  }

  public static ApiFailure missing() {
    return new ApiFailure(
        404, "NOT_FOUND", "Không tìm thấy dữ liệu hoặc bạn không có quyền truy cập.");
  }
}
