// Dịch vụ Khóa ghế phân tán thời gian thực (Redis-compatible In-Memory Lock)
// Thời gian giữ ghế tạm thời: 10 phút (600 giây)
const LOCK_TTL_MS = 10 * 60 * 1000;

class SeatLockService {
  constructor() {
    // Map lưu trạng thái khóa: key = `${showtimeId}:${seatId}` -> { userId, expiresAt, timer }
    this.lockedSeats = new Map();
    // Map lưu ghế đã thanh toán thành công: key = `${showtimeId}` -> Set(seatId)
    this.bookedSeats = new Map();
  }

  // Khóa một danh sách ghế cho người dùng
  lockSeats(showtimeId, seatIds, userId = "anonymous") {
    const now = Date.now();
    this.cleanExpiredLocks();

    // 1. Kiểm tra xem có ghế nào đã được bán hoặc đang bị khóa bởi người khác không
    const alreadyBooked = this.bookedSeats.get(showtimeId) || new Set();
    const conflictSeats = [];

    for (const seatId of seatIds) {
      if (alreadyBooked.has(seatId)) {
        conflictSeats.push({ seatId, reason: "ALREADY_BOOKED" });
        continue;
      }

      const key = `${showtimeId}:${seatId}`;
      const existingLock = this.lockedSeats.get(key);
      if (existingLock && existingLock.expiresAt > now && existingLock.userId !== userId) {
        conflictSeats.push({ seatId, reason: "LOCKED_BY_OTHER" });
      }
    }

    if (conflictSeats.length > 0) {
      return {
        success: false,
        message: "Một số ghế đã có người giữ hoặc đã được bán",
        conflictSeats
      };
    }

    // 2. Thực hiện khóa ghế với thời hạn 10 phút
    const expiresAt = now + LOCK_TTL_MS;
    for (const seatId of seatIds) {
      const key = `${showtimeId}:${seatId}`;
      this.lockedSeats.set(key, {
        userId,
        expiresAt
      });
    }

    return {
      success: true,
      message: "Khóa ghế thành công trong 10 phút",
      expiresAt,
      ttlSeconds: Math.floor(LOCK_TTL_MS / 1000)
    };
  }

  // Giải phóng ghế khi hết hạn hoặc hủy
  releaseSeats(showtimeId, seatIds, userId) {
    for (const seatId of seatIds) {
      const key = `${showtimeId}:${seatId}`;
      const existing = this.lockedSeats.get(key);
      if (existing && (!userId || existing.userId === userId)) {
        this.lockedSeats.delete(key);
      }
    }
    return { success: true, message: "Đã giải phóng ghế" };
  }

  // Chuyển ghế sang trạng thái ĐÃ MUA (sau khi thanh toán thành công)
  confirmBooking(showtimeId, seatIds, userId) {
    const now = Date.now();
    const bookedSet = this.bookedSeats.get(showtimeId) || new Set();
    const invalidSeats = [];

    this.cleanExpiredLocks();
    for (const seatId of seatIds) {
      const key = `${showtimeId}:${seatId}`;
      const lock = this.lockedSeats.get(key);
      if (bookedSet.has(seatId)) {
        invalidSeats.push({ seatId, reason: "ALREADY_BOOKED" });
      } else if (!lock || lock.expiresAt <= now || lock.userId !== userId) {
        invalidSeats.push({ seatId, reason: "NOT_LOCKED_BY_USER" });
      }
    }

    if (invalidSeats.length > 0) {
      return {
        success: false,
        message: "Chỉ có thể thanh toán các ghế đang được bạn giữ",
        invalidSeats
      };
    }

    if (!this.bookedSeats.has(showtimeId)) {
      this.bookedSeats.set(showtimeId, new Set());
    }
    const confirmedSeats = this.bookedSeats.get(showtimeId);

    for (const seatId of seatIds) {
      confirmedSeats.add(seatId);
      const key = `${showtimeId}:${seatId}`;
      this.lockedSeats.delete(key);
    }
    return { success: true, message: "Xác nhận đặt vé thành công" };
  }

  // Lấy trạng thái tất cả các ghế của 1 ca chiếu
  getSeatsStatus(showtimeId, currentUserId) {
    this.cleanExpiredLocks();
    const now = Date.now();
    const bookedSet = this.bookedSeats.get(showtimeId) || new Set();
    const result = {};

    // Ghế đã bán
    bookedSet.forEach(s => {
      result[s] = { status: "BOOKED" };
    });

    // Ghế đang khóa tạm
    this.lockedSeats.forEach((lock, key) => {
      if (key.startsWith(`${showtimeId}:`)) {
        const seatId = key.split(":")[1];
        if (lock.expiresAt > now) {
          result[seatId] = {
            status: lock.userId === currentUserId ? "MY_LOCK" : "LOCKED",
            remainingSeconds: Math.max(0, Math.floor((lock.expiresAt - now) / 1000))
          };
        }
      }
    });

    return result;
  }

  cleanExpiredLocks() {
    const now = Date.now();
    for (const [key, lock] of this.lockedSeats.entries()) {
      if (lock.expiresAt <= now) {
        this.lockedSeats.delete(key);
      }
    }
  }
}

module.exports = new SeatLockService();
