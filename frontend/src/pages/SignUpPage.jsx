import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { MessageCircleIcon, UserIcon, MailIcon, LockIcon, LoaderIcon } from "lucide-react";
import { Link, useNavigate } from "react-router";

function SignUpPage() {
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });
  const [errors, setErrors] = useState({}); 

  const { signup, isSigningUp, authUser, isCheckingAuth } = useAuth();
  const navigate = useNavigate();

  // Kiểm tra độ dài mật khẩu
  const isPasswordValid = formData.password.length >= 6; // mật khẩu hợp lệ nếu có ít nhất 6 ký tự
  const hasTypedPassword = formData.password.length > 0; // người dùng đã nhập gì vào mật khẩu chưa
  
  
  const passwordColor = isPasswordValid ? "text-green-600" : (hasTypedPassword ? "text-red-500" : "text-gray-400"); // màu chữ thông báo
  const dotColor = isPasswordValid ? "bg-green-500" : (hasTypedPassword ? "bg-red-500" : "bg-gray-300"); // màu của dấu chấm

  useEffect(() => {
    if (!isCheckingAuth && authUser) {
      navigate("/chat", { replace: true });
    }
  }, [authUser, isCheckingAuth, navigate]);

  //hàm xử lý thay đổi input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Xóa thông báo lỗi khi người dùng sửa input
    if (errors[name]) setErrors({ ...errors, [name]: "" }); 
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); // Kiểm tra định dạng email

  const validateForm = () => { // hàm kiểm tra sự hợp leej của các input khi submit
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required"; 
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Object.keys(newErrors) trả về mảng các thuộc tính của newErrors
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      await signup(formData);
    } catch (error) { /* Handled in AuthContext */ }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <LoaderIcon className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col md:flex-row bg-white rounded-xl shadow-lg overflow-hidden min-h-[600px]">
      {/*FORM */}
      <div className="md:w-1/2 p-8 flex items-center justify-center border-r border-gray-200">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <MessageCircleIcon className="w-12 h-12 mx-auto text-pink-400 mb-2" />
            <h2 className="text-3xl font-bold text-gray-800">Create Account</h2>
            <p className="text-gray-500">Sign up for a new account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-gray-700 font-medium mb-1 text-sm">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size={18}" />
                <input
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.fullName ? "border-red-500 focus:ring-red-100" : "border-gray-300 focus:ring-purple-300"
                  }`}
                  placeholder="Enter your full name"
                />
              </div>
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-700 font-medium mb-1 text-sm">Email</label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size={18}" />
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.email ? "border-red-500 focus:ring-red-100" : "border-gray-300 focus:ring-purple-300"
                  }`}
                  placeholder="example@gmail.com"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-gray-700 font-medium mb-1 text-sm">Password</label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size={18}" />
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.password ? "border-red-500 focus:ring-red-100" : "border-gray-300 focus:ring-purple-300"
                  }`}
                  placeholder="Enter your password"
                />
              </div>

              {/*hiển thị thông báo nhânpj đủ ký tự mật khẩu*/}
              <div className="mt-2 ml-1">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${dotColor}`} />
                  <p className={`text-[11px] font-semibold transition-colors duration-300 ${passwordColor}`}>
                    {isPasswordValid ? "Password meets requirements" : "At least 6 characters required"}
                  </p>
                </div>
                {/*hiẻn thị lỗi sau khi submit */}
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>
            </div>

            <button
              className="w-full text-white font-semibold py-2.5 rounded-lg transition-all bg-[#847ef2] hover:bg-[#6b64e8] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              type="submit"
              disabled={isSigningUp}
            >
              {isSigningUp ? (
                <div className="flex items-center justify-center gap-2">
                  <LoaderIcon className="w-5 h-5 animate-spin" />
                  <span>Creating Account...</span>
                </div>
              ) : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link to="/login" className="text-pink-400 hover:underline font-medium">
              Already have an account? Login
            </Link>
            <br/>
            <Link to="/" className="text-[#847ef2] hover:underline font-medium">
              or Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/*IMAGE */}
      <div
        className="hidden md:block md:w-1/2 bg-cover bg-center"
        style={{ backgroundImage: "url('/sample.png')" }}
      />
    </div>
  );
}

export default SignUpPage;