/**
 * Unit Tests for Document Governance Service
 * Tests CRUD operations, compliance checks, and status workflows
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getDocumentStages,
  getDocumentTypes,
  getProjectDocuments,
  createProjectDocument,
  updateDocumentStatus,
  submitDocumentForApproval,
  approveDocument,
  rejectDocument,
  checkProjectCompliance,
  getProgrammeCompliance
} from '../documentGovernanceService';

// Mock Supabase client
const mockPlatformDb = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        maybeSingle: vi.fn(),
        order: vi.fn()
      })),
      order: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
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

vi.mock('../supabaseClient', () => ({
  platformDb: mockPlatformDb
}));

vi.mock('../documentStorageService', () => ({
  uploadProjectDocument: vi.fn()
}));

describe('Document Governance Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDocumentStages', () => {
    it('should fetch all document governance stages', async () => {
      const mockStages = [
        { id: '1', stage_code: 'pre_project', stage_name: 'Pre-Project', stage_order: 1 },
        { id: '2', stage_code: 'initiation', stage_name: 'Initiation', stage_order: 2 }
      ];

      mockPlatformDb.from().select().eq().order.mockResolvedValue({ 
        data: mockStages, 
        error: null 
      });

      const result = await getDocumentStages();

      expect(result).toEqual(mockStages);
      expect(mockPlatformDb.from).toHaveBeenCalledWith('document_governance_stages');
    });

    it('should handle errors', async () => {
      mockPlatformDb.from().select().eq().order.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      });

      await expect(getDocumentStages()).rejects.toThrow();
    });
  });

  describe('getDocumentTypes', () => {
    it('should fetch all document types', async () => {
      const mockTypes = [
        { id: '1', name: 'PID', stage_code: 'initiation', is_mandatory: true },
        { id: '2', name: 'Business Case', stage_code: 'pre_project', is_mandatory: true }
      ];

      mockPlatformDb.from().select().eq().eq().order.mockResolvedValue({ 
        data: mockTypes, 
        error: null 
      });

      const result = await getDocumentTypes();

      expect(result).toEqual(mockTypes);
    });

    it('should filter by stage code', async () => {
      const mockTypes = [
        { id: '1', name: 'PID', stage_code: 'initiation', is_mandatory: true }
      ];

      mockPlatformDb.from().select().eq().eq().eq().order.mockResolvedValue({ 
        data: mockTypes, 
        error: null 
      });

      const result = await getDocumentTypes('initiation');

      expect(result).toEqual(mockTypes);
    });

    it('should filter mandatory documents only', async () => {
      const mockTypes = [
        { id: '1', name: 'PID', stage_code: 'initiation', is_mandatory: true }
      ];

      mockPlatformDb.from().select().eq().eq().eq().order.mockResolvedValue({ 
        data: mockTypes, 
        error: null 
      });

      const result = await getDocumentTypes(null, true);

      expect(result).toEqual(mockTypes);
    });
  });

  describe('getProjectDocuments', () => {
    it('should fetch all documents for a project', async () => {
      const mockDocuments = [
        { id: 'doc-1', project_id: 'proj-1', status: 'draft' },
        { id: 'doc-2', project_id: 'proj-1', status: 'approved' }
      ];

      mockPlatformDb.from().select().eq().eq().order.mockResolvedValue({ 
        data: mockDocuments, 
        error: null 
      });

      const result = await getProjectDocuments('proj-1');

      expect(result).toEqual(mockDocuments);
      expect(mockPlatformDb.from).toHaveBeenCalledWith('project_documents');
    });
  });

  describe('createProjectDocument', () => {
    it('should create a new project document', async () => {
      const mockDocument = {
        id: 'doc-1',
        project_id: 'proj-1',
        document_type_id: 'type-1',
        status: 'not_started'
      };

      mockPlatformDb.from().insert().select().single.mockResolvedValue({ 
        data: mockDocument, 
        error: null 
      });
      mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

      const documentData = {
        project_id: 'proj-1',
        document_type_id: 'type-1',
        status: 'not_started'
      };

      const result = await createProjectDocument(documentData);

      expect(result).toEqual(mockDocument);
      expect(mockPlatformDb.from().insert).toHaveBeenCalled();
    });
  });

  describe('updateDocumentStatus', () => {
    it('should update document status', async () => {
      const mockUpdated = {
        id: 'doc-1',
        status: 'submitted',
        submission_date: '2026-01-08'
      };

      mockPlatformDb.from().update().eq().select().single.mockResolvedValue({ 
        data: mockUpdated, 
        error: null 
      });
      mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

      const result = await updateDocumentStatus('doc-1', 'submitted');

      expect(result).toEqual(mockUpdated);
    });
  });

  describe('submitDocumentForApproval', () => {
    it('should submit document for approval', async () => {
      const mockSubmitted = {
        id: 'doc-1',
        status: 'submitted',
        submission_date: '2026-01-08'
      };

      mockPlatformDb.from().update().eq().select().single.mockResolvedValue({ 
        data: mockSubmitted, 
        error: null 
      });
      mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

      const result = await submitDocumentForApproval('doc-1', 'approver-1');

      expect(result).toEqual(mockSubmitted);
    });
  });

  describe('approveDocument', () => {
    it('should approve a document', async () => {
      const mockApproved = {
        id: 'doc-1',
        status: 'approved',
        approval_date: '2026-01-08'
      };

      mockPlatformDb.from().update().eq().select().single.mockResolvedValue({ 
        data: mockApproved, 
        error: null 
      });
      mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

      const result = await approveDocument('doc-1', 'approver-1', 'Looks good');

      expect(result).toEqual(mockApproved);
    });
  });

  describe('rejectDocument', () => {
    it('should reject a document', async () => {
      const mockRejected = {
        id: 'doc-1',
        status: 'rejected',
        rejection_date: '2026-01-08',
        rejection_reason: 'Needs revision'
      };

      mockPlatformDb.from().update().eq().select().single.mockResolvedValue({ 
        data: mockRejected, 
        error: null 
      });
      mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

      const result = await rejectDocument('doc-1', 'approver-1', 'Needs revision');

      expect(result).toEqual(mockRejected);
    });
  });

  describe('checkProjectCompliance', () => {
    it('should check project document compliance', async () => {
      const mockCompliance = {
        missing_mandatory_count: 2,
        unapproved_mandatory_count: 1,
        is_compliant: false
      };

      mockPlatformDb.rpc.mockResolvedValue({ 
        data: mockCompliance, 
        error: null 
      });

      const result = await checkProjectCompliance('proj-1', 'initiation');

      expect(result).toEqual(mockCompliance);
      expect(mockPlatformDb.rpc).toHaveBeenCalledWith('check_project_document_compliance', {
        p_project_id: 'proj-1',
        p_stage_code: 'initiation'
      });
    });
  });

  describe('getProgrammeCompliance', () => {
    it('should get programme-level compliance', async () => {
      const mockCompliance = {
        programme_id: 'prog-1',
        total_projects: 5,
        compliant_projects: 3,
        non_compliant_projects: 2
      };

      mockPlatformDb.rpc.mockResolvedValue({ 
        data: mockCompliance, 
        error: null 
      });

      const result = await getProgrammeCompliance('prog-1');

      expect(result).toEqual(mockCompliance);
    });
  });
});
