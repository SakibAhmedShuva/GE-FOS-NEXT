@echo off
echo Starting Green Energy FOS Server...
echo ===================================
set DATABASE_URL=file:./dev.db
pnpm run dev
pause
