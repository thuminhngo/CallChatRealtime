import EmojiPicker from "emoji-picker-react";
import { Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChat } from "../../context/ChatContext";
import "../../styles/emoji-picker.css";

export default function MessageBubble({ message, isMe, avatar, isLastInGroup }) {
  const [showReactionBar, setShowReactionBar] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);
  const { reactToMessage } = useChat();
  const wrapperRef = useRef(null);
  if (message.isSystem) {
    return <div className="text-center text-xs text-gray-400 my-4 italic bg-gray-50 py-1 px-3 rounded-full w-fit mx-auto">{message.text}</div>;
  }

  // Close reaction bar when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowReactionBar(false);
        setShowFullPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleReaction = (emoji) => {
    reactToMessage(message._id, emoji);
    setShowReactionBar(false);
    setShowFullPicker(false);
  };

  // Group reactions by emoji and count them
  const reactionCounts = (message.reactions || []).reduce((acc, curr) => {
    acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
    return acc;
  }, {});

  const hasReactions = Object.keys(reactionCounts).length > 0;


  return (
    <div className={`flex items-end mb-2 gap-2 group relative ${isMe ? "flex-row-reverse" : "flex-row"}`} ref={wrapperRef}>
      {!isMe && (
        <img src={avatar} alt="Avatar" className="w-8 h-8 rounded-full border border-gray-100 object-cover mb-1" />
      )}

      <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[70%] relative`}>
        {/* Reactions Badge */}
        {hasReactions && (
          <div className={`absolute bg-rose-50 -top-2 ${isMe ? "left-0 transform -translate-x-1/2" : "right-0 transform translate-x-1/2"} z-10 flex gap-0.5 bg-white border border-gray-100 rounded-full px-1.5 py-0.5 shadow-sm`}>
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <div key={emoji} className="flex items-center text-[10px] text-gray-600">
                <span className="mr-0.5">{emoji}</span>
                {count > 1 && <span className="font-medium text-gray-400">{count}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Message Content */}
        <div className={`text-[14.5px] break-words relative z-0
            ${!message.image && ((/^(?:\p{Extended_Pictographic}|\s)+$/u.test(message.text)))
            ? "bg-transparent text-[40px] shadow-none border-none leading-none"
            : (isMe
              ? "bg-gradient-to-br shadown-sm py-2 px-4 from-pink-500 to-rose-400 text-white rounded-[20px] rounded-tr-sm"
              : "bg-white shadow-sm py-2 px-4 border border-gray-100 text-gray-800 rounded-[20px] rounded-tl-sm")
          }`}>
          {message.image && (
            <img
              src={message.image}
              alt="Shared image"
              className="object-cover rounded-lg mb-2 cursor-pointer"
              width={360}
              height={360}
              onClick={() => window.open(message.image, '_blank')}
            />
          )}
          {message.audio && (
            <div className={`flex items-center gap-2 w-full min-w-[200px] sm:min-w-[280px] max-w-full ${isMe ? "text-white" : "text-gray-800"}`}>
              <audio
                controls
                src={message.audio}
                className="w-full h-8"
              />
            </div>
          )}
          {message.text}
        </div>

        {/* Timestamp */}
        {isLastInGroup && (
          <span className={`text-[10px] text-gray-400 px-1 select-none absolute -bottom-5 w-max
              ${isMe ? "right-1" : "left-1"}
            `}>
            {message.displayTime} {isMe && message.isRead && "Seen"} {isMe && !message.isRead && "Sent"}
          </span>
        )}
      </div>

      {/* Reaction Trigger Button (Smile Icon) */}
      <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center mb-1
          ${isMe ? "mr-2 flex-row-reverse" : "ml-2 flex-row"} ${showReactionBar ? "!opacity-100" : ""}`}>
        <button
          onClick={() => setShowReactionBar(!showReactionBar)}
          className="p-1.5 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-pink-500 border border-gray-100 shadow-sm transition-colors"
        >
          <Smile size={16} />
        </button>
      </div>

      {/* Reaction Bar (Popover) */}
      {showReactionBar && (
        <div className={`absolute bottom-full mb-1 ${isMe ? "right-10" : "left-10"} z-50 animate-in fade-in zoom-in-95 duration-100`}>
          <EmojiPicker
            className="custom-emoji-picker"
            previewConfig={{ showPreview: false }}
            reactionsDefaultOpen={true}
            style={{ backgroundColor: "#fdf2f8" }}
            onReactionClick={(data) => handleReaction(data.emoji)}
            onEmojiClick={(data) => handleReaction(data.emoji)}
          />
        </div>
      )}
    </div>
  );
}
