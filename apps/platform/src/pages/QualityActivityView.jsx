/**
 * Quality Activity View Page
 * Full page view for a quality activity detail
 */

import { useParams, useNavigate } from 'react-router-dom';
import QualityActivityDetail from '../components/quality/QualityActivityDetail';

export default function QualityActivityView() {
  const { identifier } = useParams();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <QualityActivityDetail
      activityIdentifier={identifier}
      onBack={handleBack}
    />
  );
}
