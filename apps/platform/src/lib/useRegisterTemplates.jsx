/**
 * Register record templates (v1336): New → Blank / From template on the routed "New …" page
 * (…/local-registers/<register>/new, v1361 — rule 65, no dialog), the Templates tab, Preview
 * (complete document), Customise, Edit, Archive.
 * Document registers only. Identical copy in apps/simulator (only the database client differs).
 *
 * @param {object} input
 * @param {object|null} input.register       register definition (with fields)
 * @param {string|null} input.projectId      the project new records belong to
 * @param {string} input.basePath            '/platform' or '/simulator'
 * @param {string} input.scopeSuffix         query string to keep on the create link
 * @param {(key: string) => Promise<{data: object|null}>} input.loadRegister  register definition by key
 * @param {boolean} [input.inline]           true on the "New …" page: pickerElement is the page content
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { platformDb as db } from '@nidus/supabase'
import { getCurrentUserAccountId, getCurrentUserInternalUserId } from '@nidus/shared/utils/accountResolution'
import {
  archiveTemplate,
  buildTemplateDocumentPdfBlob,
  canManageRegisterTemplates,
  createRecordFromTemplate,
  customiseTemplate,
  getRegisterTemplate,
  listRegisterTemplates,
} from '@nidus/shared/services/localRegisterTemplateService'
import RegisterTemplatePicker from '@nidus/ui/RegisterTemplatePicker'
import RegisterTemplatesTab from '@nidus/ui/RegisterTemplatesTab'
import Modal from '@nidus/ui/Modal'

const MODE = 'platform'

export function useRegisterTemplates({ register, projectId, basePath, scopeSuffix = '', loadRegister, inline = false }) {
  const navigate = useNavigate()
  const enabled = Boolean(register?.is_document || register?.behaviour?.templates) // v1337: runbooks use templates too
  const registerKey = register?.register_key || null
  const [state, setState] = useState({ key: null, templates: [] })
  const [viewer, setViewer] = useState({ accountId: null, userId: null, canManage: false })
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(null) // { name, url } | { name, loading: true }
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([getCurrentUserAccountId(), getCurrentUserInternalUserId()]).then(async ([accountId, userId]) => {
      const canManage = await canManageRegisterTemplates(db, accountId)
      if (!cancelled) setViewer({ accountId, userId, canManage })
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!enabled || !registerKey) return undefined
    let cancelled = false
    listRegisterTemplates(db, registerKey, { includeArchived: true }).then((result) => {
      if (cancelled) return
      if (!result.success) toast.error(result.message || 'Failed to load templates')
      setState({ key: `${registerKey}|${reloadKey}`, templates: result.success ? result.data : [] })
    })
    return () => { cancelled = true }
  }, [enabled, registerKey, reloadKey])

  const loading = enabled && state.key !== `${registerKey}|${reloadKey}`
  const activeTemplates = state.templates.filter((t) => !t.is_archived)
  const listPath = `${basePath}/local-registers/${registerKey}`

  const openNew = useCallback(() => {
    navigate(`${listPath}/${enabled ? 'new' : 'create'}${scopeSuffix}`)
  }, [enabled, navigate, listPath, scopeSuffix])

  const createFromTemplate = async (template, title) => {
    if (!projectId) {
      toast.error('Open a project first — the new record belongs to a project.')
      return
    }
    setBusy(true)
    const result = await createRecordFromTemplate(db, {
      templateId: template.id, projectId, title, accountId: viewer.accountId, uploadedByUserId: viewer.userId, mode: MODE,
    })
    setBusy(false)
    if (!result.success) {
      if (result.code === 'exists') {
        toast.error(result.message)
        if (result.existingRecordId) navigate(`${listPath}/${result.existingRecordId}`)
        return
      }
      toast.error(result.message || 'The record could not be created')
      return
    }
    if (result.data.failedFiles.length) {
      toast.error(`Created, but these annexures could not be copied: ${result.data.failedFiles.join(', ')}`)
    } else {
      toast.success(`Created from “${template.name}” with ${result.data.children} linked records and ${result.data.copied} annexures`)
    }
    navigate(`${listPath}/${result.data.recordId}`, { replace: true })
  }

  const previewTemplate = async (template) => {
    setPreview({ name: template.name, loading: true })
    const full = await getRegisterTemplate(db, template.id)
    if (!full.success) {
      toast.error(full.message || 'Failed to load the template')
      setPreview(null)
      return
    }
    const childKeys = [...new Set(full.data.children.map((c) => c.register_key))]
    const childRegisters = Object.fromEntries(await Promise.all(childKeys.map(async (key) => [key, (await loadRegister(key)).data])))
    try {
      const blob = await buildTemplateDocumentPdfBlob(db, { register, template: full.data, childRegisters })
      setPreview({ name: template.name, url: URL.createObjectURL(blob) })
    } catch (error) {
      toast.error(error?.message || 'Failed to build the preview')
      setPreview(null)
    }
  }

  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  const customise = async (template) => {
    const result = await customiseTemplate(db, { templateId: template.id, name: `${template.name} (customised)`, accountId: viewer.accountId })
    if (!result.success) {
      toast.error(result.message || 'The template could not be customised')
      return
    }
    toast.success('Organisation copy created — edit it now')
    setReloadKey((k) => k + 1)
    navigate(`${listPath}/templates/${result.data}/edit`)
  }

  const archive = async (template, archived) => {
    const result = await archiveTemplate(db, { templateId: template.id, archived })
    if (!result.success) {
      toast.error(result.message || 'The template could not be updated')
      return
    }
    toast.success(archived ? 'Template archived' : 'Template restored')
    setReloadKey((k) => k + 1)
  }

  const pickerElement = enabled && inline ? (
    <RegisterTemplatePicker
      inline
      registerLabel={register?.label || ''}
      templates={activeTemplates}
      loading={loading}
      busy={busy}
      onBlank={() => navigate(`${listPath}/create${scopeSuffix}`, { replace: true })}
      onUse={createFromTemplate}
      onPreview={previewTemplate}
    />
  ) : null

  const templatesTab = enabled ? (
    <RegisterTemplatesTab
      registerKey={registerKey}
      templates={state.templates}
      loading={loading}
      canManage={viewer.canManage}
      onPreview={previewTemplate}
      onUse={openNew}
      onCustomise={customise}
      onEdit={(t) => navigate(`${listPath}/templates/${t.id}/edit`)}
      onArchive={archive}
    />
  ) : null

  const previewElement = preview ? (
    <Modal isOpen onClose={closePreview} title={`Preview: ${preview.name}`} size="full" className="!max-w-[93.6rem] w-full h-[92vh] max-h-[92vh] flex flex-col overflow-hidden" contentClassName="!p-0 !max-h-none flex-1 min-h-0 overflow-hidden flex flex-col">
      {preview.loading ? (
        <div className="flex h-full min-h-[50vh] items-center justify-center text-sm text-gray-600 dark:text-gray-300">Building the complete document…</div>
      ) : (
        <iframe src={`${preview.url}#view=FitH`} title={`Preview ${preview.name}`} className="block h-full min-h-[50vh] w-full border-0 bg-white" />
      )}
    </Modal>
  ) : null

  return { enabled, templates: state.templates, canManage: viewer.canManage, openNew, pickerElement, templatesTab, previewElement }
}
