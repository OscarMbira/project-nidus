import { Link } from 'react-router-dom';

/**
 * Reusable practice area page shell for v734 role dashboards.
 */
export default function RolePracticePage({ title, description, children }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {description && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>
        )}
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        {children}
      </div>
    </div>
  );
}

export function RolePracticeLinks({ links = [] }) {
  if (!links.length) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No linked practice areas configured.</p>;
  }
  return (
    <ul className="space-y-2">
      {links.map((link) => (
        <li key={link.path}>
          <Link
            to={link.path}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
