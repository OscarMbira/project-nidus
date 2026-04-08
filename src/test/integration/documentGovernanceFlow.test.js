/**
 * Integration Tests for Document Governance Flow
 * Tests complete document lifecycle and version control
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createProjectDocument,
  submitDocumentForApproval,
  approveDocument,
  rejectDocument,
  createDocumentVersion
} from '../../services/documentGovernanceService';
import {
  uploadProjectDocument,
  downloadProjectDocument,
  getDocumentVersions
} from '../../services/documentStorageService';
import { checkStageGateRequirements } from '../../services/documentGovernanceService';

// Mock Supabase client for integration tests
const mockPlatformDb = {
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      createSignedUrl: vi.fn(),
      list: vi.fn()
    }))
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        maybeSingle: vi.fn(),
        order: vi.fn()
      })),
      order: vi.fn()
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    })),
    rpc: vi.fn()
  })),
  auth: {
    getUser: vi.fn()
  }
};

vi.mock('../../services/supabaseClient', () => ({
  platformDb: mockPlatformDb
}));

describe('Document Governance Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Document Lifecycle Flow', () => {
    it('should complete full document lifecycle: create → submit → approve', async () => {
      const projectId = 'proj-123';
      const documentTypeId = 'type-456';
      const userId = 'user-789';
      const approverId = 'approver-101';

      // Step 1: Create document
      const mockDocument = {
        id: 'doc-123',
        project_id: projectId,
        document_type_id: documentTypeId,
        status: 'not_started',
        owner_user_id: userId
      };

      mockPlatformDb.from().insert().select().single.mockResolvedValueOnce({
        data: mockDocument,
        error: null
      });
      mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: userId } } });

      const created = await createProjectDocument({
        project_id: projectId,
        document_type_id: documentTypeId,
        status: 'not_started',
        owner_user_id: userId
      });

      expect(created.id).toBe('doc-123');
      expect(created.status).toBe('not_started');

      // Step 2: Submit for approval
      const mockSubmitted = {
        ...mockDocument,
        status: 'submitted',
        submission_date: new Date().toISOString()
      };

      mockPlatformDb.from().update().eq().select().single.mockResolvedValueOnce({
        data: mockSubmitted,
        error: null
      });

      const submitted = await submitDocumentForApproval('doc-123', approverId);

      expect(submitted.status).toBe('submitted');
      expect(submitted.submission_date).toBeDefined();

      // Step 3: Approve document
      const mockApproved = {
        ...mockSubmitted,
        status: 'approved',
        approval_date: new Date().toISOString(),
        approver_user_id: approverId
      };

      mockPlatformDb.from().update().eq().select().single.mockResolvedValueOnce({
        data: mockApproved,
        error: null
      });

      const approved = await approveDocument('doc-123', approverId, 'Approved');

      expect(approved.status).toBe('approved');
      expect(approved.approval_date).toBeDefined();
    });

    it('should handle rejection and re-submission flow', async () => {
      const documentId = 'doc-123';
      const approverId = 'approver-101';

      // Step 1: Reject document
      const mockRejected = {
        id: documentId,
        status: 'rejected',
        rejection_reason: 'Needs more detail',
        rejection_date: new Date().toISOString()
      };

      mockPlatformDb.from().update().eq().select().single.mockResolvedValueOnce({
        data: mockRejected,
        error: null
      });
      mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: approverId } } });

      const rejected = await rejectDocument(documentId, approverId, 'Needs more detail');

      expect(rejected.status).toBe('rejected');
      expect(rejected.rejection_reason).toBe('Needs more detail');

      // Step 2: Re-submit after rejection
      const mockResubmitted = {
        ...mockRejected,
        status: 'submitted',
        submission_date: new Date().toISOString()
      };

      mockPlatformDb.from().update().eq().select().single.mockResolvedValueOnce({
        data: mockResubmitted,
        error: null
      });

      const resubmitted = await submitDocumentForApproval(documentId, approverId);

      expect(resubmitted.status).toBe('submitted');
    });
  });

  describe('Version Control Flow', () => {
    it('should create and manage document versions', async () => {
      const documentId = 'doc-123';
      const projectId = 'proj-456';
      const documentTypeId = 'type-789';

      // Upload version 1
      const mockFile1 = new File(['content v1'], 'document-v1.pdf', { type: 'application/pdf' });
      Object.defineProperty(mockFile1, 'size', { value: 1024 });

      const mockUpload1 = {
        path: `${projectId}/${documentTypeId}/1/uuid_document-v1.pdf`,
        filename: 'document-v1.pdf',
        size: 1024
      };

      mockPlatformDb.storage.from().upload.mockResolvedValueOnce({
        data: { path: mockUpload1.path },
        error: null
      });

      const uploadResult1 = await uploadProjectDocument(mockFile1, projectId, documentTypeId, 1);

      expect(uploadResult1.path).toBe(mockUpload1.path);

      // Upload version 2
      const mockFile2 = new File(['content v2'], 'document-v2.pdf', { type: 'application/pdf' });
      Object.defineProperty(mockFile2, 'size', { value: 2048 });

      const mockUpload2 = {
        path: `${projectId}/${documentTypeId}/2/uuid_document-v2.pdf`,
        filename: 'document-v2.pdf',
        size: 2048
      };

      mockPlatformDb.storage.from().upload.mockResolvedValueOnce({
        data: { path: mockUpload2.path },
        error: null
      });

      const uploadResult2 = await uploadProjectDocument(mockFile2, projectId, documentTypeId, 2);

      expect(uploadResult2.path).toBe(mockUpload2.path);

      // Get version history
      const mockVersions = [
        { id: 'v2', version_number: 2, file_path: mockUpload2.path, is_current: true },
        { id: 'v1', version_number: 1, file_path: mockUpload1.path, is_current: false }
      ];

      mockPlatformDb.from().select().eq().eq().order.mockResolvedValue({
        data: mockVersions,
        error: null
      });

      const versions = await getDocumentVersions(documentId);

      expect(versions).toHaveLength(2);
      expect(versions[0].version_number).toBe(2);
      expect(versions[0].is_current).toBe(true);
    });
  });

  describe('Stage Gate Compliance', () => {
    it('should block stage gate when mandatory documents are missing', async () => {
      const stageBoundaryId = 'gate-123';

      const mockCompliance = {
        can_approve: false,
        blocking_reason: 'Missing mandatory documents',
        missing_documents_count: 2,
        unapproved_documents_count: 0,
        missing_documents: [
          { document_type_name: 'PID', is_mandatory: true },
          { document_type_name: 'Business Case', is_mandatory: true }
        ]
      };

      mockPlatformDb.rpc.mockResolvedValue({
        data: mockCompliance,
        error: null
      });

      const result = await checkStageGateRequirements(stageBoundaryId);

      expect(result.can_approve).toBe(false);
      expect(result.missing_documents_count).toBe(2);
      expect(result.blocking_reason).toContain('mandatory');
    });

    it('should allow stage gate approval when all documents are compliant', async () => {
      const stageBoundaryId = 'gate-123';

      const mockCompliance = {
        can_approve: true,
        blocking_reason: null,
        missing_documents_count: 0,
        unapproved_documents_count: 0
      };

      mockPlatformDb.rpc.mockResolvedValue({
        data: mockCompliance,
        error: null
      });

      const result = await checkStageGateRequirements(stageBoundaryId);

      expect(result.can_approve).toBe(true);
      expect(result.missing_documents_count).toBe(0);
    });
  });
});
