/** Canonical URL bases for the Testing & Diagnostics Centre (6 menu contexts). */
export const TESTING_CENTRE = {
  platform: '/platform/testing-centre',
  pm: '/pm/testing-centre',
  pmo: '/pmo/testing-centre',
  simulator: '/simulator/testing-centre',
  simPm: '/simulator/pm/testing-centre',
  simPmo: '/simulator/pmo/testing-centre',
}

export function homePathForSegment(segment) {
  switch (segment) {
    case 'pm': return TESTING_CENTRE.pm
    case 'pmo': return TESTING_CENTRE.pmo
    case 'sim': return TESTING_CENTRE.simulator
    case 'sim-pm': return TESTING_CENTRE.simPm
    case 'sim-pmo': return TESTING_CENTRE.simPmo
    default: return TESTING_CENTRE.platform
  }
}
