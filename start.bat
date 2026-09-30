@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo.
echo === Проверяю Node.js ===
where node >nul 2>nul
if errorlevel 1 (
  echo ОШИБКА: не найден Node.js. Установите: winget install OpenJS.NodeJS.LTS  ^(потом откройте НОВОЕ окно терминала^)
  exit /b 1
)
for /f %%v in ('node -p "process.versions.node.split('.')[0]"') do set NODEMAJOR=%%v
if %NODEMAJOR% LSS 22 (
  echo ОШИБКА: нужен Node.js 22 или новее. Обновите: winget upgrade OpenJS.NodeJS.LTS
  exit /b 1
)

echo.
echo === Проверяю pnpm ===
where pnpm >nul 2>nul
if errorlevel 1 (
  call npm install -g pnpm
  if errorlevel 1 (
    echo ОШИБКА: не удалось установить pnpm. Выполните вручную: npm install -g pnpm
    exit /b 1
  )
)

echo.
echo === Создаю настройки ===
node scripts\make-env.mjs
if errorlevel 1 exit /b 1

echo.
echo === Проверяю базу данных ===
node scripts\db-up.mjs
if errorlevel 1 (
  where docker >nul 2>nul
  if errorlevel 1 (
    echo ОШИБКА: не найден Docker. Установите: winget install Docker.DockerDesktop , запустите Docker Desktop и повторите.
    exit /b 1
  )
  docker info >nul 2>nul
  if errorlevel 1 (
    echo ОШИБКА: Docker Desktop не запущен. Откройте его, дождитесь запуска и повторите.
    exit /b 1
  )
  docker compose -f docker-compose.dev.yml up -d
  if errorlevel 1 exit /b 1
  node scripts\db-up.mjs --wait
  if errorlevel 1 (
    echo ОШИБКА: база не запустилась за 60 секунд.
    exit /b 1
  )
  timeout /t 3 >nul
)

echo.
echo === Устанавливаю зависимости ^(первый раз несколько минут^) ===
call pnpm install
if errorlevel 1 exit /b 1

echo.
echo === Создаю водяной знак и загружаю данные ===
call pnpm watermark
if errorlevel 1 exit /b 1
call pnpm seed
if errorlevel 1 exit /b 1

echo.
echo ================================================================
echo   Сайт:     http://localhost:3000
echo   Админка:  http://localhost:3000/admin
echo   Вход:     admin@localhost.local  /  admin-local-12345
echo   Остановить: Ctrl+C
echo ================================================================
echo.
call pnpm dev
