/**
 * Mở cửa sổ cuộc gọi mới với các tham số truyền qua URL
 */
export const OpenCallWindow = (params) => {
  // 1. QUAN TRỌNG: Phải lấy channelName từ params
  const { name, avatar, id, video, caller, channelName } = params;

  // 2. Kiểm tra nếu thiếu channelName thì báo lỗi ngay (để dễ debug)
  if (!channelName) {
    console.error("OpenCallWindow: Thiếu channelName!");
    // Vẫn cho mở nhưng khả năng cao sẽ lỗi màn hình trắng,
    // nhưng log ở trên giúp bạn biết lỗi do đâu.
  }

  // 3. Tạo chuỗi query string bao gồm cả channelName
  const queryString = new URLSearchParams({
    name: name || "Unknown", // Fallback nếu tên null
    avatar: avatar || "",
    id,
    video,
    caller,
    channelName, // <--- BẮT BUỘC PHẢI CÓ
  }).toString();

  // URL của trang cuộc gọi
  const url = `/call?${queryString}`;

  // Các thiết lập cho cửa sổ popup (đã tăng kích thước một chút cho đẹp)
  const width = 1000;
  const height = 660;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;

  const features = `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`;

  // Mở cửa sổ
  const newWindow = window.open(url, "CallWindow", features);

  if (newWindow) {
    newWindow.focus();
  } else {
    alert("Vui lòng cho phép trình duyệt mở popup để thực hiện cuộc gọi.");
  }
};
