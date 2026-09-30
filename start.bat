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
echo === Устанавливаю зависимости ^(первый раз несколько минут^) ===
call pnpm install
if errorlevel 1 exit /b 1

call node scripts\local-run.mjs
