// Frontend performance utilities

/**
 * Measure and report Core Web Vitals
 */
export function setupWebVitals() {
  // Largest Contentful Paint
  const lcp = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1] as any;
    console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
  });
  lcp.observe({ entryTypes: ['largest-contentful-paint'] });

  // First Input Delay
  const fid = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry: any) => {
      console.log('FID:', entry.processingDuration);
    });
  });
  fid.observe({ entryTypes: ['first-input'] });

  // Cumulative Layout Shift
  let clsValue = 0;
  const cls = new PerformanceObserver((list) => {
    for (const { hadRecentInput, value } of list.getEntries() as any[]) {
      if (!hadRecentInput) {
        clsValue += value;
        console.log('CLS:', clsValue);
      }
    }
  });
  cls.observe({ entryTypes: ['layout-shift'] });

  // First Contentful Paint
  const paint = performance.getEntries();
  const fcp = paint.find((entry) => entry.name === 'first-contentful-paint');
  console.log('FCP:', fcp?.startTime);
}

/**
 * Track route performance
 */
export function trackRoutePerformance(routeName: string) {
  const start = performance.now();

  return () => {
    const duration = performance.now() - start;
    console.log(`Route [${routeName}] took ${duration}ms`);

    // Report to analytics
    if ((window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_path: routeName,
        page_load_time: duration,
      });
    }
  };
}

/**
 * Lazy load images
 */
export function setupImageLazyLoading() {
  const images = document.querySelectorAll('img[data-src]');

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = img.dataset.src || '';
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  });

  images.forEach((img) => imageObserver.observe(img));
}

/**
 * Request Idle Callback polyfill
 */
export function scheduleIdleWork(callback: () => void) {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback);
  } else {
    setTimeout(callback, 0);
  }
}

/**
 * Memory usage monitoring
 */
export function setupMemoryMonitoring() {
  if (!(performance as any).memory) {
    console.warn('Memory monitoring not available');
    return;
  }

  setInterval(() => {
    const mem = (performance as any).memory;
    const percentUsed = (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100;

    console.log(`Memory: ${percentUsed.toFixed(2)}% used`);

    if (percentUsed > 90) {
      console.warn('High memory usage detected!');
    }
  }, 30000);
}

/**
 * Long task monitoring
 */
export function setupLongTaskMonitoring() {
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      console.warn(`Long task detected: ${entry.duration}ms`);
    });
  });

  try {
    observer.observe({ entryTypes: ['longtask'] });
  } catch (e) {
    console.warn('Long task monitoring not supported');
  }
}
