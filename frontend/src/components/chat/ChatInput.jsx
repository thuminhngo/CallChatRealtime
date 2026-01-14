import EmojiPicker from "emoji-picker-react";
import { Image, Loader2, Mic, Send, Smile, Trash, X } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { useChat } from "../../context/ChatContext";
import { useGroup } from "../../context/GroupContext"; // 1. Import GroupContext

export default function ChatInput({ chat, isGroup }) { // 2. Nhận prop isGroup
  const [text, setText] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 3. Lấy hàm gửi tin từ cả 2 context
  const { sendMessage, sendTypingStatus } = useChat();
  const { sendGroupMessage, sendGroupTyping } = useGroup();

  const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const fileInputRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);

  // 4. Hàm xử lý gửi tin
  const handleSend = async (e) => {
    e.preventDefault();
    if ((!text.trim() && !imageFile) || loading) return;

    setLoading(true);
    try {
      if (isGroup) {
        // --- Logic gửi tin nhắn nhóm ---
        // Hàm sendGroupMessage trong GroupContext cần ID nhóm và data
        await sendGroupMessage(chat._id, {
          text: text.trim(),
          image: imageFile, 
        });
        sendGroupTyping(false);
      } else {
        // --- Logic gửi tin nhắn 1-1 ---
        await sendMessage({
          text: text.trim(),
          image: imageFile,
        });
        sendTypingStatus(false);
      }

      // Reset form
      setText("");
      setPreviewImage(null);
      setImageFile(null);
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const handleTyping = (value) => {
    setText(value);
    const isTyping = value.length > 0;
    // 5. Typing status
    if (isGroup) {
      sendGroupTyping(isTyping);
    } else {
      sendTypingStatus(isTyping);
    }
  };

  // 6. Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        
        // Gửi audio
        if (isGroup) {
           await sendGroupMessage(chat._id, { audio: blob });
        } else {
           await sendMessage({ audio: blob });
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
    } catch (err) {
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
    setRecordingDuration(0);
  };

  return (
    <div className="p-4 bg-white border-t border-gray-100 relative">
      {isEmojiPickerOpen && (
        <div className="absolute bottom-full right-20 mb-2 z-10">
          <EmojiPicker onEmojiClick={(e) => handleTyping(text + e.emoji)} />
        </div>
      )}

      {previewImage && (
        <div className="relative inline-block ml-3 mb-2">
          <img src={previewImage} className="w-20 h-20 object-cover rounded-lg border border-pink-500" alt="preview" />
          <button onClick={() => {setPreviewImage(null); setImageFile(null);}} className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full p-1"><X size={12}/></button>
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2 bg-gray-50 border p-2 rounded-[24px]">
        {!isRecording ? (
          <>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-pink-500">
              <Image size={20} />
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
              const file = e.target.files[0];
              if (file) { setImageFile(file); setPreviewImage(URL.createObjectURL(file)); }
            }} />
            <input
              type="text"
              value={text}
              onChange={(e) => handleTyping(e.target.value)} // Gọi hàm handleTyping đã sửa
              placeholder={isGroup ? "Message group..." : "Type a message..."}
              className="flex-1 bg-transparent px-2 text-sm outline-none"
            />
            <button type="button" onClick={() => setEmojiPickerOpen(!isEmojiPickerOpen)} className="p-2 text-gray-400 hover:text-yellow-500">
              <Smile size={20} />
            </button>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-between px-4 text-rose-500">
            <span className="animate-pulse font-medium">Recording Audio...</span>
            <span className="font-mono">{Math.floor(recordingDuration/60)}:{(recordingDuration%60).toString().padStart(2, '0')}</span>
          </div>
        )}

        <button
          type={isRecording ? "button" : "submit"}
          onClick={isRecording ? stopRecording : null}
          disabled={loading}
          className="p-3 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
        </button>

        {!text && !imageFile && !isRecording && (
          <button type="button" onClick={startRecording} className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200">
            <Mic size={20} />
          </button>
        )}
      </form>
    </div>
  );
}