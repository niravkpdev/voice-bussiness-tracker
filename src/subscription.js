export const PLAN_LIMITS = {
  'Free Trial': { 
    customers: 50, 
    products: 50, 
    employees: 5,
    users: 1,
    ai: false,
    label: '1 Month Free Trial',
    price: 0,
    trialDays: 30
  },
  'Basic': { 
    customers: 500, 
    products: 500, 
    employees: 10,
    users: 1,
    ai: false,
    label: 'Basic',
    price: 99
  },
  'Starter': { 
    customers: 500, 
    products: 500, 
    employees: 10,
    users: 1,
    ai: false,
    label: 'Basic',
    price: 99
  },
  'Professional': { 
    customers: 999999, 
    products: 999999, 
    employees: 50,
    users: 5,
    ai: true,
    label: 'Professional',
    price: 499
  },
  'Enterprise': { 
    customers: 999999, 
    products: 999999, 
    employees: 999999,
    users: 999999,
    ai: true,
    label: 'Enterprise',
    price: 'Custom'
  }
};

/**
 * Get the max limit for a specific feature based on the user's plan.
 */
export function getPlanLimit(currentPlan, featureName) {
  const plan = PLAN_LIMITS[currentPlan] || PLAN_LIMITS['Free Trial'];
  return plan[featureName] !== undefined ? plan[featureName] : 0;
}

/**
 * Check if the user can use or add more of a specific feature.
 * Returns true if allowed, false if limit reached.
 */
export function canUseFeature(currentPlan, featureName, currentUsageCount = 0) {
  const limit = getPlanLimit(currentPlan, featureName);
  
  if (typeof limit === 'boolean') {
    return limit === true;
  }
  
  return currentUsageCount < limit;
}

/**
 * Get a friendly upgrade message when a limit is reached.
 */
export function getUpgradeMessage(currentPlan, featureName) {
  const planName = currentPlan || 'Free Trial';
  
  const messages = {
    customers: `You have reached the ${planName} customer limit. Upgrade to add more customers.`,
    products: `You have reached the ${planName} product limit. Upgrade to add more products.`,
    employees: `You have reached the ${planName} employee limit. Upgrade to add more employees.`,
    users: `You have reached the ${planName} team member limit. Upgrade to add more users.`,
    ai: `Trinetr AI Assistant is only available on Professional and Enterprise plans. Upgrade to unlock AI.`
  };
  
  return messages[featureName] || `You have reached the limit for your current plan. Please upgrade to continue.`;
}

/**
 * Calculate trial days left (1 Month Free Trial = 30 days)
 */
export function getTrialDaysLeft(trialStartDate) {
  if (!trialStartDate) return 30;
  const start = new Date(trialStartDate);
  const now = new Date();
  const diffTime = Math.max(0, now - start);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const remaining = 30 - diffDays;
  return remaining > 0 ? remaining : 0;
}
