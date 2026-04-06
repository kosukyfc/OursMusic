# Como buildar o APK para produção

## Pré-requisitos
- Flutter SDK instalado
- Android SDK / Java

## Comando de build

```bat
cd music-app\mobile

flutter pub get

flutter build apk --release ^
  --dart-define=APP_VERSION=1.0.5 ^
  --dart-define=API_URL=https://oursmusics.shop/api ^
  --dart-define=DEVICE_TYPE=mobile ^
  --target-platform android-arm,android-arm64
```

## Após o build

O APK estará em:
`build\app\outputs\flutter-apk\app-release.apk`

Copie para:
`..\backend\apk-releases\app-mobile.apk`

Ou faça upload pelo painel admin em:
`https://oursmusics.shop` → Admin → Publicar App
