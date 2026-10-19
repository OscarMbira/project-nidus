/**
 * v1239 Slice 3 — schedule route table (relative to a `schedule/*` mount), shared by every shell:
 *   Platform  /platform/…/schedule/*, /platform/projects/:projectId/schedule/*
 *   Simulator /simulator/practice-projects/:projectId/schedule/*
 *   Planner   /app/schedule/*
 * The shell wraps it in a PlanningProvider. App-local estimating pages (ActivityDetail,
 * ScheduleManagementPlan) keep their explicit routes, which rank above this splat.
 */
import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ScheduleLayout from '../components/ScheduleLayout.jsx'

const ScheduleGridScreen = lazy(() => import('../screens/schedule/ScheduleGridScreen.jsx'))
const TaskFormScreen = lazy(() => import('../screens/schedule/TaskFormScreen.jsx'))
const ScheduleGanttScreen = lazy(() => import('../screens/schedule/ScheduleGanttScreen.jsx'))
const ScheduleNetworkScreen = lazy(() => import('../screens/schedule/ScheduleNetworkScreen.jsx'))
const ScheduleFilteredListScreen = lazy(() => import('../screens/schedule/ScheduleFilteredListScreen.jsx'))
const ScheduleDependenciesScreen = lazy(() => import('../screens/schedule/ScheduleDependenciesScreen.jsx'))
const ScheduleCalendarScreen = lazy(() => import('../screens/schedule/ScheduleCalendarScreen.jsx'))
const CalendarExceptionFormScreen = lazy(() => import('../screens/schedule/CalendarExceptionFormScreen.jsx'))
const ScheduleBaselinesScreen = lazy(() => import('../screens/schedule/ScheduleBaselinesScreen.jsx'))
const ScheduleWorkloadScreen = lazy(() => import('../screens/schedule/ScheduleWorkloadScreen.jsx'))
const ScheduleTimeScreen = lazy(() => import('../screens/schedule/ScheduleTimeScreen.jsx'))
const ScheduleExchangeScreen = lazy(() => import('../screens/schedule/ScheduleExchangeScreen.jsx'))
const TasksBoard = lazy(() => import('../screens/tasks/TasksBoard.jsx'))
const TasksCalendar = lazy(() => import('../screens/tasks/TasksCalendar.jsx'))

// v1265: Board and Due dates sit inside the schedule frame like every other tab (Back, tabs,
// full screen, task modal); the standalone /tasks/board and /tasks/calendar pages are unchanged.
function ScheduleBoardTab() {
  return <ScheduleLayout title="Board" description="Tasks as cards by status."><TasksBoard embedded /></ScheduleLayout>
}
function ScheduleDueDatesTab() {
  return <ScheduleLayout title="Due dates" description="Tasks by due date. Pick a day to see what is due."><TasksCalendar embedded /></ScheduleLayout>
}

export default function ScheduleRoutes({ fallback = null }) {
  return (
    <Suspense fallback={fallback}>
      <Routes>
        <Route index element={<Navigate to="activities" replace />} />
        <Route path="activities" element={<ScheduleGridScreen />} />
        <Route path="tasks" element={<Navigate to="../activities" replace />} />
        <Route path="tasks/new" element={<TaskFormScreen />} />
        <Route path="tasks/:taskKey" element={<TaskFormScreen />} />
        <Route path="tasks/:taskKey/edit" element={<TaskFormScreen />} />
        <Route path="gantt" element={<ScheduleGanttScreen />} />
        <Route path="network" element={<ScheduleNetworkScreen />} />
        <Route path="critical-path" element={<ScheduleFilteredListScreen key="critical-path" preset="critical-path" />} />
        <Route path="milestones" element={<ScheduleFilteredListScreen key="milestones" preset="milestones" />} />
        <Route path="look-ahead" element={<ScheduleFilteredListScreen key="look-ahead" preset="look-ahead" />} />
        <Route path="variance" element={<ScheduleFilteredListScreen key="variance" preset="variance" />} />
        <Route path="dependencies" element={<ScheduleDependenciesScreen />} />
        <Route path="calendar" element={<ScheduleCalendarScreen />} />
        <Route path="calendar/exceptions" element={<ScheduleCalendarScreen />} />
        <Route path="calendar/exceptions/create" element={<CalendarExceptionFormScreen />} />
        <Route path="calendar/exceptions/:exceptionId" element={<CalendarExceptionFormScreen />} />
        <Route path="calendar/exceptions/:exceptionId/edit" element={<CalendarExceptionFormScreen />} />
        <Route path="baselines" element={<ScheduleBaselinesScreen />} />
        <Route path="workload" element={<ScheduleWorkloadScreen />} />
        <Route path="board" element={<ScheduleBoardTab />} />
        <Route path="time" element={<ScheduleTimeScreen />} />
        <Route path="exchange" element={<ScheduleExchangeScreen />} />
        <Route path="due-dates" element={<ScheduleDueDatesTab />} />
      </Routes>
    </Suspense>
  )
}
