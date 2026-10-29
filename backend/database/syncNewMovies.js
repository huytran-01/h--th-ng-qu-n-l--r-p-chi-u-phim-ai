// =========================================================================
// SCRIPT ĐỒNG BỘ 8 PHIM BOM TẤN MỚI VÀO CSDL MYSQL & MOCKDATA
// =========================================================================

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const NEW_MOVIES = [
  {
    id: "mov-15",
    title: "Avatar: Dòng Chảy Của Nước",
    originalTitle: "Avatar: The Way of Water",
    status: "NOW_SHOWING",
    durationMinutes: 192,
    releaseDate: "2024-01-15",
    ageRating: "T13",
    genres: ["Khoa học viễn tưởng", "Phiêu lưu", "Hành động"],
    formats: ["IMAX", "3D", "2D"],
    director: "James Cameron",
    cast: ["Sam Worthington", "Zoe Saldana", "Sigourney Weaver", "Stephen Lang"],
    imdbRating: 7.6,
    posterUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80",
    description: "Jake Sully và Neytiri cùng các con phải rời bỏ quê nhà rừng xanh để tìm nơi nương tựa tại vùng biển đại dương Pandora trước sự truy đuổi tàn bạo của loài người.",
    isHot: true,
    trendingScore: 97
  },
  {
    id: "mov-16",
    title: "Thám Tử Lừng Danh Conan: Ngôi Sao 5 Cánh 1 Tỷ Đô",
    originalTitle: "Detective Conan: The Million-dollar Pentagram",
    status: "NOW_SHOWING",
    durationMinutes: 111,
    releaseDate: "2024-08-02",
    ageRating: "P",
    genres: ["Hoạt hình", "Trinh thám", "Hành động"],
    formats: ["2D", "IMAX"],
    director: "Chika Nagaoka",
    cast: ["Minami Takayama", "Wakana Yamazaki", "Kappei Yamaguchi"],
    imdbRating: 7.9,
    posterUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80",
    description: "Cuộc đối đầu kịch tính giữa Conan, Siêu trộm Kid và Hattori Heiji tại Hakodate xoay quanh thanh kiếm Nhật cổ cất giấu bí mật kho báu quân sự trị giá 1 tỷ đô.",
    isHot: true,
    trendingScore: 96
  },
  {
    id: "mov-17",
    title: "Spider-Man: Không Còn Nhà",
    originalTitle: "Spider-Man: No Way Home",
    status: "NOW_SHOWING",
    durationMinutes: 148,
    releaseDate: "2023-12-17",
    ageRating: "T13",
    genres: ["Hành động", "Phiêu lưu", "Khoa học viễn tưởng"],
    formats: ["IMAX", "3D", "2D"],
    director: "Jon Watts",
    cast: ["Tom Holland", "Zendaya", "Benedict Cumberbatch", "Tobey Maguire", "Andrew Garfield"],
    imdbRating: 8.2,
    posterUrl: "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80",
    description: "Danh tính Người Nhện bị bại lộ, Peter Parker nhờ Doctor Strange làm phép nhưng vô tình mở toang đa vũ trụ, đối mặt các phản diện từ những thực tại khác.",
    isHot: true,
    trendingScore: 95
  },
  {
    id: "mov-18",
    title: "Địa Đạo: Mặt Trời Trong Bóng Tối",
    originalTitle: "Tunnel: Sun In The Dark",
    status: "NOW_SHOWING",
    durationMinutes: 125,
    releaseDate: "2024-04-30",
    ageRating: "T16",
    genres: ["Lịch sử", "Chiến tranh", "Hành động"],
    formats: ["2D", "Dolby Atmos"],
    director: "Bùi Thạc Chuyên",
    cast: ["Thái Hòa", "Quang Tuấn", "Diễm My 9x"],
    imdbRating: 8.1,
    posterUrl: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200&auto=format&fit=crop&q=80",
    description: "Tái hiện chân thực tinh thần quả cảm kiên cường của các chiến sĩ và người dân Củ Chi trong lòng địa đạo huyền thoại bảo vệ vùng đất thép.",
    isHot: false,
    trendingScore: 91
  },
  {
    id: "mov-19",
    title: "Vùng Đất Câm Lặng: Ngày Một",
    originalTitle: "A Quiet Place: Day One",
    status: "NOW_SHOWING",
    durationMinutes: 99,
    releaseDate: "2024-06-28",
    ageRating: "T16",
    genres: ["Kinh dị", "Hồi hộp", "Khoa học viễn tưởng"],
    formats: ["IMAX", "2D"],
    director: "Michael Sarnoski",
    cast: ["Lupita Nyong'o", "Joseph Quinn", "Alex Wolff"],
    imdbRating: 7.1,
    posterUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80",
    description: "Chứng kiến ngày đầu tiên những sinh vật ngoài hành tinh nhạy cảm với âm thanh giáng xuống New York, đẩy cả nhân loại vào thảm họa im lặng sinh tử.",
    isHot: false,
    trendingScore: 89
  },
  {
    id: "mov-20",
    title: "Transformers: Một",
    originalTitle: "Transformers One",
    status: "COMING_SOON",
    durationMinutes: 104,
    releaseDate: "2026-11-15",
    ageRating: "P",
    genres: ["Hoạt hình", "Hành động", "Khoa học viễn tưởng"],
    formats: ["IMAX", "3D", "2D"],
    director: "Josh Cooley",
    cast: ["Chris Hemsworth", "Brian Tyree Henry", "Scarlett Johansson", "Keegan-Michael Key"],
    imdbRating: 7.8,
    posterUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
    description: "Câu chuyện nguồn gốc chưa từng kể về tình bạn huynh đệ thân thiết giữa Orion Pax (Optimus Prime) và D-16 (Megatron) trước khi trở thành kẻ thù truyền kiếp.",
    isHot: true,
    trendingScore: 94
  },
  {
    id: "mov-21",
    title: "Moana 2: Hành Trình Mới Của Biển Cả",
    originalTitle: "Moana 2",
    status: "COMING_SOON",
    durationMinutes: 100,
    releaseDate: "2026-11-27",
    ageRating: "P",
    genres: ["Hoạt hình", "Phiêu lưu", "Âm nhạc", "Gia đình"],
    formats: ["IMAX", "3D", "2D"],
    director: "David G. Derrick Jr.",
    cast: ["Auli'i Cravalho", "Dwayne Johnson", "Alan Tudyk"],
    imdbRating: 7.4,
    posterUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80",
    description: "Sau lời hiệu triệu bất ngờ từ tổ tiên, Moana cùng á thần Maui vượt qua những vùng biển nguy hiểm xa xôi chưa từng được khám phá của Châu Đại Dương.",
    isHot: false,
    trendingScore: 90
  },
  {
    id: "mov-22",
    title: "Sonic The Hedgehog 3: Nhím Sonic 3",
    originalTitle: "Sonic the Hedgehog 3",
    status: "COMING_SOON",
    durationMinutes: 110,
    releaseDate: "2026-12-20",
    ageRating: "P",
    genres: ["Hành động", "Phiêu lưu", "Hài hước", "Gia đình"],
    formats: ["2D", "4DX"],
    director: "Jeff Fowler",
    cast: ["Ben Schwartz", "Keanu Reeves", "Jim Carrey", "Idris Elba"],
    imdbRating: 7.7,
    posterUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200&auto=format&fit=crop&q=80",
    description: "Sonic, Tails và Knuckles phải liên minh với kẻ thù cũ Dr. Robotnik để ngăn chặn Shadow the Hedgehog - một thế lực bí ẩn sở hữu sức mạnh hủy diệt.",
    isHot: false,
    trendingScore: 88
  }
];

const NEW_SCHEDULE_TEMPLATES = [
  // 9. Avatar: Dòng Chảy Của Nước (mov-15)
  { movieId: "mov-15", roomId: "room-01", time: "16:30", price: 160000, format: "IMAX" },
  { movieId: "mov-15", roomId: "room-04", time: "20:00", price: 170000, format: "IMAX" },

  // 10. Thám Tử Lừng Danh Conan (mov-16)
  { movieId: "mov-16", roomId: "room-03", time: "09:30", price: 110000, format: "2D" },
  { movieId: "mov-16", roomId: "room-05", time: "15:00", price: 120000, format: "2D" },
  { movieId: "mov-16", roomId: "room-08", time: "18:15", price: 115000, format: "2D" },

  // 11. Spider-Man: Không Còn Nhà (mov-17)
  { movieId: "mov-17", roomId: "room-02", time: "10:15", price: 190000, format: "VIP" },
  { movieId: "mov-17", roomId: "room-07", time: "17:00", price: 160000, format: "IMAX" },

  // 12. Địa Đạo: Mặt Trời Trong Bóng Tối (mov-18)
  { movieId: "mov-18", roomId: "room-05", time: "11:30", price: 110000, format: "2D" },
  { movieId: "mov-18", roomId: "room-09", time: "19:45", price: 120000, format: "2D" },

  // 13. Vùng Đất Câm Lặng: Ngày Một (mov-19)
  { movieId: "mov-19", roomId: "room-06", time: "21:30", price: 140000, format: "IMAX" }
];

function getDynamicDateStr(dayOffset, timeStr) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const date = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${date} ${timeStr}:00`;
}

function generateNewShowtimes() {
  const list = [];
  for (let offset = 0; offset < 7; offset++) {
    NEW_SCHEDULE_TEMPLATES.forEach(t => {
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
}

async function syncAll() {
  console.log("=== BẮT ĐẦU ĐỒNG BỘ PHIM MỚI & SUẤT CHIẾU ===");

  // 1. Cập nhật vào mockData.js nếu chưa có
  const mockPath = path.join(__dirname, "../src/data/mockData.js");
  let mockContent = fs.readFileSync(mockPath, "utf8");

  if (!mockContent.includes("mov-15")) {
    console.log("-> Đang cập nhật mockData.js với 8 phim mới...");
    const moviesJson = NEW_MOVIES.map(m => "  " + JSON.stringify(m, null, 2).replace(/\n/g, "\n  ")).join(",\n");
    mockContent = mockContent.replace(/(\n\s*\{\s*id:\s*["']mov-14["'][\s\S]*?\n\s*\})([\s\r\n]*\];)/, (match, p1, p2) => {
      return p1 + ",\n" + moviesJson + p2;
    });

    // Cập nhật schedule template
    const schedStr = NEW_SCHEDULE_TEMPLATES.map(s => `    { movieId: "${s.movieId}", roomId: "${s.roomId}", time: "${s.time}", price: ${s.price}, format: "${s.format}" }`).join(",\n");
    mockContent = mockContent.replace(/(\{ movieId:\s*["']mov-08["'][\s\S]*?format:\s*["']2D["']\s*\})([\s\r\n]*\];)/, (match, p1, p2) => {
      return p1 + ",\n\n    // Suất chiếu phim mới cập nhật\n" + schedStr + p2;
    });

    fs.writeFileSync(mockPath, mockContent, "utf8");
    console.log("✅ Đã cập nhật mockData.js thành công!");
  } else {
    console.log("ℹ️ mockData.js đã chứa dữ liệu mov-15.");
  }

  // 2. Kết nối CSDL MySQL và đồng bộ
  const DB_CONFIG = {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "cinema_db",
    charset: "utf8mb4",
    timezone: "+07:00"
  };

  let conn;
  try {
    conn = await mysql.createConnection(DB_CONFIG);
    console.log("✅ Đã kết nối MySQL instance thành công!");

    // Insert phim mới
    console.log("-> Đang đồng bộ 8 phim mới vào MySQL bảng `movies`...");
    for (const m of NEW_MOVIES) {
      await conn.execute(
        `INSERT INTO movies 
         (id, title, original_title, status, duration_minutes, release_date, age_rating, 
          genres, formats, director, cast, imdb_rating, trending_score, is_hot, poster_url, banner_url, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
          title=VALUES(title), original_title=VALUES(original_title), status=VALUES(status),
          duration_minutes=VALUES(duration_minutes), release_date=VALUES(release_date),
          age_rating=VALUES(age_rating), genres=VALUES(genres), formats=VALUES(formats),
          director=VALUES(director), cast=VALUES(cast), imdb_rating=VALUES(imdb_rating),
          trending_score=VALUES(trending_score), is_hot=VALUES(is_hot),
          poster_url=VALUES(poster_url), banner_url=VALUES(banner_url), description=VALUES(description);`,
        [
          m.id,
          m.title,
          m.originalTitle,
          m.status,
          m.durationMinutes,
          m.releaseDate,
          m.ageRating,
          JSON.stringify(m.genres),
          JSON.stringify(m.formats),
          m.director,
          JSON.stringify(m.cast),
          m.imdbRating,
          m.trendingScore,
          m.isHot ? 1 : 0,
          m.posterUrl,
          m.bannerUrl,
          m.description
        ]
      );
      console.log(`   + Đã đồng bộ phim: [${m.id}] ${m.title}`);
    }

    // Insert suất chiếu cho các phim mới
    const newShowtimes = generateNewShowtimes();
    console.log(`-> Đang đồng bộ ${newShowtimes.length} suất chiếu mới cho các phim đang chiếu...`);
    for (const st of newShowtimes) {
      await conn.execute(
        `INSERT INTO showtimes (id, movie_id, room_id, start_time, end_time, price, format)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
          movie_id=VALUES(movie_id), room_id=VALUES(room_id), 
          start_time=VALUES(start_time), end_time=VALUES(end_time), 
          price=VALUES(price), format=VALUES(format);`,
        [st.id, st.movieId, st.roomId, st.startTime, st.endTime, st.price, st.format]
      );
    }
    console.log(`✅ Đã đồng bộ ${newShowtimes.length} suất chiếu mới thành công!`);

    // Kiểm tra tổng số phim và suất chiếu trong MySQL
    const [movRows] = await conn.query("SELECT COUNT(*) AS totalMovies FROM movies");
    const [stRows] = await conn.query("SELECT COUNT(*) AS totalShowtimes FROM showtimes");
    console.log("=================================================");
    console.log(`🎬 TỔNG SỐ PHIM TRONG MYSQL: ${movRows[0].totalMovies} phim`);
    console.log(`🕒 TỔNG SỐ SUẤT CHIẾU TRONG MYSQL: ${stRows[0].totalShowtimes} suất`);
    console.log("=================================================");

  } catch (err) {
    console.error("❌ Lỗi khi đồng bộ MySQL:", err.message);
  } finally {
    if (conn) await conn.end();
  }
}

syncAll().then(() => {
  console.log("🎉 Hoàn tất quá trình đồng bộ!");
  process.exit(0);
}).catch(err => {
  console.error("Lỗi:", err);
  process.exit(1);
});
