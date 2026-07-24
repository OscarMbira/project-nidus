/**
 * Documentation Service
 * Loads and manages markdown documentation files
 */
import { platformDb } from '@nidus/supabase';

const STORAGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/documentation`;

function storageUrl(system, module, fileName) {
  return `${STORAGE_BASE}/${system}/${module}/${fileName}`;
}

function normalizeSystem(system) {
  if (system === 'pm' || system === 'pm-platform') return 'platform';
  return system === 'simulator' ? 'simulator' : 'platform';
}

// Map documentation files to their paths and platforms
const DOCUMENTATION_MAP = {
  // Platform Documentation
  'platform': {
    platform: 'platform',
    name: 'Platform',
    guides: [
      {
        id: 'getting-started',
        title: 'Getting Started',
        file: 'Platform_Getting_Started.md',
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
 * Load a markdown file from Storage or the Documentation folder
 */
export async function loadDocumentationFile(filename, system = null, module = null) {
  if (system && module) {
    const primaryUrl = storageUrl(system, module, filename);
    const fallbackUrl = `/Documentation/${filename}`;
    for (const url of [primaryUrl, fallbackUrl]) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const content = await response.text();
        if (content.trim().startsWith('<!') || content.trim().startsWith('<html')) continue;
        return content;
      } catch {
        continue;
      }
    }
    throw new Error(`Documentation file not found: ${filename}`);
  }

  // Legacy static file lookup
  const paths = [
    `/Documentation/${filename}`,  // Production (public/Documentation/)
    `/docs/${filename}`,            // Alternative path
    `../Documentation/${filename}`, // Development fallback
  ];

  for (const path of paths) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        const content = await response.text();
        // Verify it's not HTML (like index.html fallback)
        if (content.trim().startsWith('<!DOCTYPE') || content.trim().startsWith('<!doctype') || content.trim().startsWith('<html')) {
          console.warn(`Received HTML instead of markdown for ${filename} at path ${path}`);
          continue; // Try next path
        }
        return content;
      }
    } catch (error) {
      // Continue to next path
      console.warn(`Failed to load ${filename} from ${path}:`, error);
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
  // Handle both old 'pm' and new 'platform' identifiers for backward compatibility
  const normalizedPlatform = platform === 'pm' || platform === 'pm-platform' ? 'platform' : platform;
  const platformKey = normalizedPlatform === 'platform' ? 'platform' : 'simulator';
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

/** Admin (v733): distinct modules from DB */
export async function getModules(system) {
  const normalizedSystem = normalizeSystem(system);
  const { data, error } = await platformDb
    .from('documentation_guides')
    .select('module, sort_order')
    .eq('system', normalizedSystem)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`Failed to fetch modules: ${error.message}`);
  const seen = new Set();
  return (data || [])
    .map((r) => r.module)
    .filter((m) => { if (seen.has(m)) return false; seen.add(m); return true; });
}

/** Admin (v733): active guides from DB */
export async function getDocumentationGuidesFromDb(system, module = null) {
  const normalizedSystem = normalizeSystem(system);
  let query = platformDb
    .from('documentation_guides')
    .select('*')
    .eq('system', normalizedSystem)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (module) query = query.eq('module', module);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch guides: ${error.message}`);
  return data || [];
}

export async function saveGuideMetadata(guide) {
  const { data, error } = await platformDb
    .from('documentation_guides')
    .upsert(guide, { onConflict: 'guide_id,system' })
    .select()
    .single();
  if (error) throw new Error(`Failed to save guide: ${error.message}`);
  return data;
}

export async function deactivateGuide(id) {
  const { error } = await platformDb
    .from('documentation_guides')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw new Error(`Failed to deactivate guide: ${error.message}`);
}

export async function deleteGuide(id) {
  const { error } = await platformDb
    .from('documentation_guides')
    .delete()
    .eq('id', id);
  if (error) throw new Error(`Failed to delete guide: ${error.message}`);
}

export async function uploadDocumentationFile(system, module, fileName, content) {
  const path = `${system}/${module}/${fileName}`;
  const { error } = await platformDb.storage
    .from('documentation')
    .upload(path, new Blob([content], { type: 'text/markdown' }), {
      upsert: true,
      contentType: 'text/markdown',
    });
  if (error) throw new Error(`Failed to upload file: ${error.message}`);
  return storageUrl(system, module, fileName);
}

export async function deleteDocumentationFile(system, module, fileName) {
  const path = `${system}/${module}/${fileName}`;
  const { error } = await platformDb.storage.from('documentation').remove([path]);
  if (error) throw new Error(`Failed to delete file from Storage: ${error.message}`);
}

export default {
  loadDocumentationFile,
  getDocumentationGuides,
  getGuideById,
  getGuidesByCategory,
  getCategories,
  getModules,
  getDocumentationGuidesFromDb,
  saveGuideMetadata,
  deactivateGuide,
  deleteGuide,
  uploadDocumentationFile,
  deleteDocumentationFile,
};

