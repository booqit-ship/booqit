
# BooqIt PWA Deployment Guide

## Files Created for PWA Conversion

### Core PWA Files
- `/public/manifest.json` - PWA manifest with app configuration
- `/public/pwabuilder-sw.js` - Enhanced service worker for offline functionality
- `/public/.well-known/assetlinks.json` - Digital Asset Links for Android verification

### Icon Assets (Replace with actual BooqIt branded icons)
- `/public/icons/icon-72x72.png`
- `/public/icons/icon-96x96.png`
- `/public/icons/icon-128x128.png`
- `/public/icons/icon-144x144.png`
- `/public/icons/icon-152x152.png`
- `/public/icons/icon-192x192.png` ⭐ **Required**
- `/public/icons/icon-384x384.png`
- `/public/icons/icon-512x512.png` ⭐ **Required**

### Screenshot Assets (Replace with actual app screenshots)
- `/public/screenshots/home-screen.png`
- `/public/screenshots/booking-screen.png`
- `/public/screenshots/calendar-screen.png`

## Pre-Deployment Checklist

### 1. Replace Placeholder Assets
- [ ] Replace all icon files with actual BooqIt branded icons
- [ ] Replace screenshot files with actual app screenshots
- [ ] Update icon paths in manifest.json if needed

### 2. Configure Package Settings
- [ ] Update `package_name` in `assetlinks.json` with your actual Android package name
- [ ] Update `sha256_cert_fingerprints` with your actual signing certificate fingerprint
- [ ] Verify theme colors match your brand (currently set to #7E57C2)

### 3. Test PWA Functionality
- [ ] Test service worker caching
- [ ] Verify offline functionality
- [ ] Test "Add to Home Screen" on mobile devices
- [ ] Validate manifest.json using browser dev tools

## PWABuilder.com Deployment Steps

1. **Upload to PWABuilder**
   - Go to https://pwabuilder.com
   - Enter your app URL
   - Click "Start" to analyze your PWA

2. **Configure Android Settings**
   - Select Android platform
   - Choose "Trusted Web Activity" option
   - Configure package name and signing options
   - Add required permissions (location, notifications)

3. **Download and Sign APK**
   - Download the generated APK
   - Sign with your certificate
   - Test on Android device

## Location Permission Implementation

The app is configured to request location permissions for:
- Finding nearby services
- Map functionality
- Location-based booking

Permissions are handled through:
- Browser geolocation API
- Android location permissions in PWA wrapper
- Graceful fallback for denied permissions

## Important Notes

- **Icons**: All icon files are currently placeholders. Replace with proper BooqIt branded icons.
- **Screenshots**: Replace with actual app screenshots for better store presentation.
- **Package Name**: Update Android package name in `assetlinks.json`.
- **Signing**: Use your own certificate for production APK signing.
- **Testing**: Test thoroughly on various Android devices before store submission.

## Verification

After deployment, verify:
- [ ] PWA installs correctly on mobile
- [ ] Service worker caches resources
- [ ] Offline functionality works
- [ ] Location requests work properly
- [ ] App shortcuts function correctly
- [ ] Push notifications work (if implemented)

## Troubleshooting

Common issues:
- **Icons not loading**: Check file paths and ensure all referenced icons exist
- **Manifest errors**: Validate JSON syntax and required fields
- **Service worker issues**: Check console logs and cache behavior
- **Location not working**: Verify HTTPS deployment and permission handling
