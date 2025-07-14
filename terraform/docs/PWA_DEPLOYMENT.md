# PWA & SPA Deployment Guide

This guide covers the specific considerations for deploying a **Single Page Application (SPA)** and **Progressive Web App (PWA)** to AWS.

## PWA & SPA Architecture

```
Internet → CloudFront CDN → S3 Bucket (Static Files)
                    ↓
              PWA Features:
              - Service Worker (Offline Support)
              - Manifest (App-like Experience)
              - HTTPS (Required for PWA)
              - Caching Strategies
```

## Key PWA Requirements

### ✅ **HTTPS Required**
- CloudFront provides automatic SSL certificates
- All PWA features require HTTPS
- Service workers only work over HTTPS

### ✅ **Service Worker Support**
- **No caching** for service worker files
- **Immediate updates** for new versions
- **Offline functionality** support

### ✅ **Manifest File**
- **Short cache** (1 hour) for updates
- **App icons** and metadata
- **Install prompts** for mobile devices

### ✅ **SPA Routing**
- **All routes** serve `index.html`
- **Client-side routing** support
- **Deep linking** works correctly

## CloudFront Configuration for PWA

### Error Handling for SPA
```hcl
# All error responses serve index.html for SPA routing
custom_error_response {
  error_code         = 404
  response_code      = "200"
  response_page_path = "/index.html"
}

custom_error_response {
  error_code         = 403
  response_code      = "200"
  response_page_path = "/index.html"
}
```

### Cache Behaviors for PWA Assets

#### Service Worker (No Caching)
```hcl
ordered_cache_behavior {
  path_pattern     = "/service-worker.js"
  default_ttl      = 0        # No caching
  max_ttl          = 0
}
```

#### Manifest (Short Cache)
```hcl
ordered_cache_behavior {
  path_pattern     = "/manifest.json"
  default_ttl      = 3600     # 1 hour
  max_ttl          = 86400    # 24 hours
}
```

#### Static Assets (Long Cache)
```hcl
ordered_cache_behavior {
  path_pattern     = "/static/*"
  default_ttl      = 86400    # 24 hours
  max_ttl          = 31536000 # 1 year
}
```

## PWA Deployment Checklist

### ✅ **Infrastructure Setup**
- [ ] S3 bucket with website hosting enabled
- [ ] CloudFront distribution with HTTPS
- [ ] CORS configuration for PWA assets
- [ ] Proper cache behaviors configured

### ✅ **PWA Assets**
- [ ] `manifest.json` with app metadata
- [ ] `service-worker.js` for offline support
- [ ] App icons in multiple sizes
- [ ] Proper cache headers set

### ✅ **SPA Configuration**
- [ ] All routes serve `index.html`
- [ ] Client-side routing works
- [ ] Deep links function correctly
- [ ] Browser back/forward works

### ✅ **Performance Optimization**
- [ ] Static assets cached aggressively
- [ ] Service worker not cached
- [ ] Manifest cached for 1 hour
- [ ] Compression enabled

## PWA Testing Checklist

### ✅ **Core PWA Features**
- [ ] App installs on mobile devices
- [ ] Works offline (with service worker)
- [ ] Shows app icon on home screen
- [ ] Splash screen displays correctly

### ✅ **SPA Functionality**
- [ ] All routes load correctly
- [ ] Browser back/forward works
- [ ] Deep links function
- [ ] No 404 errors on routes

### ✅ **Performance**
- [ ] Fast loading times
- [ ] Proper caching behavior
- [ ] Service worker updates immediately
- [ ] Manifest updates within 1 hour

## PWA-Specific Deployment Commands

### Set Cache Headers for PWA Assets

```bash
# Service worker - no caching
aws s3 cp build/service-worker.js s3://BUCKET_NAME/service-worker.js \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "application/javascript"

# Manifest - short cache
aws s3 cp build/manifest.json s3://BUCKET_NAME/manifest.json \
  --cache-control "max-age=3600" \
  --content-type "application/json"

# App icons - long cache
aws s3 cp build/logo*.png s3://BUCKET_NAME/ \
  --cache-control "max-age=31536000" \
  --recursive
```

### Invalidate CloudFront Cache

```bash
# Invalidate service worker immediately
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/service-worker.js"

# Invalidate manifest for updates
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/manifest.json"
```

## PWA Manifest Example

```json
{
  "name": "Slay Drip",
  "short_name": "SlayDrip",
  "description": "Clothing management app",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/logo192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/logo512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## Service Worker Considerations

### Update Strategy
```javascript
// service-worker.js
self.addEventListener('install', (event) => {
  // Skip waiting for immediate activation
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});
```

### Cache Strategy
```javascript
// Cache static assets for offline use
self.addEventListener('fetch', (event) => {
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
```

## Performance Optimization

### CloudFront Cache Optimization
- **Static assets**: 1 year cache
- **Manifest**: 1 hour cache
- **Service worker**: No cache
- **HTML**: 1 hour cache

### Bundle Optimization
- **Code splitting**: Route-based splitting
- **Tree shaking**: Remove unused code
- **Compression**: Gzip/Brotli enabled
- **Lazy loading**: Images and components

## Monitoring PWA Performance

### CloudWatch Metrics
```hcl
# Monitor PWA performance
resource "aws_cloudwatch_metric_alarm" "pwa_performance" {
  alarm_name          = "${var.app_name}-pwa-performance"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Requests"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Sum"
  threshold           = "100"
}
```

### PWA Audit Tools
- **Lighthouse**: PWA score and recommendations
- **Chrome DevTools**: Service worker debugging
- **WebPageTest**: Performance testing
- **GTmetrix**: Speed optimization

## Troubleshooting PWA Issues

### Common PWA Problems

1. **Service worker not updating**
   - Check cache headers (should be no-cache)
   - Invalidate CloudFront cache
   - Clear browser cache

2. **App not installing**
   - Verify HTTPS is working
   - Check manifest.json is valid
   - Ensure icons are accessible

3. **Offline functionality not working**
   - Verify service worker is registered
   - Check cache strategies
   - Test in incognito mode

4. **SPA routes returning 404**
   - Verify CloudFront error responses
   - Check S3 website configuration
   - Test direct S3 access

### Debug Commands

```bash
# Check service worker cache headers
curl -I https://YOUR_DOMAIN/service-worker.js

# Verify manifest accessibility
curl -I https://YOUR_DOMAIN/manifest.json

# Test SPA routing
curl -I https://YOUR_DOMAIN/some-route

# Check CloudFront cache status
aws cloudfront get-distribution --id DISTRIBUTION_ID
```

## Security Considerations

### HTTPS Requirements
- **PWA features require HTTPS**
- **Service workers only work over HTTPS**
- **CloudFront provides automatic SSL**

### Content Security Policy
```html
<!-- Add to index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
               style-src 'self' 'unsafe-inline';">
```

### CORS Configuration
```hcl
# S3 CORS for PWA
cors_rule {
  allowed_headers = ["*"]
  allowed_methods = ["GET", "HEAD"]
  allowed_origins = ["*"]
  expose_headers  = ["ETag"]
  max_age_seconds = 3000
}
```

## Next Steps for PWA

1. **Implement service worker** for offline functionality
2. **Create app icons** in multiple sizes
3. **Add manifest.json** with app metadata
4. **Test PWA features** on mobile devices
5. **Optimize performance** with caching strategies
6. **Monitor PWA metrics** with analytics
7. **Implement push notifications** (optional)
8. **Add app store listings** (optional)

Your PWA will be fully optimized for both SPA routing and PWA features with this configuration! 