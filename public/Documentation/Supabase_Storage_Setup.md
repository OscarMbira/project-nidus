# Supabase Storage Setup for Task Attachments

## Overview
This document describes how to set up Supabase Storage for task attachments functionality.

## Prerequisites
- Supabase project created
- Storage feature enabled in Supabase

## Steps

### 1. Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** section
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `task-attachments`
   - **Public bucket**: Unchecked (private bucket)
   - **File size limit**: 10 MB (or your preferred limit)
   - **Allowed MIME types**: Leave empty for all types, or specify allowed types

### 2. Set Up Storage Policies

You need to create Row Level Security (RLS) policies for the bucket.

#### Policy 1: Allow authenticated users to upload files
```sql
CREATE POLICY "Users can upload task attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-attachments' AND
  (storage.foldername(name))[1] = 'tasks'
);
```

#### Policy 2: Allow users to read their own files or files from tasks they have access to
```sql
CREATE POLICY "Users can read task attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'task-attachments' AND
  (storage.foldername(name))[1] = 'tasks'
);
```

#### Policy 3: Allow users to delete their own files
```sql
CREATE POLICY "Users can delete their own task attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-attachments' AND
  (storage.foldername(name))[1] = 'tasks'
);
```

### 3. Alternative: Public Bucket (Simpler but less secure)

If you want to make the bucket public for easier access:

1. Create bucket with **Public bucket** checked
2. Files will be publicly accessible via URL
3. Still use RLS policies to control who can upload/delete

### 4. Update File Upload Service (if needed)

If you change the bucket name or structure, update:
- `src/services/fileUploadService.js` - Update `STORAGE_BUCKET` constant
- `src/components/TaskAttachments.jsx` - Update bucket reference if needed

## File Structure

Files are stored in the following structure:
```
task-attachments/
  └── tasks/
      └── {taskId}/
          └── {timestamp}_{filename}
```

Example:
```
task-attachments/tasks/123e4567-e89b-12d3-a456-426614174000/1704067200000_document.pdf
```

## Security Considerations

1. **Private Bucket**: Recommended for sensitive files
   - Requires signed URLs for access
   - Better security control

2. **Public Bucket**: Easier but less secure
   - Files accessible via public URL
   - Use with caution for sensitive data

3. **File Size Limits**: Set appropriate limits in bucket settings

4. **MIME Type Restrictions**: Consider restricting allowed file types for security

## Testing

After setup, test the attachment functionality:
1. Create a task
2. Navigate to task detail page
3. Try uploading a file
4. Verify file appears in attachments list
5. Test download functionality
6. Test delete functionality

## Troubleshooting

### Error: "Bucket not found"
- Ensure bucket name matches exactly: `task-attachments`
- Check bucket exists in Supabase Storage

### Error: "Access denied"
- Check RLS policies are set up correctly
- Verify user is authenticated
- Check bucket permissions

### Error: "File too large"
- Check bucket file size limit
- Update `MAX_FILE_SIZE` in `TaskAttachments.jsx` if needed

### Files not uploading
- Check browser console for errors
- Verify Supabase Storage is enabled
- Check network tab for API errors

