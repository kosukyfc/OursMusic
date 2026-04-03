@echo off
echo ============================================
echo  OursMusic - Build Release APK
echo ============================================
echo.

set SRC=C:\Users\ytalo\OneDrive\Área de Trabalho\Carai\music-app\mobile
set DST=C:\projetos\music-app\mobile

echo [1/4] Copiando lib...
xcopy /E /Y /Q "%SRC%\lib" "%DST%\lib\"
if errorlevel 1 ( echo ERRO ao copiar lib && pause && exit /b 1 )

echo [2/4] Copiando android...
xcopy /Y /Q "%SRC%\android\app\build.gradle.kts" "%DST%\android\app\"
xcopy /Y /Q "%SRC%\android\app\src\main\AndroidManifest.xml" "%DST%\android\app\src\main\"
xcopy /E /Y /Q "%SRC%\android\app\src\main\kotlin" "%DST%\android\app\src\main\kotlin\"

echo [3/4] Copiando pubspec.yaml...
xcopy /Y /Q "%SRC%\pubspec.yaml" "%DST%\"

echo [4/4] Buildando APK...
cd /d "%DST%"
call flutter pub get
if errorlevel 1 ( echo ERRO no flutter pub get && pause && exit /b 1 )

call flutter build apk --release ^
  --dart-define=APP_VERSION=1.0.2 ^
  --dart-define=API_URL=http://192.168.15.3:3000 ^
  --dart-define=DEVICE_TYPE=mobile

if errorlevel 1 (
  echo.
  echo BUILD FALHOU!
  pause
  exit /b 1
)

echo.
echo ============================================
echo  BUILD OK!
echo  APK: %DST%\build\app\outputs\flutter-apk\OursMusic_release.apk
echo ============================================
pause
