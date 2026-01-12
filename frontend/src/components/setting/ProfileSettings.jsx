import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { Loader2, User, Mail, Camera, Save } from "lucide-react"; 
import toast from "react-hot-toast"; 

export default function ProfileSettings() {
  const { authUser, isUpdatingProfile, updateProfile } = useAuth();
  
  // State lưu form và file
  const [formData, setFormData] = useState({ fullName: "" });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Set dữ liệu ban đầu và clean up preview URL
  useEffect(() => {
    if (authUser) setFormData({ fullName: authUser.fullName || "" });
    return () => previewUrl && URL.revokeObjectURL(previewUrl);
  }, [authUser]);

  // Handle chọn file ảnh
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file!");
      return;
    }
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // Handle submit 
  const handleSubmit = async (e) => {
    e.preventDefault();
    const updateData = { fullName: formData.fullName.trim() };

    if (selectedFile) {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = async () => {
        await updateProfile({ ...updateData, profilePic: reader.result });
      };
    } else {
      await updateProfile(updateData);
    }
  };

  // Loading khi chưa có dữ liệu người dùng
  if (!authUser) return (
    <div className="p-8 flex justify-center items-center h-full">
      <Loader2 className="animate-spin text-pink-500 w-8 h-8"/>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white md:bg-transparent">
      {/* Header*/}
      <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-100 bg-white sticky top-0 z-10">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">Profile</h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Update display information and avatar</p>
      </div>

      {/* Form Container*/}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6 sm:space-y-8">
          
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 pb-6 border-b border-gray-100">
            <div 
              className="relative group cursor-pointer" 
              onClick={() => fileInputRef.current.click()}
            >
              <img
                  src={
                    previewUrl || 
                    authUser.profilePic || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.fullName || 'User')}&background=random` 
                  }
                  alt="Avatar"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-md group-hover:opacity-90 transition"
                />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>

            <div className="text-center sm:text-left">
              <h4 className="font-medium text-gray-900">Avatar</h4>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 mb-2">Supports JPG, GIF, or PNG files.</p>
              <button 
                type="button" 
                onClick={() => fileInputRef.current.click()} 
                className="text-sm font-semibold text-pink-600 hover:text-pink-700 hover:underline"
              >
                Upload New
              </button>
            </div>
          </div>

          {/* Inputs Section */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition text-sm sm:text-base"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={authUser.email}
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 bg-gray-50 text-gray-400 rounded-xl cursor-not-allowed text-sm sm:text-base"
                />
              </div>
              <p className="text-[11px] sm:text-xs text-gray-400 mt-1.5">Email cannot be changed for security reasons.</p>
            </div>
          </div>

          {/* Submit Button - Full width trên mobile, auto trên desktop */}
          <div className="pt-4 pb-8">
            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-pink-500 text-white font-medium rounded-xl hover:bg-pink-600 disabled:opacity-70 disabled:cursor-not-allowed transition shadow-sm w-full sm:w-auto sm:ml-auto"
            >
              {isUpdatingProfile ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}