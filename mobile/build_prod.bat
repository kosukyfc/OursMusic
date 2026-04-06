@echo off
setlocal enabledelayedexpansion
title OursMusic - Build APK

echo.
echo  ============================================
echo   OursMusic - Build APK Producao v1.0.5
echo  ============================================
echo.

cd /d "%~dp0"

:: ── Etapa 1: pub get ────────────────────────────────────────────────────────
echo  [1/5] Verificando dependencias...
call flutter pub get
if errorlevel 1 (
  echo  [ERRO] flutter pub get falhou.
  pause & exit /b 1
)
echo  [####                    ] 20%% - Dependencias OK
echo.

:: ── Etapa 2: flutter clean ──────────────────────────────────────────────────
echo  [2/5] Limpando cache antigo...
call flutter clean >nul 2>&1
call flutter pub get >nul 2>&1
echo  [########                ] 40%% - Cache limpo
echo.

:: ── Etapa 3: build ──────────────────────────────────────────────────────────
echo  [3/5] Compilando APK Release...
echo  (isso pode levar alguns minutos)
echo.

call flutter build apk --release ^
  --dart-define=APP_VERSION=1.0.5 ^
  --dart-define=API_URL=https://oursmusics.shop/api ^
  --dart-define=DEVICE_TYPE=mobile ^
  --target-platform android-arm,android-arm64

if errorlevel 1 (
  echo.
  echo  [ERRO] Build falhou. Verifique os erros acima.
  pause & exit /b 1
)
echo.
echo  [############            ] 60%% - Build concluido!
echo.

:: ── Etapa 4: copiar APK ─────────────────────────────────────────────────────
echo  [4/5] Copiando APK para releases...
set APK=build\app\outputs\flutter-apk\app-release.apk
set DST=..\backend\apk-releases\app-mobile.apk

if exist "%APK%" (
  copy /Y "%APK%" "%DST%" >nul
  echo  [################        ] 80%% - APK copiado
) else (
  echo  [AVISO] APK nao encontrado em: %APK%
  pause & exit /b 1
)
echo.

:: ── Etapa 5: git push ───────────────────────────────────────────────────────
echo  [5/5] Enviando para o repositorio...
cd /d "%~dp0\.."

git add backend/apk-releases/app-mobile.apk
git add backend/apk-releases/version.json 2>nul
git add mobile/ 2>nul
git commit -m "build: APK v1.0.5"
git push origin main

if errorlevel 1 (
  echo  [AVISO] git push falhou. Verifique sua conexao ou credenciais.
) else (
  echo  [########################] 100%% - Push concluido!
)

echo.
echo  ============================================
echo   PRONTO! APK v1.0.5 publicado no GitHub
echo   A VPS pode fazer git pull para atualizar
echo  ============================================
echo.
pause
