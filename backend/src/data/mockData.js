// Cơ sở dữ liệu mẫu giả lập cho Hệ thống Rạp chiếu phim chuẩn CGV Cultureplex tích hợp AI
const movies = [
  // ==================== PHIM ĐANG CHIẾU (NOW SHOWING) ==================== //
  {
    id: "mov-01",
    title: "Dune: Hành Tinh Cát - Phần 2",
    originalTitle: "Dune: Part Two",
    status: "NOW_SHOWING",
    durationMinutes: 166,
    releaseDate: "2024-03-01",
    ageRating: "T16",
    genres: ["Khoa học viễn tưởng", "Phiêu lưu", "Hành động"],
    formats: ["IMAX", "2D", "4DX"],
    director: "Denis Villeneuve",
    cast: ["Timothée Chalamet", "Zendaya", "Rebecca Ferguson"],
    imdbRating: 8.6,
    posterUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
    description: "Paul Atreides hợp nhất với Chani và người Fremen trên con đường báo thù những kẻ đã hủy hoại gia tộc mình, đối mặt với sự lựa chọn định mệnh.",
    isHot: true,
    trendingScore: 98
  },
  {
    id: "mov-02",
    title: "Mai",
    originalTitle: "Mai",
    status: "NOW_SHOWING",
    durationMinutes: 131,
    releaseDate: "2024-02-10",
    ageRating: "T18",
    genres: ["Tâm lý", "Tình cảm", "Chính kịch"],
    formats: ["2D", "Dolby Atmos"],
    director: "Trấn Thành",
    cast: ["Phương Anh Đào", "Tuấn Trần", "Hồng Đào"],
    imdbRating: 7.2,
    posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80",
    description: "Cuộc gặp gỡ tình cờ giữa Mai - người phụ nữ massage với quá khứ nhiều tổn thương và Dương - chàng trai trẻ lãng tử đào hoa khao khát yêu thương.",
    isHot: true,
    trendingScore: 95
  },
  {
    id: "mov-03",
    title: "Oppenheimer",
    originalTitle: "Oppenheimer",
    status: "NOW_SHOWING",
    durationMinutes: 180,
    releaseDate: "2023-08-11",
    ageRating: "T18",
    genres: ["Tiểu sử", "Lịch sử", "Chính kịch"],
    formats: ["IMAX", "2D"],
    director: "Christopher Nolan",
    cast: ["Cillian Murphy", "Emily Blunt", "Matt Damon", "Robert Downey Jr."],
    imdbRating: 8.9,
    posterUrl: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200&auto=format&fit=crop&q=80",
    description: "Câu chuyện lịch sử kịch tính về cuộc đời nhà vật lý lý thuyết J. Robert Oppenheimer và dự án Manhattan chế tạo bom nguyên tử đầu tiên trên thế giới.",
    isHot: true,
    trendingScore: 92
  },
  {
    id: "mov-04",
    title: "Kung Fu Panda 4",
    originalTitle: "Kung Fu Panda 4",
    status: "NOW_SHOWING",
    durationMinutes: 94,
    releaseDate: "2024-03-08",
    ageRating: "P",
    genres: ["Hoạt hình", "Hài hước", "Gia đình", "Võ thuật"],
    formats: ["2D", "3D", "4DX"],
    director: "Mike Mitchell",
    cast: ["Jack Black", "Awkwafina", "Viola Davis"],
    imdbRating: 6.8,
    posterUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
    description: "Po được chọn làm Thủ lĩnh tinh thần của Thung lũng Bình Yên và phải tìm kiếm, huấn luyện một Hiệp sĩ Rồng mới trong khi đối đầu phản diện Tắc Kè Bông.",
    isHot: false,
    trendingScore: 84
  },
  {
    id: "mov-05",
    title: "Godzilla x Kong: Đế Chế Mới",
    originalTitle: "Godzilla x Kong: The New Empire",
    status: "NOW_SHOWING",
    durationMinutes: 115,
    releaseDate: "2024-03-29",
    ageRating: "T13",
    genres: ["Hành động", "Khoa học viễn tưởng", "Phiêu lưu"],
    formats: ["IMAX", "3D", "4DX", "ScreenX"],
    director: "Adam Wingard",
    cast: ["Rebecca Hall", "Brian Tyree Henry", "Dan Stevens"],
    imdbRating: 6.5,
    posterUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80",
    description: "Godzilla và Kong phải gạt bỏ hiềm khích xưa để hợp lực chống lại mối hiểm họa khổng lồ ẩn sâu dưới lòng Trái Đất đe dọa sự tồn vong của loài người.",
    isHot: true,
    trendingScore: 90
  },
  {
    id: "mov-06",
    title: "Exhuma: Quật Mộ Trùng Ma",
    originalTitle: "Exhuma",
    status: "NOW_SHOWING",
    durationMinutes: 134,
    releaseDate: "2024-03-15",
    ageRating: "T18",
    genres: ["Kinh dị", "Bí ẩn", "Hồi hộp"],
    formats: ["2D", "Dolby Atmos"],
    director: "Jang Jae-hyun",
    cast: ["Choi Min-sik", "Kim Go-eun", "Lee Do-hyun"],
    imdbRating: 7.1,
    posterUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200&auto=format&fit=crop&q=80",
    description: "Hai pháp sư trẻ, một thầy phong thủy và một chuyên viên mai táng nhận lời khai quật một ngôi mộ bí ẩn tại vùng quê hẻo lánh và giải phóng thế lực tà ác.",
    isHot: true,
    trendingScore: 96
  },
  {
    id: "mov-07",
    title: "Interstellar: Hố Đen Tử Thần",
    originalTitle: "Interstellar",
    status: "NOW_SHOWING",
    durationMinutes: 169,
    releaseDate: "2024-01-15",
    ageRating: "T13",
    genres: ["Khoa học viễn tưởng", "Phiêu lưu", "Chính kịch"],
    formats: ["IMAX", "2D"],
    director: "Christopher Nolan",
    cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"],
    imdbRating: 8.7,
    posterUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&auto=format&fit=crop&q=80",
    description: "Một nhóm các nhà thám hiểm du hành qua lỗ sâu gần sao Thổ để tìm kiếm hành tinh mới cho nhân loại trước nguy cơ tuyệt chủng trên Trái Đất.",
    isHot: false,
    trendingScore: 91
  },
  {
    id: "mov-08",
    title: "Lật Mặt 7: Một Điều Ước",
    originalTitle: "Face Off 7: One Wish",
    status: "NOW_SHOWING",
    durationMinutes: 138,
    releaseDate: "2024-04-26",
    ageRating: "T13",
    genres: ["Gia đình", "Tâm lý", "Hài hước"],
    formats: ["2D"],
    director: "Lý Hải",
    cast: ["Thanh Hiền", "Trương Minh Cường", "Đinh Y Nhung"],
    imdbRating: 7.6,
    posterUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80",
    description: "Câu chuyện gia đình xúc động xoay quanh người mẹ già 73 tuổi cùng năm người con bận rộn với cuộc sống riêng tại các miền đất nước.",
    isHot: true,
    trendingScore: 94
  },

  // ==================== PHIM SẮP CHIẾU (COMING SOON) ==================== //
  {
    id: "mov-09",
    title: "Deadpool & Wolverine",
    originalTitle: "Deadpool & Wolverine",
    status: "COMING_SOON",
    durationMinutes: 128,
    releaseDate: "2026-10-15",
    ageRating: "T18",
    genres: ["Hành động", "Hài hước", "Khoa học viễn tưởng"],
    formats: ["IMAX", "3D", "4DX"],
    director: "Shawn Levy",
    cast: ["Ryan Reynolds", "Hugh Jackman", "Emma Corrin"],
    imdbRating: 8.0,
    posterUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
    description: "Wade Wilson tái xuất cùng người anh em Wolverine trong một phi vụ đa vũ trụ đầy hài hước và những pha hành động mãn nhãn.",
    isHot: true,
    trendingScore: 97
  },
  {
    id: "mov-10",
    title: "Kẻ Trộm Mặt Trăng 4",
    originalTitle: "Despicable Me 4",
    status: "COMING_SOON",
    durationMinutes: 95,
    releaseDate: "2026-10-20",
    ageRating: "P",
    genres: ["Hoạt hình", "Hài hước", "Gia đình"],
    formats: ["2D", "3D"],
    director: "Chris Renaud",
    cast: ["Steve Carell", "Kristen Wiig", "Will Ferrell"],
    imdbRating: 6.7,
    posterUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200&auto=format&fit=crop&q=80",
    description: "Gru chào đón thành viên nhí Gru Jr. quậy phá trong khi gia đình phải đối đầu kẻ thù mới nguy hiểm Maxime Le Mal.",
    isHot: false,
    trendingScore: 88
  },
  {
    id: "mov-11",
    title: "Joker: Điên Có Đôi",
    originalTitle: "Joker: Folie à Deux",
    status: "COMING_SOON",
    durationMinutes: 138,
    releaseDate: "2026-11-04",
    ageRating: "T18",
    genres: ["Tâm lý", "Kịch tính", "Âm nhạc"],
    formats: ["IMAX", "2D"],
    director: "Todd Phillips",
    cast: ["Joaquin Phoenix", "Lady Gaga", "Brendan Gleeson"],
    imdbRating: 8.2,
    posterUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
    description: "Arthur Fleck bị giam giữ tại trại tâm thần Arkham và tìm thấy tình yêu định mệnh cùng Harley Quinn giữa những ảo mộng điên cuồng.",
    isHot: true,
    trendingScore: 96
  },
  {
    id: "mov-12",
    title: "Gladiator II: Võ Sĩ Giác Đấu 2",
    originalTitle: "Gladiator II",
    status: "COMING_SOON",
    durationMinutes: 150,
    releaseDate: "2026-11-22",
    ageRating: "T18",
    genres: ["Hành động", "Lịch sử", "Chính kịch"],
    formats: ["IMAX", "4DX", "2D"],
    director: "Ridley Scott",
    cast: ["Paul Mescal", "Pedro Pascal", "Denzel Washington"],
    imdbRating: 7.9,
    posterUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200&auto=format&fit=crop&q=80",
    description: "Phần tiếp theo của siêu phẩm sử thi La Mã huyền thoại, theo chân Lucius bước vào đấu trường Colosseum đẫm máu để giành lại tự do.",
    isHot: true,
    trendingScore: 93
  },
  {
    id: "mov-13",
    title: "Mufasa: Vua Sư Tử",
    originalTitle: "Mufasa: The Lion King",
    status: "COMING_SOON",
    durationMinutes: 120,
    releaseDate: "2026-12-20",
    ageRating: "P",
    genres: ["Hoạt hình", "Phiêu lưu", "Gia đình"],
    formats: ["3D", "IMAX", "2D"],
    director: "Barry Jenkins",
    cast: ["Aaron Pierre", "Kelvin Harrison Jr.", "Seth Rogen"],
    imdbRating: 7.5,
    posterUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
    description: "Hành trình thời trẻ đầy thử thách và vinh quang của Mufasa từ một chú sư tử mồ côi trở thành vị vua vĩ đại của Pride Lands.",
    isHot: false,
    trendingScore: 89
  },
  {
    id: "mov-14",
    title: "Wicked: Phù Thủy Xứ Oz",
    originalTitle: "Wicked: Part One",
    status: "COMING_SOON",
    durationMinutes: 160,
    releaseDate: "2026-12-25",
    ageRating: "T13",
    genres: ["Kỳ ảo", "Âm nhạc", "Phiêu lưu"],
    formats: ["IMAX", "2D"],
    director: "Jon M. Chu",
    cast: ["Cynthia Erivo", "Ariana Grande", "Jonathan Bailey"],
    imdbRating: 7.8,
    posterUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80",
    description: "Câu chuyện chưa kể về tình bạn kỳ lạ giữa Elphaba - Phù thủy Ác phương Tây và Glinda - Phù thủy Tốt phương Bắc trước khi Dorothy đến Oz.",
    isHot: false,
    trendingScore: 87
  }
];

// Hệ thống cụm rạp CGV Cinema
const cinemas = [
  {
    id: "cin-01",
    name: "CGV Vincom Landmark 81",
    region: "TP. Hồ Chí Minh",
    address: "Tầng B1, TTTM Vincom Landmark 81, 720A Điện Biên Phủ, P. 22, Bình Thạnh, TP. HCM",
    phone: "1900 6017",
    formats: ["IMAX Laser", "Gold Class", "Dolby Atmos"]
  },
  {
    id: "cin-02",
    name: "CGV Hùng Vương Plaza",
    region: "TP. Hồ Chí Minh",
    address: "Tầng 7, Hùng Vương Plaza, 126 Hồng Bàng, P. 12, Quận 5, TP. HCM",
    phone: "1900 6017",
    formats: ["4DX", "Sweetbox", "2D"]
  },
  {
    id: "cin-03",
    name: "CGV Vincom Royal City",
    region: "Hà Nội",
    address: "Tầng B2, TTTM Vincom Mega Mall Royal City, 72A Nguyễn Trãi, Thanh Xuân, Hà Nội",
    phone: "1900 6017",
    formats: ["IMAX", "4DX", "Dolby Atmos"]
  },
  {
    id: "cin-04",
    name: "CGV Vincom Bà Triệu",
    region: "Hà Nội",
    address: "Tầng 6, Vincom Center Hà Nội, 191 Bà Triệu, Hai Bà Trưng, Hà Nội",
    phone: "1900 6017",
    formats: ["ScreenX", "Gold Class", "2D"]
  },
  {
    id: "cin-05",
    name: "CGV Vincom Đà Nẵng",
    region: "Đà Nẵng",
    address: "Tầng 4, TTTM Vincom Plaza Ngô Quyền, 910A Ngô Quyền, Sơn Trà, Đà Nẵng",
    phone: "1900 6017",
    formats: ["Starium", "Sweetbox", "2D"]
  }
];

const rooms = [
  // Cụm cin-01: CGV Vincom Landmark 81 (TP. HCM)
  { id: "room-01", cinemaId: "cin-01", name: "Phòng 01 - IMAX Laser", type: "IMAX", totalSeats: 80 },
  { id: "room-02", cinemaId: "cin-01", name: "Phòng 02 - Gold Class VIP", type: "VIP", totalSeats: 40 },
  { id: "room-03", cinemaId: "cin-01", name: "Phòng 03 - 2D Dolby Atmos", type: "STANDARD", totalSeats: 80 },
  // Cụm cin-02: CGV Hùng Vương Plaza (TP. HCM)
  { id: "room-04", cinemaId: "cin-02", name: "Phòng 04 - 4DX Dynamic", type: "4DX", totalSeats: 60 },
  { id: "room-06", cinemaId: "cin-02", name: "Phòng 06 - 2D Standard", type: "STANDARD", totalSeats: 80 },
  // Cụm cin-03: CGV Vincom Royal City (Hà Nội)
  { id: "room-05", cinemaId: "cin-03", name: "Phòng 05 - ScreenX 270°", type: "SCREENX", totalSeats: 80 },
  { id: "room-07", cinemaId: "cin-03", name: "Phòng 02 - IMAX Laser Royal", type: "IMAX", totalSeats: 80 },
  { id: "room-08", cinemaId: "cin-03", name: "Phòng 03 - 2D Dolby Atmos", type: "STANDARD", totalSeats: 80 },
  // Cụm cin-04: CGV Vincom Bà Triệu (Hà Nội)
  { id: "room-09", cinemaId: "cin-04", name: "Phòng 01 - Gold Class VIP", type: "VIP", totalSeats: 40 },
  { id: "room-10", cinemaId: "cin-04", name: "Phòng 02 - 2D Digital", type: "STANDARD", totalSeats: 80 },
  // Cụm cin-05: CGV Vincom Đà Nẵng (Đà Nẵng)
  { id: "room-11", cinemaId: "cin-05", name: "Phòng 01 - Starium Laser", type: "STARIUM", totalSeats: 80 },
  { id: "room-12", cinemaId: "cin-05", name: "Phòng 02 - 2D Dolby Atmos", type: "STANDARD", totalSeats: 80 }
];

// Helper sinh ngày giờ linh hoạt theo thời gian thực (luôn có suất chiếu hôm nay, ngày mai, các ngày tiếp theo)
const getDynamicDateStr = (daysOffset, timeStr) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day} ${timeStr}`;
};

// Hàm sinh danh sách suất chiếu thời gian thực cho 7 ngày tới (từ hôm nay trở đi)
const generateRealtimeShowtimes = () => {
  const list = [];
  const scheduleTemplate = [
    // 1. Exhuma: Quật Mộ Trùng Ma (mov-06) - Phim đang chọn trong ảnh
    { movieId: "mov-06", roomId: "room-05", time: "10:15", price: 140000, format: "SCREENX" },
    { movieId: "mov-06", roomId: "room-07", time: "13:30", price: 160000, format: "IMAX" },
    { movieId: "mov-06", roomId: "room-08", time: "16:45", price: 110000, format: "2D" },
    { movieId: "mov-06", roomId: "room-05", time: "19:00", price: 150000, format: "SCREENX" },
    { movieId: "mov-06", roomId: "room-07", time: "21:30", price: 170000, format: "IMAX" },
    { movieId: "mov-06", roomId: "room-01", time: "18:00", price: 160000, format: "IMAX" },
    { movieId: "mov-06", roomId: "room-03", time: "20:15", price: 110000, format: "2D" },
    { movieId: "mov-06", roomId: "room-04", time: "15:00", price: 155000, format: "4DX" },

    // 2. Dune: Hành Tinh Cát 2 (mov-01)
    { movieId: "mov-01", roomId: "room-01", time: "10:00", price: 150000, format: "IMAX" },
    { movieId: "mov-01", roomId: "room-01", time: "14:30", price: 150000, format: "IMAX" },
    { movieId: "mov-01", roomId: "room-01", time: "18:30", price: 160000, format: "IMAX" },
    { movieId: "mov-01", roomId: "room-01", time: "21:45", price: 160000, format: "IMAX" },
    { movieId: "mov-01", roomId: "room-07", time: "18:00", price: 160000, format: "IMAX" },
    { movieId: "mov-01", roomId: "room-07", time: "21:15", price: 160000, format: "IMAX" },

    // 3. Mai (mov-02)
    { movieId: "mov-02", roomId: "room-03", time: "11:00", price: 105000, format: "2D" },
    { movieId: "mov-02", roomId: "room-03", time: "15:30", price: 110000, format: "2D" },
    { movieId: "mov-02", roomId: "room-03", time: "19:15", price: 120000, format: "2D" },
    { movieId: "mov-02", roomId: "room-08", time: "14:00", price: 110000, format: "2D" },
    { movieId: "mov-02", roomId: "room-08", time: "19:30", price: 120000, format: "2D" },
    { movieId: "mov-02", roomId: "room-02", time: "20:30", price: 210000, format: "VIP" },

    // 4. Godzilla x Kong: Đế Chế Mới (mov-05)
    { movieId: "mov-05", roomId: "room-04", time: "11:30", price: 150000, format: "4DX" },
    { movieId: "mov-05", roomId: "room-04", time: "17:15", price: 165000, format: "4DX" },
    { movieId: "mov-05", roomId: "room-04", time: "20:45", price: 170000, format: "4DX" },
    { movieId: "mov-05", roomId: "room-05", time: "14:15", price: 145000, format: "SCREENX" },
    { movieId: "mov-05", roomId: "room-05", time: "22:00", price: 145000, format: "SCREENX" },

    // 5. Kung Fu Panda 4 (mov-04)
    { movieId: "mov-04", roomId: "room-04", time: "09:15", price: 140000, format: "4DX" },
    { movieId: "mov-04", roomId: "room-04", time: "13:45", price: 145000, format: "4DX" },
    { movieId: "mov-04", roomId: "room-08", time: "10:30", price: 100000, format: "2D" },
    { movieId: "mov-04", roomId: "room-08", time: "15:45", price: 105000, format: "2D" },

    // 6. Oppenheimer (mov-03)
    { movieId: "mov-03", roomId: "room-02", time: "13:30", price: 200000, format: "VIP" },
    { movieId: "mov-03", roomId: "room-02", time: "17:45", price: 210000, format: "VIP" },
    { movieId: "mov-03", roomId: "room-07", time: "10:30", price: 155000, format: "IMAX" },

    // 7. Interstellar: Hố Đen Tử Thần (mov-07)
    { movieId: "mov-07", roomId: "room-01", time: "13:15", price: 150000, format: "IMAX" },
    { movieId: "mov-07", roomId: "room-07", time: "14:15", price: 155000, format: "IMAX" },

    // 8. Lật Mặt 7: Một Điều Ước (mov-08)
    { movieId: "mov-08", roomId: "room-03", time: "13:00", price: 110000, format: "2D" },
    { movieId: "mov-08", roomId: "room-03", time: "17:30", price: 115000, format: "2D" },
    { movieId: "mov-08", roomId: "room-08", time: "11:45", price: 110000, format: "2D" },
    { movieId: "mov-08", roomId: "room-08", time: "17:45", price: 115000, format: "2D" }
  ];

  for (let offset = 0; offset < 7; offset++) {
    scheduleTemplate.forEach(t => {
      const start = getDynamicDateStr(offset, t.time);
      const [h, m] = t.time.split(":").map(Number);
      const endH = String((h + 2) % 24).padStart(2, "0");
      const endM = String((m + 15) % 60).padStart(2, "0");
      const end = getDynamicDateStr(offset, `${endH}:${endM}`);

      list.push({
        id: `st-${t.movieId}-${t.roomId}-d${offset}-${t.time.replace(":", "")}`,
        movieId: t.movieId,
        roomId: t.roomId,
        startTime: start,
        endTime: end,
        price: t.price,
        format: t.format
      });
    });
  }
  return list;
};

// Danh sách suất chiếu mẫu phong phú theo thời gian thực
const showtimes = generateRealtimeShowtimes();

// Sinh ma trận ghế (Hàng A -> H, mỗi hàng 10 ghế)
const generateSeats = () => {
  const seats = [];
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
  rows.forEach((r, rIdx) => {
    for (let c = 1; c <= 10; c++) {
      let type = "STANDARD";
      let priceRate = 1.0;
      if (rIdx >= 3 && rIdx <= 5) {
        type = "VIP";
        priceRate = 1.25;
      } else if (rIdx >= 6) {
        type = "SWEETBOX";
        priceRate = 1.5;
      }
      seats.push({
        id: `${r}${c}`,
        row: r,
        number: c,
        type: type,
        priceRate: priceRate
      });
    }
  });
  return seats;
};

const defaultSeats = generateSeats();

// Menu Bắp Nước CGV Concession
const combos = [
  { id: "cb-01", name: "CGV My Combo", desc: "1 Bắp rang bơ vừa + 1 Nước ngọt lớn", price: 89000, img: "🍿🥤" },
  { id: "cb-02", name: "CGV Couple Sweet Combo", desc: "1 Bắp phô mai lớn + 2 Nước ngọt lớn", price: 139000, img: "🍿🥤🥤" },
  { id: "cb-03", name: "CGV Family Friends Combo", desc: "2 Bắp caramel lớn + 4 Nước ngọt + 1 Snack khoai tây", price: 229000, img: "🍿🍿🥤🥤🍟" },
  { id: "cb-04", name: "Premium Nachos Combo", desc: "1 Hộp Bánh Nachos Phô Mai + 1 Nước ngọt lớn", price: 99000, img: "🧀🥤" }
];

// Danh sách người dùng & Thành viên CGV Membership
const users = [
  {
    id: "user_guest",
    name: "Khách hàng CGV VIP",
    email: "customer@aicinema.vn",
    password: "123456",
    phone: "0987654321",
    role: "CUSTOMER",
    memberCardNumber: "9999-8888-2401-1250",
    memberTier: "VIP",
    points: 1250,
    totalSpent: 2650000,
    favoriteGenres: ["Khoa học viễn tưởng", "Hành động"],
    status: "ACTIVE",
    createdAt: "2024-01-10T08:00:00.000Z"
  },
  {
    id: "user_002",
    name: "Nguyễn Hoàng Nam",
    email: "hoangnam@gmail.com",
    password: "123456",
    phone: "0912345678",
    role: "CUSTOMER",
    memberCardNumber: "9999-7777-2402-0450",
    memberTier: "MEMBER",
    points: 450,
    totalSpent: 850000,
    favoriteGenres: ["Hài hước", "Hoạt hình"],
    status: "ACTIVE",
    createdAt: "2024-02-15T09:30:00.000Z"
  },
  {
    id: "user_003",
    name: "Trịnh Thùy Trang",
    email: "thuytrang@gmail.com",
    password: "123456",
    phone: "0977889900",
    role: "CUSTOMER",
    memberCardNumber: "9999-6666-2403-0120",
    memberTier: "MEMBER",
    points: 120,
    totalSpent: 320000,
    favoriteGenres: ["Tình cảm", "Tâm lý"],
    status: "ACTIVE",
    createdAt: "2024-03-01T14:20:00.000Z"
  },
  {
    id: "staff_001",
    name: "Lê Minh Anh",
    email: "minhanh@aicinema.vn",
    password: "123456",
    phone: "0901001001",
    role: "STAFF",
    memberCardNumber: "9999-0000-STAFF-001",
    memberTier: "STAFF",
    points: 0,
    totalSpent: 0,
    favoriteGenres: [],
    status: "ACTIVE",
    createdAt: "2024-01-01T08:00:00.000Z"
  },
  {
    id: "staff_002",
    name: "Trần Bảo Nam",
    email: "baonam@aicinema.vn",
    password: "123456",
    phone: "0902002002",
    role: "STAFF",
    memberCardNumber: "9999-0000-STAFF-002",
    memberTier: "STAFF",
    points: 0,
    totalSpent: 0,
    favoriteGenres: [],
    status: "ACTIVE",
    createdAt: "2024-01-01T08:00:00.000Z"
  },
  {
    id: "admin_001",
    name: "Nguyễn Quang Huy",
    email: "admin@aicinema.vn",
    password: "admin123",
    phone: "0903003003",
    role: "ADMIN",
    memberCardNumber: "9999-0000-ADMIN-01",
    memberTier: "INTERNAL",
    points: 0,
    totalSpent: 0,
    favoriteGenres: [],
    status: "ACTIVE",
    createdAt: "2024-01-01T08:00:00.000Z"
  }
];

const bookings = [
  { bookingCode: "BKG-240901", qrToken: "CGV-TICKET-BKG-240901-XYZ1", userId: "user_guest", movieId: "mov-01", showtimeId: "st-101", seats: ["D5", "D6"], total: 450000, status: "PAID", bookedAt: "2026-09-22T10:30:00.000Z" },
  { bookingCode: "BKG-240842", qrToken: "CGV-TICKET-BKG-240842-XYZ2", userId: "user_guest", movieId: "mov-03", showtimeId: "st-105", seats: ["E4"], total: 200000, status: "PAID", bookedAt: "2026-09-21T12:10:00.000Z" }
];

module.exports = {
  movies,
  cinemas,
  rooms,
  showtimes,
  defaultSeats,
  combos,
  users,
  bookings
};
