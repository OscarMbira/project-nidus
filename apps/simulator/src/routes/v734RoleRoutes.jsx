/**
 * v734 role dashboard and turn-engine routes.
 */
import { Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import {
  LoadingFallback,
  ThemeProvider,
  ToastProvider,
  ProtectedRoute,
  SimulatorPortfolioLayout,
  SimulatorProgrammeLayout,
  SimulatorCoordinatorLayout,
  SimulatorPMOLayout,
  SimulatorPortfolioDashboard,
  SimulatorProgrammeDashboard,
  SimulatorCoordinatorDashboard,
  SimulatorRolePracticePage,
  SimulationTurnView,
  SimulationComplete,
  LearningPathDashboard,
  LearningModule,
  SimulatorRoleSelection,
  SimulatorTMRedirect,
  CollaborativeSessionLobby,
  CollaborativeSessionRoom,
  CollaborativeSessionDebrief,
  SubscriptionAccessGate,
} from './routeCommon';

function simRoute(content) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ThemeProvider>
        <ToastProvider>
          <ProtectedRoute requiredPlatform="simulator">
            {content}
          </ProtectedRoute>
        </ToastProvider>
      </ThemeProvider>
    </Suspense>
  );
}

export function V734RoleRouteElements() {
  return (
    <>
      <Route path="simulator/role-selection" element={simRoute(<SimulatorRoleSelection />)} />

      <Route path="simulator/portfolio/dashboard" element={simRoute(
        <SimulatorPortfolioLayout><SimulatorPortfolioDashboard /></SimulatorPortfolioLayout>
      )} />
      <Route
        path="simulator/portfolio/:pageKey"
        element={simRoute(
          <SimulatorPortfolioLayout><SimulatorRolePracticePage roleArea="portfolio" /></SimulatorPortfolioLayout>
        )}
      />

      <Route path="simulator/programme/dashboard" element={simRoute(
        <SimulatorProgrammeLayout><SimulatorProgrammeDashboard /></SimulatorProgrammeLayout>
      )} />
      <Route
        path="simulator/programme/:pageKey"
        element={simRoute(
          <SimulatorProgrammeLayout><SimulatorRolePracticePage roleArea="programme" /></SimulatorProgrammeLayout>
        )}
      />

      <Route path="simulator/coordinator/dashboard" element={simRoute(
        <SimulatorCoordinatorLayout><SimulatorCoordinatorDashboard /></SimulatorCoordinatorLayout>
      )} />
      <Route
        path="simulator/coordinator/:pageKey"
        element={simRoute(
          <SimulatorCoordinatorLayout><SimulatorRolePracticePage roleArea="coordinator" /></SimulatorCoordinatorLayout>
        )}
      />

      <Route
        path="simulator/pmo/analyst/:pageKey"
        element={simRoute(
          <SimulatorPMOLayout><SimulatorRolePracticePage roleArea="pmo" /></SimulatorPMOLayout>
        )}
      />

      <Route path="simulator/run/:runId/turns" element={simRoute(<SimulationTurnView />)} />
      <Route path="simulator/runs/:runId/complete" element={simRoute(<SimulationComplete />)} />

      <Route path="simulator/collaborative/lobby" element={simRoute(
        <SubscriptionAccessGate requiresCollaborative><CollaborativeSessionLobby /></SubscriptionAccessGate>
      )} />
      <Route path="simulator/collaborative/session/:sessionId" element={simRoute(
        <SubscriptionAccessGate requiresCollaborative><CollaborativeSessionRoom /></SubscriptionAccessGate>
      )} />
      {/* Debrief is deliberately NOT gated on requiresCollaborative — a participant whose
          Team seat was later revoked should still be able to see a session they already played. */}
      <Route path="simulator/collaborative/session/:sessionId/debrief" element={simRoute(<CollaborativeSessionDebrief />)} />
      <Route path="simulator/learning" element={simRoute(<LearningPathDashboard />)} />
      <Route path="simulator/learning/module/:moduleId" element={simRoute(<LearningModule />)} />

      <Route path="simulator/tm/*" element={simRoute(<SimulatorTMRedirect />)} />
      <Route path="role-selection" element={<Navigate to="/simulator/role-selection" replace />} />
    </>
  );
}
