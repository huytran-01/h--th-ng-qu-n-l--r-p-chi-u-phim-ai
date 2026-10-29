// =========================================================================
// CẤU HÌNH KẾT NỐI CƠ SỞ DỮ LIỆU MYSQL SERVER (POOL CONNECTION)
// Hỗ trợ chế độ kép: Tự động dùng MySQL nếu khả dụng, fallback sang MockData
// =========================================================================

const mysql = require("mysql2/promise");
require("dotenv").config();

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "cinema_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
  timezone: "+07:00",
  dateStrings: true
};

let pool = null;
let isMySqlConnected = false;

/**
 * Khởi tạo Pool kết nối tới MySQL Server
 */
function getPool() {
  if (!pool) {
    try {
      pool = mysql.createPool(DB_CONFIG);
    } catch (err) {
      console.warn("⚠️ Không thể tạo Pool kết nối MySQL:", err.message);
      pool = null;
    }
  }
  return pool;
}

/**
 * Kiểm tra trạng thái kết nối MySQL
 */
async function testConnection() {
  if (process.env.USE_MYSQL === "false") {
    console.log("ℹ️ Hệ thống đang cấu hình USE_MYSQL=false (Chế độ In-Memory Mock Data).");
    isMySqlConnected = false;
    return false;
  }

  try {
    const p = getPool();
    if (!p) {
      isMySqlConnected = false;
      return false;
    }
    const connection = await p.getConnection();
    await connection.ping();
    connection.release();
    isMySqlConnected = true;
    console.log(`✅ Kết nối MySQL Server thành công: ${DB_CONFIG.user}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
    return true;
  } catch (err) {
    isMySqlConnected = false;
    console.warn(`⚠️ Chưa thể kết nối MySQL Server (${DB_CONFIG.host}:${DB_CONFIG.port}): ${err.message}`);
    console.warn("👉 Hệ thống tự động kích hoạt chế độ In-Memory Mock Data dự phòng để đảm bảo website hoạt động ổn định.");
    return false;
  }
}

/**
 * Thực thi câu lệnh SQL với tham số an toàn (Prepared Statement)
 */
async function query(sql, params = []) {
  const p = getPool();
  if (!p) throw new Error("MySQL Pool chưa được khởi tạo");
  const [rows] = await p.query(sql, params);
  return rows;
}

/**
 * Thực thi câu lệnh Insert / Update / Delete
 */
async function execute(sql, params = []) {
  const p = getPool();
  if (!p) throw new Error("MySQL Pool chưa được khởi tạo");
  const [result] = await p.execute(sql, params);
  return result;
}

module.exports = {
  DB_CONFIG,
  getPool,
  testConnection,
  query,
  execute,
  isMySqlConnected: () => isMySqlConnected
};
