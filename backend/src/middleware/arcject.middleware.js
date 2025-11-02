import aj from "../lib/arcjet.js";
import { isSpoofedBot } from "@arcjet/inspect";

// Middleware bảo vệ API bằng Arcjet
export const arcjetProtection = async (req, res, next) => {
  try {
    // Gửi request cho Arcjet để đánh giá mức độ an toàn
    // Arcjet sẽ phân tích IP, tần suất, User-Agent, hành vi...
    const decision = await aj.protect(req);

    // Nếu Arcjet từ chối request
    if (decision.isDenied()) {

      // Trường hợp gửi quá nhiều request (rate limit)
      if (decision.reason.isRateLimit()) {
        return res.status(429).json({
          message: "Rate limit exceeded. Please try again later."
        });
      }

      // Trường hợp request đến từ bot
      else if (decision.reason.isBot()) {
        return res.status(403).json({
          message: "Bot access denied."
        });
      }

      // Các lý do bảo mật khác (IP xấu, hành vi bất thường...)
      else {
        return res.status(403).json({
          message: "Access denied by security policy.",
        });
      }
    }

    // Kiểm tra bot giả mạo (spoofed bot)
    // Ví dụ: bot giả danh Googlebot để vượt qua kiểm tra
    if (decision.results.some(isSpoofedBot)) {
      return res.status(403).json({
        error: "Spoofed bot detected",
        message: "Malicious bot activity detected.",
      });
    }

    // Nếu request hợp lệ → cho phép đi tiếp vào controller
    next();
  } catch (error) {
    // Log lỗi nếu Arcjet gặp sự cố
    console.log("Arcjet Protection Error:", error);

    // Cho request đi tiếp để tránh làm sập hệ thống
    next();
  }
};
