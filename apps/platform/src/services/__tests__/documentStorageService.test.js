/**
 * Unit Tests for Document Storage Service
 * Tests file upload, download, versioning, and validation functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  uploadProjectDocument,
  uploadProgrammeDocument,
  downloadProjectDocument,
  downloadProgrammeDocument,
  deleteProjectDocument,
  deleteProgrammeDocument,
  getProjectStorageUsage,
  getProgrammeStorageUsage,
  checkProjectStorageLimit,
  validateFile,
  isAllowedExtension,
  isValidFileSize,
  formatFileSize,
  getFileExtension,
  getMimeType
} from '../documentStorageService';

// Mock Supabase client
// Stable query/bucket objects: the service and the tests must share the same vi.fn instances,
// so a test's .mockResolvedValue() reaches the call the service actually makes.
const { mockStorage, mockPlatformDb } = vi.hoisted(() => {
  const storageBucket = {
    upload: vi.fn(),
    download: vi.fn(),
    remove: vi.fn(),
    createSignedUrl: vi.fn(),
    list: vi.fn()
  };
  const mockStorage = {
    from: vi.fn(() => storageBucket)
  };

  const queryChain = {};
  const chainable = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'in', 'is', 'gt', 'gte', 'lt', 'lte', 'order', 'limit', 'range', 'or', 'not', 'filter', 'match'];
  chainable.forEach((method) => {
    queryChain[method] = vi.fn(() => queryChain);
  });
  queryChain.single = vi.fn();
  queryChain.maybeSingle = vi.fn();

  const mockPlatformDb = {
    storage: mockStorage,
    from: vi.fn(() => queryChain),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  };

  return { mockStorage, mockPlatformDb };
});

vi.mock('../supabaseClient', () => ({
  platformDb: mockPlatformDb
}));

describe('Document Storage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('File Validation Functions', () => {
    describe('getFileExtension', () => {
      it('should extract extension from filename', () => {
        expect(getFileExtension('document.pdf')).toBe('pdf');
        expect(getFileExtension('test.DOCX')).toBe('docx');
        expect(getFileExtension('file.name.xlsx')).toBe('xlsx');
      });

      it('should return empty string for files without extension', () => {
        expect(getFileExtension('noextension')).toBe('');
        expect(getFileExtension('')).toBe('');
      });
    });

    describe('getMimeType', () => {
      it('should return correct MIME type for known extensions', () => {
        expect(getMimeType('pdf')).toBe('application/pdf');
        expect(getMimeType('docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        expect(getMimeType('png')).toBe('image/png');
      });

      it('should return octet-stream for unknown extensions', () => {
        expect(getMimeType('unknown')).toBe('application/octet-stream');
      });
    });

    describe('isAllowedExtension', () => {
      it('should return true for allowed extensions', () => {
        expect(isAllowedExtension('pdf')).toBe(true);
        expect(isAllowedExtension('docx')).toBe(true);
        expect(isAllowedExtension('xlsx')).toBe(true);
        expect(isAllowedExtension('png')).toBe(true);
      });

      it('should return false for disallowed extensions', () => {
        expect(isAllowedExtension('exe')).toBe(false);
        expect(isAllowedExtension('bat')).toBe(false);
        expect(isAllowedExtension('')).toBe(false);
      });

      it('should be case-insensitive', () => {
        expect(isAllowedExtension('PDF')).toBe(true);
        expect(isAllowedExtension('DOCX')).toBe(true);
      });
    });

    describe('isValidFileSize', () => {
      it('should return true for valid file sizes', () => {
        expect(isValidFileSize(1024)).toBe(true); // 1KB
        expect(isValidFileSize(52428800)).toBe(true); // 50MB (max)
        expect(isValidFileSize(1048576)).toBe(true); // 1MB
      });

      it('should return false for invalid file sizes', () => {
        expect(isValidFileSize(0)).toBe(false);
        expect(isValidFileSize(-1)).toBe(false);
        expect(isValidFileSize(52428801)).toBe(false); // Over 50MB
      });
    });

    describe('formatFileSize', () => {
      it('should format bytes correctly', () => {
        expect(formatFileSize(1024)).toBe('1.00 KB');
        expect(formatFileSize(1048576)).toBe('1.00 MB');
        expect(formatFileSize(52428800)).toBe('50.00 MB');
      });

      it('should handle zero bytes', () => {
        expect(formatFileSize(0)).toBe('0 B');
      });
    });

    describe('validateFile', () => {
      it('should validate valid files', () => {
        const validFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
        Object.defineProperty(validFile, 'size', { value: 1024 });

        const result = validateFile(validFile);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
        expect(result.extension).toBe('pdf');
      });

      it('should reject files with invalid extensions', () => {
        const invalidFile = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
        Object.defineProperty(invalidFile, 'size', { value: 1024 });

        const result = validateFile(invalidFile);
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/not allowed/);
      });

      it('should reject files that are too large', () => {
        const largeFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
        Object.defineProperty(largeFile, 'size', { value: 52428801 }); // Over 50MB

        const result = validateFile(largeFile);
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/size/);
      });

      it('should reject empty files', () => {
        const emptyFile = new File([], 'test.pdf', { type: 'application/pdf' });
        Object.defineProperty(emptyFile, 'size', { value: 0 });

        const result = validateFile(emptyFile);
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/size/);
      });
    });
  });

  describe('uploadProjectDocument', () => {
    it('should upload file successfully', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(mockFile, 'size', { value: 1024 });

      const mockUploadResponse = { path: 'project-123/doc-456/1/uuid_test.pdf' };
      const mockDocumentRecord = { id: 'doc-123', file_path: mockUploadResponse.path };

      mockPlatformDb.storage.from().upload.mockResolvedValue({ data: mockUploadResponse, error: null });
      mockPlatformDb.from().insert().select().single.mockResolvedValue({ data: mockDocumentRecord, error: null });
      mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });

      const result = await uploadProjectDocument(mockFile, 'project-123', 'doc-456', 'user-123');

      expect(result).toBeDefined();
      expect(mockPlatformDb.storage.from).toHaveBeenCalledWith('project-documents');
      expect(mockPlatformDb.storage.from().upload).toHaveBeenCalled();
    });

    it('should handle upload errors', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(mockFile, 'size', { value: 1024 });

      mockPlatformDb.storage.from().upload.mockResolvedValue({ 
        data: null, 
        error: { message: 'Upload failed' } 
      });
      mockPlatformDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });

      await expect(
        uploadProjectDocument(mockFile, 'project-123', 'doc-456', 'user-123')
      ).rejects.toThrow();
    });
  });

  describe('downloadProjectDocument', () => {
    it('should generate signed URL for download', async () => {
      const mockSignedUrl = 'https://storage.supabase.co/signed-url';
      mockPlatformDb.storage.from().createSignedUrl.mockResolvedValue({ 
        data: { signedUrl: mockSignedUrl }, 
        error: null 
      });

      const result = await downloadProjectDocument('doc-123', 'file-path.pdf');

      expect(result).toBe(mockSignedUrl);
      expect(mockPlatformDb.storage.from).toHaveBeenCalledWith('project-documents');
      expect(mockPlatformDb.storage.from().createSignedUrl).toHaveBeenCalled();
    });

    it('should handle download errors', async () => {
      mockPlatformDb.storage.from().createSignedUrl.mockResolvedValue({ 
        data: null, 
        error: { message: 'Download failed' } 
      });

      await expect(
        downloadProjectDocument('doc-123', 'file-path.pdf')
      ).rejects.toThrow();
    });
  });

  describe('getProjectStorageUsage', () => {
    it('should return total storage usage for a project from the database function', async () => {
      mockPlatformDb.rpc.mockResolvedValue({ data: 3584 * 1024, error: null });

      const result = await getProjectStorageUsage('project-123');

      expect(result).toBe(3584 * 1024);
      expect(mockPlatformDb.rpc).toHaveBeenCalledWith('calculate_project_storage_usage', {
        p_project_id: 'project-123'
      });
    });
  });

  describe('checkProjectStorageLimit', () => {
    it('should report not over limit when usage is under the limit', async () => {
      mockPlatformDb.rpc.mockResolvedValue({ data: 10 * 1024 * 1024, error: null });

      const result = await checkProjectStorageLimit('project-123');

      expect(result.isOverLimit).toBe(false);
    });

    it('should report over limit when usage exceeds the limit', async () => {
      mockPlatformDb.rpc.mockResolvedValue({ data: 600 * 1024 * 1024, error: null });

      const result = await checkProjectStorageLimit('project-123');

      expect(result.isOverLimit).toBe(true);
    });
  });
});
