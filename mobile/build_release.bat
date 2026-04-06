@echo off
echo ============================================
echo  OursMusic - Build Release APK
echo ============================================
echo.

REM Detecta o caminho do projeto automaticamente
set SRC=%~dp0
set SRC=%SRC:~0,-1%

REM Pasta de destino do build (pode ser a mesma)
set DST=%SRC%

echo [1/3] Instalando dependencias...
cd /d "%DST%"
call flutter pub get
if errorlevel 1 ( echo ERRO no flutter pub get && pause && exit /b 1 )

echo [2/3] Buildando APK release...
call flutter build apk --release ^
  --dart-define=APP_VERSION=1.0.5 ^
  --dart-define=API_URL=https://oursmusics.shop/api ^
  --dart-define=DEVICE_TYPE=mobile ^
  --target-platform android-arm,android-arm64

if errorlevel 1 (
  echo.
  echo BUILD FALHOU!
  pause
  exit /b 1
)

echo [3/3] Copiando APK para apk-releases...
set APK_OUT=%DST%\build\app\outputs\flutter-apk\app-release.apk
set APK_DST=%SRC%\..\backend\apk-releases\app-mobile.apk

if exist "%APK_OUT%" (
  copy /Y "%APK_OUT%" "%APK_DST%"
  echo APK copiado para: %APK_DST%
) else (
  echo AVISO: APK nao encontrado em %APK_OUT%
)

echo.
echo ============================================
echo  BUILD OK! Versao 1.0.5
echo  API: https://oursmusics.shop/api
echo ============================================
pause
