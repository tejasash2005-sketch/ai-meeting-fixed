@echo off
echo ================================================
echo   AI Meeting Intelligence v2
echo   Starting backend + frontend...
echo ================================================

echo Installing backend...
cd backend
call npm install --silent
echo Seeding dummy meetings with recordings...
call npm run seed
start /B npm run dev

echo Installing frontend...
cd ..\frontend
call npm install --silent

echo.
echo ================================================
echo   App running!
echo   Open: http://localhost:3000
echo   Admin: admin@demo.com / password123
echo ================================================
echo.
call npm run dev
