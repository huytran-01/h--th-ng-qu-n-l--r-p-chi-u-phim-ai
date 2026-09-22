// Dịch vụ Xác thực & Quản lý Phiên Người Dùng Chuẩn CGV Membership
const { users } = require("../data/mockData");

// In-memory token store (Token -> { userId, role, createdAt, expiresAt })
const tokenStore = new Map();
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 giờ

class AuthService {
  /**
   * Tạo token ngẫu nhiên mô phỏng Bearer Token
   */
  generateToken(userId) {
    const randomPart = Math.random().toString(36).substring(2) + Date.now().toString(36);
    return `cgv_${userId}_${randomPart}`;
  }

  /**
   * Sinh số thẻ thành viên CGV 16 chữ số ngẫu nhiên: 9999-XXXX-XXXX-XXXX
   */
  generateCGVCardNumber() {
    const p1 = "9999";
    const p2 = Math.floor(1000 + Math.random() * 9000);
    const p3 = Math.floor(1000 + Math.random() * 9000);
    const p4 = Math.floor(1000 + Math.random() * 9000);
    return `${p1}-${p2}-${p3}-${p4}`;
  }

  /**
   * Đăng nhập người dùng bằng email và mật khẩu
   */
  login(email, password) {
    if (!email || !password) {
      return { success: false, message: "Vui lòng nhập đầy đủ email và mật khẩu." };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      return { success: false, message: "Email hoặc mật khẩu không chính xác." };
    }

    if (user.password && user.password !== password) {
      return { success: false, message: "Email hoặc mật khẩu không chính xác." };
    }

    if (user.status === "LOCKED") {
      return { success: false, message: "Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ quầy CSKH CGV." };
    }

    // Sinh token và lưu session
    const token = this.generateToken(user.id);
    const session = {
      userId: user.id,
      role: user.role,
      createdAt: Date.now(),
      expiresAt: Date.now() + TOKEN_TTL_MS
    };
    tokenStore.set(token, session);

    // Không trả mật khẩu về client
    const { password: _, ...safeUser } = user;

    return {
      success: true,
      token,
      user: safeUser,
      message: `Đăng nhập thành công! Chào mừng thành viên ${user.name}.`
    };
  }

  /**
   * Đăng ký tài khoản khách hàng mới chuẩn CGV Membership
   */
  register(userData) {
    const { name, email, password, phone } = userData;

    if (!name || !email || !password) {
      return { success: false, message: "Vui lòng điền đầy đủ họ tên, email và mật khẩu." };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return { success: false, message: "Email này đã được đăng ký tài khoản thành viên CGV." };
    }

    const newId = `user_${Date.now().toString().slice(-6)}`;
    const memberCardNumber = this.generateCGVCardNumber();

    const newUser = {
      id: newId,
      name: name.trim(),
      email: normalizedEmail,
      password: password,
      phone: phone ? phone.trim() : "",
      role: "CUSTOMER",
      memberCardNumber: memberCardNumber,
      memberTier: "MEMBER",
      membership: "STANDARD",
      points: 100, // Tặng 100 điểm thưởng chào mừng CGV Member
      totalSpent: 0,
      favoriteGenres: ["Hành động", "Khoa học viễn tưởng"],
      status: "ACTIVE",
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    // Tự động sinh token đăng nhập
    const token = this.generateToken(newId);
    tokenStore.set(token, {
      userId: newId,
      role: newUser.role,
      createdAt: Date.now(),
      expiresAt: Date.now() + TOKEN_TTL_MS
    });

    const { password: _, ...safeUser } = newUser;

    return {
      success: true,
      token,
      user: safeUser,
      message: `Chào mừng bạn đến với CGV Cultureplex! Mã thẻ thành viên của bạn: ${memberCardNumber}. Bạn đã nhận 100 điểm thưởng.`
    };
  }

  /**
   * Xác thực token lấy thông tin user
   */
  verifyToken(token) {
    if (!token) return null;

    const cleanToken = token.startsWith("Bearer ") ? token.slice(7).trim() : token.trim();
    const session = tokenStore.get(cleanToken);

    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      tokenStore.delete(cleanToken);
      return null;
    }

    const user = users.find(u => u.id === session.userId);
    if (!user || user.status === "LOCKED") return null;

    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Đăng xuất hủy token
   */
  logout(token) {
    if (!token) return true;
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7).trim() : token.trim();
    tokenStore.delete(cleanToken);
    return true;
  }
}

module.exports = new AuthService();
