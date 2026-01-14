import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import multer from "multer"; // 👈 BẮT BUỘC PHẢI IMPORT
import { ENV } from "./env.js";

// 1. Cấu hình Cloudinary
cloudinary.config({
  cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
  api_key: ENV.CLOUDINARY_API_KEY,
  api_secret: ENV.CLOUDINARY_API_SECRET,
});

// 2. Cấu hình Multer (Để lưu file tạm vào ổ cứng trước khi up lên Cloud)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Lưu tạm vào thư mục 'uploads' ở root
    // ⚠️ LƯU Ý: Bạn cần tạo thủ công thư mục "uploads" ngang hàng với src nếu chưa có
    cb(null, "./uploads"); 
  },
  filename: function (req, file, cb) {
    // Đặt tên file ngẫu nhiên để tránh trùng
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

// 👇 EXPORT BIẾN NÀY ĐỂ DÙNG Ở ROUTE (Đây là cái bạn đang thiếu)
export const upload = multer({ storage: storage });

// 3. Hàm upload lên Cloudinary
export const uploadOnCloudinary = async (localFilePath, options = {}) => {
  try {
    if (!localFilePath) return null;

    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto", // image, video, audio
      ...options,
    });

    // Xoá file local sau khi upload thành công
    await fs.unlink(localFilePath);

    return {
      url: result.secure_url,
      resourceType: result.resource_type,
      duration: result.duration || null,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    // Dọn file local nếu lỗi
    try {
      await fs.unlink(localFilePath);
    } catch (e) {
        console.error("Error deleting local file:", e);
    }

    return null;
  }
};

export default cloudinary;