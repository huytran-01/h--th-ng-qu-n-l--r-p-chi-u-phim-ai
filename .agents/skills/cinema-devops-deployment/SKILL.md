---
name: cinema-devops-deployment
description: >-
  Hướng dẫn đóng gói, cấu hình môi trường, triển khai và hoàn thiện vận hành Production cho hệ thống rạp chiếu phim:
  container hóa Docker & Docker Compose, cấu hình Nginx Reverse Proxy, chứng chỉ bảo mật SSL/TLS HTTPS,
  quản lý tiến trình PM2, cấu hình biến môi trường an toàn, tối ưu nén tài nguyên tĩnh và giám sát sức khỏe hệ thống.
---

# Cinema DevOps & Production Deployment — Skill Guide

Tài liệu này chuẩn hóa toàn bộ quy trình **Đóng gói, Triển khai (Deployment), Tối ưu Hiệu năng và Vận hành (Operations)** cho hệ thống rạp chiếu phim lên môi trường Production thực tế.

---

## 1. Kiến Trúc Triển Khai Production (Target Architecture)

```mermaid
graph TD
    User["🌐 Người Dùng Internet (Trình duyệt / Mobile)"] -->|HTTPS (Port 443)| Cloudflare["🛡️ CDN / DNS / SSL Edge"]
    Cloudflare --> Nginx["🔀 Nginx Reverse Proxy (Gzip, Cache, Security Headers)"]
    
    subgraph "Application Host (Docker / Linux Server)"
        Nginx -->|Proxy Pass (Port 5000)| PM2["⚡ PM2 Process Manager"]
        PM2 --> AppInstance1["Node.js Express App (Instance 1)"]
        PM2 --> AppInstance2["Node.js Express App (Instance 2)"]
        
        AppInstance1 --> MySQL["🐬 MySQL Server 8.0 (Port 3306)"]
        AppInstance2 --> MySQL
        AppInstance1 --> GeminiCloud["☁️ Google Gemini API"]
        AppInstance2 --> GeminiCloud
    end
```

---

## 2. Container Hóa Với Docker & Docker Compose

### 2.1. Dockerfile Chuẩn Cho Backend & Frontend
Tạo file `Dockerfile` tại thư mục gốc của dự án:
```dockerfile
# Sử dụng Node.js LTS bản rút gọn (Alpine)
FROM node:20-alpine AS production

# Thiết lập thư mục làm việc
WORKDIR /app

# Sao chép file cấu hình thư viện
COPY backend/package*.json ./backend/

# Cài đặt dependencies sạch cho môi trường production
RUN cd backend && npm ci --only=production

# Sao chép mã nguồn backend và frontend
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Thiết lập biến môi trường
ENV NODE_ENV=production
ENV PORT=5000

# Mở cổng dịch vụ
EXPOSE 5000

# Lệnh khởi động server
CMD ["node", "backend/src/server.js"]
```

### 2.2. Docker Compose Đa Dịch Vụ (`docker-compose.yml`)
```yaml
version: '3.8'

services:
  # 1. Cơ sở dữ liệu MySQL
  cinema-db:
    image: mysql:8.0
    container_name: cinema_mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: cinema_db
      MYSQL_USER: cinema_user
      MYSQL_PASSWORD: cinema_password
    ports:
      - "3306:3306"
    volumes:
      - db_data:/var/lib/mysql
      - ./backend/database/schema.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - cinema-net

  # 2. Ứng dụng Web Express + Vanilla JS
  cinema-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: cinema_backend
    restart: always
    environment:
      PORT: 5000
      DB_HOST: cinema-db
      DB_PORT: 3306
      DB_USER: cinema_user
      DB_PASSWORD: cinema_password
      DB_NAME: cinema_db
      USE_MYSQL: "true"
      GEMINI_API_KEY: ${GEMINI_API_KEY}
    ports:
      - "5000:5000"
    depends_on:
      - cinema-db
    networks:
      - cinema-net

volumes:
  db_data:

networks:
  cinema-net:
    driver: bridge
```

*Khởi chạy toàn bộ hệ thống bằng 1 lệnh duy nhất:*
```bash
docker compose up -d --build
```

---

## 3. Quản Lý Tiến Trình Ứng Dụng Với PM2 (Process Manager)

Nếu triển khai trực tiếp trên VPS Ubuntu / Debian, sử dụng PM2 để đảm bảo server tự khởi động lại khi crash hoặc reboot máy chủ:

### File cấu hình `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: "cinema-system",
      script: "backend/src/server.js",
      instances: "max",       // Tận dụng toàn bộ core CPU (Cluster Mode)
      exec_mode: "cluster",
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "logs/error.log",
      out_file: "logs/combined.log",
      merge_logs: true
    }
  ]
};
```

---

## 4. Cấu Hình Nginx Reverse Proxy & Tối Ưu Tốc Độ

Tệp cấu hình Nginx mẫu tại `/etc/nginx/sites-available/cinema`:
```nginx
server {
    listen 80;
    server_name cinema.yourdomain.com;
    return 301 https://$host$request_uri; # Tự động chuyển hướng sang HTTPS
}

server {
    listen 443 ssl http2;
    server_name cinema.yourdomain.com;

    # Chứng chỉ SSL Let's Encrypt
    ssl_certificate /etc/letsencrypt/live/cinema.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cinema.yourdomain.com/privkey.pem;

    # Nén Gzip tăng tốc tải trang
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 5. Quản Lý Biến Môi Trường An Toàn (`.env`)

Tạo file mẫu `backend/.env.example` để chia sẻ cho các thành viên trong nhóm mà không làm lộ secret:
```env
# Server
PORT=5000
NODE_ENV=production

# Database (MySQL 8.0+)
USE_MYSQL=true
DB_HOST=localhost
DB_PORT=3306
DB_USER=cinema_user
DB_PASSWORD=your_secure_password
DB_NAME=cinema_db

# Google Gemini AI Integration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-flash-lite-latest

# Security & Secrets
JWT_SECRET=your_super_secret_jwt_key_2026
QR_SECRET=cgv_secure_qr_hash_2026
```

> [!CAUTION]
> Tuyệt đối không commit file `backend/.env` chứa API key thật lên Git repository. Luôn đưa file này vào `.gitignore`.

---

## 6. Giám Sát Sức Khỏe Hệ Thống (Health Check API)

Tích hợp endpoint `/api/v1/healthz` trong server để công cụ giám sát (như Uptime Kuma hoặc AWS Route53) kiểm tra tình trạng dịch vụ định kỳ:
```javascript
app.get("/api/v1/healthz", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbService.isUsingMySql() ? "MYSQL_ONLINE" : "MEMORY_FALLBACK",
    geminiAi: aiService.geminiService.isAvailable() ? "READY" : "DISABLED",
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  });
});
```
