import { v2 as cloudinary } from "cloudinary";
import fs from 'fs';
import { ENV } from "./env.js";

cloudinary.config({
    cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
    api_key: ENV.CLOUDINARY_API_KEY,
    api_secret: ENV.CLOUDINARY_API_SECRET,
});


export const uploadOnCloudinary = async (file, options = {}) => {
    try {
        if (!file) return null;

        console.log('Uploading file:', file);
        const result = await cloudinary.uploader.upload(file, options);
        console.log('Upload result:', result.secure_url);

        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }

        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }

        return null;
    }
}


export default cloudinary;