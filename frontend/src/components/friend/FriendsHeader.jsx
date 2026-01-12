import { Search, LayoutGrid, List as ListIcon } from "lucide-react";

export default function FriendsHeader({ 
  title, 
  searchQuery, 
  setSearchQuery, 
  viewMode, 
  setViewMode,
  showToggle = true,   // ẩn/hiện toggle
  showSearch = true,    // ẩn/hiện thanh tìm kiếm
}) {
  return (
    <div className="bg-white border-b border-gray-100 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm z-30 sticky top-0">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-gray-800 truncate">{title}</h2>
      </div>

      <div className="flex items-center gap-3 justify-between md:justify-end w-full md:w-auto">
        {/* Thanh tìm kiếm */}
        {showSearch && (
          <div className="relative group flex-1 md:flex-none">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pink-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 bg-gray-100 rounded-xl text-xs w-full md:w-48 transition-all outline-none focus:border-pink-400 focus:outline-pink-200"
            />
          </div>
        )}

        {/* Nút chuyển đổi Grid/List */}
        {showToggle && (
          <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' 
                  ? 'bg-white text-pink-500 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list' 
                  ? 'bg-white text-pink-500 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="List View"
            >
              <ListIcon size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}