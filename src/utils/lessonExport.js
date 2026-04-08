/**
 * Lesson Export Utilities
 * Handles CSV, Excel, and PDF export functionality for Lessons Log
 */

/**
 * Generate printable HTML content for Lessons Log
 */
export function generateLessonsLogPrintHTML(log, lessons = [], summary = null) {
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getEffectTypeColor = (type) => {
    switch (type) {
      case 'positive': return '#10b981'; // green
      case 'negative': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Lessons Log: ${log.log_reference}</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; }
      .no-print { display: none; }
      .page-break { page-break-after: always; }
    }
    body {
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm;
    }
    .header {
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 18pt;
      font-weight: bold;
    }
    .header-info {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      font-size: 10pt;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 10px;
      border-bottom: 1px solid #000;
      padding-bottom: 5px;
    }
    .lesson {
      border: 1px solid #000;
      padding: 15px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .lesson-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #ccc;
    }
    .lesson-reference {
      font-weight: bold;
      font-family: monospace;
    }
    .lesson-meta {
      font-size: 10pt;
      color: #666;
    }
    .field {
      margin-bottom: 10px;
    }
    .field-label {
      font-weight: bold;
      margin-bottom: 3px;
    }
    .field-value {
      margin-left: 20px;
      white-space: pre-wrap;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 9pt;
      font-weight: bold;
      margin-right: 5px;
    }
    .effect-positive { background-color: #d1fae5; color: #065f46; }
    .effect-negative { background-color: #fee2e2; color: #991b1b; }
    .effect-neutral { background-color: #f3f4f6; color: #374151; }
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat-box {
      border: 1px solid #000;
      padding: 10px;
      text-align: center;
    }
    .stat-number {
      font-size: 20pt;
      font-weight: bold;
    }
    .stat-label {
      font-size: 9pt;
      margin-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    th, td {
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .footer {
      margin-top: 50px;
      padding-top: 10px;
      border-top: 1px solid #000;
      font-size: 9pt;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>LESSONS LOG</h1>
    <div class="header-info">
      <div>
        <strong>Reference:</strong> ${log.log_reference}<br>
        <strong>Version:</strong> ${log.version_number || '1.0'}<br>
        <strong>Project:</strong> ${log.project?.project_name || 'N/A'}
      </div>
      <div>
        <strong>Author:</strong> ${log.author?.full_name || 'N/A'}<br>
        <strong>Owner:</strong> ${log.owner?.full_name || 'N/A'}<br>
        <strong>Date:</strong> ${formatDate(log.created_at)}
      </div>
    </div>
  </div>

  ${summary ? `
  <div class="section">
    <div class="section-title">Summary Statistics</div>
    <div class="summary-stats">
      <div class="stat-box">
        <div class="stat-number">${summary.total_lessons || lessons.length}</div>
        <div class="stat-label">Total Lessons</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${summary.positive_lessons || lessons.filter(l => l.effect_type === 'positive').length}</div>
        <div class="stat-label">Positive</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${summary.negative_lessons || lessons.filter(l => l.effect_type === 'negative').length}</div>
        <div class="stat-label">Negative</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${summary.corporate_lessons || lessons.filter(l => l.is_corporate_lesson).length}</div>
        <div class="stat-label">Corporate</div>
      </div>
    </div>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Lessons</div>
    ${lessons.map((lesson, index) => `
    <div class="lesson">
      <div class="lesson-header">
        <div>
          <span class="lesson-reference">${lesson.lesson_reference || `L-${index + 1}`}</span>
          <span class="badge effect-${lesson.effect_type || 'neutral'}">${(lesson.effect_type || 'neutral').toUpperCase()}</span>
          <span class="badge">${lesson.lesson_category || lesson.category || 'N/A'}</span>
          <span class="badge">${lesson.priority || 'N/A'}</span>
        </div>
        <div class="lesson-meta">
          ${formatDate(lesson.lesson_date || lesson.date_logged || lesson.created_at)}
        </div>
      </div>

      <div class="field">
        <div class="field-label">Title:</div>
        <div class="field-value">${lesson.lesson_title || lesson.title || 'N/A'}</div>
      </div>

      <div class="field">
        <div class="field-label">What Happened (Event):</div>
        <div class="field-value">${(lesson.what_happened || lesson.event_description || 'N/A').replace(/\n/g, '<br>')}</div>
      </div>

      <div class="field">
        <div class="field-label">Effect:</div>
        <div class="field-value">${(lesson.what_was_impact || lesson.effect_description || 'N/A').replace(/\n/g, '<br>')}</div>
      </div>

      ${(lesson.what_caused_this || lesson.cause_description) ? `
      <div class="field">
        <div class="field-label">Root Cause:</div>
        <div class="field-value">${(lesson.what_caused_this || lesson.cause_description).replace(/\n/g, '<br>')}</div>
      </div>
      ` : ''}

      ${lesson.early_warning_indicators ? `
      <div class="field">
        <div class="field-label">Early Warning Indicators:</div>
        <div class="field-value">${lesson.early_warning_indicators.replace(/\n/g, '<br>')}</div>
      </div>
      ` : ''}

      <div class="field">
        <div class="field-label">Recommendations:</div>
        <div class="field-value">${(lesson.recommendations || 'N/A').replace(/\n/g, '<br>')}</div>
      </div>

      ${(lesson.related_product_name || lesson.related_product_id) ? `
      <div class="field">
        <div class="field-label">Related Product:</div>
        <div class="field-value">${lesson.related_product_name || 'N/A'}</div>
      </div>
      ` : ''}

      ${lesson.tags && lesson.tags.length > 0 ? `
      <div class="field">
        <div class="field-label">Tags:</div>
        <div class="field-value">${lesson.tags.join(', ')}</div>
      </div>
      ` : ''}
    </div>
    `).join('')}
  </div>

  <div class="footer">
    <p>Lessons Log: ${log.log_reference} | Version ${log.version_number || '1.0'} | Generated ${formatDate(new Date())}</p>
  </div>
</body>
</html>
  `;
}

/**
 * Export lessons log to PDF (using browser print)
 */
export function exportToPDF(log, lessons = [], summary = null) {
  const html = generateLessonsLogPrintHTML(log, lessons, summary);
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Please allow pop-ups to export PDF');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

/**
 * Export lessons to CSV
 */
export function exportToCSV(lessons = []) {
  const headers = [
    'Reference', 'Title', 'Date Logged', 'Category', 'Effect Type', 'Priority', 'Scope',
    'Event Description', 'Effect Description', 'Root Cause', 'Recommendations',
    'Status', 'Related Product', 'Tags'
  ];

  const rows = lessons.map(lesson => [
    lesson.lesson_reference || '',
    lesson.lesson_title || lesson.title || '',
    lesson.lesson_date || lesson.date_logged || lesson.created_at || '',
    lesson.lesson_category || lesson.category || '',
    lesson.effect_type || '',
    lesson.priority || '',
    lesson.lesson_scope || '',
    (lesson.what_happened || lesson.event_description || '').replace(/"/g, '""'),
    (lesson.what_was_impact || lesson.effect_description || '').replace(/"/g, '""'),
    (lesson.what_caused_this || lesson.cause_description || '').replace(/"/g, '""'),
    (lesson.recommendations || '').replace(/"/g, '""'),
    lesson.status || '',
    lesson.related_product_name || '',
    (lesson.tags || []).join('; ')
  ]);

  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = `lessons_log_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export lessons to Excel (CSV format, can be opened in Excel)
 */
export function exportToExcel(lessons = []) {
  // Use CSV format which Excel can open
  exportToCSV(lessons);
}

/**
 * Generate lessons report summary
 */
export function generateLessonsReport(log, lessons = [], summary = null) {
  const report = {
    log: {
      reference: log.log_reference,
      version: log.version_number,
      project: log.project?.project_name,
      author: log.author?.full_name,
      date: log.created_at
    },
    summary: summary || {
      total_lessons: lessons.length,
      positive_lessons: lessons.filter(l => l.effect_type === 'positive').length,
      negative_lessons: lessons.filter(l => l.effect_type === 'negative').length,
      corporate_lessons: lessons.filter(l => l.is_corporate_lesson).length,
      lessons_by_category: {},
      lessons_by_status: {}
    },
    lessons: lessons.map(lesson => ({
      reference: lesson.lesson_reference,
      title: lesson.lesson_title || lesson.title,
      category: lesson.lesson_category || lesson.category,
      effect_type: lesson.effect_type,
      priority: lesson.priority,
      recommendations: lesson.recommendations
    })),
    keyRecommendations: lessons
      .filter(l => l.priority === 'high' || l.priority === 'critical')
      .map(l => l.recommendations)
      .filter(Boolean)
      .slice(0, 10)
  };

  // Calculate category distribution
  lessons.forEach(lesson => {
    const category = lesson.lesson_category || lesson.category || 'other';
    report.summary.lessons_by_category[category] = (report.summary.lessons_by_category[category] || 0) + 1;
  });

  // Calculate status distribution
  lessons.forEach(lesson => {
    const status = lesson.status || 'logged';
    report.summary.lessons_by_status[status] = (report.summary.lessons_by_status[status] || 0) + 1;
  });

  return report;
}

export default {
  generateLessonsLogPrintHTML,
  exportToPDF,
  exportToCSV,
  exportToExcel,
  generateLessonsReport
};
