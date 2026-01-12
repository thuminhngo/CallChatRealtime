import { Search, Loader } from "lucide-react";
import CallHistoryItem from "./CallHistoryItem";

export default function CallsList({ calls, loading, onCall, onVideo, onMessage }) {
  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center text-gray-400 h-full min-h-[300px]">
        <Loader size={40} className="animate-spin opacity-50 mb-2"/>
        <p>Loading call history...</p>
      </div>
    );
  }

  // Empty state
  if (calls.length === 0) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center h-full py-20 text-gray-400">
            <Search size={48} className="opacity-20 mb-4"/>
            <p className="text-sm italic text-center px-4">
                No call history found.
            </p>
        </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
        {calls.map((call) => (
            <CallHistoryItem 
                key={call._id} 
                call={call} 
                onCall={onCall} 
                onVideo={onVideo} 
                onMessage={onMessage}
            />
        ))}
    </div>
  );
}