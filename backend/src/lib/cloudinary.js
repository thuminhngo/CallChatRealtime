// import { v2 as cloudinary } from "cloudinary";
// import fs from 'fs';
// import { ENV } from "./env.js";

// cloudinary.config({
//     cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
//     api_key: ENV.CLOUDINARY_API_KEY,
//     api_secret: ENV.CLOUDINARY_API_SECRET,
// });


// export const uploadOnCloudinary = async (file, options = {}) => {
//     try {
//         if (!file) return null;

//         console.log('Uploading file:', file);
//         const result = await cloudinary.uploader.upload(file, options);
//         console.log('Upload result:', result.secure_url);

//         if (fs.existsSync(file)) {
//             fs.unlinkSync(file);
//         }

//         return result.secure_url;
//     } catch (error) {
//         console.error('Cloudinary upload error:', error);
//         if (fs.existsSync(file)) {
//             fs.unlinkSync(file);
//         }

//         return null;
//     }
// }


// export default cloudinary;



import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import { ENV } from "./env.js";

cloudinary.config({
  cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
  api_key: ENV.CLOUDINARY_API_KEY,
  api_secret: ENV.CLOUDINARY_API_SECRET,
});

export const uploadOnCloudinary = async (localFilePath, options = {}) => {
  try {
    if (!localFilePath) return null;

    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto", // 🔥 QUAN TRỌNG: image + audio
      ...options,
    });

    // Xoá file local sau khi upload
    await fs.unlink(localFilePath);

    return {
      url: result.secure_url,
      resourceType: result.resource_type,
      duration: result.duration || null, // audio/video
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    // Dọn file nếu lỗi
    try {
      await fs.unlink(localFilePath);
    } catch {}

    return null;
  }
};

export default cloudinary;
