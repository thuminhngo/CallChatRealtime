import multer from "multer";
import path from "path";
import fs from "fs";

// Cấu hình lưu trữ tạm thời trên đĩa cứng
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(process.cwd(), "uploads");

    // Kiểm tra lại lần cuối: Nếu chưa có thì tạo mới (để chắc chắn 100%)
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// Kiểm tra định dạng tệp (Tùy chọn)
const fileFilter = (req, file, cb) => {
  if (file.fieldname === "image") {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận tệp hình ảnh!"), false);
    }
  } else if (file.fieldname === "audio") {
    if (file.mimetype.startsWith("audio/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận tệp âm thanh!"), false);
    }
  }
};

export const uploadMiddleware = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // Giới hạn 10MB
});