/**
 * Documentation Service
 * Loads and manages markdown documentation files
 */

// Map documentation files to their paths and platforms
const DOCUMENTATION_MAP = {
  // Platform Documentation
  'pm-platform': {
    platform: 'pm',
    name: 'Platform',
    guides: [
      {
        id: 'getting-started',
        title: 'Getting Started',
        file: 'PM_Platform_Getting_Started.md',
        category: 'Getting Started'
      },
      {
        id: 'project-manager-guide',
        title: 'Project Manager Guide',
        file: 'Project_Manager_Guide.md',
        category: 'Role Guides'
      },
      {
        id: 'team-lead-guide',
        title: 'Team Lead Guide',
        file: 'Team_Lead_Guide.md',
        category: 'Role Guides'
      },
      {
        id: 'team-member-guide',
        title: 'Team Member Guide',
        file: 'Team_Member_Guide.md',
        category: 'Role Guides'
      },
      {
        id: 'gantt-chart-guide',
        title: 'Gantt Chart Guide',
        file: 'Gantt_Chart_User_Guide.md',
        category: 'Features'
      },
      {
        id: 'kanban-guide',
        title: 'Kanban Board Guide',
        file: 'Kanban_User_Guide.md',
        category: 'Features'
      },
      {
        id: 'risk-management',
        title: 'Risk Management Guide',
        file: 'Risk_Management_Guide.md',
        category: 'Features'
      },
      {
        id: 'issue-management',
        title: 'Issue Management Guide',
        file: 'Issue_Management_Guide.md',
        category: 'Features'
      },
      {
        id: 'raid-log',
        title: 'RAID Log Guide',
        file: 'RAID_Log_User_Guide.md',
        category: 'Features'
      },
      {
        id: 'structured-pm-cs',
        title: 'Structured PM - Controlling a Stage',
        file: 'Structured_PM_CS_Guide.md',
        category: 'Methodologies'
      },
      {
        id: 'structured-pm-mp',
        title: 'Structured PM - Managing Product Delivery',
        file: 'Structured_PM_MP_Guide.md',
        category: 'Methodologies'
      },
      {
        id: 'scrum-events',
        title: 'Scrum Events Guide',
        file: 'Scrum_Events_Guide.md',
        category: 'Methodologies'
      },
      {
        id: 'sprint-board',
        title: 'Sprint Board Guide',
        file: 'Sprint_Board_User_Guide.md',
        category: 'Methodologies'
      }
    ]
  },
  // Simulator Documentation
  'simulator': {
    platform: 'simulator',
    name: 'Simulator',
    guides: [
      {
        id: 'getting-started',
        title: 'Getting Started',
        file: 'User_Guide.md',
        category: 'Getting Started'
      },
      {
        id: 'help-content',
        title: 'FAQ & Help',
        file: 'Help_Content.md',
        category: 'Help'
      },
      {
        id: 'scenario-guide',
        title: 'Scenario Guide',
        file: 'PRD_Project_Management_Simulator.md',
        category: 'Guides'
      }
    ]
  }
};

/**
 * Load a markdown file from the Documentation folder
 */
export async function loadDocumentationFile(filename) {
  // Try multiple paths - in Vite, files in public/ are served at root
  const paths = [
    `/Documentation/${filename}`,  // Production (public/Documentation/)
    `/docs/${filename}`,            // Alternative path
    `../Documentation/${filename}`, // Development fallback
  ];

  for (const path of paths) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      // Continue to next path
      continue;
    }
  }

  // If all paths fail, throw error
  throw new Error(`Failed to load documentation file: ${filename}. Please ensure the Documentation folder is in the public directory.`);
}

/**
 * Get all documentation guides for a platform
 */
export function getDocumentationGuides(platform) {
  const platformKey = platform === 'pm' ? 'pm-platform' : 'simulator';
  return DOCUMENTATION_MAP[platformKey] || null;
}

/**
 * Get a specific guide by ID
 */
export function getGuideById(platform, guideId) {
  const platformData = getDocumentationGuides(platform);
  if (!platformData) return null;
  
  return platformData.guides.find(guide => guide.id === guideId) || null;
}

/**
 * Get guides by category
 */
export function getGuidesByCategory(platform, category) {
  const platformData = getDocumentationGuides(platform);
  if (!platformData) return [];
  
  return platformData.guides.filter(guide => guide.category === category);
}

/**
 * Get all unique categories for a platform
 */
export function getCategories(platform) {
  const platformData = getDocumentationGuides(platform);
  if (!platformData) return [];
  
  const categories = [...new Set(platformData.guides.map(guide => guide.category))];
  return categories;
}

export default {
  loadDocumentationFile,
  getDocumentationGuides,
  getGuideById,
  getGuidesByCategory,
  getCategories
};

