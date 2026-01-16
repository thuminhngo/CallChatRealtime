import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ENV } from "../lib/env.js";

/*  Protect Middleware */
export const protectRoute = async (req, res, next) => {
    try {
        //lay token từ cookie ( jwt vì ta đã đặt tên cookie là jwt ở auth.controller.js)
        const token = req.cookies.jwt 

        if (!token) return res.status(401).json({ message: "Not authorized, no token." });
        const decoded = jwt.verify(token, ENV.JWT_SECRET); // xác thực token
        if (!decoded) return  res.status(401).json({ message: "Not authorized, token failed." });
           
        const user = await User.findById(decoded.userId).select("-password"); // lấy thông tin user từ token trừ mật khẩu
        if (!user) return res.status(401).json({ message: "Not authorized, user not found." });

        req.user = user; 
        next();    
            
        } catch (error) {
        console.error("Auth middleware error:", error);
        return res.status(401).json({ message: "Not authorized, token error." });
    }
}