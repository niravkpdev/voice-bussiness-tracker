const LOCAL_ANALYTICS_KEY = 'TRINETR_LOCAL_ANALYTICS';

let analyticsEnabled = true;

const loadLocalMetrics = () => {
  try {
    const raw = localStorage.getItem(LOCAL_ANALYTICS_KEY);
    return raw ? JSON.parse(raw) : {
      totalSignups: 0,
      demoUsers: 0,
      activeUsers: 0,
      moduleUsage: {},
      productsAdded: 0,
      customersAdded: 0,
      employeesAdded: 0,
      upgradeClicks: 0,
      pricingPageViews: 0,
    };
  } catch (e) {
    return null;
  }
};

const saveLocalMetrics = (metrics) => {
  try {
    localStorage.setItem(LOCAL_ANALYTICS_KEY, JSON.stringify(metrics));
  } catch (e) {
    // ignore
  }
};

export const setAnalyticsConsent = (enabled) => {
  analyticsEnabled = enabled;
};

export const initAnalytics = () => {
  if (!analyticsEnabled) return;
  
  if (import.meta.env.DEV) {
    console.log('[Analytics] Initialized (Dev Mode)');
  }

  // GA4
  if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
    console.log('[Analytics] GA4 configured');
  }

  // Clarity
  if (import.meta.env.VITE_CLARITY_PROJECT_ID) {
    console.log('[Analytics] Clarity configured');
  }

  // PostHog
  if (import.meta.env.VITE_POSTHOG_KEY) {
    console.log('[Analytics] PostHog configured');
  }
};

export const trackPageView = (path) => {
  if (!analyticsEnabled) return;
  
  if (import.meta.env.DEV) {
    console.log(`[Analytics] Page View: ${path}`);
  }

  // Update local dashboard
  const metrics = loadLocalMetrics();
  if (metrics) {
    if (path === 'pricing' || path === '#pricing') {
      metrics.pricingPageViews = (metrics.pricingPageViews || 0) + 1;
    }
    
    // Module usage heuristics
    if (['inventory', 'customers', 'employees', 'ai-assistant', 'dashboard'].includes(path)) {
      metrics.moduleUsage[path] = (metrics.moduleUsage[path] || 0) + 1;
    }
    
    saveLocalMetrics(metrics);
  }
};

export const trackEvent = (eventName, properties = {}) => {
  if (!analyticsEnabled) return;
  
  if (import.meta.env.DEV) {
    console.log(`[Analytics] Event: ${eventName}`, properties);
  }

  const metrics = loadLocalMetrics();
  if (!metrics) return;

  switch (eventName) {
    case 'Signup started':
      metrics.totalSignups += 1;
      break;
    case 'Demo mode started':
      metrics.demoUsers += 1;
      break;
    case 'Login successful':
      metrics.activeUsers += 1; // Simplistic but serves local demo
      break;
    case 'Product added':
      metrics.productsAdded += 1;
      break;
    case 'Customer added':
      metrics.customersAdded += 1;
      break;
    case 'Employee added':
      metrics.employeesAdded += 1;
      break;
    case 'Upgrade clicked':
      metrics.upgradeClicks += 1;
      break;
    default:
      break;
  }
  
  saveLocalMetrics(metrics);
};

export const identifyUser = (userId, traits = {}) => {
  if (!analyticsEnabled) return;
  
  // NEVER log passwords or secure tokens
  const safeTraits = { ...traits };
  delete safeTraits.password;
  delete safeTraits.token;

  if (import.meta.env.DEV) {
    console.log(`[Analytics] Identify User: ${userId}`, safeTraits);
  }
};

export const resetAnalytics = () => {
  if (import.meta.env.DEV) {
    console.log('[Analytics] Reset session');
  }
};

export const captureError = (error, context = {}) => {
  // Always log errors locally regardless of consent to prevent debugging blindspots,
  // but we won't send them upstream if consent is revoked.
  console.error('[Error Tracker]', error, context);
};
