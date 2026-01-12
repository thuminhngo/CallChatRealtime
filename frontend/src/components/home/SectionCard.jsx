import { AutoScrollList } from "./HomeItems";

export default function SectionCard({
  title,
  subtitle,
  icon: Icon,
  image,
  bgColor = "bg-pink-300",
  borderColor = "border-pink-100",
  iconColor = "text-pink-600",
  iconBg = "bg-pink-100/80",
  items = [],
  renderItem,
  onClick, 
}) {
  return (
    <div
      onClick={onClick} 
      className={`relative h-[450px] md:h-full rounded-2xl border ${borderColor} ${bgColor} overflow-hidden
                  shadow-sm group transition-transform duration-500 hover:scale-[1.02] 
                  cursor-pointer active:scale-95`}
    >
      {image && (
        <>
          <img
            src={image}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/40 to-transparent" />
        </>
      )}

      {/* Vùng hiển thị danh sách */}
      <div className="absolute top-4 bottom-28 left-0 right-0 px-4 z-10">
        {items && items.length > 0 ? (
          <AutoScrollList>
            {items.map(renderItem)}
          </AutoScrollList>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-500 italic text-center px-4">
            Start connecting with your friends!
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-6 z-20 pointer-events-none"> 
        <div className={`${iconBg} backdrop-blur-md p-3 rounded-2xl w-fit mb-2 shadow-sm`}>
          <Icon size={24} className={iconColor} />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}