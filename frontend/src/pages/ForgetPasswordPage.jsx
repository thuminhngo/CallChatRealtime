import { useState, useEffect } from "react";
import { MessageCircleIcon, MailIcon, LockIcon, KeyRound, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom"; 
import { useAuth } from "../context/AuthContext";

function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();

  // 1. Lấy các hàm và trạng thái từ AuthContext
  const { forgotPassword, resetPassword, isSendingOTP, isResettingPassword } = useAuth();

  // 2. Thêm state để kiểm soát dữ liệu nhập vào
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // 3. Cập nhật logic xử lý gửi form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (step === 1) {
      // Gọi API gửi OTP từ context
      const success = await forgotPassword(email);
      if (success) {
        setStep(2);
        setCountdown(60);
      }
      return;
    }

    // Gọi API đặt lại mật khẩu từ context
    const success = await resetPassword({ email, otp, newPassword });
    if (success) {
      navigate("/login"); // Chuyển hướng về trang đăng nhập khi thành công
    }
  };

  const handleResend = async () => {
    if (countdown === 0) {
      const success = await forgotPassword(email);
      if (success) setCountdown(60);
    }
  };

  return (
    <div className="w-full flex flex-col md:flex-row bg-white rounded-xl shadow-lg overflow-hidden min-h-screen md:min-h-0 md:h-[600px]">
      <div className="w-full md:w-1/2 p-6 md:p-8 flex items-center justify-center border-r border-gray-200">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 md:mb-8">
            <MessageCircleIcon className="w-10 h-10 md:w-12 md:h-12 mx-auto text-pink-400 mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
              {step === 1 ? "Forgot Password" : "Reset Password"}
            </h2>
            <p className="text-sm md:text-base text-gray-500">
              {step === 1 
                ? "Enter your email to receive an OTP code."
                : "Enter the OTP code and your new password."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            {step === 1 && (
              <div>
                <label className="block text-gray-700 font-medium mb-1">Email</label>
                <div className="relative">
                  <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)} // Liên kết state email
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D3D0FB]"
                    placeholder="yourname@example.com"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">OTP Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)} // Liên kết state otp
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D3D0FB] tracking-widest font-bold text-center"
                      placeholder="• • • • • •"
                    />
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={countdown > 0 || isSendingOTP}
                      className={`text-xs font-medium hover:underline transition-colors ${
                        countdown > 0 ? "text-gray-400 cursor-not-allowed" : "text-[#847ef2]"
                      }`}
                    >
                      {countdown > 0 ? `Resend in ${countdown}s` : "Resend Code"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">New Password</label>
                  <div className="relative">
                    <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)} // Liên kết state password
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D3D0FB]"
                      placeholder="Enter new password (min 6 chars)"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isSendingOTP || isResettingPassword} // Vô hiệu hóa khi đang xử lý
              className="w-full text-white font-semibold py-3 rounded-lg transition-all 
                bg-[#D3D0FB] hover:bg-[#847ef2] active:scale-95 shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSendingOTP || isResettingPassword 
                ? "Processing..." 
                : (step === 1 ? "Send OTP" : "Reset Password")}
            </button>
          </form>

          <div className="mt-6 text-center">
            {step === 2 && (
              <button
                onClick={() => { setStep(1); setCountdown(0); }}
                className="text-gray-500 hover:text-gray-800 text-xs mb-4 block w-full"
              >
                Change Email?
              </button>
            )}
            <Link to="/login" className="text-pink-400 hover:underline font-medium flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden md:block md:w-1/2 bg-cover bg-center" style={{ backgroundImage: "url('/sample.png')" }}></div>
    </div>
  );
}

export default ForgotPasswordPage;