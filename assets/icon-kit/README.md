# Dera Skul — App Icon & Favicon Package

Matches the graduation-cap mark from your onboarding screen: terracotta
rounded-square background (`#C66F5B → #A6543F` gradient), off-white
(`#FBF8F3`) cap glyph.

## Contents

```
app-icon/
  icon.svg                 vector source
  icon-1024/512/192/180/152/120.png   for app stores, manifest, splash screens

favicon/
  favicon.svg               vector source (bolder proportions — stays crisp small)
  favicon.ico                multi-size (16/32/48/64) — put at your site root
  favicon-16 ... 512.png    individual sizes
  apple-touch-icon-180.png  iOS home-screen icon
  android-chrome-192/512.png PWA manifest icons
```

## Browser `<head>`

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon-180.png">
<link rel="manifest" href="/site.webmanifest">
```

```json
{
  "name": "Dera Skul",
  "short_name": "Dera Skul",
  "icons": [
    { "src": "/android-chrome-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#C66F5B",
  "background_color": "#FBF8F3",
  "display": "standalone"
}
```

Both `.svg` files are plain vector markup — editable in Figma/Illustrator/Inkscape or importable into Canva.
