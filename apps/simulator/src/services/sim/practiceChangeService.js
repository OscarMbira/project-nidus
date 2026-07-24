/**
 * Practice Change Service — alias for Simulator changeManagementService (sim.practice_change_*).
 * Plan: projectplan/v792_change_management_tier_inheritance_plan.md Phase 0.
 */
export {
  fetchChangeBoards,
  fetchChangeBoard,
  createChangeBoard,
  updateChangeBoard,
  fetchChangeBoardMembers,
  addChangeBoardMember,
  removeChangeBoardMember,
  fetchChangeRequests,
  fetchChangeRequest,
  createChangeRequest,
  updateChangeRequest,
  deleteChangeRequest,
  fetchChangeAssessment,
  createChangeAssessment,
  updateChangeAssessment,
  fetchChangeApprovals,
  createChangeApproval,
  updateChangeApproval,
  fetchChangeImplementation,
  createChangeImplementation,
  updateChangeImplementation,
  fetchChangeLog,
  addChangeLogEntry,
  getChangeManagementStats,
} from '../changeManagementService'

export { default } from '../changeManagementService'
