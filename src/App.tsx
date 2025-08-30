// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import { AccessibilityProvider, SkipLink } from './components/accessibility/AccessibilityProvider';
import { FocusManager } from './components/accessibility/FocusManager';
import ErrorBoundary from './components/common/ErrorBoundary';
import MockModeIndicator from './components/MockModeIndicator';
import LandingPage from './pages/LandingPage';
import EnvironmentSelectionPage from './pages/EnvironmentSelectionPage';
import SelectZonePage from './pages/SelectZonePage'; // Legacy zone selection (keeping for backward compatibility)
import GroupViewPage from './pages/GroupViewPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import HelpPage from './pages/HelpPage';
import AboutPage from './pages/AboutPage';

function App() {
  return (
    <AccessibilityProvider>
      <ErrorBoundary>
        <div>
          {/* Mock mode indicator */}
          <MockModeIndicator />
          
          {/* Skip links for keyboard navigation */}
          <SkipLink href="#main-content">Skip to main content</SkipLink>

          {/* Main application content */}
          <main id="main-content" role="main" tabIndex={-1}>
            <FocusManager>
              {/* Define your application routes */}
              <Routes>
                {/* Landing Page - New primary entry point */}
                <Route path="/" element={<LandingPage />} />

                {/* Environment Selection - Phase 3 implementation */}
                <Route path="/environments" element={<EnvironmentSelectionPage />} />

                {/* Legacy zone selection - maintaining backward compatibility */}
                <Route path="/zones" element={<SelectZonePage />} />

                {/* Main tracking view - supports environment parameter */}
                <Route path="/group-view" element={<GroupViewPage />} />

                {/* Analytics Page - Phase 9 implementation */}
                <Route path="/analytics" element={<AnalyticsPage />} />

                {/* Settings Page - Phase 10 implementation */}
                <Route path="/settings" element={<SettingsPage />} />

                {/* Placeholder routes for future pages */}
                <Route
                  path="/custom-setup"
                  element={
                    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                      <h1 className="text-2xl" role="heading" aria-level={1}>
                        Custom Setup - Coming Soon
                      </h1>
                    </div>
                  }
                />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/about" element={<AboutPage />} />

                {/* 404 fallback */}
                <Route
                  path="*"
                  element={
                    <div
                      className="min-h-screen bg-gray-900 text-white flex items-center justify-center"
                      role="alert"
                    >
                      <div className="text-center">
                        <h1 className="text-2xl mb-4" role="heading" aria-level={1}>
                          Page Not Found
                        </h1>
                        <p className="text-gray-400 mb-4">
                          The page you're looking for doesn't exist.
                        </p>
                        <a
                          href="/"
                          className="text-orange-400 hover:text-orange-300 underline focus:outline-none focus:ring-2 focus:ring-orange-500 rounded px-1"
                        >
                          Return to Home
                        </a>
                      </div>
                    </div>
                  }
                />
              </Routes>
            </FocusManager>
          </main>
        </div>
      </ErrorBoundary>
    </AccessibilityProvider>
  );
}

export default App;
