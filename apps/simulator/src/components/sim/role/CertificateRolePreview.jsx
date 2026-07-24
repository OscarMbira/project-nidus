import { SIMULATOR_ROLES } from '@nidus/shared/constants/simulatorRoles';

const ROLE_ACCENT = {
  project_manager: 'border-purple-500 from-purple-900/40 to-gray-900',
  programme_manager: 'border-orange-500 from-orange-900/40 to-gray-900',
  portfolio_manager: 'border-indigo-500 from-indigo-900/40 to-gray-900',
  pmo_analyst: 'border-teal-500 from-teal-900/40 to-gray-900',
  project_coordinator: 'border-green-500 from-green-900/40 to-gray-900',
};

export default function CertificateRolePreview({ templates = [], theme = 'dark' }) {
  if (!templates.length) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Role certificate previews</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const role = SIMULATOR_ROLES[Object.keys(SIMULATOR_ROLES).find(
            (k) => SIMULATOR_ROLES[k].id === template.role_id,
          )] || null;
          const accent = ROLE_ACCENT[template.role_id] || 'border-blue-500 from-blue-900/40 to-gray-900';
          return (
            <div
              key={template.id || template.template_code}
              className={`rounded-xl border-2 bg-gradient-to-br p-5 ${accent} ${
                theme === 'dark' ? 'text-white' : 'text-gray-900 bg-white'
              }`}
            >
              <p className="text-xs uppercase tracking-wide opacity-70 mb-1">
                {role?.label || template.role_id}
              </p>
              <h3 className="text-lg font-semibold mb-2">{template.certificate_name}</h3>
              <p className="text-sm opacity-80 mb-3">{template.description}</p>
              <div className="text-xs space-y-1 opacity-70">
                <p>Min score: {template.min_score ?? 75}%</p>
                {template.required_modules?.length > 0 && (
                  <p>{template.required_modules.length} learning modules required</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
