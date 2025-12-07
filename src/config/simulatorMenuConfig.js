/**
 * Simulator Platform Menu Configuration
 * Defines menu structure for Simulator Platform with subscription-based visibility
 */

export const simulatorMenuConfig = [
  {
    id: 'sim-dashboard',
    label: 'Dashboard',
    path: '/simulator/dashboard',
    icon: 'layout-dashboard',
    subscriptionTier: null, // Available to all
  },
  {
    id: 'sim-scenarios',
    label: 'Scenarios',
    path: null,
    icon: 'gamepad-2',
    subscriptionTier: null,
    children: [
      {
        id: 'sim-scenarios-browse',
        label: 'Browse Scenarios',
        path: '/simulator/scenarios',
        subscriptionTier: null,
      },
      {
        id: 'sim-scenarios-progress',
        label: 'My Progress',
        path: '/simulator/scenarios/progress',
        subscriptionTier: null,
      },
      {
        id: 'sim-scenarios-custom',
        label: 'Custom Scenarios',
        path: '/simulator/scenarios/custom',
        subscriptionTier: 'premium', // Premium only
      },
    ],
  },
  {
    id: 'sim-learning-path',
    label: 'Learning Path',
    path: '/simulator/learning-path',
    icon: 'graduation-cap',
    subscriptionTier: null,
  },
  {
    id: 'sim-leaderboard',
    label: 'Leaderboard',
    path: '/simulator/leaderboard',
    icon: 'trophy',
    subscriptionTier: null,
  },
  {
    id: 'sim-certificates',
    label: 'Certificates',
    path: '/simulator/certificates',
    icon: 'award',
    subscriptionTier: null,
  },
  {
    id: 'sim-profile',
    label: 'Profile',
    path: null,
    icon: 'user',
    subscriptionTier: null,
    children: [
      {
        id: 'sim-profile-stats',
        label: 'My Stats',
        path: '/simulator/profile/stats',
        subscriptionTier: null,
      },
      {
        id: 'sim-profile-badges',
        label: 'Badges & Achievements',
        path: '/simulator/profile/badges',
        subscriptionTier: null,
      },
    ],
  },
  {
    id: 'sim-settings',
    label: 'Settings',
    path: '/simulator/settings',
    icon: 'settings',
    subscriptionTier: null,
  },
]

/**
 * Check if menu item should be visible based on subscription tier
 * @param {object} menuItem - Menu item configuration
 * @param {string} userSubscriptionTier - User's subscription tier ('free', 'premium', etc.)
 * @returns {boolean}
 */
export function isSimMenuItemVisible(menuItem, userSubscriptionTier = 'free') {
  // If no subscription tier required, always visible
  if (!menuItem.subscriptionTier) {
    return true
  }

  // Premium features require premium subscription
  if (menuItem.subscriptionTier === 'premium') {
    return userSubscriptionTier === 'premium' || userSubscriptionTier === 'enterprise'
  }

  return true
}

/**
 * Filter menu items based on subscription tier
 * @param {array} menuItems - Menu items to filter
 * @param {string} userSubscriptionTier - User's subscription tier
 * @returns {array} Filtered menu items
 */
export function filterSimMenuBySubscription(menuItems, userSubscriptionTier = 'free') {
  return menuItems
    .filter((item) => isSimMenuItemVisible(item, userSubscriptionTier))
    .map((item) => {
      if (item.children) {
        return {
          ...item,
          children: filterSimMenuBySubscription(item.children, userSubscriptionTier),
        }
      }
      return item
    })
    .filter((item) => !item.children || item.children.length > 0) // Remove items with no visible children
}

export default simulatorMenuConfig

