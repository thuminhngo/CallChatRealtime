import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { MessageCircleIcon, MailIcon, LockIcon, LoaderIcon } from "lucide-react";
import { Link, useNavigate } from "react-router";

function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  // LẤY THÊM isCheckingAuth
  const { login, isLoggingIn, authUser, isCheckingAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isCheckingAuth && authUser) { 
      navigate("/chat", { replace: true }); // đăng nhập thành công chuyển hướng sang /chat
    }
  }, [authUser, isCheckingAuth, navigate]); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(formData);
    } catch (error) {
      // Toast đã xử lý
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <p>Loading...</p>
      </div>
    );
  }

  //hàm xử lý thay đổi input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  return (
    <div className="w-full flex flex-col md:flex-row bg-white rounded-xl shadow-lg overflow-hidden min-h-[600px]">
      <div className="w-full md:w-1/2 p-8 flex items-center justify-center border-r border-gray-200">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 md:mb-8">
            <MessageCircleIcon className="w-10 h-10 md:w-12 md:h-12 mx-auto text-pink-400 mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Login</h2>
            <p className="text-gray-500">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Email</label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange} 
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="example@gmail.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Password</label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="Enter your password"
                  required
                />
              </div>
              <div className="text-right mt-1">
                <Link to="/forgot-password" className="text-sm text-purple-500 hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              className="w-full text-white font-semibold py-2 rounded-lg transition-colors bg-[#D3D0FB] hover:bg-[#847ef2]"
              type="submit"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? <LoaderIcon className="w-5 h-5 mx-auto animate-spin" /> : "Login"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/signup" className="text-pink-400 hover:underline font-medium">
              Don't have an account? Sign Up
            </Link>
            <br/>
            <Link to="/" className="text-[#847ef2] hover:underline font-medium">
              or Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div
        className="md:block md:w-1/2 bg-cover bg-center hidden"
        style={{ backgroundImage: "url('/sample.png')" }}
      ></div>
    </div>
  );
}

export default LoginPage;