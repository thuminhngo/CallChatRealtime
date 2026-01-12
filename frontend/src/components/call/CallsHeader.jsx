import { Search, Phone } from "lucide-react";

export default function CallsHeader({ searchQuery, setSearchQuery, filter, setFilter }) {
  const tabs = [
    { id: "all", label: "All Calls" },
    { id: "missed", label: "Missed" },
    { id: "incoming", label: "Incoming" },
  ];

  return (
    <div className="bg-white p-4 md:p-6 pb-2 sticky top-0 z-10">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Calls</h1>
            <p className="text-xs md:text-sm text-gray-500">Recent history & logs</p>
        </div>
        <button className="p-2.5 md:p-3 bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-2xl shadow-lg hover:scale-105 transition-all">
            <Phone size={20} className="md:w-5 md:h-5 fill-current" />
        </button>
      </div>

      <div className="relative mb-4 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
            type="text" value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search call logs..." 
            className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-pink-50 transition-all outline-none"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-gray-100 pb-1">
        {tabs.map(tab => (
            <button key={tab.id} onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap ${filter === tab.id ? "text-pink-600 bg-pink-50" : "text-gray-500 hover:bg-gray-50"}`}
            >
                {tab.label}
            </button>
        ))}
      </div>
    </div>
  );
}