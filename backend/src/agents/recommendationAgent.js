/**
 * RecommendationAgent — Động cơ gợi ý phim cá nhân hóa
 * Thuật toán: Hybrid (Content-based + Collaborative Filtering + Popularity Trending)
 * Mô phỏng PhoBERT embedding + NCF (Neural Collaborative Filtering)
 */
const { movies, showtimes } = require("../data/mockData");

// Hồ sơ người dùng mẫu (mô phỏng user history database)
const MOCK_USER_PROFILES = {
  user_001: { genres: ["Khoa học viễn tưởng", "Hành động"], watchedIds: ["mov-01", "mov-03"], avgRating: 8.2 },
  user_002: { genres: ["Tâm lý", "Lãng mạn"], watchedIds: ["mov-02"], avgRating: 7.5 },
  user_003: { genres: ["Kinh dị", "Tâm lý"], watchedIds: ["mov-06"], avgRating: 8.8 },
  user_004: { genres: ["Hành động", "Phiêu lưu"], watchedIds: ["mov-04", "mov-05"], avgRating: 7.0 },
};

// Ma trận tương đồng phim (mô phỏng embedding similarity)
const MOVIE_SIMILARITY_MATRIX = {
  "mov-01": { "mov-03": 0.82, "mov-05": 0.71, "mov-04": 0.65 },  // Dune 2 → Sci-fi, Action
  "mov-02": { "mov-06": 0.68, "mov-03": 0.55, "mov-01": 0.42 },  // Mai → Drama, Vietnamese
  "mov-03": { "mov-01": 0.82, "mov-05": 0.60, "mov-04": 0.58 },  // Oppenheimer → Historical, Drama
  "mov-04": { "mov-05": 0.75, "mov-01": 0.65, "mov-03": 0.58 },  // KFP4 → Animation, Family
  "mov-05": { "mov-04": 0.75, "mov-01": 0.71, "mov-03": 0.60 },  // Godzilla → Action, Monster
  "mov-06": { "mov-02": 0.68, "mov-03": 0.52, "mov-01": 0.40 },  // Exhuma → Horror, Korean
};

class RecommendationAgent {
  /**
   * Xây dựng hồ sơ người dùng từ lịch sử xem
   * @param {string} userId - ID người dùng
   * @param {Array} viewHistory - Lịch sử: [{ movieId, rating, watchedAt }]
   * @returns {Object} User profile với preferred genres và thống kê
   */
  buildUserProfile(userId, viewHistory = []) {
    // Nếu đã có profile mẫu, trả về ngay
    if (MOCK_USER_PROFILES[userId]) {
      return {
        userId,
        source: "stored_profile",
        ...MOCK_USER_PROFILES[userId],
        totalWatched: MOCK_USER_PROFILES[userId].watchedIds.length,
      };
    }

    // Xây dựng profile mới từ viewHistory
    const genreCount = {};
    let ratingSum = 0;
    const watchedIds = [];

    viewHistory.forEach(({ movieId, rating }) => {
      const movie = movies.find(m => m.id === movieId);
      if (movie) {
        watchedIds.push(movieId);
        if (rating) ratingSum += rating;
        movie.genres.forEach(g => { genreCount[g] = (genreCount[g] || 0) + 1; });
      }
    });

    // Sắp xếp thể loại theo tần suất xem
    const sortedGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre);

    return {
      userId,
      source: "computed_from_history",
      genres: sortedGenres.slice(0, 3), // Top 3 thể loại yêu thích
      watchedIds,
      avgRating: viewHistory.length > 0 ? ratingSum / viewHistory.length : 7.5,
      totalWatched: watchedIds.length,
    };
  }

  /**
   * Gợi ý phim theo Collaborative Filtering (dựa trên users tương tự)
   * @param {string} userId - ID người dùng cần gợi ý
   * @param {number} limit - Số phim tối đa trả về
   * @returns {Array} Danh sách phim gợi ý với similarity score
   */
  getCollaborativeRecommendations(userId, limit = 5) {
    const targetProfile = MOCK_USER_PROFILES[userId] || {
      genres: ["Hành động", "Khoa học viễn tưởng"],
      watchedIds: [],
    };

    // Tìm users tương tự (Jaccard similarity trên thể loại)
    const similarUsers = Object.entries(MOCK_USER_PROFILES)
      .filter(([uid]) => uid !== userId)
      .map(([uid, profile]) => {
        const sharedGenres = profile.genres.filter(g => targetProfile.genres.includes(g));
        const jaccardSim = sharedGenres.length /
          (new Set([...profile.genres, ...targetProfile.genres]).size);
        return { uid, profile, similarity: jaccardSim };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 2); // Top 2 users tương tự nhất

    // Thu thập phim mà users tương tự đã xem nhưng target chưa xem
    const candidateMovieIds = new Set();
    similarUsers.forEach(({ profile }) => {
      profile.watchedIds.forEach(id => {
        if (!targetProfile.watchedIds.includes(id)) candidateMovieIds.add(id);
      });
    });

    // Nếu không tìm được phim mới → fallback sang trending
    if (candidateMovieIds.size === 0) {
      return this._getTrendingMovies(limit, targetProfile.watchedIds);
    }

    return movies
      .filter(m => candidateMovieIds.has(m.id))
      .map(m => ({
        ...m,
        aiScore: Math.min(0.99, (m.trendingScore / 100) * 0.6 + (m.imdbRating / 10) * 0.4),
        matchPercentage: Math.round(Math.min(99, (m.trendingScore / 100) * 60 + (m.imdbRating / 10) * 40)),
        recommendationReason: "Được yêu thích bởi những khán giả có gu tương tự bạn",
        algorithm: "collaborative_filtering",
      }))
      .slice(0, limit);
  }

  /**
   * Tìm phim tương tự dựa trên ma trận embedding similarity
   * @param {string} movieId - ID phim gốc
   * @param {number} limit - Số phim tối đa
   * @returns {Array} Danh sách phim tương tự với similarity score
   */
  getSimilarMovies(movieId, limit = 4) {
    const similarityRow = MOVIE_SIMILARITY_MATRIX[movieId] || {};
    const sourceMovie = movies.find(m => m.id === movieId);

    if (!sourceMovie) return [];

    return Object.entries(similarityRow)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, similarity]) => {
        const movie = movies.find(m => m.id === id);
        if (!movie) return null;
        return {
          ...movie,
          aiScore: similarity,
          matchPercentage: Math.round(similarity * 100),
          recommendationReason: `Tương tự với "${sourceMovie.title}" — ${Math.round(similarity * 100)}% trùng khớp nội dung`,
          algorithm: "content_similarity",
        };
      })
      .filter(Boolean);
  }

  /**
   * Gợi ý phim cá nhân hóa đầy đủ (Hybrid: Content + Collaborative + Popularity)
   * @param {string} userId - ID người dùng
   * @param {Object} userPreferences - Thể loại yêu thích: { genres: [...] }
   * @param {number} limit - Số phim tối đa
   * @returns {Array} Danh sách phim gợi ý đã sắp xếp theo điểm AI
   */
  getPersonalizedRecommendations(userId = "user_guest", userPreferences = {}, limit = 6) {
    const profile = MOCK_USER_PROFILES[userId];
    const preferredGenres = userPreferences.genres
      || profile?.genres
      || ["Khoa học viễn tưởng", "Hành động", "Tâm lý"];

    const scoredMovies = movies.map(movie => {
      // Weight 1: Content-based (50%) — độ trùng thể loại
      const matchedGenres = movie.genres.filter(g => preferredGenres.includes(g));
      const contentScore = (matchedGenres.length / Math.max(1, movie.genres.length)) * 0.50;

      // Weight 2: Popularity/Trend (30%) — xu hướng phòng vé
      const trendScore = (movie.trendingScore / 100) * 0.30;

      // Weight 3: Quality (20%) — điểm IMDb
      const qualityScore = (movie.imdbRating / 10) * 0.20;

      const totalScore = Math.min(0.99, Number((contentScore + trendScore + qualityScore).toFixed(3)));

      // Sinh lý do gợi ý tự nhiên
      let reason;
      if (matchedGenres.length > 0) {
        reason = `Phù hợp với gu phim ${matchedGenres.slice(0, 2).join(" & ")} của bạn`;
      } else if (movie.isHot) {
        reason = "Đang gây sốt phòng vé — Đừng bỏ lỡ!";
      } else if (movie.imdbRating >= 8.0) {
        reason = `Kiệt tác điện ảnh — IMDb ${movie.imdbRating}/10`;
      } else {
        reason = "Phim có điểm đánh giá xuất sắc từ cộng đồng khán giả";
      }

      return {
        ...movie,
        aiScore: totalScore,
        matchPercentage: Math.round(totalScore * 100),
        recommendationReason: reason,
        algorithm: "hybrid_ncf_phobert",
      };
    });

    scoredMovies.sort((a, b) => b.aiScore - a.aiScore);
    return scoredMovies.slice(0, limit);
  }

  // ==================== PRIVATE HELPERS ==================== //

  /** Lấy phim trending (fallback khi không có đủ collaborative data) */
  _getTrendingMovies(limit, excludeIds = []) {
    return movies
      .filter(m => !excludeIds.includes(m.id))
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit)
      .map(m => ({
        ...m,
        aiScore: m.trendingScore / 100,
        matchPercentage: m.trendingScore,
        recommendationReason: "Phim đang được xem nhiều nhất tuần này",
        algorithm: "popularity_trending",
      }));
  }
}

module.exports = new RecommendationAgent();
