import { useEffect } from 'react';
import { Phone, MessageCircle, Users } from 'lucide-react';
import { useChat } from "../../context/ChatContext";
import { useNavigate } from 'react-router-dom';

import SectionCard from './SectionCard';
import { CallItem, ChatItem, FriendItem } from './HomeItems';

export default function HomeDashboard() {
  // SỬA TẠI ĐÂY: Lấy homeStats và getHomeStats thay vì chatPartners
  const { messages, homeStats, getHomeStats } = useChat();
  const navigate = useNavigate();

  useEffect(() => {
    getHomeStats();
  }, [getHomeStats]);

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="h-full w-full p-4 overflow-y-auto md:overflow-hidden font-sans text-gray-800">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">

        {/* CALLS */}
        <SectionCard
          title="Calls"
          subtitle="Recent history"
          icon={Phone}
          image="/call.jpg"
          items={homeStats?.calls || []} 
          renderItem={(item) => <CallItem key={item._id || item.id} call={item} />}
          onClick={() => handleNavigation('/chat/home')}
        />

        {/* CHATS */}
        <SectionCard
          title="Chats"
          subtitle="New messages"
          icon={MessageCircle}
          image="/chat.jpg"
          items={homeStats?.chats || []} 
          renderItem={(item) => <ChatItem key={item._id || item.id} chat={item} />}
          onClick={() => handleNavigation('/chat/messages')}
        />

        {/* FRIENDS */}
        <SectionCard
          title="Friends"
          subtitle="Online status"
          icon={Users}
          image="/friends.jpg"
          items={homeStats?.chats || []} 
          renderItem={(item) => <FriendItem key={item._id || item.id} friend={item} />}
          onClick={() => handleNavigation('/chat/friends/all')}
        />
      </div>
    </div>
  );
}