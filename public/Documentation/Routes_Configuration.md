# Routes Configuration for Dual-Subscription System

**Purpose:** Add these routes to your App.jsx or routing configuration

---

## New Routes to Add

### Pricing Routes

```jsx
import PMPricing from './pages/PMPricing';
import BundlePricing from './pages/BundlePricing';
import SubscriptionDashboard from './pages/SubscriptionDashboard';
import CheckoutSuccess from './pages/checkout/CheckoutSuccess';
import CheckoutCancel from './pages/checkout/CheckoutCancel';

// Add to your Routes configuration:

{/* Platform Pricing */}
<Route path="/pricing" element={<PMPricing />} />

{/* Bundle Pricing */}
<Route path="/bundle-pricing" element={<BundlePricing />} />

{/* Subscription Dashboard (Protected) */}
<Route
  path="/subscriptions"
  element={
    <ProtectedRoute>
      <SubscriptionDashboard />
    </ProtectedRoute>
  }
/>

{/* Checkout Success/Cancel */}
<Route path="/checkout/success" element={<CheckoutSuccess />} />
<Route path="/checkout/cancel" element={<CheckoutCancel />} />
```

---

## Updated Protected Routes with Platform Access

### Platform Routes

```jsx
{/* Dashboard - Platform */}
<Route
  path="/dashboard"
  element={
    <ProtectedRoute requiredPlatform="pm">
      <Dashboard />
    </ProtectedRoute>
  }
/>

{/* Projects - Platform */}
<Route
  path="/projects"
  element={
    <ProtectedRoute requiredPlatform="pm">
      <Projects />
    </ProtectedRoute>
  }
/>

{/* All other PM routes */}
<Route
  path="/tasks"
  element={
    <ProtectedRoute requiredPlatform="pm">
      <Tasks />
    </ProtectedRoute>
  }
/>
```

### Simulator Routes

```jsx
{/* Simulator Dashboard */}
<Route
  path="/simulator"
  element={
    <ProtectedRoute requiredPlatform="simulator">
      <SimulatorDashboard />
    </ProtectedRoute>
  }
/>

{/* Simulator Scenarios */}
<Route
  path="/simulator/scenarios"
  element={
    <ProtectedRoute requiredPlatform="simulator">
      <Scenarios />
    </ProtectedRoute>
  }
/>

{/* All other Simulator routes */}
<Route
  path="/simulator/runs"
  element={
    <ProtectedRoute requiredPlatform="simulator">
      <SimulationRuns />
    </ProtectedRoute>
  }
/>
```

---

## Complete Example App.jsx

```jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages
import Register from './pages/auth/Register';
import Login from './pages/auth/Login';

// Pricing Pages
import PMPricing from './pages/PMPricing';
import BundlePricing from './pages/BundlePricing';
import SubscriptionDashboard from './pages/SubscriptionDashboard';

// Checkout Pages
import CheckoutSuccess from './pages/checkout/CheckoutSuccess';
import CheckoutCancel from './pages/checkout/CheckoutCancel';

// Platform Pages
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';

// Simulator Pages
import SimulatorDashboard from './pages/simulator/SimulatorDashboard';
import Scenarios from './pages/simulator/Scenarios';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* Pricing Routes (Public) */}
        <Route path="/pricing" element={<PMPricing />} />
        <Route path="/bundle-pricing" element={<BundlePricing />} />
        <Route path="/simulator/pricing" element={<SimulatorPricing />} />

        {/* Subscription Management (Protected) */}
        <Route
          path="/subscriptions"
          element={
            <ProtectedRoute>
              <SubscriptionDashboard />
            </ProtectedRoute>
          }
        />

        {/* Checkout Routes */}
        <Route path="/checkout/success" element={<CheckoutSuccess />} />
        <Route path="/checkout/cancel" element={<CheckoutCancel />} />

        {/* Platform Routes (Protected with PM platform requirement) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredPlatform="pm">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute requiredPlatform="pm">
              <Projects />
            </ProtectedRoute>
          }
        />
        {/* Add all other PM routes... */}

        {/* Simulator Routes (Protected with simulator platform requirement) */}
        <Route
          path="/simulator"
          element={
            <ProtectedRoute requiredPlatform="simulator">
              <SimulatorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/simulator/scenarios"
          element={
            <ProtectedRoute requiredPlatform="simulator">
              <Scenarios />
            </ProtectedRoute>
          }
        />
        {/* Add all other Simulator routes... */}
      </Routes>
    </Router>
  );
}

export default App;
```

---

## Navigation Menu Updates

Update your navigation menu to show platform-specific links:

```jsx
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { getAllPlatformStatuses } from '../services/unifiedSubscriptionService';

function Navigation() {
  const [platformAccess, setPlatformAccess] = useState({
    pm: false,
    simulator: false,
  });

  useEffect(() => {
    loadPlatformAccess();
  }, []);

  const loadPlatformAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const access = await getAllPlatformStatuses(user.id);
      setPlatformAccess(access);
    }
  };

  return (
    <nav>
      {platformAccess.pm && (
        <a href="/dashboard">PM Dashboard</a>
      )}

      {platformAccess.simulator && (
        <a href="/simulator">Simulator</a>
      )}

      <a href="/subscriptions">Subscriptions</a>
      <a href="/pricing">Pricing</a>
    </nav>
  );
}
```

---

## Sidebar Menu Integration

Add to your sidebar menu configuration:

```javascript
const menuItems = [
  // Platform Section
  {
    title: 'Platform',
    visible: platformAccess.pm,
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { path: '/projects', label: 'Projects', icon: 'FolderKanban' },
      // ... other PM menu items
    ],
  },

  // Simulator Section
  {
    title: 'Simulator',
    visible: platformAccess.simulator,
    items: [
      { path: '/simulator', label: 'Dashboard', icon: 'Gamepad2' },
      { path: '/simulator/scenarios', label: 'Scenarios', icon: 'BookOpen' },
      // ... other Simulator menu items
    ],
  },

  // Common Section
  {
    title: 'Account',
    visible: true,
    items: [
      { path: '/subscriptions', label: 'Subscriptions', icon: 'CreditCard' },
      { path: '/settings', label: 'Settings', icon: 'Settings' },
    ],
  },
];
```

---

## Quick Implementation Steps

1. **Copy routes from this document**
2. **Add imports** for new components
3. **Update ProtectedRoute** usage to include `requiredPlatform` prop
4. **Update navigation menus** to conditionally show platform links
5. **Test all routes** with different subscription states

---

**Last Updated:** 2025-11-26
**Status:** Ready to Implement
