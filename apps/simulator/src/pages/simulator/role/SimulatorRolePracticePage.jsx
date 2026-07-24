import { useParams } from 'react-router-dom';
import RolePracticePage, { RolePracticeLinks } from '../../../components/sim/role/RolePracticePage';
import {
  PORTFOLIO_PRACTICE_PAGES,
  PROGRAMME_PRACTICE_PAGES,
  COORDINATOR_PRACTICE_PAGES,
  PMO_ANALYST_PRACTICE_PAGES,
} from '../../../config/simulatorRolePracticeMap';

const MAPS = {
  portfolio: PORTFOLIO_PRACTICE_PAGES,
  programme: PROGRAMME_PRACTICE_PAGES,
  coordinator: COORDINATOR_PRACTICE_PAGES,
  pmo: PMO_ANALYST_PRACTICE_PAGES,
};

export default function SimulatorRolePracticePage({ roleArea = 'portfolio' }) {
  const { pageKey } = useParams();
  const page = MAPS[roleArea]?.[pageKey];

  if (!page) {
    return (
      <RolePracticePage title="Practice area not found" description="This practice page is not configured.">
        <p className="text-sm text-gray-500 dark:text-gray-400">Check the sidebar menu for available areas.</p>
      </RolePracticePage>
    );
  }

  return (
    <RolePracticePage title={page.title} description={page.description}>
      <RolePracticeLinks links={page.links} />
    </RolePracticePage>
  );
}
