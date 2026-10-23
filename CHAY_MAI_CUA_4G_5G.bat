@echo off
chcp 65001 >nul
title TẠP HÓA MAI CUA - MÁY CHỦ BÁN HÀNG & 4G/5G IPHONE
color 0A

echo ================================================================
echo        TẠP HÓA MAI CUA - KHỞI ĐỘNG HỆ THỐNG QUẢN LÝ
echo ================================================================
echo.
echo Đang kiểm tra mã nguồn và khởi động máy chủ...
echo Đang tạo đường truyền bảo mật HTTPS để dùng trên iPhone 4G/5G...
echo.

node start-4g.js

pause
