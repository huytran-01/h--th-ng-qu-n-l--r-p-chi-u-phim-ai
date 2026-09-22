@echo off
chcp 65001 > nul
title HE THONG QUAN LY RAP CHIEU PHIM TICH HOP AI
echo ======================================================================
echo    HE THONG QUAN LY RAP CHIEU PHIM TICH HOP TRI TUE NHAN TAO (AI)
echo ======================================================================
echo.
echo [1/2] Dang khoi dong Backend API va Dinh tuyen Frontend...
cd /d "%~dp0backend"
start "AI Cinema Backend Server" cmd /k "node src/server.js"
timeout /t 2 > nul
echo.
echo [2/2] Mo giao dien Web tren trinh duyet mac dinh...
start http://localhost:5000
echo.
echo ======================================================================
echo  He thong da khoi dong thanh cong tai: http://localhost:5000
echo  - Giao dien nguoi dung: http://localhost:5000
echo  - Backend API: http://localhost:5000/api/v1/movies
echo  - Trợ lý ảo Chatbot AI 24/7 o goc phai man hinh
echo ======================================================================
pause
