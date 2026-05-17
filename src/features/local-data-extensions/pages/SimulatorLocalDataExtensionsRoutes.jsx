import { simDb, platformDb } from '../../../services/supabase/supabaseClient'
import LocalDataExtensionsRoutes from './LocalDataExtensionsRoutes'

/** Simulator LDE admin + metadata uses sim schema; roles/public.users resolve via platformDb. */
export default function SimulatorLocalDataExtensionsRoutes() {
  return <LocalDataExtensionsRoutes dataDb={simDb} rolesDb={platformDb} />
}
