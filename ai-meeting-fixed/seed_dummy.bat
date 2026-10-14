@echo off
echo ================================================
echo   AI Meeting Intelligence - Dummy Data Seeder
echo ================================================
echo.
echo Seeding dummy meetings with playable recordings...
cd backend
call npm run seed
echo.
echo ================================================
echo   Done!
echo   Playable meetings added for jane@demo.com
echo   Password: password123
echo ================================================
pause
