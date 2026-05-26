import { getTemplateService } from './processTemplateCrudFactory'

const svc = getTemplateService('activity-duration-estimates', { sim: false })

export const listByProject = svc.listByProject.bind(svc)
export const getById = svc.getById.bind(svc)
export const create = svc.create.bind(svc)
export const update = svc.update.bind(svc)
export const remove = svc.remove.bind(svc)
export const setOnHold = svc.setOnHold.bind(svc)
export const copyMaster = svc.copyMaster.bind(svc)
export default svc
