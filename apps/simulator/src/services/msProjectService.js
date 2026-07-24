/**
 * MS Project Integration Service
 * Handles import/export of Microsoft Project files (.mpp, .xml, .xlsx)
 */

import { supabase } from './supabaseClient'

/**
 * Get MS Project field mappings
 */
export async function getFieldMappings() {
  try {
    const { data, error } = await supabase
      .from('ms_project_field_mappings')
      .select('*')
      .eq('is_active', true)
      .order('ms_project_field')

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching field mappings:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Create or update field mapping
 */
export async function saveFieldMapping(mappingData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('ms_project_field_mappings')
      .upsert({
        ...mappingData,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data, message: 'Field mapping saved successfully' }
  } catch (error) {
    console.error('Error saving field mapping:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Import MS Project file
 */
export async function importMSProjectFile(fileData, projectId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from('ms_project_imports')
      .insert({
        project_id: projectId,
        user_id: user.id,
        file_name: fileData.name,
        file_type: fileData.type || getFileType(fileData.name),
        import_status: 'processing',
        import_settings: fileData.settings || {},
        created_by: user.id
      })
      .select()
      .single()

    if (importError) throw importError

    try {
      // Parse the file based on type
      const parsedData = await parseProjectFile(fileData)

      // Get field mappings
      const { data: mappings } = await getFieldMappings()
      const mappingMap = createMappingMap(mappings)

      // Import tasks with field mapping
      const importResults = await importTasks(
        parsedData.tasks,
        projectId,
        importRecord.id,
        mappingMap,
        user.id
      )

      // Update import record with success
      await supabase
        .from('ms_project_imports')
        .update({
          import_status: 'completed',
          tasks_imported: importResults.imported,
          tasks_failed: importResults.failed,
          import_completed_at: new Date().toISOString(),
          import_log: importResults.log
        })
        .eq('id', importRecord.id)

      return {
        success: true,
        data: {
          import_id: importRecord.id,
          tasks_imported: importResults.imported,
          tasks_failed: importResults.failed
        },
        message: `Successfully imported ${importResults.imported} tasks`
      }
    } catch (parseError) {
      // Update import record with failure
      await supabase
        .from('ms_project_imports')
        .update({
          import_status: 'failed',
          error_message: parseError.message,
          import_completed_at: new Date().toISOString()
        })
        .eq('id', importRecord.id)

      throw parseError
    }
  } catch (error) {
    console.error('Error importing MS Project file:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Get file type from filename
 */
function getFileType(filename) {
  const ext = filename.toLowerCase().split('.').pop()
  const typeMap = {
    'mpp': 'mpp',
    'xml': 'xml',
    'xlsx': 'xlsx',
    'xls': 'xlsx'
  }
  return typeMap[ext] || 'unknown'
}

/**
 * Parse MS Project file based on type
 */
async function parseProjectFile(fileData) {
  const fileType = fileData.type || getFileType(fileData.name)

  switch (fileType) {
    case 'xml':
      return await parseXMLFile(fileData.file)
    case 'xlsx':
      return await parseExcelFile(fileData.file)
    case 'mpp':
      // .mpp files require server-side processing with specialized libraries
      throw new Error('MPP file import requires server-side processing. Please use XML or Excel format.')
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

/**
 * Parse MS Project XML file
 */
async function parseXMLFile(file) {
  const text = await file.text()
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(text, 'text/xml')

  // Check for parsing errors
  const parserError = xmlDoc.querySelector('parsererror')
  if (parserError) {
    throw new Error('Invalid XML file')
  }

  const tasks = []
  const taskElements = xmlDoc.querySelectorAll('Task')

  taskElements.forEach(taskEl => {
    const task = {
      uid: taskEl.querySelector('UID')?.textContent,
      name: taskEl.querySelector('Name')?.textContent,
      start: taskEl.querySelector('Start')?.textContent,
      finish: taskEl.querySelector('Finish')?.textContent,
      duration: taskEl.querySelector('Duration')?.textContent,
      percentComplete: taskEl.querySelector('PercentWorkComplete')?.textContent || '0',
      priority: taskEl.querySelector('Priority')?.textContent,
      notes: taskEl.querySelector('Notes')?.textContent,
      wbs: taskEl.querySelector('WBS')?.textContent,
      outlineLevel: taskEl.querySelector('OutlineLevel')?.textContent || '1'
    }

    // Parse predecessors
    const predecessors = []
    taskEl.querySelectorAll('PredecessorLink').forEach(pred => {
      predecessors.push({
        predecessorUID: pred.querySelector('PredecessorUID')?.textContent,
        type: pred.querySelector('Type')?.textContent || '1', // 1 = FS (Finish-to-Start)
        lag: pred.querySelector('LinkLag')?.textContent || '0'
      })
    })
    task.predecessors = predecessors

    tasks.push(task)
  })

  return { tasks }
}

/**
 * Parse MS Project Excel file
 */
async function parseExcelFile(file) {
  // For Excel parsing, you would typically use a library like SheetJS (xlsx)
  // This is a simplified implementation
  throw new Error('Excel file import requires the SheetJS library. Please use XML format for now.')
}

/**
 * Create mapping map from field mappings
 */
function createMappingMap(mappings) {
  const map = {}
  mappings.forEach(mapping => {
    map[mapping.ms_project_field] = {
      nidusField: mapping.nidus_field,
      transform: mapping.transformation_rule
    }
  })
  return map
}

/**
 * Import tasks with field mapping
 */
async function importTasks(tasks, projectId, importId, mappingMap, userId) {
  let imported = 0
  let failed = 0
  const log = []
  const uidToIdMap = {} // Map MS Project UIDs to Nidus task IDs

  // First pass: Create all tasks
  for (const msTask of tasks) {
    try {
      const nidusTask = transformTask(msTask, mappingMap, projectId)

      const { data: createdTask, error } = await supabase
        .from('tasks')
        .insert({
          ...nidusTask,
          created_by: userId
        })
        .select()
        .single()

      if (error) throw error

      // Create task mapping
      await supabase
        .from('ms_project_task_mappings')
        .insert({
          import_id: importId,
          ms_project_task_uid: msTask.uid,
          nidus_task_id: createdTask.id,
          mapping_data: msTask
        })

      uidToIdMap[msTask.uid] = createdTask.id
      imported++
      log.push(`✓ Imported: ${msTask.name}`)
    } catch (error) {
      failed++
      log.push(`✗ Failed to import ${msTask.name}: ${error.message}`)
    }
  }

  // Second pass: Create dependencies
  for (const msTask of tasks) {
    if (msTask.predecessors && msTask.predecessors.length > 0) {
      const successorId = uidToIdMap[msTask.uid]
      if (!successorId) continue

      for (const pred of msTask.predecessors) {
        const predecessorId = uidToIdMap[pred.predecessorUID]
        if (!predecessorId) continue

        try {
          await supabase
            .from('task_dependencies')
            .insert({
              predecessor_task_id: predecessorId,
              successor_task_id: successorId,
              dependency_type: mapDependencyType(pred.type),
              lag_days: parseInt(pred.lag) || 0,
              created_by: userId
            })
        } catch (error) {
          log.push(`✗ Failed to create dependency: ${error.message}`)
        }
      }
    }
  }

  return { imported, failed, log }
}

/**
 * Transform MS Project task to Nidus task
 */
function transformTask(msTask, mappingMap, projectId) {
  const nidusTask = {
    project_id: projectId,
    task_name: msTask.name || 'Unnamed Task',
    description: msTask.notes || null,
    planned_start_date: msTask.start ? new Date(msTask.start).toISOString() : null,
    planned_end_date: msTask.finish ? new Date(msTask.finish).toISOString() : null,
    progress_percentage: parseInt(msTask.percentComplete) || 0,
    priority: mapPriority(msTask.priority),
    wbs_code: msTask.wbs || null
  }

  // Apply custom field mappings
  Object.keys(mappingMap).forEach(msField => {
    const mapping = mappingMap[msField]
    if (msTask[msField] !== undefined) {
      nidusTask[mapping.nidusField] = applyTransform(msTask[msField], mapping.transform)
    }
  })

  return nidusTask
}

/**
 * Map MS Project dependency type to Nidus dependency type
 */
function mapDependencyType(msType) {
  const typeMap = {
    '0': 'FF', // Finish-to-Finish
    '1': 'FS', // Finish-to-Start
    '2': 'SS', // Start-to-Start
    '3': 'SF'  // Start-to-Finish
  }
  return typeMap[msType] || 'FS'
}

/**
 * Map MS Project priority to Nidus priority
 */
function mapPriority(msPriority) {
  const priority = parseInt(msPriority) || 500
  if (priority <= 300) return 'low'
  if (priority <= 600) return 'medium'
  if (priority <= 800) return 'high'
  return 'critical'
}

/**
 * Apply transformation rule to field value
 */
function applyTransform(value, transformRule) {
  if (!transformRule) return value

  try {
    // Transform rules are stored as JSON objects
    if (typeof transformRule === 'object') {
      if (transformRule.type === 'date') {
        return new Date(value).toISOString()
      } else if (transformRule.type === 'number') {
        return parseFloat(value)
      } else if (transformRule.type === 'mapping') {
        return transformRule.map[value] || value
      }
    }
    return value
  } catch (error) {
    return value
  }
}

/**
 * Export project to MS Project XML format
 */
export async function exportToMSProject(projectId, options = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Create export record
    const { data: exportRecord, error: exportError } = await supabase
      .from('ms_project_exports')
      .insert({
        project_id: projectId,
        user_id: user.id,
        export_format: options.format || 'xml',
        export_status: 'processing',
        export_settings: options,
        created_by: user.id
      })
      .select()
      .single()

    if (exportError) throw exportError

    try {
      // Fetch project data
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError

      // Fetch tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_to:users(first_name, last_name)
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('created_at')

      if (tasksError) throw tasksError

      // Fetch dependencies
      const { data: dependencies, error: depsError } = await supabase
        .from('task_dependencies')
        .select('*')
        .in('successor_task_id', tasks.map(t => t.id))

      if (depsError) throw depsError

      // Generate XML
      const xml = generateMSProjectXML(project, tasks, dependencies)

      // Update export record
      await supabase
        .from('ms_project_exports')
        .update({
          export_status: 'completed',
          file_name: `${project.project_name}_export.xml`,
          tasks_exported: tasks.length,
          export_completed_at: new Date().toISOString()
        })
        .eq('id', exportRecord.id)

      return {
        success: true,
        data: {
          export_id: exportRecord.id,
          xml: xml,
          file_name: `${project.project_name}_export.xml`,
          tasks_exported: tasks.length
        },
        message: `Successfully exported ${tasks.length} tasks`
      }
    } catch (exportProcessError) {
      // Update export record with failure
      await supabase
        .from('ms_project_exports')
        .update({
          export_status: 'failed',
          error_message: exportProcessError.message,
          export_completed_at: new Date().toISOString()
        })
        .eq('id', exportRecord.id)

      throw exportProcessError
    }
  } catch (error) {
    console.error('Error exporting to MS Project:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Generate MS Project XML from project data
 */
function generateMSProjectXML(project, tasks, dependencies) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Name>${escapeXml(project.project_name)}</Name>
  <StartDate>${project.start_date || new Date().toISOString()}</StartDate>
  <FinishDate>${project.end_date || new Date().toISOString()}</FinishDate>
  <Tasks>`

  tasks.forEach((task, index) => {
    const uid = index + 1
    const assignedTo = task.assigned_to
      ? `${task.assigned_to.first_name} ${task.assigned_to.last_name}`
      : ''

    // Find dependencies for this task
    const taskDeps = dependencies.filter(d => d.successor_task_id === task.id)

    xml += `
    <Task>
      <UID>${uid}</UID>
      <ID>${uid}</ID>
      <Name>${escapeXml(task.task_name)}</Name>
      <Start>${task.planned_start_date || new Date().toISOString()}</Start>
      <Finish>${task.planned_end_date || new Date().toISOString()}</Finish>
      <PercentWorkComplete>${task.progress_percentage || 0}</PercentWorkComplete>
      <Priority>${mapNidusPriorityToMS(task.priority)}</Priority>
      <Notes>${escapeXml(task.description || '')}</Notes>
      <WBS>${escapeXml(task.wbs_code || '')}</WBS>
      <ResourceNames>${escapeXml(assignedTo)}</ResourceNames>`

    if (taskDeps.length > 0) {
      taskDeps.forEach(dep => {
        const predIndex = tasks.findIndex(t => t.id === dep.predecessor_task_id)
        if (predIndex >= 0) {
          xml += `
      <PredecessorLink>
        <PredecessorUID>${predIndex + 1}</PredecessorUID>
        <Type>${mapNidusDependencyTypeToMS(dep.dependency_type)}</Type>
        <LinkLag>${dep.lag_days || 0}</LinkLag>
      </PredecessorLink>`
        }
      })
    }

    xml += `
    </Task>`
  })

  xml += `
  </Tasks>
</Project>`

  return xml
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe) {
  if (!unsafe) return ''
  return unsafe.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Map Nidus priority to MS Project priority (0-1000)
 */
function mapNidusPriorityToMS(nidusPriority) {
  const priorityMap = {
    'low': 300,
    'medium': 500,
    'high': 700,
    'critical': 900
  }
  return priorityMap[nidusPriority] || 500
}

/**
 * Map Nidus dependency type to MS Project type
 */
function mapNidusDependencyTypeToMS(nidusType) {
  const typeMap = {
    'FF': '0',
    'FS': '1',
    'SS': '2',
    'SF': '3'
  }
  return typeMap[nidusType] || '1'
}

/**
 * Get import history
 */
export async function getImportHistory(projectId = null, limit = 20) {
  try {
    let query = supabase
      .from('ms_project_imports')
      .select(`
        *,
        projects(project_name),
        users(first_name, last_name)
      `)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching import history:', error)
    return { success: false, message: error.message, data: [] }
  }
}

/**
 * Get export history
 */
export async function getExportHistory(projectId = null, limit = 20) {
  try {
    let query = supabase
      .from('ms_project_exports')
      .select(`
        *,
        projects(project_name),
        users(first_name, last_name)
      `)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching export history:', error)
    return { success: false, message: error.message, data: [] }
  }
}
