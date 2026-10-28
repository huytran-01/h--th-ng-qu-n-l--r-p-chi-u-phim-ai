@echo off
chcp 65001 > nul
title 🎬 HE THONG QUAN LY RAP CHIEU PHIM AI (CGV)

echo ======================================================================
echo    HE THONG QUAN LY RAP CHIEU PHIM TICH HOP TRI TUE NHAN TAO (AI)
echo ======================================================================
echo.

cd /d "%~dp0backend"

:: 1. Kiem tra file cau hinh .env
if not exist ".env" (
    echo [1/3] Khoi tao file cau hinh .env tu .env.example...
    copy ".env.example" ".env" > nul
)

:: 2. Kiem tra thu vien dependencies
if not exist "node_modules" (
    echo [2/3] Dang cai dat thu vien can thiet (npm install)...
    call npm install
)

echo.
echo ======================================================================
echo  [3/3] Dang khoi dong Backend API va mo trinh duyet...
echo.
echo  🌐 Dia chi website: http://localhost:5000
echo  🎬 Tro ly ao Chatbot AI 24/7 o goc phai man hinh
echo.
echo  ⚠️  CHU Y: VUI LONG GIU CUA SO NAY MO TRONG SUOT QUA TRINH SU DUNG!
echo  (Neu tat cua so nay, website se bi loi "localhost tu choi ket noi")
echo  Nhan [Ctrl + C] neu ban muon dung server.
echo ======================================================================
echo.

:: Mo trinh duyet sau 2 giay khi server da san sang
start "" cmd /c "timeout /t 2 > nul && start http://localhost:5000"

:: Chay server truc tiep tai cua so nay de hien thi log thoi gian thuc
node src/server.js
