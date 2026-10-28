// =========================================================================
// DỊCH VỤ TRUY XUẤT DỮ LIỆU ĐA TẦNG (DATA ACCESS SERVICE)
// Hỗ trợ đồng thời: MySQL Server 8.0+ (Chính) & In-Memory Fallback (Dự phòng)
// =========================================================================

const db = require("../config/database");
const mockData = require("../data/mockData");

class DbService {
  constructor() {
    this.mock = mockData;
  }

  isUsingMySql() {
    return db.isMySqlConnected();
  }

  // ==================== MOVIES (PHIM) ==================== //

  async getMovies() {
    if (this.isUsingMySql()) {
      try {
        const rows = await db.query(
          "SELECT * FROM movies ORDER BY is_hot DESC, trending_score DESC"
        );
        return rows.map(r => ({
          id: r.id,
          title: r.title,
          originalTitle: r.original_title,
          status: r.status,
          durationMinutes: r.duration_minutes,
          releaseDate: r.release_date ? r.release_date.toISOString().split("T")[0] : null,
          ageRating: r.age_rating,
          genres: typeof r.genres === "string" ? JSON.parse(r.genres) : (r.genres || []),
          formats: typeof r.formats === "string" ? JSON.parse(r.formats) : (r.formats || []),
          director: r.director,
          cast: typeof r.cast === "string" ? JSON.parse(r.cast) : (r.cast || []),
          imdbRating: parseFloat(r.imdb_rating),
          trendingScore: r.trending_score,
          isHot: Boolean(r.is_hot),
          posterUrl: r.poster_url,
          bannerUrl: r.banner_url,
          description: r.description
        }));
      } catch (err) {
        console.error("Lỗi getMovies từ MySQL, fallback mock:", err.message);
      }
    }
    return this.mock.movies;
  }

  async getMovieById(id) {
    if (this.isUsingMySql()) {
      try {
        const rows = await db.query("SELECT * FROM movies WHERE id = ? LIMIT 1", [id]);
        if (rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            title: r.title,
            originalTitle: r.original_title,
            status: r.status,
            durationMinutes: r.duration_minutes,
            releaseDate: r.release_date ? r.release_date.toISOString().split("T")[0] : null,
            ageRating: r.age_rating,
            genres: typeof r.genres === "string" ? JSON.parse(r.genres) : (r.genres || []),
            formats: typeof r.formats === "string" ? JSON.parse(r.formats) : (r.formats || []),
            director: r.director,
            cast: typeof r.cast === "string" ? JSON.parse(r.cast) : (r.cast || []),
            imdbRating: parseFloat(r.imdb_rating),
            trendingScore: r.trending_score,
            isHot: Boolean(r.is_hot),
            posterUrl: r.poster_url,
            bannerUrl: r.banner_url,
            description: r.description
          };
        }
      } catch (err) {
        console.error("Lỗi getMovieById từ MySQL:", err.message);
      }
    }
    return this.mock.movies.find(m => m.id === id) || null;
  }

  async createMovie(data) {
    const id = data.id || `mov-${String(Date.now()).slice(-4)}`;
    const movieObj = {
      id,
      title: data.title,
      originalTitle: data.originalTitle || data.title,
      status: data.status || "NOW_SHOWING",
      durationMinutes: Number(data.durationMinutes) || 120,
      releaseDate: data.releaseDate || new Date().toISOString().split("T")[0],
      ageRating: data.ageRating || "T13",
      genres: Array.isArray(data.genres) ? data.genres : [data.genres || "Hành động"],
      formats: Array.isArray(data.formats) ? data.formats : ["2D"],
      director: data.director || "Đang cập nhật",
      cast: Array.isArray(data.cast) ? data.cast : ["Đang cập nhật"],
      imdbRating: Number(data.imdbRating) || 8.0,
      trendingScore: Number(data.trendingScore) || 80,
      isHot: Boolean(data.isHot),
      posterUrl: data.posterUrl || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600",
      bannerUrl: data.bannerUrl || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200",
      description: data.description || ""
    };

    if (this.isUsingMySql()) {
      try {
        await db.execute(
          `INSERT INTO movies 
           (id, title, original_title, status, duration_minutes, release_date, age_rating, 
            genres, formats, director, cast, imdb_rating, trending_score, is_hot, poster_url, banner_url, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            movieObj.id,
            movieObj.title,
            movieObj.originalTitle,
            movieObj.status,
            movieObj.durationMinutes,
            movieObj.releaseDate,
            movieObj.ageRating,
            JSON.stringify(movieObj.genres),
            JSON.stringify(movieObj.formats),
            movieObj.director,
            JSON.stringify(movieObj.cast),
            movieObj.imdbRating,
            movieObj.trendingScore,
            movieObj.isHot ? 1 : 0,
            movieObj.posterUrl,
            movieObj.bannerUrl,
            movieObj.description
          ]
        );
      } catch (err) {
        console.error("Lỗi createMovie MySQL:", err.message);
      }
    }

    // Đồng bộ đồng thời vào memory mock để các agent AI đọc nhanh
    const existingIdx = this.mock.movies.findIndex(m => m.id === id);
    if (existingIdx >= 0) {
      this.mock.movies[existingIdx] = movieObj;
    } else {
      this.mock.movies.unshift(movieObj);
    }
    return movieObj;
  }

  async updateMovie(id, updateData) {
    let movie = await this.getMovieById(id);
    if (!movie) return null;

    Object.assign(movie, updateData);

    if (this.isUsingMySql()) {
      try {
        await db.execute(
          `UPDATE movies SET 
            title=?, original_title=?, status=?, duration_minutes=?, release_date=?, age_rating=?,
            genres=?, formats=?, director=?, imdb_rating=?, trending_score=?, is_hot=?, poster_url=?, description=?
           WHERE id=?`,
          [
            movie.title,
            movie.originalTitle,
            movie.status,
            movie.durationMinutes,
            movie.releaseDate,
            movie.ageRating,
            JSON.stringify(movie.genres),
            JSON.stringify(movie.formats),
            movie.director,
            movie.imdbRating,
            movie.trendingScore,
            movie.isHot ? 1 : 0,
            movie.posterUrl,
            movie.description,
            id
          ]
        );
      } catch (err) {
        console.error("Lỗi updateMovie MySQL:", err.message);
      }
    }

    const idx = this.mock.movies.findIndex(m => m.id === id);
    if (idx !== -1) this.mock.movies[idx] = movie;
    return movie;
  }

  async deleteMovie(id) {
    let deleted = false;
    if (this.isUsingMySql()) {
      try {
        const res = await db.execute("DELETE FROM movies WHERE id = ?", [id]);
        deleted = res.affectedRows > 0;
      } catch (err) {
        console.error("Lỗi deleteMovie MySQL:", err.message);
      }
    }

    const idx = this.mock.movies.findIndex(m => m.id === id);
    if (idx !== -1) {
      this.mock.movies.splice(idx, 1);
      deleted = true;
    }
    return deleted;
  }

  // ==================== SHOWTIMES (SUẤT CHIẾU) ==================== //

  async getShowtimes() {
    if (this.isUsingMySql()) {
      try {
        const rows = await db.query("SELECT * FROM showtimes ORDER BY start_time ASC");
        return rows.map(r => ({
          id: r.id,
          movieId: r.movie_id,
          roomId: r.room_id,
          startTime: r.start_time ? new Date(r.start_time).toISOString() : null,
          endTime: r.end_time ? new Date(r.end_time).toISOString() : null,
          price: r.price,
          format: r.format
        }));
      } catch (err) {
        console.error("Lỗi getShowtimes từ MySQL:", err.message);
      }
    }
    return this.mock.showtimes;
  }

  async createShowtime(data) {
    const id = data.id || `st-${String(Date.now()).slice(-4)}`;
    const stObj = {
      id,
      movieId: data.movieId,
      roomId: data.roomId,
      startTime: data.startTime,
      endTime: data.endTime || null,
      price: Number(data.price) || 110000,
      format: data.format || "2D"
    };

    if (this.isUsingMySql()) {
      try {
        const startSql = new Date(stObj.startTime).toISOString().slice(0, 19).replace('T', ' ');
        const endSql = stObj.endTime ? new Date(stObj.endTime).toISOString().slice(0, 19).replace('T', ' ') : null;
        await db.execute(
          `INSERT INTO showtimes (id, movie_id, room_id, start_time, end_time, price, format)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [stObj.id, stObj.movieId, stObj.roomId, startSql, endSql, stObj.price, stObj.format]
        );
      } catch (err) {
        console.error("Lỗi createShowtime MySQL:", err.message);
      }
    }

    this.mock.showtimes.push(stObj);
    return stObj;
  }

  async deleteShowtime(id) {
    let deleted = false;
    if (this.isUsingMySql()) {
      try {
        const res = await db.execute("DELETE FROM showtimes WHERE id = ?", [id]);
        deleted = res.affectedRows > 0;
      } catch (err) {
        console.error("Lỗi deleteShowtime MySQL:", err.message);
      }
    }

    const idx = this.mock.showtimes.findIndex(st => st.id === id);
    if (idx !== -1) {
      this.mock.showtimes.splice(idx, 1);
      deleted = true;
    }
    return deleted;
  }

  // ==================== CINEMAS & ROOMS ==================== //

  async getCinemas() {
    if (this.isUsingMySql()) {
      try {
        const rows = await db.query("SELECT * FROM cinemas");
        return rows;
      } catch (err) {
        console.error("Lỗi getCinemas MySQL:", err.message);
      }
    }
    return this.mock.cinemas;
  }

  async getRooms() {
    if (this.isUsingMySql()) {
      try {
        const rows = await db.query("SELECT * FROM rooms");
        return rows.map(r => ({
          id: r.id,
          cinemaId: r.cinema_id,
          name: r.name,
          format: r.format,
          totalSeats: r.total_seats
        }));
      } catch (err) {
        console.error("Lỗi getRooms MySQL:", err.message);
      }
    }
    return this.mock.rooms;
  }

  async getCombos() {
    if (this.isUsingMySql()) {
      try {
        const rows = await db.query("SELECT * FROM combos WHERE status = 'ACTIVE'");
        return rows.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          price: r.price,
          imageUrl: r.image_url,
          status: r.status
        }));
      } catch (err) {
        console.error("Lỗi getCombos MySQL:", err.message);
      }
    }
    return this.mock.combos;
  }

  // ==================== USERS & AUTHENTICATION ==================== //

  async getUsers() {
    if (this.isUsingMySql()) {
      try {
        const rows = await db.query("SELECT * FROM users ORDER BY created_at DESC");
        return rows.map(r => ({
          id: r.id,
          name: r.name,
          email: r.email,
          password: r.password,
          phone: r.phone,
          role: r.role,
          memberCardNumber: r.member_card_number,
          memberTier: r.member_tier,
          points: r.points,
          totalSpent: Number(r.total_spent),
          favoriteGenres: typeof r.favorite_genres === "string" ? JSON.parse(r.favorite_genres) : (r.favorite_genres || []),
          status: r.status,
          createdAt: r.created_at ? r.created_at.toISOString() : null
        }));
      } catch (err) {
        console.error("Lỗi getUsers MySQL:", err.message);
      }
    }
    return this.mock.users;
  }

  async findUserByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();

    if (this.isUsingMySql()) {
      try {
        const rows = await db.query("SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1", [cleanEmail]);
        if (rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            name: r.name,
            email: r.email,
            password: r.password,
            phone: r.phone,
            role: r.role,
            memberCardNumber: r.member_card_number,
            memberTier: r.member_tier,
            points: r.points,
            totalSpent: Number(r.total_spent),
            favoriteGenres: typeof r.favorite_genres === "string" ? JSON.parse(r.favorite_genres) : (r.favorite_genres || []),
            status: r.status,
            createdAt: r.created_at ? r.created_at.toISOString() : null
          };
        }
      } catch (err) {
        console.error("Lỗi findUserByEmail MySQL:", err.message);
      }
    }
    return this.mock.users.find(u => u.email.toLowerCase() === cleanEmail) || null;
  }

  async findUserById(id) {
    if (!id) return null;
    if (this.isUsingMySql()) {
      try {
        const rows = await db.query("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
        if (rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            name: r.name,
            email: r.email,
            password: r.password,
            phone: r.phone,
            role: r.role,
            memberCardNumber: r.member_card_number,
            memberTier: r.member_tier,
            points: r.points,
            totalSpent: Number(r.total_spent),
            favoriteGenres: typeof r.favorite_genres === "string" ? JSON.parse(r.favorite_genres) : (r.favorite_genres || []),
            status: r.status,
            createdAt: r.created_at ? r.created_at.toISOString() : null
          };
        }
      } catch (err) {
        console.error("Lỗi findUserById MySQL:", err.message);
      }
    }
    return this.mock.users.find(u => u.id === id) || null;
  }

  async createUser(userData) {
    const id = userData.id || `user_${Date.now().toString().slice(-6)}`;
    const user = {
      id,
      name: userData.name,
      email: userData.email.trim().toLowerCase(),
      password: userData.password,
      phone: userData.phone || "",
      role: (userData.role || "CUSTOMER").toUpperCase(),
      memberCardNumber: userData.memberCardNumber || `9999-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      memberTier: userData.memberTier || "MEMBER",
      points: Number(userData.points) || 100,
      totalSpent: Number(userData.totalSpent) || 0,
      favoriteGenres: userData.favoriteGenres || [],
      status: userData.status || "ACTIVE",
      createdAt: new Date().toISOString()
    };

    if (this.isUsingMySql()) {
      try {
        await db.execute(
          `INSERT INTO users 
           (id, name, email, password, phone, role, member_card_number, member_tier, points, total_spent, favorite_genres, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user.id,
            user.name,
            user.email,
            user.password,
            user.phone,
            user.role,
            user.memberCardNumber,
            user.memberTier,
            user.points,
            user.totalSpent,
            JSON.stringify(user.favoriteGenres),
            user.status
          ]
        );
      } catch (err) {
        console.error("Lỗi createUser MySQL:", err.message);
      }
    }

    this.mock.users.push(user);
    return user;
  }

  async updateUser(id, updateData) {
    const user = await this.findUserById(id);
    if (!user) return null;

    Object.assign(user, updateData);

    if (this.isUsingMySql()) {
      try {
        await db.execute(
          `UPDATE users SET 
            name=?, phone=?, role=?, member_tier=?, points=?, total_spent=?, status=?
           WHERE id=?`,
          [
            user.name,
            user.phone,
            user.role,
            user.memberTier,
            user.points,
            user.totalSpent,
            user.status,
            id
          ]
        );
      } catch (err) {
        console.error("Lỗi updateUser MySQL:", err.message);
      }
    }

    const idx = this.mock.users.findIndex(u => u.id === id);
    if (idx !== -1) this.mock.users[idx] = user;
    return user;
  }

  async updateUserRole(id, newRole) {
    return this.updateUser(id, { role: newRole.toUpperCase() });
  }

  async deleteUser(id) {
    let deleted = false;
    if (this.isUsingMySql()) {
      try {
        const res = await db.execute("DELETE FROM users WHERE id = ?", [id]);
        deleted = res.affectedRows > 0;
      } catch (err) {
        console.error("Lỗi deleteUser MySQL:", err.message);
      }
    }

    const idx = this.mock.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.mock.users.splice(idx, 1);
      deleted = true;
    }
    return deleted;
  }

  // ==================== BOOKINGS (ĐƠN ĐẶT VÉ) ==================== //

  async getBookings() {
    if (this.isUsingMySql()) {
      try {
        const rows = await db.query("SELECT * FROM bookings ORDER BY booked_at DESC");
        return rows.map(r => ({
          bookingCode: r.booking_code,
          qrToken: r.qr_token,
          userId: r.user_id,
          movieId: r.movie_id,
          showtimeId: r.showtime_id,
          seats: typeof r.seats === "string" ? JSON.parse(r.seats) : (r.seats || []),
          comboIds: typeof r.combo_ids === "string" ? JSON.parse(r.combo_ids) : (r.combo_ids || []),
          ticketTotal: r.ticket_total,
          comboTotal: r.combo_total,
          total: r.total,
          status: r.status,
          bookedAt: r.booked_at ? new Date(r.booked_at).toISOString() : null,
          checkedInAt: r.checked_in_at ? new Date(r.checked_in_at).toISOString() : null,
          checkedInBy: r.checked_in_by
        }));
      } catch (err) {
        console.error("Lỗi getBookings MySQL:", err.message);
      }
    }
    return this.mock.bookings;
  }

  async findBookingByCode(code) {
    if (!code) return null;
    const clean = String(code).trim().toUpperCase();

    if (this.isUsingMySql()) {
      try {
        const rows = await db.query(
          "SELECT * FROM bookings WHERE UPPER(booking_code) = ? OR UPPER(qr_token) = ? LIMIT 1",
          [clean, clean]
        );
        if (rows.length > 0) {
          const r = rows[0];
          return {
            bookingCode: r.booking_code,
            qrToken: r.qr_token,
            userId: r.user_id,
            movieId: r.movie_id,
            showtimeId: r.showtime_id,
            seats: typeof r.seats === "string" ? JSON.parse(r.seats) : (r.seats || []),
            comboIds: typeof r.combo_ids === "string" ? JSON.parse(r.combo_ids) : (r.combo_ids || []),
            ticketTotal: r.ticket_total,
            comboTotal: r.combo_total,
            total: r.total,
            status: r.status,
            bookedAt: r.booked_at ? new Date(r.booked_at).toISOString() : null,
            checkedInAt: r.checked_in_at ? new Date(r.checked_in_at).toISOString() : null,
            checkedInBy: r.checked_in_by
          };
        }
      } catch (err) {
        console.error("Lỗi findBookingByCode MySQL:", err.message);
      }
    }

    return this.mock.bookings.find(
      b => (b.bookingCode && b.bookingCode.toUpperCase() === clean) ||
           (b.qrToken && b.qrToken.toUpperCase() === clean)
    ) || null;
  }

  async createBooking(bookingData) {
    const booking = {
      bookingCode: bookingData.bookingCode || `CGV-${Math.floor(100000 + Math.random() * 900000)}`,
      qrToken: bookingData.qrToken || `CGV-QR-${Date.now().toString(36).toUpperCase()}`,
      userId: bookingData.userId || "user_guest",
      movieId: bookingData.movieId,
      showtimeId: bookingData.showtimeId,
      seats: bookingData.seats || [],
      comboIds: bookingData.comboIds || [],
      ticketTotal: bookingData.ticketTotal || bookingData.total || 0,
      comboTotal: bookingData.comboTotal || 0,
      total: bookingData.total || 0,
      status: bookingData.status || "PAID",
      bookedAt: new Date().toISOString()
    };

    if (this.isUsingMySql()) {
      try {
        await db.execute(
          `INSERT INTO bookings 
           (booking_code, qr_token, user_id, movie_id, showtime_id, seats, combo_ids, ticket_total, combo_total, total, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            booking.bookingCode,
            booking.qrToken,
            booking.userId,
            booking.movieId,
            booking.showtimeId,
            JSON.stringify(booking.seats),
            JSON.stringify(booking.comboIds),
            booking.ticketTotal,
            booking.comboTotal,
            booking.total,
            booking.status
          ]
        );
      } catch (err) {
        console.error("Lỗi createBooking MySQL:", err.message);
      }
    }

    this.mock.bookings.unshift(booking);
    return booking;
  }

  async updateBookingCheckIn(bookingCode, checkedInBy = "Nhân viên rạp") {
    const nowIso = new Date().toISOString();
    const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');

    if (this.isUsingMySql()) {
      try {
        await db.execute(
          `UPDATE bookings SET status = 'CHECKED_IN', checked_in_at = ?, checked_in_by = ?
           WHERE booking_code = ?`,
          [nowSql, checkedInBy, bookingCode]
        );
      } catch (err) {
        console.error("Lỗi updateBookingCheckIn MySQL:", err.message);
      }
    }

    const b = this.mock.bookings.find(item => item.bookingCode === bookingCode);
    if (b) {
      b.status = "CHECKED_IN";
      b.checkedInAt = nowIso;
      b.checkedInBy = checkedInBy;
    }
    return true;
  }

  async resetBookingCheckIn(bookingCode) {
    if (this.isUsingMySql()) {
      try {
        await db.execute(
          `UPDATE bookings SET status = 'PAID', checked_in_at = NULL, checked_in_by = NULL WHERE booking_code = ?`,
          [bookingCode]
        );
      } catch (err) {
        console.error("Lỗi resetBookingCheckIn MySQL:", err.message);
      }
    }

    const b = this.mock.bookings.find(item => item.bookingCode === bookingCode);
    if (b) {
      b.status = "PAID";
      delete b.checkedInAt;
      delete b.checkedInBy;
    }
    return true;
  }
}

// Export Singleton Instance
module.exports = new DbService();
