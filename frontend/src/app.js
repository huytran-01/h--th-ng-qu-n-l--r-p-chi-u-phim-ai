// Frontend Logic cho Hệ Thống CGV Cultureplex Cinema tích hợp AI
const API_BASE = "http://localhost:5000/api/v1";

// ==================== GLOBAL STATES ==================== //
let allMovies = [];
let allCinemas = [];
let selectedMovie = null;
let selectedShowtime = null;
let selectedSeats = [];
let selectedCombos = {};
let lockTimerInterval = null;
let forecastChart = null;

// Customer Movie Catalog State (Phân Trang Riêng Biệt Cho Khách Hàng)
let custMovieTab = "NOW_SHOWING";
let custMoviePage = 1;
const custMovieLimit = 6;
let custMovieSearch = "";
let custMovieGenre = "ALL";
let custMovieSearchTimeout = null;

// Customer Bookings Pagination State
let custBookingPage = 1;
const custBookingLimit = 4;

// Authentication State & CGV Membership
let authToken = localStorage.getItem("aiCinemaToken") || null;
let currentUser = null;
try {
  currentUser = JSON.parse(localStorage.getItem("aiCinemaUser") || "null");
} catch (e) {
  currentUser = null;
}

// Admin Workspace State (Phân Trang Riêng Biệt Cho Admin)
let currentAdminTab = "movies";

let moviePage = 1;
const movieLimit = 5;
let movieSearch = "";
let movieStatusFilter = "ALL";
let movieSearchTimeout = null;

let showtimePage = 1;
const showtimeLimit = 5;
let showtimeSearch = "";
let showtimeRoom = "ALL";
let showtimeSearchTimeout = null;

let userPage = 1;
const userLimit = 5;
let userSearch = "";
let userRole = "ALL";
let userSearchTimeout = null;

let deleteConfirmCallback = null;

// ==================== INITIALIZATION ==================== //
document.addEventListener("DOMContentLoaded", async () => {
  // Khởi tạo trạng thái đăng nhập
  if (authToken && !currentUser) {
    await fetchCurrentUser();
  } else if (!authToken && !currentUser) {
    // Mặc định đăng nhập tài khoản khách hàng VIP để trải nghiệm ngay
    await quickLogin("customer@aicinema.vn", "123456", false);
  } else {
    updateAuthUI();
  }

  // Tải dữ liệu ban đầu
  await Promise.all([
    fetchCustomerMovies(),
    fetchCinemas(),
    fetchAIRecommendations(),
    fetchCombos()
  ]);

  initQuickBookingBar();
});

// ==================== AUTHENTICATION & CGV MEMBERSHIP LOGIC ==================== //

function getAuthHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  if (currentUser && currentUser.role) {
    headers["x-demo-role"] = currentUser.role;
  }
  return headers;
}

async function apiFetch(path, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) }
  });
}

async function fetchCurrentUser() {
  if (!authToken) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { "Authorization": `Bearer ${authToken}` }
    });
    const json = await res.json();
    if (json.status === "SUCCESS") {
      currentUser = json.data;
      localStorage.setItem("aiCinemaUser", JSON.stringify(currentUser));
      updateAuthUI();
      return currentUser;
    } else {
      handleLogout(false);
    }
  } catch (err) {
    console.error("Lỗi xác thực người dùng:", err);
  }
  return null;
}

function updateAuthUI() {
  const unloggedSec = document.getElementById("auth-unlogged-section");
  const loggedSec = document.getElementById("auth-logged-section");
  const navAdminBadge = document.getElementById("nav-admin-badge");
  const dropdownAdminLink = document.getElementById("dropdown-admin-link");

  if (!currentUser) {
    if (unloggedSec) unloggedSec.classList.remove("hidden");
    if (loggedSec) loggedSec.classList.add("hidden");
    if (navAdminBadge) navAdminBadge.textContent = "Khóa";
    if (dropdownAdminLink) dropdownAdminLink.classList.add("hidden");
    return;
  }

  if (unloggedSec) unloggedSec.classList.add("hidden");
  if (loggedSec) loggedSec.classList.remove("hidden");

  const nameEl = document.getElementById("header-user-name");
  const roleEl = document.getElementById("header-user-role");
  const dropdownEmail = document.getElementById("dropdown-user-email");
  const dropdownRoleBadge = document.getElementById("dropdown-user-role-badge");
  const dropdownPoints = document.getElementById("dropdown-user-points");

  if (nameEl) nameEl.textContent = currentUser.name;
  if (dropdownEmail) dropdownEmail.textContent = currentUser.email;

  const tier = currentUser.memberTier || "MEMBER";
  const points = (currentUser.points || 0).toLocaleString("vi-VN");

  if (dropdownPoints) dropdownPoints.textContent = `${points} điểm`;

  const roleConfigs = {
    CUSTOMER: {
      label: `CGV ${tier} (${points} P)`,
      badgeClass: tier === "VVIP" ? "bg-purple-950 text-purple-300 border-purple-800" : tier === "VIP" ? "bg-yellow-950 text-cgv-gold border-yellow-800" : "bg-red-950 text-red-300 border-red-800",
      icon: "fa-crown",
      canAdmin: false
    },
    STAFF: { label: "Nhân viên quầy POS", badgeClass: "bg-green-950 text-green-400 border-green-800", icon: "fa-cash-register", canAdmin: true },
    MANAGER: { label: "Quản lý rạp CGV", badgeClass: "bg-blue-950 text-blue-400 border-blue-800", icon: "fa-user-tie", canAdmin: true },
    ADMIN: { label: "Quản trị viên toàn quyền", badgeClass: "bg-red-950 text-red-400 border-red-800", icon: "fa-shield", canAdmin: true }
  };

  const config = roleConfigs[currentUser.role] || roleConfigs.CUSTOMER;
  if (roleEl) roleEl.innerHTML = `<i class="fa-solid ${config.icon} mr-1"></i>${config.label}`;
  if (dropdownRoleBadge) {
    dropdownRoleBadge.textContent = currentUser.role === "CUSTOMER" ? `CGV ${tier}` : currentUser.role;
    dropdownRoleBadge.className = `px-2 py-0.5 rounded text-[10px] font-bold border ${config.badgeClass}`;
  }

  if (config.canAdmin) {
    if (navAdminBadge) {
      navAdminBadge.textContent = currentUser.role;
      navAdminBadge.className = "ml-1.5 px-1.5 py-0.5 rounded text-[9px] bg-red-950 text-red-400 border border-red-800 font-bold";
    }
    if (dropdownAdminLink) dropdownAdminLink.classList.remove("hidden");
  } else {
    if (navAdminBadge) {
      navAdminBadge.textContent = "Yêu cầu quyền";
      navAdminBadge.className = "ml-1.5 px-1.5 py-0.5 rounded text-[9px] bg-gray-800 text-gray-400 border border-gray-700 font-bold";
    }
    if (dropdownAdminLink) dropdownAdminLink.classList.add("hidden");
  }

  const adminTag = document.getElementById("admin-current-user-tag");
  if (adminTag) {
    adminTag.innerHTML = `<i class="fa-solid fa-user-shield text-cgv-red mr-1.5"></i>${currentUser.name} (${currentUser.role})`;
  }
}

function openAuthModal(tab = "login") {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.classList.remove("hidden");
  switchAuthTab(tab);
}

function closeAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.classList.add("hidden");
}

function switchAuthTab(tab) {
  const tabLogin = document.getElementById("auth-tab-login");
  const tabReg = document.getElementById("auth-tab-register");
  const formLogin = document.getElementById("login-form");
  const formReg = document.getElementById("register-form");
  const title = document.getElementById("auth-modal-title");

  if (tab === "login") {
    tabLogin.className = "flex-1 py-2 text-xs font-bold rounded-lg bg-cgv-red text-white transition";
    tabReg.className = "flex-1 py-2 text-xs font-bold rounded-lg text-gray-400 hover:text-white transition";
    formLogin.classList.remove("hidden");
    formReg.classList.add("hidden");
    if (title) title.textContent = "Đăng Nhập Khách Hàng CGV";
  } else {
    tabReg.className = "flex-1 py-2 text-xs font-bold rounded-lg bg-cgv-gold text-black font-bold transition";
    tabLogin.className = "flex-1 py-2 text-xs font-bold rounded-lg text-gray-400 hover:text-white transition";
    formReg.classList.remove("hidden");
    formLogin.classList.add("hidden");
    if (title) title.textContent = "Đăng Ký Thành Viên CGV Membership";
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    if (json.status === "SUCCESS") {
      authToken = json.token;
      currentUser = json.user;
      localStorage.setItem("aiCinemaToken", authToken);
      localStorage.setItem("aiCinemaUser", JSON.stringify(currentUser));
      closeAuthModal();
      updateAuthUI();
      showToast(json.message || "Đăng nhập thành công!", "success");
      if (["ADMIN", "MANAGER"].includes(currentUser.role)) {
        showToast(`Chào mừng Quản trị viên ${currentUser.name}. Bạn có thể vào tab Quản Trị Admin.`, "info");
      }
    } else {
      showToast(json.message || "Đăng nhập thất bại!", "error");
    }
  } catch (err) {
    showToast("Không thể kết nối máy chủ.", "error");
  }
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  const name = document.getElementById("reg-name").value;
  const email = document.getElementById("reg-email").value;
  const phone = document.getElementById("reg-phone").value;
  const password = document.getElementById("reg-password").value;

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password })
    });
    const json = await res.json();
    if (json.status === "SUCCESS") {
      authToken = json.token;
      currentUser = json.user;
      localStorage.setItem("aiCinemaToken", authToken);
      localStorage.setItem("aiCinemaUser", JSON.stringify(currentUser));
      closeAuthModal();
      updateAuthUI();
      showToast(json.message || "Đăng ký thẻ thành viên CGV thành công!", "success");
      switchView("account"); // Chuyển ngay đến thẻ thành viên ảo để khách hàng chiêm ngưỡng
    } else {
      showToast(json.message || "Đăng ký thất bại!", "error");
    }
  } catch (err) {
    showToast("Không thể kết nối máy chủ.", "error");
  }
}

async function quickLogin(email, password, notify = true) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    if (json.status === "SUCCESS") {
      authToken = json.token;
      currentUser = json.user;
      localStorage.setItem("aiCinemaToken", authToken);
      localStorage.setItem("aiCinemaUser", JSON.stringify(currentUser));
      closeAuthModal();
      updateAuthUI();
      if (notify) showToast(`Đã chuyển sang tài khoản: ${currentUser.name} (${currentUser.role})`, "success");
    }
  } catch (err) {
    console.error("Lỗi Quick Login:", err);
  }
}

async function handleLogout(notify = true) {
  try {
    if (authToken) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${authToken}` }
      });
    }
  } catch (e) {}

  authToken = null;
  currentUser = null;
  localStorage.removeItem("aiCinemaToken");
  localStorage.removeItem("aiCinemaUser");
  closeUserDropdown();
  updateAuthUI();
  switchView("home");
  if (notify) showToast("Đã đăng xuất tài khoản an toàn.", "info");
}

function toggleUserDropdown() {
  const menu = document.getElementById("user-dropdown-menu");
  if (menu) menu.classList.toggle("hidden");
}

function closeUserDropdown() {
  const menu = document.getElementById("user-dropdown-menu");
  if (menu) menu.classList.add("hidden");
}

document.addEventListener("click", (e) => {
  const loggedSec = document.getElementById("auth-logged-section");
  const menu = document.getElementById("user-dropdown-menu");
  if (loggedSec && !loggedSec.contains(e.target) && menu && !menu.classList.contains("hidden")) {
    menu.classList.add("hidden");
  }
});

function handleAdminNavClick() {
  if (!currentUser) {
    showToast("Vui lòng đăng nhập với tài khoản Quản trị viên (Admin) để truy cập!", "warning");
    openAuthModal("login");
    return;
  }

  if (["ADMIN", "MANAGER"].includes(currentUser.role)) {
    switchView("admin");
  } else {
    showToast(`Tài khoản ${currentUser.name} là Khách hàng, không có quyền truy cập khu vực Quản trị Admin! Vui lòng đăng nhập bằng tài khoản Quản trị viên.`, "error");
    openAuthModal("login");
  }
}

// ==================== VIEW ROUTING ==================== //

function switchView(viewName) {
  const homeView = document.getElementById("home-view");
  const adminView = document.getElementById("admin-view");
  const aiLabView = document.getElementById("ai-lab-view");
  const accountView = document.getElementById("account-view");

  if (viewName === "admin") {
    if (!currentUser || !["ADMIN", "MANAGER"].includes(currentUser.role)) {
      handleAdminNavClick();
      return;
    }
    homeView.classList.add("hidden");
    aiLabView.classList.add("hidden");
    accountView.classList.add("hidden");
    adminView.classList.remove("hidden");
    updateAdminCapabilities();
    loadAdminDashboard();
    switchAdminTab("movies");
  } else if (viewName === "ai-lab") {
    homeView.classList.add("hidden");
    adminView.classList.add("hidden");
    accountView.classList.add("hidden");
    aiLabView.classList.remove("hidden");
    loadRecommendationLab();
  } else if (viewName === "account") {
    homeView.classList.add("hidden");
    adminView.classList.add("hidden");
    aiLabView.classList.add("hidden");
    accountView.classList.remove("hidden");
    loadAccountView();
  } else {
    adminView.classList.add("hidden");
    aiLabView.classList.add("hidden");
    accountView.classList.add("hidden");
    homeView.classList.remove("hidden");
  }
}

function updateAdminCapabilities() {
  const canManageUsers = currentUser && currentUser.role === "ADMIN";
  const usersTab = document.getElementById("btn-admin-tab-users");
  const usersPane = document.getElementById("admin-tab-users");

  if (usersTab) usersTab.classList.toggle("hidden", !canManageUsers);
  if (usersPane && !canManageUsers && currentAdminTab === "users") {
    switchAdminTab("movies");
  }
}

// ==================== CGV QUICK BOOKING BAR LOGIC ==================== //

async function fetchCinemas() {
  try {
    const res = await fetch(`${API_BASE}/cinemas`);
    const json = await res.json();
    if (json.status === "SUCCESS") {
      allCinemas = json.data;
    }
  } catch (err) {
    console.error("Lỗi lấy cụm rạp:", err);
  }
}

function initQuickBookingBar() {
  const movieSelect = document.getElementById("qb-movie");
  const cinemaSelect = document.getElementById("qb-cinema");

  if (movieSelect) {
    movieSelect.innerHTML = `<option value="">-- Chọn Phim Đang Chiếu --</option>` +
      allMovies.filter(m => m.status === "NOW_SHOWING").map(m => `<option value="${m.id}">${m.title}</option>`).join("");
  }

  if (cinemaSelect) {
    cinemaSelect.innerHTML = `<option value="">-- Chọn Cụm Rạp CGV --</option>` +
      allCinemas.map(c => `<option value="${c.id}">${c.name} (${c.region})</option>`).join("");
  }
}

async function handleQuickBookingMovieChange(movieId) {
  updateQuickBookingShowtimes();
}

async function handleQuickBookingCinemaChange(cinemaId) {
  updateQuickBookingShowtimes();
}

async function handleQuickBookingDateChange(dateValue) {
  updateQuickBookingShowtimes();
}

async function updateQuickBookingShowtimes() {
  const movieId = document.getElementById("qb-movie").value;
  const cinemaId = document.getElementById("qb-cinema").value;
  const showtimeSelect = document.getElementById("qb-showtime");

  if (!showtimeSelect) return;

  if (!movieId) {
    showtimeSelect.innerHTML = `<option value="">-- Vui lòng chọn phim trước --</option>`;
    return;
  }

  try {
    let url = `${API_BASE}/showtimes?movieId=${movieId}`;
    if (cinemaId) url += `&cinemaId=${cinemaId}`;

    const res = await fetch(url);
    const json = await res.json();

    if (json.status === "SUCCESS" && json.data.length > 0) {
      showtimeSelect.innerHTML = json.data.map(st => `
        <option value="${st.id}">
          ${st.startTime.slice(-5)} • ${st.room ? st.room.name : 'Phòng'} • ${st.price.toLocaleString('vi-VN')}đ
        </option>
      `).join("");
    } else {
      showtimeSelect.innerHTML = `<option value="">Chưa có suất chiếu phù hợp</option>`;
    }
  } catch (e) {
    showtimeSelect.innerHTML = `<option value="">Lỗi lấy suất chiếu</option>`;
  }
}

function executeQuickBooking() {
  const movieId = document.getElementById("qb-movie").value;
  const showtimeId = document.getElementById("qb-showtime").value;

  if (!movieId) {
    showToast("Vui lòng chọn bộ phim bạn muốn xem trên thanh Đặt vé nhanh!", "warning");
    return;
  }

  openBookingModal(movieId);
  if (showtimeId) {
    setTimeout(() => selectShowtime(showtimeId), 200);
  }
}

// ==================== PHÂN TRANG & TÌM KIẾM DÀNH CHO KHÁCH HÀNG ==================== //

async function fetchCustomerMovies() {
  const grid = document.getElementById("customer-movies-grid");
  if (grid) grid.innerHTML = `<div class="col-span-full py-12 text-center text-gray-400"><i class="fa-solid fa-spinner animate-spin mr-2 text-cgv-red"></i>Đang tải danh sách phim CGV...</div>`;

  try {
    const query = new URLSearchParams({
      status: custMovieTab,
      search: custMovieSearch,
      genre: custMovieGenre,
      page: custMoviePage,
      limit: custMovieLimit
    });

    const res = await fetch(`${API_BASE}/movies?${query.toString()}`);
    const json = await res.json();

    if (json.status === "SUCCESS") {
      allMovies = json.data; // Lưu cache
      renderCustomerMoviesGrid(json.data, json.pagination);
    }
  } catch (err) {
    if (grid) grid.innerHTML = `<div class="col-span-full py-8 text-center text-red-400">Không thể tải danh sách phim.</div>`;
  }
}

function renderCustomerMoviesGrid(moviesList, pagination) {
  const grid = document.getElementById("customer-movies-grid");
  const infoEl = document.getElementById("customer-movies-pagination-info");
  const controlsEl = document.getElementById("customer-movies-pagination-controls");

  if (!grid) return;
  grid.innerHTML = "";

  if (!moviesList || moviesList.length === 0) {
    grid.innerHTML = `<div class="col-span-full py-12 text-center text-gray-400">Không tìm thấy bộ phim nào phù hợp với điều kiện tìm kiếm.</div>`;
    if (infoEl) infoEl.textContent = "0 phim";
    if (controlsEl) controlsEl.innerHTML = "";
    return;
  }

  moviesList.forEach(m => {
    const card = document.createElement("div");
    card.className = "group relative rounded-2xl overflow-hidden bg-cgv-card border border-gray-800 hover:border-cgv-red transition duration-300 cursor-pointer flex flex-col shadow-xl";

    const formatBadges = (m.formats || ["2D"]).map(f => `<span class="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur text-[9px] font-black text-cyan-300 border border-cyan-800/60 mr-1">${f}</span>`).join("");

    card.innerHTML = `
      <div class="relative aspect-[2/3] overflow-hidden">
        <img src="${m.posterUrl}" alt="${m.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
        
        <!-- Age Rating -->
        <span class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-red-950/90 text-[10px] font-black text-red-400 border border-red-800 shadow">
          ${m.ageRating}
        </span>
        
        <!-- IMDb Rating -->
        <span class="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur text-[10px] font-bold text-yellow-400 border border-yellow-500/30">
          <i class="fa-solid fa-star text-[9px] mr-1"></i>${m.imdbRating}
        </span>

        <!-- Hot Tag -->
        ${m.isHot ? `<span class="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-cgv-red text-[10px] font-black text-white shadow cgv-glow"><i class="fa-solid fa-fire mr-1"></i>HOT</span>` : ""}
      </div>

      <div class="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <div class="mb-1.5 flex flex-wrap gap-y-1">
            ${formatBadges}
          </div>
          <h3 class="font-bold text-sm text-white line-clamp-1 group-hover:text-cgv-red transition">${m.title}</h3>
          <span class="text-[11px] text-gray-400 block mt-0.5">${m.genres.slice(0, 2).join(", ")} • ${m.durationMinutes}p</span>
        </div>

        <div class="mt-3.5 flex items-center space-x-2">
          ${m.status === "NOW_SHOWING" ? `
            <button onclick="openBookingModal('${m.id}')" class="flex-1 py-2 rounded-xl bg-cgv-red hover:bg-red-700 text-white text-xs font-black transition flex items-center justify-center space-x-1 cgv-glow">
              <i class="fa-solid fa-ticket text-xs"></i>
              <span>MUA VÉ</span>
            </button>
          ` : `
            <button onclick="showToast('Phim dự kiến khởi chiếu vào ngày ${m.releaseDate}. Hãy theo dõi lịch chiếu sớm nhất!', 'info')" class="flex-1 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-cgv-gold text-xs font-bold border border-cgv-gold/40 transition">
              <i class="fa-solid fa-bell mr-1"></i>SẮP CHIẾU
            </button>
          `}
          <button onclick="openTrailerModal()" class="w-8 h-8 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white flex items-center justify-center text-xs transition" title="Xem Trailer">
            <i class="fa-solid fa-play"></i>
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  // THANH PHÂN TRANG CHO KHÁCH HÀNG
  const { total, page, totalPages } = pagination;
  if (infoEl) infoEl.textContent = `Hiển thị trang ${page} / ${totalPages} (Tổng ${total} phim ${custMovieTab === "NOW_SHOWING" ? "đang chiếu" : "sắp chiếu"})`;
  
  if (controlsEl) {
    controlsEl.innerHTML = `
      <button onclick="goToCustomerMoviePage(${page - 1})" ${page <= 1 ? "disabled" : ""} class="px-3 py-1.5 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition">
        <i class="fa-solid fa-chevron-left mr-1"></i>Trước
      </button>
      ${Array.from({ length: totalPages }, (_, i) => i + 1).map(p => `
        <button onclick="goToCustomerMoviePage(${p})" class="w-8 h-8 rounded-xl text-xs font-black transition ${p === page ? 'bg-cgv-red text-white cgv-glow' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}">
          ${p}
        </button>
      `).join("")}
      <button onclick="goToCustomerMoviePage(${page + 1})" ${page >= totalPages ? "disabled" : ""} class="px-3 py-1.5 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition">
        Sau<i class="fa-solid fa-chevron-right ml-1"></i>
      </button>
    `;
  }
}

function switchCustomerMovieTab(status) {
  custMovieTab = status;
  custMoviePage = 1;

  const btnNow = document.getElementById("btn-cust-now-showing");
  const btnSoon = document.getElementById("btn-cust-coming-soon");

  if (status === "NOW_SHOWING") {
    btnNow.className = "text-2xl sm:text-3xl font-black text-white border-b-4 border-cgv-red pb-2 transition";
    btnSoon.className = "text-2xl sm:text-3xl font-black text-gray-500 hover:text-gray-300 border-b-4 border-transparent pb-2 transition";
  } else {
    btnSoon.className = "text-2xl sm:text-3xl font-black text-white border-b-4 border-cgv-red pb-2 transition";
    btnNow.className = "text-2xl sm:text-3xl font-black text-gray-500 hover:text-gray-300 border-b-4 border-transparent pb-2 transition";
  }

  fetchCustomerMovies();
}

function handleCustomerMovieSearch(value) {
  clearTimeout(custMovieSearchTimeout);
  custMovieSearchTimeout = setTimeout(() => {
    custMovieSearch = value.trim();
    custMoviePage = 1;
    fetchCustomerMovies();
  }, 350);
}

function handleCustomerMovieGenreFilter(value) {
  custMovieGenre = value;
  custMoviePage = 1;
  fetchCustomerMovies();
}

function goToCustomerMoviePage(page) {
  custMoviePage = page;
  fetchCustomerMovies();
  const el = document.getElementById("movies-section");
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

function scrollToCustomerMovies(tab) {
  switchView('home');
  switchCustomerMovieTab(tab);
  const el = document.getElementById("movies-section");
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

// ==================== AI RECOMMENDATIONS ==================== //

async function fetchAIRecommendations() {
  try {
    const userId = currentUser ? currentUser.id : "user_guest";
    const res = await fetch(`${API_BASE}/ai/recommendations?userId=${userId}`);
    const json = await res.json();
    if (json.status === "SUCCESS") {
      renderAIRecGrid(json.data.slice(0, 3));
    }
  } catch (err) {
    console.error("Lỗi tải gợi ý AI:", err);
  }
}

function renderAIRecGrid(movies) {
  const container = document.getElementById("ai-recommendations-grid");
  if (!container) return;
  container.innerHTML = "";

  movies.forEach(m => {
    const card = document.createElement("div");
    card.className = "p-4 rounded-2xl bg-cgv-card border border-gray-800 hover:border-red-500/60 transition shadow-xl relative overflow-hidden flex flex-col justify-between";
    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex items-center space-x-3">
            <img src="${m.posterUrl}" alt="${m.title}" class="w-16 h-24 rounded-xl object-cover shadow-md">
            <div>
              <span class="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-950 text-red-300 border border-red-800">
                <i class="fa-solid fa-wand-magic-sparkles mr-1"></i>${m.matchPercentage || 95}% Phù Hợp
              </span>
              <h3 class="font-bold text-sm text-white mt-1 line-clamp-1">${m.title}</h3>
              <span class="text-[11px] text-gray-400">${m.genres.slice(0, 2).join(", ")} • <i class="fa-solid fa-star text-yellow-400 text-[10px]"></i> ${m.imdbRating}</span>
            </div>
          </div>
        </div>
        <p class="text-xs text-gray-300 leading-relaxed line-clamp-2 mb-3">${m.description}</p>
        <div class="p-2.5 rounded-xl bg-gray-900/80 border border-red-900/30 text-[11px] text-red-300 flex items-start space-x-2">
          <i class="fa-solid fa-lightbulb text-yellow-400 mt-0.5 flex-shrink-0"></i>
          <span>${m.recommendationReason || "Được AI đề xuất dựa trên sở thích thể loại của bạn."}</span>
        </div>
      </div>
      <div class="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
        <button onclick="openRecommendationLab('${m.id}')" class="text-xs text-gray-400 hover:text-red-300 transition">
          <i class="fa-solid fa-circle-info mr-1"></i>Vì sao gợi ý?
        </button>
        <button onclick="openBookingModal('${m.id}')" class="px-4 py-1.5 rounded-xl bg-cgv-red hover:bg-red-700 text-white text-xs font-bold transition">
          Mua vé ngay
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

// ==================== CGV VIRTUAL MEMBERSHIP CARD & ACCOUNT ==================== //

async function loadAccountView() {
  if (!currentUser) {
    showToast("Vui lòng đăng nhập để xem thông tin Thẻ Thành Viên CGV!", "info");
    openAuthModal("login");
    return;
  }

  const userId = currentUser.id;
  const [profileResponse, bookingsResponse] = await Promise.all([
    fetch(`${API_BASE}/users/${userId}/profile`, { headers: getAuthHeaders() }),
    fetch(`${API_BASE}/users/${userId}/bookings?page=${custBookingPage}&limit=${custBookingLimit}`, { headers: getAuthHeaders() })
  ]);
  const profile = await profileResponse.json();
  const bookingJson = await bookingsResponse.json();

  if (profile.status === "SUCCESS") {
    const u = profile.data;
    // Cập nhật thẻ CGV điện tử
    const cardTierBadge = document.getElementById("cgv-card-tier-badge");
    const cardNumber = document.getElementById("cgv-card-number");
    const cardName = document.getElementById("cgv-card-name");
    const cardPoints = document.getElementById("cgv-card-points");
    const barcodeContainer = document.getElementById("cgv-card-barcode");

    if (cardTierBadge) cardTierBadge.textContent = `${u.memberTier || 'MEMBER'} MEMBER`;
    if (cardNumber) cardNumber.textContent = u.memberCardNumber || "9999-8888-2401-1250";
    if (cardName) cardName.textContent = u.name;
    if (cardPoints) cardPoints.textContent = `${(u.points || 0).toLocaleString('vi-VN')} P`;

    // Render Barcode SVG giả lập đẹp mắt
    if (barcodeContainer) {
      barcodeContainer.innerHTML = Array.from({ length: 42 }, (_, i) => {
        const isBlack = (i * 7 + 3) % 5 !== 0;
        const width = (i % 3 === 0) ? "3px" : (i % 2 === 0) ? "2px" : "1.5px";
        return `<span style="width: ${width}; height: 100%; background: ${isBlack ? '#111' : 'transparent'}; margin: 0 1px;"></span>`;
      }).join("");
    }

    // Input form
    document.getElementById("account-name").value = u.name;
    document.getElementById("account-phone").value = u.phone || "";
  }

  // Render lịch sử vé có phân trang
  renderCustomerBookings(bookingJson.data, bookingJson.pagination);
}

function renderCustomerBookings(bookingsList, pagination) {
  const container = document.getElementById("account-bookings");
  const infoEl = document.getElementById("cust-bookings-pagination-info");
  const controlsEl = document.getElementById("cust-bookings-pagination-controls");

  if (!container) return;

  if (!bookingsList || bookingsList.length === 0) {
    container.innerHTML = `<p class="text-xs text-gray-400 p-6 bg-gray-900 rounded-2xl border border-gray-800 text-center">Chưa có lịch sử đặt vé nào. Hãy chọn phim và trải nghiệm ngay!</p>`;
    if (infoEl) infoEl.textContent = "0 vé";
    if (controlsEl) controlsEl.innerHTML = "";
    return;
  }

  container.innerHTML = bookingsList.map(b => `
    <div class="p-4 rounded-2xl bg-gray-900/90 border border-gray-800 hover:border-gray-700 transition flex flex-col sm:flex-row gap-3 sm:items-center">
      <img src="${b.movie ? b.movie.posterUrl : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600'}" class="w-14 h-20 rounded-xl object-cover shadow">
      <div class="flex-1">
        <div class="flex items-center justify-between">
          <p class="text-sm font-bold text-white">${b.movie ? b.movie.title : 'Phim CGV'}</p>
          <span class="px-2 py-0.5 rounded-full bg-green-950 text-green-400 border border-green-800 text-[10px] font-bold">${b.status}</span>
        </div>
        <p class="text-xs text-gray-300 mt-1">
          <i class="fa-regular fa-clock mr-1 text-cgv-red"></i>${b.showtime ? b.showtime.startTime : ''} • Ghế: <b class="text-cgv-gold">${b.seats.join(", ")}</b>
        </p>
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-800/80">
          <span class="text-[10px] text-gray-400 font-mono">Mã vé: <b class="text-white">${b.bookingCode}</b></span>
          <span class="text-xs font-black text-cgv-red">${Number(b.total).toLocaleString("vi-VN")} đ</span>
        </div>
      </div>
    </div>
  `).join("");

  if (pagination) {
    const { total, page, totalPages } = pagination;
    if (infoEl) infoEl.textContent = `Trang ${page} / ${totalPages} (Tổng ${total} vé)`;
    if (controlsEl) {
      controlsEl.innerHTML = `
        <button onclick="goToCustomerBookingPage(${page - 1})" ${page <= 1 ? "disabled" : ""} class="px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        ${Array.from({ length: totalPages }, (_, i) => i + 1).map(p => `
          <button onclick="goToCustomerBookingPage(${p})" class="w-7 h-7 rounded-lg text-xs font-bold ${p === page ? 'bg-cgv-red text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}">
            ${p}
          </button>
        `).join("")}
        <button onclick="goToCustomerBookingPage(${page + 1})" ${page >= totalPages ? "disabled" : ""} class="px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      `;
    }
  }
}

function goToCustomerBookingPage(page) {
  custBookingPage = page;
  loadAccountView();
}

async function saveAccountProfile() {
  if (!currentUser) return;
  const name = document.getElementById("account-name").value;
  const phone = document.getElementById("account-phone").value;

  try {
    const res = await apiFetch(`/users/${currentUser.id}/profile`, {
      method: "PUT",
      body: JSON.stringify({ name, phone })
    });
    const json = await res.json();
    if (json.status === "SUCCESS") {
      showToast("Cập nhật thông tin thành viên CGV thành công!", "success");
      currentUser.name = name;
      currentUser.phone = phone;
      localStorage.setItem("aiCinemaUser", JSON.stringify(currentUser));
      updateAuthUI();
      loadAccountView();
    } else {
      showToast(json.message || "Không thể cập nhật hồ sơ", "error");
    }
  } catch (err) {
    showToast("Lỗi kết nối máy chủ.", "error");
  }
}

// ==================== ADMIN WORKSPACE (PHÂN TRANG RIÊNG CHO ADMIN) ==================== //

function switchAdminTab(tabName) {
  if (tabName === "users" && (!currentUser || currentUser.role !== "ADMIN")) {
    showToast("Chỉ ADMIN mới có quyền quản lý người dùng và RBAC.", "warning");
    return;
  }
  currentAdminTab = tabName;
  const tabs = ["movies", "showtimes", "users", "forecast"];
  tabs.forEach(t => {
    const pane = document.getElementById(`admin-tab-${t}`);
    const btn = document.getElementById(`btn-admin-tab-${t}`);
    if (pane) {
      if (t === tabName) pane.classList.remove("hidden");
      else pane.classList.add("hidden");
    }
    if (btn) {
      if (t === tabName) {
        btn.className = "admin-tab px-4 py-2.5 rounded-xl bg-cgv-red text-white text-xs font-bold transition flex items-center shadow";
      } else {
        btn.className = "admin-tab px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-xs font-bold transition flex items-center hover:text-white";
      }
    }
  });

  if (tabName === "movies") fetchAdminMovies();
  if (tabName === "showtimes") fetchAdminShowtimes();
  if (tabName === "users") fetchAdminUsers();
}

async function loadAdminDashboard() {
  try {
    const [forecastRes, reportRes] = await Promise.all([
      apiFetch(`/ai/demand-forecast`),
      apiFetch(`/admin/daily-report`)
    ]);
    const forecast = await forecastRes.json();
    const report = await reportRes.json();
    if (forecast.status === "SUCCESS") {
      renderForecastChart(forecast.data);
      renderAIOptimization(forecast.data);
    }
    if (report.status === "SUCCESS") {
      renderDailyKPIs(report.data);
    }
  } catch (err) {
    console.error("Lỗi tải dashboard admin:", err);
  }
}

// ---------------- 1. QUẢN LÝ PHIM ADMIN ---------------- //

async function fetchAdminMovies() {
  const tbody = document.getElementById("admin-movies-table-body");
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-400"><i class="fa-solid fa-spinner animate-spin mr-2 text-cgv-red"></i>Đang tải danh sách phim...</td></tr>`;

  try {
    const query = new URLSearchParams({
      page: moviePage,
      limit: movieLimit,
      search: movieSearch,
      status: movieStatusFilter
    });

    const res = await apiFetch(`/admin/movies?${query.toString()}`);
    const json = await res.json();

    if (json.status === "SUCCESS") {
      renderAdminMoviesTable(json.data, json.pagination);
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-400">Không thể kết nối máy chủ.</td></tr>`;
  }
}

function renderAdminMoviesTable(moviesList, pagination) {
  const tbody = document.getElementById("admin-movies-table-body");
  const infoEl = document.getElementById("admin-movies-pagination-info");
  const controlsEl = document.getElementById("admin-movies-pagination-controls");

  if (!tbody) return;
  tbody.innerHTML = "";

  if (!moviesList || moviesList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-400">Không tìm thấy phim nào phù hợp.</td></tr>`;
    if (infoEl) infoEl.textContent = "0 phim";
    if (controlsEl) controlsEl.innerHTML = "";
    return;
  }

  moviesList.forEach(m => {
    const tr = document.createElement("tr");
    tr.className = "border-t border-gray-800 hover:bg-gray-800/40 transition";
    tr.innerHTML = `
      <td class="p-4">
        <div class="flex items-center space-x-3">
          <img src="${m.posterUrl}" alt="${m.title}" class="w-10 h-14 rounded-lg object-cover shadow">
          <div>
            <b class="text-white text-xs block">${m.title}</b>
            <span class="text-[10px] text-gray-500 font-mono">${m.id} • ${m.durationMinutes}p</span>
          </div>
        </div>
      </td>
      <td class="p-4 text-gray-300">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${m.status === 'NOW_SHOWING' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-gray-800 text-gray-400 border border-gray-700'}">
          ${m.status === 'NOW_SHOWING' ? 'Đang chiếu' : 'Sắp chiếu'}
        </span>
        <span class="text-[10px] text-gray-400 block mt-1">${m.genres.slice(0, 2).join(", ")}</span>
      </td>
      <td class="p-4 text-gray-300">
        <span class="block text-white font-medium">${m.director || "Đang cập nhật"}</span>
        <span class="text-[10px] text-gray-500 line-clamp-1">${Array.isArray(m.cast) ? m.cast.slice(0, 2).join(", ") : m.cast}</span>
      </td>
      <td class="p-4">
        <span class="px-2 py-1 rounded bg-yellow-950 text-yellow-400 border border-yellow-800/60 font-bold text-xs">
          <i class="fa-solid fa-star text-[10px] mr-1"></i>${m.imdbRating}
        </span>
      </td>
      <td class="p-4">
        <button onclick="toggleMovieHot('${m.id}', ${!m.isHot})" class="px-2.5 py-1 rounded-full text-xs font-bold transition ${m.isHot ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-white'}">
          <i class="fa-solid fa-fire mr-1"></i>${m.isHot ? 'HOT' : 'Thường'}
        </button>
      </td>
      <td class="p-4 text-right space-x-2">
        <button onclick='openMovieModal("edit", ${JSON.stringify(m).replace(/'/g, "&apos;")})' class="px-2.5 py-1.5 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-800/50 hover:bg-blue-900/60 transition" title="Sửa phim">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button onclick="confirmDeleteMovie('${m.id}', '${m.title}')" class="px-2.5 py-1.5 rounded-lg bg-red-950/60 text-red-400 border border-red-800/50 hover:bg-red-900/60 transition" title="Xóa phim">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const { total, page, totalPages } = pagination;
  if (infoEl) infoEl.textContent = `Hiển thị trang ${page} / ${totalPages} (Tổng ${total} phim)`;
  if (controlsEl) {
    controlsEl.innerHTML = `
      <button onclick="goToMoviePage(${page - 1})" ${page <= 1 ? "disabled" : ""} class="px-2.5 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      ${Array.from({ length: totalPages }, (_, i) => i + 1).map(p => `
        <button onclick="goToMoviePage(${p})" class="w-8 h-8 rounded-lg text-xs font-bold transition ${p === page ? 'bg-cgv-red text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}">
          ${p}
        </button>
      `).join("")}
      <button onclick="goToMoviePage(${page + 1})" ${page >= totalPages ? "disabled" : ""} class="px-2.5 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    `;
  }
}

function handleMovieSearch(value) {
  clearTimeout(movieSearchTimeout);
  movieSearchTimeout = setTimeout(() => {
    movieSearch = value.trim();
    moviePage = 1;
    fetchAdminMovies();
  }, 350);
}

function handleMovieStatusFilter(value) {
  movieStatusFilter = value;
  moviePage = 1;
  fetchAdminMovies();
}

function goToMoviePage(page) {
  moviePage = page;
  fetchAdminMovies();
}

function openMovieModal(mode = "create", movieData = null) {
  const modal = document.getElementById("movie-modal");
  const title = document.getElementById("movie-modal-title");
  const form = document.getElementById("movie-form");
  form.reset();

  if (mode === "create") {
    title.textContent = "Thêm Phim Mới";
    document.getElementById("movie-form-id").value = "";
    document.getElementById("movie-duration").value = "120";
    document.getElementById("movie-imdb").value = "8.0";
    document.getElementById("movie-trending").value = "85";
    document.getElementById("movie-age-rating").value = "T16";
    document.getElementById("movie-status").value = "NOW_SHOWING";
  } else if (movieData) {
    title.textContent = `Chỉnh Sửa Phim: ${movieData.title}`;
    document.getElementById("movie-form-id").value = movieData.id;
    document.getElementById("movie-title").value = movieData.title || "";
    document.getElementById("movie-original-title").value = movieData.originalTitle || "";
    document.getElementById("movie-status").value = movieData.status || "NOW_SHOWING";
    document.getElementById("movie-duration").value = movieData.durationMinutes || 120;
    document.getElementById("movie-imdb").value = movieData.imdbRating || 7.5;
    document.getElementById("movie-age-rating").value = movieData.ageRating || "T16";
    document.getElementById("movie-genres").value = Array.isArray(movieData.genres) ? movieData.genres.join(", ") : movieData.genres;
    document.getElementById("movie-formats").value = Array.isArray(movieData.formats) ? movieData.formats.join(", ") : "2D, IMAX";
    document.getElementById("movie-director").value = movieData.director || "";
    document.getElementById("movie-cast").value = Array.isArray(movieData.cast) ? movieData.cast.join(", ") : movieData.cast;
    document.getElementById("movie-poster").value = movieData.posterUrl || "";
    document.getElementById("movie-trending").value = movieData.trendingScore || 80;
    document.getElementById("movie-desc").value = movieData.description || "";
    document.getElementById("movie-is-hot").checked = Boolean(movieData.isHot);
  }

  modal.classList.remove("hidden");
}

function closeMovieModal() {
  document.getElementById("movie-modal").classList.add("hidden");
}

async function handleMovieFormSubmit(event) {
  event.preventDefault();
  const id = document.getElementById("movie-form-id").value;
  const isEdit = Boolean(id);

  const payload = {
    title: document.getElementById("movie-title").value,
    originalTitle: document.getElementById("movie-original-title").value,
    status: document.getElementById("movie-status").value,
    durationMinutes: Number(document.getElementById("movie-duration").value),
    imdbRating: Number(document.getElementById("movie-imdb").value),
    ageRating: document.getElementById("movie-age-rating").value,
    genres: document.getElementById("movie-genres").value.split(",").map(s => s.trim()).filter(Boolean),
    formats: document.getElementById("movie-formats").value.split(",").map(s => s.trim()).filter(Boolean),
    director: document.getElementById("movie-director").value,
    cast: document.getElementById("movie-cast").value.split(",").map(s => s.trim()).filter(Boolean),
    posterUrl: document.getElementById("movie-poster").value,
    trendingScore: Number(document.getElementById("movie-trending").value),
    description: document.getElementById("movie-desc").value,
    isHot: document.getElementById("movie-is-hot").checked
  };

  try {
    const url = isEdit ? `/admin/movies/${id}` : `/admin/movies`;
    const method = isEdit ? "PUT" : "POST";

    const res = await apiFetch(url, {
      method,
      body: JSON.stringify(payload)
    });
    const json = await res.json();

    if (json.status === "SUCCESS") {
      closeMovieModal();
      showToast(json.message || "Đã lưu thông tin phim!", "success");
      fetchAdminMovies();
      fetchCustomerMovies(); // Cập nhật cho trang khách hàng
    } else {
      showToast(json.message || "Lỗi khi lưu phim!", "error");
    }
  } catch (err) {
    showToast("Lỗi kết nối máy chủ.", "error");
  }
}

async function toggleMovieHot(movieId, isHot) {
  try {
    const res = await apiFetch(`/admin/movies/${movieId}`, {
      method: "PATCH",
      body: JSON.stringify({ isHot })
    });
    const json = await res.json();
    if (json.status === "SUCCESS") {
      showToast(isHot ? "Đã bật trạng thái Phim Hot 🔥" : "Đã tắt trạng thái Hot", "success");
      fetchAdminMovies();
      fetchCustomerMovies();
    }
  } catch (e) {
    showToast("Không thể cập nhật trạng thái phim.", "error");
  }
}

function confirmDeleteMovie(id, title) {
  openConfirmDelete(`Bạn có chắc chắn muốn xóa bộ phim "${title}"? Tất cả các suất chiếu liên quan cũng sẽ bị xóa.`, async () => {
    try {
      const res = await apiFetch(`/admin/movies/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.status === "SUCCESS") {
        showToast(json.message || "Đã xóa phim thành công!", "success");
        fetchAdminMovies();
        fetchCustomerMovies();
      } else {
        showToast(json.message || "Không thể xóa phim!", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối máy chủ.", "error");
    }
  });
}

// ---------------- 2. QUẢN LÝ SUẤT CHIẾU ADMIN ---------------- //

async function fetchAdminShowtimes() {
  const tbody = document.getElementById("admin-showtimes-table-body");
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-400"><i class="fa-solid fa-spinner animate-spin mr-2 text-cgv-red"></i>Đang tải danh sách suất chiếu...</td></tr>`;

  try {
    const query = new URLSearchParams({
      page: showtimePage,
      limit: showtimeLimit,
      search: showtimeSearch,
      roomId: showtimeRoom !== "ALL" ? showtimeRoom : ""
    });

    const res = await apiFetch(`/admin/showtimes?${query.toString()}`);
    const json = await res.json();

    if (json.status === "SUCCESS") {
      renderAdminShowtimesTable(json.data, json.pagination);
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-400">Không thể kết nối máy chủ.</td></tr>`;
  }
}

function renderAdminShowtimesTable(showtimesList, pagination) {
  const tbody = document.getElementById("admin-showtimes-table-body");
  const infoEl = document.getElementById("admin-showtimes-pagination-info");
  const controlsEl = document.getElementById("admin-showtimes-pagination-controls");

  if (!tbody) return;
  tbody.innerHTML = "";

  if (!showtimesList || showtimesList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-400">Chưa có suất chiếu nào phù hợp.</td></tr>`;
    if (infoEl) infoEl.textContent = "0 suất chiếu";
    if (controlsEl) controlsEl.innerHTML = "";
    return;
  }

  showtimesList.forEach(st => {
    const tr = document.createElement("tr");
    tr.className = "border-t border-gray-800 hover:bg-gray-800/40 transition";
    tr.innerHTML = `
      <td class="p-4 font-mono font-bold text-cgv-red text-xs">${st.id}</td>
      <td class="p-4">
        <b class="text-white text-xs block">${st.movie ? st.movie.title : st.movieId}</b>
        <span class="text-[10px] text-gray-500">${st.movie ? st.movie.durationMinutes + ' phút' : ''}</span>
      </td>
      <td class="p-4 text-gray-300">
        <span class="text-white font-medium text-xs block">${st.cinema ? st.cinema.name : 'CGV Cinema'}</span>
        <span class="text-[10px] text-gray-400">${st.room ? st.room.name : st.roomId}</span>
      </td>
      <td class="p-4 text-gray-300 text-xs">
        <span class="block text-white font-bold"><i class="fa-regular fa-clock mr-1 text-cgv-red"></i>${st.startTime}</span>
        <span class="text-[10px] text-gray-500">Kết thúc: ${st.endTime}</span>
      </td>
      <td class="p-4">
        <span class="text-cgv-gold font-bold text-xs">${Number(st.price).toLocaleString("vi-VN")} đ</span>
      </td>
      <td class="p-4 text-right space-x-2">
        <button onclick='openShowtimeModal("edit", ${JSON.stringify(st).replace(/'/g, "&apos;")})' class="px-2.5 py-1.5 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-800/50 hover:bg-blue-900/60 transition" title="Sửa suất chiếu">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button onclick="confirmDeleteShowtime('${st.id}')" class="px-2.5 py-1.5 rounded-lg bg-red-950/60 text-red-400 border border-red-800/50 hover:bg-red-900/60 transition" title="Xóa suất chiếu">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const { total, page, totalPages } = pagination;
  if (infoEl) infoEl.textContent = `Hiển thị trang ${page} / ${totalPages} (Tổng ${total} suất chiếu)`;
  if (controlsEl) {
    controlsEl.innerHTML = `
      <button onclick="goToShowtimePage(${page - 1})" ${page <= 1 ? "disabled" : ""} class="px-2.5 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      ${Array.from({ length: totalPages }, (_, i) => i + 1).map(p => `
        <button onclick="goToShowtimePage(${p})" class="w-8 h-8 rounded-lg text-xs font-bold transition ${p === page ? 'bg-cgv-red text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}">
          ${p}
        </button>
      `).join("")}
      <button onclick="goToShowtimePage(${page + 1})" ${page >= totalPages ? "disabled" : ""} class="px-2.5 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    `;
  }
}

function handleShowtimeSearch(value) {
  clearTimeout(showtimeSearchTimeout);
  showtimeSearchTimeout = setTimeout(() => {
    showtimeSearch = value.trim();
    showtimePage = 1;
    fetchAdminShowtimes();
  }, 350);
}

function handleShowtimeRoomFilter(value) {
  showtimeRoom = value;
  showtimePage = 1;
  fetchAdminShowtimes();
}

function goToShowtimePage(page) {
  showtimePage = page;
  fetchAdminShowtimes();
}

function openShowtimeModal(mode = "create", stData = null) {
  const modal = document.getElementById("showtime-modal");
  const title = document.getElementById("showtime-modal-title");
  const movieSelect = document.getElementById("showtime-movie-id");

  movieSelect.innerHTML = allMovies.map(m => `<option value="${m.id}">${m.title} (${m.durationMinutes}p)</option>`).join("");

  if (mode === "create") {
    title.textContent = "Tạo Suất Chiếu Mới";
    document.getElementById("showtime-form-id").value = "";
    document.getElementById("showtime-start").value = "2026-09-23 19:30";
    document.getElementById("showtime-end").value = "2026-09-23 21:45";
    document.getElementById("showtime-price").value = "130000";
  } else if (stData) {
    title.textContent = `Sửa Suất Chiếu: ${stData.id}`;
    document.getElementById("showtime-form-id").value = stData.id;
    document.getElementById("showtime-movie-id").value = stData.movieId;
    document.getElementById("showtime-room-id").value = stData.roomId;
    document.getElementById("showtime-start").value = stData.startTime;
    document.getElementById("showtime-end").value = stData.endTime;
    document.getElementById("showtime-price").value = stData.price;
  }

  modal.classList.remove("hidden");
}

function closeShowtimeModal() {
  document.getElementById("showtime-modal").classList.add("hidden");
}

async function handleShowtimeFormSubmit(event) {
  event.preventDefault();
  const id = document.getElementById("showtime-form-id").value;
  const isEdit = Boolean(id);

  const payload = {
    movieId: document.getElementById("showtime-movie-id").value,
    roomId: document.getElementById("showtime-room-id").value,
    startTime: document.getElementById("showtime-start").value,
    endTime: document.getElementById("showtime-end").value,
    price: Number(document.getElementById("showtime-price").value)
  };

  try {
    const url = isEdit ? `/admin/showtimes/${id}` : `/admin/showtimes`;
    const method = isEdit ? "PUT" : "POST";

    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    const json = await res.json();

    if (json.status === "SUCCESS") {
      closeShowtimeModal();
      showToast(json.message || "Đã lưu suất chiếu!", "success");
      fetchAdminShowtimes();
    } else {
      showToast(json.message || "Lỗi lưu suất chiếu!", "error");
    }
  } catch (err) {
    showToast("Lỗi kết nối máy chủ.", "error");
  }
}

function confirmDeleteShowtime(id) {
  openConfirmDelete(`Bạn có chắc chắn muốn xóa suất chiếu mã "${id}"?`, async () => {
    try {
      const res = await apiFetch(`/admin/showtimes/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.status === "SUCCESS") {
        showToast(json.message || "Đã xóa suất chiếu!", "success");
        fetchAdminShowtimes();
      } else {
        showToast(json.message || "Không thể xóa suất chiếu!", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối máy chủ.", "error");
    }
  });
}

// ---------------- 3. QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN ADMIN ---------------- //

async function fetchAdminUsers() {
  const tbody = document.getElementById("admin-users-table-body");
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-400"><i class="fa-solid fa-spinner animate-spin mr-2 text-cgv-red"></i>Đang tải danh sách người dùng...</td></tr>`;

  try {
    const query = new URLSearchParams({
      page: userPage,
      limit: userLimit,
      search: userSearch,
      role: userRole
    });

    const res = await apiFetch(`/admin/users?${query.toString()}`);
    const json = await res.json();

    if (json.status === "SUCCESS") {
      renderAdminUsersTable(json.data, json.pagination);
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-400">Không thể kết nối máy chủ.</td></tr>`;
  }
}

function renderAdminUsersTable(usersList, pagination) {
  const tbody = document.getElementById("admin-users-table-body");
  const infoEl = document.getElementById("admin-users-pagination-info");
  const controlsEl = document.getElementById("admin-users-pagination-controls");

  if (!tbody) return;
  tbody.innerHTML = "";

  if (!usersList || usersList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-400">Không tìm thấy người dùng nào phù hợp.</td></tr>`;
    if (infoEl) infoEl.textContent = "0 người dùng";
    if (controlsEl) controlsEl.innerHTML = "";
    return;
  }

  usersList.forEach(u => {
    const tr = document.createElement("tr");
    tr.className = "border-t border-gray-800 hover:bg-gray-800/40 transition";
    tr.innerHTML = `
      <td class="p-4">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-cgv-red to-orange-600 text-white font-bold flex items-center justify-center text-xs shadow">
            ${u.name.charAt(0)}
          </div>
          <div>
            <b class="text-white text-xs block">${u.name}</b>
            <span class="text-[10px] text-cgv-gold font-mono">${u.memberCardNumber || u.id}</span>
          </div>
        </div>
      </td>
      <td class="p-4 text-gray-300">
        <span class="block text-white">${u.email}</span>
        <span class="text-[10px] text-gray-500">${u.phone || "Chưa có SĐT"}</span>
      </td>
      <td class="p-4">
        <select onchange="changeUserRole('${u.id}', this.value)" class="bg-gray-900 border border-gray-700 text-xs rounded-lg px-2.5 py-1 text-red-400 font-bold focus:outline-none">
          <option value="CUSTOMER" ${u.role === "CUSTOMER" ? "selected" : ""}>CUSTOMER (Khách hàng)</option>
          <option value="STAFF" ${u.role === "STAFF" ? "selected" : ""}>STAFF (Nhân viên POS)</option>
          <option value="MANAGER" ${u.role === "MANAGER" ? "selected" : ""}>MANAGER (Quản lý)</option>
          <option value="ADMIN" ${u.role === "ADMIN" ? "selected" : ""}>ADMIN (Quản trị viên)</option>
        </select>
      </td>
      <td class="p-4">
        <span class="px-2 py-0.5 rounded bg-yellow-950/60 text-cgv-gold border border-yellow-800/50 text-[11px] font-bold block">
          ${u.memberTier || 'MEMBER'} (${u.points || 0} P)
        </span>
        <span class="text-[10px] text-gray-500 mt-0.5 block">Chi tiêu: ${Number(u.totalSpent || 0).toLocaleString('vi-VN')}đ</span>
      </td>
      <td class="p-4">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${u.status === 'ACTIVE' ? 'bg-green-950 text-green-400 border border-green-800' : 'bg-red-950 text-red-400 border border-red-800'}">
          ${u.status}
        </span>
      </td>
      <td class="p-4 text-right space-x-2">
        <button onclick='openUserModal("edit", ${JSON.stringify(u).replace(/'/g, "&apos;")})' class="px-2.5 py-1.5 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-800/50 hover:bg-blue-900/60 transition" title="Sửa thông tin">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button onclick="confirmDeleteUser('${u.id}', '${u.name}')" ${u.id === 'admin_001' ? 'disabled' : ''} class="px-2.5 py-1.5 rounded-lg bg-red-950/60 text-red-400 border border-red-800/50 hover:bg-red-900/60 transition disabled:opacity-30 disabled:cursor-not-allowed" title="Xóa tài khoản">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const { total, page, totalPages } = pagination;
  if (infoEl) infoEl.textContent = `Hiển thị trang ${page} / ${totalPages} (Tổng ${total} người dùng)`;
  if (controlsEl) {
    controlsEl.innerHTML = `
      <button onclick="goToUserPage(${page - 1})" ${page <= 1 ? "disabled" : ""} class="px-2.5 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
      ${Array.from({ length: totalPages }, (_, i) => i + 1).map(p => `
        <button onclick="goToUserPage(${p})" class="w-8 h-8 rounded-lg text-xs font-bold transition ${p === page ? 'bg-cgv-gold text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}">
          ${p}
        </button>
      `).join("")}
      <button onclick="goToUserPage(${page + 1})" ${page >= totalPages ? "disabled" : ""} class="px-2.5 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    `;
  }
}

function handleUserSearch(value) {
  clearTimeout(userSearchTimeout);
  userSearchTimeout = setTimeout(() => {
    userSearch = value.trim();
    userPage = 1;
    fetchAdminUsers();
  }, 350);
}

function handleUserRoleFilter(value) {
  userRole = value;
  userPage = 1;
  fetchAdminUsers();
}

function goToUserPage(page) {
  userPage = page;
  fetchAdminUsers();
}

function openUserModal(mode = "create", userData = null) {
  const modal = document.getElementById("user-modal");
  const title = document.getElementById("user-modal-title");
  document.getElementById("user-form").reset();

  if (mode === "create") {
    title.textContent = "Thêm Người Dùng Mới";
    document.getElementById("user-form-id").value = "";
    document.getElementById("user-password").required = true;
    document.getElementById("user-role").value = "CUSTOMER";
    document.getElementById("user-tier").value = "MEMBER";
  } else if (userData) {
    title.textContent = `Sửa Tài Khoản: ${userData.name}`;
    document.getElementById("user-form-id").value = userData.id;
    document.getElementById("user-name").value = userData.name || "";
    document.getElementById("user-email").value = userData.email || "";
    document.getElementById("user-phone").value = userData.phone || "";
    document.getElementById("user-role").value = userData.role || "CUSTOMER";
    document.getElementById("user-tier").value = userData.memberTier || "MEMBER";
    document.getElementById("user-password").required = false;
  }

  modal.classList.remove("hidden");
}

function closeUserModal() {
  document.getElementById("user-modal").classList.add("hidden");
}

async function handleUserFormSubmit(event) {
  event.preventDefault();
  const id = document.getElementById("user-form-id").value;
  const isEdit = Boolean(id);

  const payload = {
    name: document.getElementById("user-name").value,
    email: document.getElementById("user-email").value,
    phone: document.getElementById("user-phone").value,
    role: document.getElementById("user-role").value,
    memberTier: document.getElementById("user-tier").value
  };

  const pass = document.getElementById("user-password").value;
  if (pass) payload.password = pass;

  try {
    const url = isEdit ? `/admin/users/${id}` : `/admin/users`;
    const method = isEdit ? "PUT" : "POST";

    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    const json = await res.json();

    if (json.status === "SUCCESS") {
      closeUserModal();
      showToast(json.message || "Đã lưu tài khoản người dùng!", "success");
      fetchAdminUsers();
      if (currentUser && currentUser.id === id) {
        Object.assign(currentUser, json.data);
        localStorage.setItem("aiCinemaUser", JSON.stringify(currentUser));
        updateAuthUI();
      }
    } else {
      showToast(json.message || "Lỗi lưu tài khoản!", "error");
    }
  } catch (e) {
    showToast("Lỗi kết nối máy chủ.", "error");
  }
}

async function changeUserRole(userId, newRole) {
  try {
    const res = await apiFetch(`/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role: newRole })
    });
    const json = await res.json();
    if (json.status === "SUCCESS") {
      showToast(json.message || `Đã đổi quyền thành ${newRole}!`, "success");
      if (currentUser && currentUser.id === userId) {
        currentUser.role = newRole;
        localStorage.setItem("aiCinemaUser", JSON.stringify(currentUser));
        updateAuthUI();
      }
    }
  } catch (e) {
    showToast("Lỗi kết nối máy chủ.", "error");
  }
}

function confirmDeleteUser(id, name) {
  if (id === "admin_001") {
    showToast("Không thể xóa tài khoản Quản trị viên hệ thống!", "warning");
    return;
  }
  openConfirmDelete(`Bạn có chắc chắn muốn xóa tài khoản "${name}" (${id})?`, async () => {
    try {
      const res = await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.status === "SUCCESS") {
        showToast(json.message || "Đã xóa tài khoản!", "success");
        fetchAdminUsers();
      } else {
        showToast(json.message || "Không thể xóa tài khoản!", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối máy chủ.", "error");
    }
  });
}

function openConfirmDelete(message, onConfirm) {
  const modal = document.getElementById("confirm-delete-modal");
  const msgEl = document.getElementById("confirm-delete-message");
  const btn = document.getElementById("btn-confirm-delete-execute");

  if (msgEl) msgEl.textContent = message;
  deleteConfirmCallback = onConfirm;

  if (btn) {
    btn.onclick = () => {
      if (deleteConfirmCallback) deleteConfirmCallback();
      closeConfirmDeleteModal();
    };
  }

  if (modal) modal.classList.remove("hidden");
}

function closeConfirmDeleteModal() {
  const modal = document.getElementById("confirm-delete-modal");
  if (modal) modal.classList.add("hidden");
  deleteConfirmCallback = null;
}

// ==================== BOOKING MODAL & SEAT MAP ==================== //

async function openBookingModal(movieId) {
  selectedMovie = allMovies.find(m => m.id === movieId);
  if (!selectedMovie) return;

  selectedSeats = [];
  selectedCombos = {};
  selectedShowtime = null;

  document.getElementById("modal-movie-title").innerText = selectedMovie.title;
  document.getElementById("modal-movie-genres").innerText = `${selectedMovie.genres.join(", ")} • ${selectedMovie.durationMinutes} phút • ${selectedMovie.ageRating}`;
  document.getElementById("modal-total-price").innerText = "0";
  document.getElementById("modal-selected-summary").innerText = "Chưa chọn ghế";
  document.getElementById("checkout-button").disabled = true;

  const showtimesContainer = document.getElementById("modal-showtimes-container");
  showtimesContainer.innerHTML = '<span class="text-xs text-gray-400"><i class="fa-solid fa-spinner animate-spin mr-2 text-cgv-red"></i>Đang tải suất chiếu rạp CGV...</span>';

  document.getElementById("booking-modal").classList.remove("hidden");

  try {
    const res = await fetch(`${API_BASE}/showtimes?movieId=${movieId}`);
    const json = await res.json();

    if (json.status === "SUCCESS" && json.data.length > 0) {
      renderShowtimes(json.data);
      selectShowtime(json.data[0].id);
    } else {
      showtimesContainer.innerHTML = '<span class="text-xs text-red-400">Hiện chưa có suất chiếu cho phim này. Vui lòng chọn phim khác.</span>';
      document.getElementById("seat-map-grid").innerHTML = "";
    }
  } catch (err) {
    console.error("Lỗi lấy suất chiếu:", err);
  }
}

function closeBookingModal() {
  document.getElementById("booking-modal").classList.add("hidden");
  if (lockTimerInterval) clearInterval(lockTimerInterval);
  document.getElementById("lock-countdown-banner").classList.add("hidden");
}

function renderShowtimes(showtimesList) {
  const container = document.getElementById("modal-showtimes-container");
  container.innerHTML = "";

  showtimesList.forEach((st, idx) => {
    const btn = document.createElement("button");
    btn.className = `px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 border ${idx === 0 ? 'bg-cgv-red text-white border-cgv-red cgv-glow' : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500'}`;
    btn.id = `showtime-btn-${st.id}`;
    btn.onclick = () => selectShowtime(st.id);
    btn.innerHTML = `
      <i class="fa-regular fa-clock"></i>
      <span>${st.startTime.slice(-5)}</span>
      <span class="text-[10px] font-normal opacity-80">(${st.cinema ? st.cinema.name.replace("CGV ", "") : (st.room ? st.room.name : 'Phòng')})</span>
    `;
    container.appendChild(btn);
  });
}

async function selectShowtime(showtimeId) {
  selectedShowtime = showtimeId;
  selectedSeats = [];
  updateOrderSummary();

  document.querySelectorAll("#modal-showtimes-container button").forEach(b => {
    b.className = "px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 border bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500";
  });
  const currentBtn = document.getElementById(`showtime-btn-${showtimeId}`);
  if (currentBtn) {
    currentBtn.className = "px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 border bg-cgv-red text-white border-cgv-red shadow-lg shadow-red-600/30";
  }

  const userId = currentUser ? currentUser.id : "user_guest";
  try {
    const res = await fetch(`${API_BASE}/showtimes/${showtimeId}/seats?userId=${userId}`);
    const json = await res.json();
    if (json.status === "SUCCESS") {
      renderSeatMap(json.data.seats);
    }
  } catch (err) {
    console.error("Lỗi lấy sơ đồ ghế:", err);
  }
}

function renderSeatMap(seats) {
  const container = document.getElementById("seat-map-grid");
  container.innerHTML = "";

  const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
  rows.forEach(r => {
    const rowDiv = document.createElement("div");
    rowDiv.className = "flex items-center space-x-2";

    const label = document.createElement("span");
    label.className = "w-5 text-xs font-bold text-gray-500 text-center";
    label.innerText = r;
    rowDiv.appendChild(label);

    const rowSeats = seats.filter(s => s.row === r);
    rowSeats.forEach(s => {
      const seatBtn = document.createElement("button");
      seatBtn.id = `seat-${s.id}`;
      seatBtn.dataset.seatId = s.id;
      seatBtn.dataset.price = s.price;
      seatBtn.dataset.type = s.type;

      let styleClass = "w-7 h-7 rounded text-[10px] font-bold flex items-center justify-center transition ";

      if (s.status === "BOOKED") {
        styleClass += "bg-red-950 text-red-600 border border-red-900 cursor-not-allowed opacity-50";
        seatBtn.disabled = true;
      } else if (s.status === "LOCKED_BY_OTHER") {
        styleClass += "bg-yellow-950 text-yellow-600 border border-yellow-900 cursor-not-allowed opacity-70";
        seatBtn.title = `Tạm khóa (${s.remainingSeconds}s)`;
        seatBtn.disabled = true;
      } else {
        if (s.type === "VIP") {
          styleClass += "bg-yellow-600/70 border border-yellow-500/80 text-white hover:bg-yellow-500";
        } else if (s.type === "SWEETBOX") {
          styleClass += "bg-pink-600/70 border border-pink-500/80 text-white hover:bg-pink-500";
        } else {
          styleClass += "bg-gray-700 border border-gray-600 text-gray-200 hover:bg-gray-600";
        }
        seatBtn.onclick = () => toggleSeatSelect(s.id);
      }

      seatBtn.className = styleClass;
      seatBtn.innerText = s.number;
      rowDiv.appendChild(seatBtn);
    });

    container.appendChild(rowDiv);
  });
}

async function toggleSeatSelect(seatId) {
  const idx = selectedSeats.indexOf(seatId);
  const seatBtn = document.getElementById(`seat-${seatId}`);

  if (idx > -1) {
    selectedSeats.splice(idx, 1);
    const type = seatBtn.dataset.type;
    if (type === "VIP") seatBtn.className = "w-7 h-7 rounded text-[10px] font-bold flex items-center justify-center transition bg-yellow-600/70 border border-yellow-500/80 text-white hover:bg-yellow-500";
    else if (type === "SWEETBOX") seatBtn.className = "w-7 h-7 rounded text-[10px] font-bold flex items-center justify-center transition bg-pink-600/70 border border-pink-500/80 text-white hover:bg-pink-500";
    else seatBtn.className = "w-7 h-7 rounded text-[10px] font-bold flex items-center justify-center transition bg-gray-700 border border-gray-600 text-gray-200 hover:bg-gray-600";
  } else {
    selectedSeats.push(seatId);
    seatBtn.className = "w-7 h-7 rounded text-[10px] font-black flex items-center justify-center transition bg-cgv-red text-white border border-red-400 shadow-lg shadow-red-500/60 scale-110";

    await lockSelectedSeats();
  }

  updateOrderSummary();
}

async function lockSelectedSeats() {
  if (!selectedSeats.length || !selectedShowtime) return;
  const userId = currentUser ? currentUser.id : "user_guest";

  try {
    const res = await fetch(`${API_BASE}/bookings/lock-seats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        showtimeId: selectedShowtime,
        seatIds: selectedSeats,
        userId: userId
      })
    });
    const json = await res.json();

    if (json.status === "SUCCESS") {
      startLockCountdown(json.expiresInSeconds || 600);
    } else if (json.status === "CONFLICT") {
      showToast(json.message || "Ghế vừa được người khác giữ chỗ!", "warning");
      selectShowtime(selectedShowtime);
    }
  } catch (err) {
    console.error("Lỗi khóa ghế:", err);
  }
}

function startLockCountdown(durationSeconds) {
  const banner = document.getElementById("lock-countdown-banner");
  const timerEl = document.getElementById("lock-timer");
  banner.classList.remove("hidden");

  if (lockTimerInterval) clearInterval(lockTimerInterval);

  let remaining = durationSeconds;
  lockTimerInterval = setInterval(() => {
    remaining--;
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    timerEl.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    if (remaining <= 0) {
      clearInterval(lockTimerInterval);
      showToast("Hết thời gian giữ ghế 10 phút! Vui lòng thao tác lại.", "warning");
      closeBookingModal();
    }
  }, 1000);
}

// Bắp Nước Combos
async function fetchCombos() {
  try {
    const res = await fetch(`${API_BASE}/combos`);
    const json = await res.json();
    if (json.status === "SUCCESS") {
      renderCombos(json.data);
    }
  } catch (err) {
    console.error("Lỗi tải combo:", err);
  }
}

function renderCombos(combosList) {
  const container = document.getElementById("combos-container");
  if (!container) return;
  container.innerHTML = "";

  combosList.forEach(c => {
    const div = document.createElement("div");
    div.className = "p-3 rounded-xl bg-gray-800/80 border border-gray-700 flex items-center justify-between text-xs";
    div.innerHTML = `
      <div class="flex items-center space-x-2.5">
        <span class="text-2xl">${c.img}</span>
        <div>
          <span class="block font-bold text-white">${c.name}</span>
          <span class="text-[11px] text-cgv-gold font-semibold">${c.price.toLocaleString("vi-VN")} đ</span>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <button onclick="changeComboQty('${c.id}', -1, ${c.price})" class="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-white font-bold">-</button>
        <span id="combo-qty-${c.id}" class="w-4 text-center font-bold text-white">0</span>
        <button onclick="changeComboQty('${c.id}', 1, ${c.price})" class="w-6 h-6 rounded bg-cgv-red hover:bg-red-600 text-white font-bold">+</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function changeComboQty(comboId, delta, price) {
  const current = selectedCombos[comboId] || { qty: 0, price: price };
  current.qty = Math.max(0, current.qty + delta);
  selectedCombos[comboId] = current;

  const qtyEl = document.getElementById(`combo-qty-${comboId}`);
  if (qtyEl) qtyEl.innerText = current.qty;

  updateOrderSummary();
}

function updateOrderSummary() {
  let total = 0;

  selectedSeats.forEach(id => {
    const btn = document.getElementById(`seat-${id}`);
    if (btn) total += Number(btn.dataset.price || 0);
  });

  Object.values(selectedCombos).forEach(c => {
    total += c.qty * c.price;
  });

  document.getElementById("modal-total-price").innerText = total.toLocaleString("vi-VN");

  const summary = document.getElementById("modal-selected-summary");
  if (selectedSeats.length > 0) {
    summary.innerText = `Đã chọn ${selectedSeats.length} ghế (${selectedSeats.join(", ")})`;
    document.getElementById("checkout-button").disabled = false;
  } else {
    summary.innerText = "Chưa chọn ghế";
    document.getElementById("checkout-button").disabled = true;
  }
}

// ---------------- CHECKOUT & DIGITAL CGV TICKET ---------------- //

async function handleCheckout() {
  if (!selectedSeats.length || !selectedShowtime) return;

  const checkoutBtn = document.getElementById("checkout-button");
  checkoutBtn.disabled = true;
  checkoutBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin mr-2"></i>Đang xuất vé CGV...';

  const userId = currentUser ? currentUser.id : "user_guest";
  const customerInfo = currentUser ? { name: currentUser.name, phone: currentUser.phone } : { name: "Khách hàng CGV", phone: "0987654321" };

  try {
    const res = await fetch(`${API_BASE}/payments/checkout`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        showtimeId: selectedShowtime,
        seatIds: selectedSeats,
        userId: userId,
        comboIds: Object.keys(selectedCombos).filter(k => selectedCombos[k].qty > 0),
        customerInfo: customerInfo
      })
    });
    const json = await res.json();

    if (json.status === "SUCCESS") {
      closeBookingModal();
      showTicketModal(json.data);
      triggerConfetti();
      showToast(json.message || "Đặt vé thành công! Điểm thưởng CGV đã được tích lũy.", "success");
      if (authToken) fetchCurrentUser();
    } else {
      showToast(json.message || "Giao dịch không thành công!", "error");
    }
  } catch (err) {
    showToast("Lỗi kết nối máy chủ thanh toán.", "error");
  } finally {
    checkoutBtn.disabled = false;
    checkoutBtn.innerHTML = '<i class="fa-solid fa-credit-card mr-2"></i>Thanh Toán & Xuất Vé';
  }
}

function showTicketModal(ticketData) {
  document.getElementById("ticket-cinema").innerText = ticketData.cinemaName || "CGV VINCOM LANDMARK 81";
  document.getElementById("ticket-movie-title").innerText = ticketData.movieTitle;
  document.getElementById("ticket-code").innerText = ticketData.bookingCode;
  document.getElementById("ticket-room").innerText = ticketData.roomName || "Phòng 01 - IMAX";
  document.getElementById("ticket-time").innerText = ticketData.showtimeStart || "Hôm nay";
  document.getElementById("ticket-seats").innerText = ticketData.seats.join(", ");

  const qrContainer = document.getElementById("ticket-qrcode");
  qrContainer.innerHTML = "";
  new QRCode(qrContainer, {
    text: ticketData.qrToken || ticketData.bookingCode,
    width: 130,
    height: 130,
    colorDark: "#0F1015",
    colorLight: "#FFFFFF",
    correctLevel: QRCode.CorrectLevel.H
  });

  document.getElementById("ticket-modal").classList.remove("hidden");
}

function closeTicketModal() {
  document.getElementById("ticket-modal").classList.add("hidden");
  switchView("home");
}

function triggerConfetti() {
  if (window.confetti) {
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
  }
}

// ==================== AI CHATBOT NLU ==================== //

function toggleChatbot() {
  const win = document.getElementById("chatbot-window");
  if (win) win.classList.toggle("hidden");
}

async function handleChatSubmit(event) {
  event.preventDefault();
  const input = document.getElementById("chat-input");
  const msg = input.value.trim();
  if (!msg) return;

  appendChatMessage(msg, "user");
  input.value = "";

  try {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, sessionId: "sess_cgv" })
    });
    const json = await res.json();
    if (json.status === "SUCCESS") {
      appendChatMessage(json.reply || json.replyText || "Xin lỗi, AI chưa có câu trả lời phù hợp.", "bot", json.suggestedAction, json);
    } else {
      appendChatMessage(json.message || "AI chưa thể xử lý yêu cầu này.", "bot");
    }
  } catch (err) {
    appendChatMessage("Xin lỗi, hệ thống AI CGV đang bảo trì. Vui lòng thử lại sau.", "bot");
  }
}

function sendQuickPrompt(text) {
  document.getElementById("chat-input").value = text;
  document.getElementById("chat-form").dispatchEvent(new Event("submit"));
}

function escapeChatHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatChatText(value) {
  return escapeChatHTML(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

function appendChatMessage(text, sender, suggestedAction = null, responseData = null) {
  const container = document.getElementById("chat-messages");
  if (!container) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = `flex items-start space-x-2 ${sender === 'user' ? 'justify-end' : ''}`;

  if (sender === "user") {
    msgDiv.innerHTML = `
      <div class="p-3 rounded-2xl rounded-tr-none bg-cgv-red text-white max-w-[82%] leading-relaxed shadow">
        ${escapeChatHTML(text)}
      </div>
    `;
  } else {
    let actionHTML = "";
    if (suggestedAction && suggestedAction.type === "BOOKING_MODAL") {
      actionHTML = `<button onclick="openBookingModal('${escapeChatHTML(suggestedAction.movieId)}')" class="mt-2 block w-full py-1.5 rounded-lg bg-cgv-red hover:bg-red-700 text-white text-[11px] font-bold text-center">👉 Mở đặt vé ngay</button>`;
    }
    if (responseData?.suggestedMovies?.length) {
      actionHTML += `<div class="mt-2 space-y-1.5">${responseData.suggestedMovies.slice(0, 3).map(movie => `
        <button onclick="openBookingModal('${escapeChatHTML(movie.id)}')" class="w-full flex items-center gap-2 p-1.5 rounded-lg bg-gray-900/80 hover:bg-gray-700 text-left">
          <img src="${escapeChatHTML(movie.posterUrl || '')}" alt="" class="w-7 h-9 rounded object-cover">
          <span class="text-[10px] font-semibold text-gray-200 truncate">${escapeChatHTML(movie.title)}</span>
        </button>`).join('')}</div>`;
    }
    if (responseData?.suggestedShowtimes?.length) {
      actionHTML += `<div class="mt-2 space-y-1.5">${responseData.suggestedShowtimes.slice(0, 3).map(showtime => `
        <button onclick="openBookingModal('${escapeChatHTML(showtime.movieId)}')" class="w-full p-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/70 text-left text-[10px] text-red-200">
          <i class="fa-regular fa-clock mr-1"></i>${escapeChatHTML(showtime.startTime)} · ${escapeChatHTML(showtime.format || '2D')}
        </button>`).join('')}</div>`;
    }
    msgDiv.innerHTML = `
      <div class="w-6 h-6 rounded-full bg-cgv-red text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
        <i class="fa-solid fa-robot"></i>
      </div>
      <div class="p-3 rounded-2xl rounded-tl-none bg-gray-800 text-gray-200 max-w-[82%] leading-relaxed shadow">
        ${formatChatText(text)}
        ${actionHTML}
      </div>
    `;
  }

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

// ==================== RECOMMENDATION LAB ==================== //

async function loadRecommendationLab() {
  const genres = ["Khoa học viễn tưởng", "Hành động", "Tâm lý", "Kinh dị", "Gia đình", "Phiêu lưu"];
  document.getElementById("genre-preferences").innerHTML = genres.map(genre => `
    <button onclick="this.classList.toggle('bg-cgv-red'); this.classList.toggle('text-white')" class="genre-preference px-2.5 py-1.5 rounded-lg bg-gray-800 text-gray-400 text-[10px] transition">
      ${genre}
    </button>
  `).join("");
  await refreshPersonalizedAI();
}

async function refreshPersonalizedAI() {
  const selectedGenres = [...document.querySelectorAll(".genre-preference.bg-cgv-red")].map(b => b.textContent.trim());
  const genreQuery = selectedGenres.length ? `&genres=${encodeURIComponent(selectedGenres.join(","))}` : "";
  const userId = currentUser ? currentUser.id : "user_guest";

  const [recRes, profRes] = await Promise.all([
    fetch(`${API_BASE}/ai/recommendations?userId=${userId}${genreQuery}`),
    fetch(`${API_BASE}/ai/profile/${userId}`)
  ]);

  const json = await recRes.json();
  const profJson = await profRes.json();

  if (json.status !== "SUCCESS") return;

  document.getElementById("ai-profile-content").innerHTML = `
    <div class="p-4 rounded-xl bg-gray-900 border border-gray-800">
      <div class="flex justify-between">
        <span class="text-xs text-gray-400">${profJson.data?.source === "stored_profile" ? "Hồ sơ đã học" : "Cold start profile"}</span>
        <span class="text-cgv-red text-xs font-bold">${profJson.data?.totalWatched || 0} phim đã xem</span>
      </div>
      <div class="flex flex-wrap gap-2 mt-4">
        ${(profJson.data?.genres || []).map(g => `<span class="px-2 py-1 rounded-full bg-red-950 text-red-300 text-[10px]">${g}</span>`).join("")}
      </div>
      <p class="text-[11px] text-gray-500 mt-4">Điểm đánh giá trung bình: ${profJson.data?.avgRating || 7.5}/10</p>
    </div>
  `;

  document.getElementById("ai-lab-grid").innerHTML = json.data.map(m => `
    <article class="p-4 rounded-2xl bg-cgv-card border border-gray-800 hover:border-red-500/60 transition">
      <div class="flex gap-3">
        <img src="${m.posterUrl}" class="w-20 h-28 rounded-xl object-cover shadow">
        <div class="min-w-0 flex-1">
          <div class="flex justify-between gap-2">
            <span class="text-[10px] px-2 py-1 rounded-full bg-red-950 text-red-300 font-bold">${m.matchPercentage}% phù hợp</span>
            <span class="text-yellow-400 text-xs"><i class="fa-solid fa-star"></i> ${m.imdbRating}</span>
          </div>
          <h3 class="font-black text-white text-sm mt-2 truncate">${m.title}</h3>
          <p class="text-[11px] text-gray-400 mt-1 line-clamp-2">${m.description}</p>
        </div>
      </div>
      <div class="mt-3 p-2 rounded-lg bg-gray-900 text-[10px] text-red-300">
        <i class="fa-solid fa-wand-magic-sparkles mr-1"></i>${m.recommendationReason}
      </div>
      <div class="grid grid-cols-4 gap-1 mt-3">
        ${["LIKE", "DISLIKE", "WATCHLIST"].map(type => `
          <button onclick="sendAIFeedback('${m.id}', '${type}')" class="py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-[10px] text-gray-300">
            ${type === "LIKE" ? "Thích" : type === "DISLIKE" ? "Bỏ qua" : "Lưu lại"}
          </button>
        `).join("")}
        <button onclick="openBookingModal('${m.id}')" class="py-1.5 rounded-lg bg-cgv-red text-[10px] text-white font-bold">
          Mua vé
        </button>
      </div>
    </article>
  `).join("");
}

async function openRecommendationLab(movieId) {
  switchView("ai-lab");
  const userId = currentUser ? currentUser.id : "user_guest";
  const res = await fetch(`${API_BASE}/ai/recommendations/explain/${movieId}?userId=${userId}`);
  const json = await res.json();
  if (json.status === "SUCCESS") {
    const factors = json.data.factors.map(f => `
      <div class="flex items-center gap-2 text-[10px] text-gray-400">
        <span class="w-24">${f.label}</span>
        <div class="h-1.5 flex-1 bg-gray-800 rounded-full overflow-hidden">
          <div class="h-full rounded-full bg-cgv-red" style="width:${f.value}%"></div>
        </div>
        <b class="text-white">${f.value}</b>
      </div>
    `).join("");
    document.getElementById("ai-profile-content").insertAdjacentHTML("afterbegin", `
      <div class="mb-4 p-3 rounded-xl border border-yellow-700/50 bg-yellow-950/20">
        <p class="text-[10px] uppercase text-yellow-400 font-bold">Explainable AI • ${json.data.movie.title}</p>
        <p class="text-xs text-gray-300 mt-2">${json.data.explanation}</p>
        <div class="mt-3 space-y-2">${factors}</div>
      </div>
    `);
  }
}

async function sendAIFeedback(movieId, type) {
  const userId = currentUser ? currentUser.id : "user_guest";
  try {
    const res = await apiFetch(`/ai/feedback`, {
      method: "POST",
      body: JSON.stringify({ userId, movieId, type })
    });
    const json = await res.json();
    if (json.status === "SUCCESS") showToast("Đã ghi nhận phản hồi để cải thiện mô hình AI!", "success");
  } catch (e) {
    showToast("Lỗi gửi feedback.", "error");
  }
}

// ==================== DASHBOARD KPI & FORECAST ==================== //

function renderDailyKPIs(report) {
  const kpi = report.kpi || {};
  const tEl = document.getElementById("kpi-total-tickets");
  const rEl = document.getElementById("kpi-total-revenue");
  const oEl = document.getElementById("kpi-occupancy");

  if (tEl) tEl.innerText = (kpi.totalTickets || 0).toLocaleString("vi-VN");
  if (rEl) rEl.innerText = kpi.revenueFormatted || "0 đồng";
  if (oEl) oEl.innerText = `${kpi.avgOccupancyRate || 0}%`;
}

function renderForecastChart(forecastData) {
  const ctx = document.getElementById("demandForecastChart");
  if (!ctx) return;

  const labels = forecastData.map(d => d.timeslot);
  const occupancy = forecastData.map(d => d.predictedOccupancy);

  if (forecastChart) forecastChart.destroy();

  forecastChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Tỷ lệ lấp đầy dự báo (%)',
        data: occupancy,
        backgroundColor: occupancy.map(val => val >= 80 ? 'rgba(231, 26, 15, 0.85)' : 'rgba(212, 175, 55, 0.75)'),
        borderColor: occupancy.map(val => val >= 80 ? '#E71A0F' : '#D4AF37'),
        borderWidth: 1.5,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#9CA3AF' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#9CA3AF', font: { size: 10 } }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderAIOptimization(forecastData) {
  const container = document.getElementById("ai-optimization-list");
  if (!container) return;
  container.innerHTML = "";

  forecastData.slice(3).forEach(f => {
    const div = document.createElement("div");
    div.className = "p-3 rounded-xl bg-gray-800/70 border border-gray-700 text-xs space-y-1";
    div.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-bold text-white">${f.timeslot}</span>
        <span class="px-2 py-0.5 rounded font-black ${f.predictedOccupancy >= 80 ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-yellow-950 text-cgv-gold border border-yellow-800'}">
          Dự báo: ${f.predictedOccupancy}%
        </span>
      </div>
      <p class="text-gray-400 text-[11px] leading-relaxed"><i class="fa-solid fa-lightbulb text-yellow-400 mr-1"></i>${f.recommendation}</p>
    `;
    container.appendChild(div);
  });
}

function approveAISchedule() {
  showToast("🎉 Ban Quản Lý CGV đã PHÊ DUYỆT thành công lịch chiếu AI! Đã xuất bản tới toàn bộ các cụm rạp CGV.", "success");
}

function openTrailerModal() {
  window.open("https://www.youtube.com/watch?v=Way9Dexny3w", "_blank");
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl flex items-center space-x-2.5 transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto ${
    type === "success" ? "bg-green-950/95 border-green-700 text-green-300" :
    type === "error" ? "bg-red-950/95 border-red-700 text-red-300" :
    type === "warning" ? "bg-yellow-950/95 border-yellow-700 text-yellow-300" :
    "bg-gray-900/95 border-red-700 text-red-300"
  }`;

  const icon = type === "success" ? "fa-circle-check" :
               type === "error" ? "fa-circle-xmark" :
               type === "warning" ? "fa-triangle-exclamation" : "fa-circle-info";

  toast.innerHTML = `
    <i class="fa-solid ${icon} text-base flex-shrink-0"></i>
    <span class="flex-1 leading-relaxed">${message}</span>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove("translate-y-2", "opacity-0");
  });

  setTimeout(() => {
    toast.classList.add("translate-y-2", "opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==================== ADMIN LOGIN PORTAL (TRANG ĐĂNG NHẬP RIÊNG CHO QUẢN TRỊ VIÊN) ==================== //

/**
 * Mở cổng đăng nhập Admin (portal riêng biệt với trang khách hàng)
 * Truy cập qua link ẩn ở footer hoặc phím tắt Ctrl+Shift+A
 */
function openAdminLoginPortal() {
  const portal = document.getElementById("admin-login-portal");
  if (!portal) return;
  portal.classList.remove("hidden");
  // Xóa thông báo lỗi cũ
  const errDiv = document.getElementById("admin-login-error");
  if (errDiv) errDiv.classList.add("hidden");
  // Focus vào email field
  setTimeout(() => {
    const emailField = document.getElementById("admin-login-email");
    if (emailField) emailField.focus();
  }, 100);
}

/**
 * Đóng cổng đăng nhập Admin
 */
function closeAdminLoginPortal() {
  const portal = document.getElementById("admin-login-portal");
  if (portal) portal.classList.add("hidden");
}

/**
 * Xử lý form đăng nhập Admin Portal
 */
async function handleAdminLoginSubmit(event) {
  event.preventDefault();
  const email = document.getElementById("admin-login-email").value;
  const password = document.getElementById("admin-login-password").value;
  const btn = document.getElementById("admin-login-btn");
  const errDiv = document.getElementById("admin-login-error");
  const errMsg = document.getElementById("admin-login-error-msg");

  // Loading state
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i><span>Đang xác thực...</span>`;
  }
  if (errDiv) errDiv.classList.add("hidden");

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();

    if (json.status === "SUCCESS") {
      const user = json.user;
      // Kiểm tra quyền truy cập admin
      if (!["ADMIN", "MANAGER"].includes(user.role)) {
        if (errDiv) errDiv.classList.remove("hidden");
        if (errMsg) errMsg.textContent = "Tài khoản này không có quyền truy cập hệ thống quản trị. Vui lòng dùng tài khoản nội bộ CGV.";
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i><span>ĐĂNG NHẬP HỆ THỐNG</span>`;
        }
        return;
      }

      // Đăng nhập thành công
      authToken = json.token;
      currentUser = user;
      localStorage.setItem("aiCinemaToken", authToken);
      localStorage.setItem("aiCinemaUser", JSON.stringify(currentUser));
      updateAuthUI();

      // Đóng portal và chuyển sang Admin Workspace
      closeAdminLoginPortal();
      showToast(`🛡️ Chào mừng ${user.name} (${user.role}) đăng nhập vào hệ thống quản trị CGV!`, "success");
      setTimeout(() => switchView("admin"), 300);

    } else {
      if (errDiv) errDiv.classList.remove("hidden");
      if (errMsg) errMsg.textContent = json.message || "Sai email hoặc mật khẩu. Vui lòng thử lại.";
    }
  } catch (err) {
    if (errDiv) errDiv.classList.remove("hidden");
    if (errMsg) errMsg.textContent = "Không thể kết nối máy chủ. Vui lòng kiểm tra lại kết nối.";
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i><span>ĐĂNG NHẬP HỆ THỐNG</span>`;
    }
  }
}

/**
 * Đăng nhập nhanh vào Admin Portal (1 click - chỉ cho demo)
 */
async function quickAdminLogin(email, password) {
  const btn = document.getElementById("admin-login-btn");
  const errDiv = document.getElementById("admin-login-error");
  if (errDiv) errDiv.classList.add("hidden");

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();

    if (json.status === "SUCCESS") {
      const user = json.user;
      authToken = json.token;
      currentUser = user;
      localStorage.setItem("aiCinemaToken", authToken);
      localStorage.setItem("aiCinemaUser", JSON.stringify(currentUser));
      updateAuthUI();
      closeAdminLoginPortal();
      showToast(`🛡️ Đăng nhập thành công: ${user.name} (${user.role})`, "success");
      setTimeout(() => switchView("admin"), 300);
    }
  } catch (err) {
    showToast("Lỗi kết nối máy chủ.", "error");
  }
}

/**
 * Toggle hiển thị/ẩn mật khẩu trong Admin Portal
 */
function toggleAdminPasswordVisibility() {
  const input = document.getElementById("admin-login-password");
  const eye = document.getElementById("admin-pw-eye");
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    if (eye) eye.className = "fa-solid fa-eye-slash text-sm";
  } else {
    input.type = "password";
    if (eye) eye.className = "fa-solid fa-eye text-sm";
  }
}

// Phím tắt bí mật: Ctrl+Shift+A → Mở Admin Portal
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === "A") {
    e.preventDefault();
    if (currentUser && ["ADMIN", "MANAGER"].includes(currentUser.role)) {
      switchView("admin");
    } else {
      openAdminLoginPortal();
    }
  }
  // Esc đóng portal
  if (e.key === "Escape") {
    closeAdminLoginPortal();
  }
});
