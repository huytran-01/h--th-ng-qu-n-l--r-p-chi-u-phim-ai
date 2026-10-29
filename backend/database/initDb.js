// =========================================================================
// SCRIPT KHỞI TẠO VÀ MIGRATION CƠ SỞ DỮ LIỆU MYSQL SERVER
// Chạy bằng lệnh: npm run db:init (hoặc: node database/initDb.js)
// =========================================================================

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mockData = require("../src/data/mockData");

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "cinema_db",
  multipleStatements: true,
  charset: "utf8mb4",
  timezone: "+07:00",
  dateStrings: true
};

function formatMysqlDatetime(str) {
  if (!str) return null;
  const clean = String(str).replace("T", " ").trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(clean)) return clean;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(clean)) return clean + ":00";
  const d = new Date(str);
  if (isNaN(d.getTime())) return clean;
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function initDatabase() {
  console.log("==================================================================");
  console.log("🎬 CGV CINEMAS — BẮT ĐẦU KHỞI TẠO CƠ SỞ DỮ LIỆU MYSQL SERVER");
  console.log("==================================================================");
  console.log(`📡 Cấu hình kết nối: ${DB_CONFIG.user}@${DB_CONFIG.host}:${DB_CONFIG.port}`);

  let rootConn;
  try {
    // 1. Kết nối tới MySQL Server (không chỉ định database trước)
    rootConn = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password
    });
    console.log("✅ Đã kết nối thành công tới MySQL Server instance.");

    // 2. Tạo Database cinema_db nếu chưa tồn tại
    await rootConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` 
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    console.log(`✅ Đã tạo/kiểm tra CSDL: \`${DB_CONFIG.database}\`.`);
    await rootConn.end();

    // 3. Kết nối trực tiếp vào cinema_db để chạy Schema
    const dbConn = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      database: DB_CONFIG.database,
      multipleStatements: true
    });

    const schemaPath = path.join(__dirname, "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    console.log("⏳ Đang thực thi cấu trúc bảng (schema.sql)...");
    await dbConn.query(schemaSql);
    console.log("✅ Đã tạo cấu trúc bảng thành công (8 bảng chuẩn quan hệ).");

    // 4. Seed dữ liệu: Cinemas
    console.log("⏳ Đang nạp dữ liệu Cụm rạp (Cinemas)...");
    for (const c of mockData.cinemas) {
      await dbConn.execute(
        `INSERT INTO cinemas (id, name, address, city) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), address=VALUES(address), city=VALUES(city);`,
        [c.id, c.name, c.address, c.city || c.region || "TP. Hồ Chí Minh"]
      );
    }

    // 5. Seed dữ liệu: Rooms & Seats
    console.log("⏳ Đang nạp dữ liệu Phòng chiếu & Ma trận ghế...");
    for (const r of mockData.rooms) {
      await dbConn.execute(
        `INSERT INTO rooms (id, cinema_id, name, format, total_seats) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), format=VALUES(format), total_seats=VALUES(total_seats);`,
        [r.id, r.cinemaId || "cin-01", r.name, r.format || r.type || "2D", r.totalSeats || 48]
      );

      // Thêm 48 ghế chuẩn cho phòng này
      for (const s of mockData.defaultSeats) {
        await dbConn.execute(
          `INSERT INTO seats (id, room_id, seat_row, seat_number, seat_type, price_rate)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE seat_type=VALUES(seat_type), price_rate=VALUES(price_rate);`,
          [s.id, r.id, s.row, s.number, s.type || "STANDARD", s.priceRate || 1.0]
        );
      }
    }

    // 6. Seed dữ liệu: Movies
    console.log("⏳ Đang nạp dữ liệu Phim (Movies)...");
    for (const m of mockData.movies) {
      await dbConn.execute(
        `INSERT INTO movies 
         (id, title, original_title, status, duration_minutes, release_date, age_rating, 
          genres, formats, director, cast, imdb_rating, trending_score, is_hot, poster_url, banner_url, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title=VALUES(title), status=VALUES(status), imdb_rating=VALUES(imdb_rating);`,
        [
          m.id,
          m.title,
          m.originalTitle || null,
          m.status || "NOW_SHOWING",
          m.durationMinutes || 120,
          m.releaseDate || null,
          m.ageRating || "T13",
          JSON.stringify(m.genres || []),
          JSON.stringify(m.formats || []),
          m.director || null,
          JSON.stringify(m.cast || []),
          m.imdbRating || 0,
          m.trendingScore || 80,
          m.isHot ? 1 : 0,
          m.posterUrl || null,
          m.bannerUrl || null,
          m.description || null
        ]
      );
    }

    // 7. Seed dữ liệu: Showtimes
    console.log("⏳ Đang nạp dữ liệu Suất chiếu (Showtimes)...");
    for (const st of mockData.showtimes) {
      const startTime = formatMysqlDatetime(st.startTime);
      const endTime = formatMysqlDatetime(st.endTime);
      await dbConn.execute(
        `INSERT INTO showtimes (id, movie_id, room_id, start_time, end_time, price, format)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE movie_id=VALUES(movie_id), room_id=VALUES(room_id), start_time=VALUES(start_time), end_time=VALUES(end_time), price=VALUES(price), format=VALUES(format);`,
        [st.id, st.movieId, st.roomId, startTime, endTime, st.price || 110000, st.format || "2D"]
      );
    }

    // 8. Seed dữ liệu: Combos
    console.log("⏳ Đang nạp dữ liệu Combo F&B...");
    for (const cb of mockData.combos) {
      await dbConn.execute(
        `INSERT INTO combos (id, name, description, price, image_url, status)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price);`,
        [cb.id, cb.name, cb.description || cb.desc || "", cb.price || 0, cb.imageUrl || cb.img || null, cb.status || "ACTIVE"]
      );
    }

    // 9. Seed dữ liệu: Users (3 tác nhân chuẩn CUSTOMER, STAFF, ADMIN)
    console.log("⏳ Đang nạp dữ liệu Người dùng (Users)...");
    for (const u of mockData.users) {
      await dbConn.execute(
        `INSERT INTO users 
         (id, name, email, password, phone, role, member_card_number, member_tier, points, total_spent, favorite_genres, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role), member_tier=VALUES(member_tier);`,
        [
          u.id,
          u.name,
          u.email,
          u.password,
          u.phone || null,
          u.role || "CUSTOMER",
          u.memberCardNumber || null,
          u.memberTier || "MEMBER",
          u.points || 0,
          u.totalSpent || 0,
          JSON.stringify(u.favoriteGenres || []),
          u.status || "ACTIVE"
        ]
      );
    }

    // 10. Seed dữ liệu: Bookings
    console.log("⏳ Đang nạp dữ liệu Đơn đặt vé (Bookings)...");
    const [stRows] = await dbConn.execute("SELECT id FROM showtimes");
    const validStIds = new Set(stRows.map(r => r.id));
    const firstValidStId = stRows.length > 0 ? stRows[0].id : null;

    for (const b of mockData.bookings) {
      const showtimeId = validStIds.has(b.showtimeId) ? b.showtimeId : firstValidStId;
      await dbConn.execute(
        `INSERT INTO bookings 
         (booking_code, qr_token, user_id, movie_id, showtime_id, seats, ticket_total, combo_total, total, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status);`,
        [
          b.bookingCode,
          b.qrToken || b.bookingCode,
          b.userId,
          b.movieId,
          showtimeId,
          JSON.stringify(b.seats || []),
          b.total || 0,
          0,
          b.total || 0,
          b.status || "PAID"
        ]
      );
    }

    await dbConn.end();

    console.log("==================================================================");
    console.log("🎉 KHỞI TẠO VÀ NẠP CƠ SỞ DỮ LIỆU MYSQL HOÀN TẤT 100%!");
    console.log(`   - Database name: ${DB_CONFIG.database}`);
    console.log(`   - Phim: ${mockData.movies.length}`);
    console.log(`   - Cụm rạp: ${mockData.cinemas.length}`);
    console.log(`   - Phòng chiếu: ${mockData.rooms.length}`);
    console.log(`   - Suất chiếu: ${mockData.showtimes.length}`);
    console.log(`   - Người dùng: ${mockData.users.length} (CUSTOMER, STAFF, ADMIN)`);
    console.log("==================================================================");
    process.exit(0);

  } catch (err) {
    console.error("❌ LỖI KHỞI TẠO MYSQL:", err.message);
    console.log("\n💡 HƯỚNG DẪN KHẮC PHỤC:");
    console.log("1. Đảm bảo dịch vụ MySQL Server đang chạy (Xem Services hoặc MySQL Workbench).");
    console.log("2. Kiểm tra thông tin đăng nhập trong file 'backend/.env':");
    console.log("   DB_HOST=localhost");
    console.log("   DB_PORT=3306");
    console.log("   DB_USER=root");
    console.log("   DB_PASSWORD=mật_khẩu_mysql_của_bạn");
    console.log("   DB_NAME=cinema_db");
    process.exit(1);
  }
}

initDatabase();
