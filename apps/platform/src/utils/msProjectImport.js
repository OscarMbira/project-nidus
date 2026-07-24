/**
 * Microsoft Project Import Utilities
 * Handles importing data from MS Project files
 */

/**
 * Parse MS Project XML file
 * @param {File|string} file - MS Project file or XML content
 * @returns {Promise<Object>} Parsed project data
 */
export async function parseMSProjectFile(file) {
  try {
    let xmlContent
    
    if (file instanceof File) {
      xmlContent = await file.text()
    } else {
      xmlContent = file
    }

    // Parse XML
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml')

    // Extract project information
    const project = {
      name: extractText(xmlDoc, 'Name') || 'Imported Project',
      startDate: extractText(xmlDoc, 'StartDate'),
      finishDate: extractText(xmlDoc, 'FinishDate'),
      tasks: [],
      resources: [],
      assignments: [],
    }

    // Extract tasks
    const tasks = xmlDoc.getElementsByTagName('Task')
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]
      project.tasks.push({
        id: extractText(task, 'UID'),
        name: extractText(task, 'Name'),
        startDate: extractText(task, 'Start'),
        finishDate: extractText(task, 'Finish'),
        duration: extractText(task, 'Duration'),
        work: extractText(task, 'Work'),
        percentComplete: extractText(task, 'PercentComplete'),
        priority: extractText(task, 'Priority'),
        notes: extractText(task, 'Notes'),
      })
    }

    // Extract resources
    const resources = xmlDoc.getElementsByTagName('Resource')
    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i]
      project.resources.push({
        id: extractText(resource, 'UID'),
        name: extractText(resource, 'Name'),
        type: extractText(resource, 'Type'),
        email: extractText(resource, 'EmailAddress'),
      })
    }

    // Extract assignments
    const assignments = xmlDoc.getElementsByTagName('Assignment')
    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i]
      project.assignments.push({
        taskUID: extractText(assignment, 'TaskUID'),
        resourceUID: extractText(assignment, 'ResourceUID'),
        work: extractText(assignment, 'Work'),
        units: extractText(assignment, 'Units'),
      })
    }

    return project
  } catch (error) {
    console.error('Error parsing MS Project file:', error)
    throw new Error('Failed to parse MS Project file: ' + error.message)
  }
}

/**
 * Extract text content from XML element
 */
function extractText(element, tagName) {
  const nodes = element.getElementsByTagName(tagName)
  if (nodes.length > 0) {
    return nodes[0].textContent || null
  }
  return null
}

/**
 * Convert MS Project data to internal format
 * @param {Object} msProjectData - Parsed MS Project data
 * @param {string} projectId - Target project ID
 * @returns {Object} Converted data ready for import
 */
export function convertMSProjectToInternal(msProjectData, projectId) {
  const converted = {
    project: {
      project_name: msProjectData.name,
      start_date: msProjectData.startDate,
      end_date: msProjectData.finishDate,
    },
    tasks: msProjectData.tasks.map(task => ({
      project_id: projectId,
      task_name: task.name,
      task_description: task.notes,
      start_date: task.startDate,
      due_date: task.finishDate,
      estimated_hours: parseDurationToHours(task.work || task.duration),
      progress_percentage: parseInt(task.percentComplete) || 0,
      priority: mapPriority(task.priority),
    })),
    resources: msProjectData.resources.map(resource => ({
      resource_name: resource.name,
      resource_type: resource.type === '1' ? 'human' : 'equipment',
      email: resource.email,
    })),
  }

  return converted
}

/**
 * Parse MS Project duration to hours
 */
function parseDurationToHours(duration) {
  if (!duration) return null
  
  // MS Project duration format: PT8H0M0S (ISO 8601)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (match) {
    const hours = parseInt(match[1] || 0)
    const minutes = parseInt(match[2] || 0)
    return hours + (minutes / 60)
  }
  
  // Try parsing as decimal days (MS Project default)
  const days = parseFloat(duration)
  if (!isNaN(days)) {
    return days * 8 // Assume 8 hours per day
  }
  
  return null
}

/**
 * Map MS Project priority to internal priority
 */
function mapPriority(msPriority) {
  const priorityMap = {
    '0': 'low',
    '500': 'medium',
    '1000': 'high',
  }
  return priorityMap[msPriority] || 'medium'
}

/**
 * Export project data to MS Project XML format
 * @param {Object} projectData - Internal project data
 * @returns {string} MS Project XML content
 */
export function exportToMSProjectXML(projectData) {
  const { project, tasks, resources, assignments } = projectData
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<Project xmlns="http://schemas.microsoft.com/project">\n'
  
  // Project information
  xml += `  <Name>${escapeXML(project.project_name)}</Name>\n`
  if (project.start_date) {
    xml += `  <StartDate>${formatMSProjectDate(project.start_date)}</StartDate>\n`
  }
  if (project.end_date) {
    xml += `  <FinishDate>${formatMSProjectDate(project.end_date)}</FinishDate>\n`
  }
  
  // Tasks
  xml += '  <Tasks>\n'
  tasks.forEach((task, index) => {
    xml += `    <Task>\n`
    xml += `      <UID>${index + 1}</UID>\n`
    xml += `      <Name>${escapeXML(task.task_name)}</Name>\n`
    if (task.start_date) {
      xml += `      <Start>${formatMSProjectDate(task.start_date)}</Start>\n`
    }
    if (task.due_date) {
      xml += `      <Finish>${formatMSProjectDate(task.due_date)}</Finish>\n`
    }
    if (task.estimated_hours) {
      xml += `      <Work>PT${Math.floor(task.estimated_hours)}H${Math.round((task.estimated_hours % 1) * 60)}M0S</Work>\n`
    }
    if (task.progress_percentage) {
      xml += `      <PercentComplete>${task.progress_percentage}</PercentComplete>\n`
    }
    xml += `    </Task>\n`
  })
  xml += '  </Tasks>\n'
  
  // Resources
  if (resources && resources.length > 0) {
    xml += '  <Resources>\n'
    resources.forEach((resource, index) => {
      xml += `    <Resource>\n`
      xml += `      <UID>${index + 1}</UID>\n`
      xml += `      <Name>${escapeXML(resource.resource_name)}</Name>\n`
      xml += `      <Type>${resource.resource_type === 'human' ? '1' : '0'}</Type>\n`
      xml += `    </Resource>\n`
    })
    xml += '  </Resources>\n'
  }
  
  xml += '</Project>'
  
  return xml
}

/**
 * Format date for MS Project XML
 */
function formatMSProjectDate(date) {
  if (!date) return null
  const d = new Date(date)
  return d.toISOString().split('T')[0] + 'T00:00:00'
}

/**
 * Escape XML special characters
 */
function escapeXML(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Download MS Project XML file
 */
export function downloadMSProjectXML(xmlContent, filename = 'project.xml') {
  const blob = new Blob([xmlContent], { type: 'application/xml' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

