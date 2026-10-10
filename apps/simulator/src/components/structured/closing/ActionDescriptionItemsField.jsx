import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { useViewMode } from '@nidus/shared/hooks/useViewMode';
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils';
import ViewToggle from '@nidus/ui/ViewToggle';
import { RowActionButton } from '@nidus/ui';
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table';
import Modal from '@nidus/ui/Modal';
import RowNumberBadge from '@nidus/ui/RowNumberBadge';

const inputClass = 'w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white';

export function descriptionItemsFromAction(action) {
  if (Array.isArray(action?.action_description_items) && action.action_description_items.length) {
    return action.action_description_items
      .map((row) => ({
        description: String(row?.description || '').trim(),
        target_date: row?.target_date ? String(row.target_date).slice(0, 10) : '',
      }))
      .filter((row) => row.description);
  }
  return String(action?.action_description || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((description) => ({ description, target_date: '' }));
}

export function joinDescriptionItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((row) => String(row?.description || '').trim())
    .filter(Boolean)
    .join('\n');
}

export default function ActionDescriptionItemsField({ items = [], onChange, disabled = false }) {
  const [viewMode, setViewMode] = useViewMode('follow-on-action-description', 'list');
  const [draft, setDraft] = useState('');
  const [draftDate, setDraftDate] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [editDate, setEditDate] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  const update = (next) => onChange(next);

  const addDraft = () => {
    const description = draft.trim();
    if (!description) return;
    update([...items, { description, target_date: draftDate || '' }]);
    setDraft('');
    setDraftDate('');
  };

  const saveEdit = () => {
    if (editingIndex == null) return;
    const description = editDraft.trim();
    if (!description) return;
    const next = [...items];
    next[editingIndex] = { description, target_date: editDate || '' };
    update(next);
    setEditingIndex(null);
    setEditDraft('');
    setEditDate('');
  };

  const confirmDelete = () => {
    if (pendingDelete === 'all') update([]);
    else if (typeof pendingDelete === 'number') update(items.filter((_, index) => index !== pendingDelete));
    setPendingDelete(null);
    setEditingIndex(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">View</span>
        <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Action description layout" />
      </div>

      {viewMode === 'list' ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto bg-white dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader />
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Description</th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider w-44">Target date</th>
                {!disabled && (
                <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider w-28">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((item, index) => (
                <tr key={`${index}-${item.description.slice(0, 24)}`}>
                  <TableRowNumberCell number={getDisplayRowNumber(index)} className="text-gray-700 dark:text-gray-200" />
                  <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {editingIndex === index ? (
                      <input
                        type="text"
                        value={editDraft}
                        onChange={(event) => setEditDraft(event.target.value)}
                        className={inputClass}
                        aria-label={`Edit action description ${index + 1}`}
                      />
                    ) : (
                      <span className="whitespace-pre-wrap">{item.description}</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="date"
                      value={editingIndex === index ? editDate : (item.target_date || '')}
                      onChange={(event) => {
                        const target_date = event.target.value;
                        if (editingIndex === index) {
                          setEditDate(target_date);
                          return;
                        }
                        const next = [...items];
                        next[index] = { ...item, target_date };
                        update(next);
                      }}
                      className={inputClass}
                      aria-label={`Target date for action description ${index + 1}`}
                      disabled={disabled}
                    />
                  </td>
                  {!disabled && (
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center justify-end gap-0.5">
                      {editingIndex === index ? (
                        <>
                          <button type="button" onClick={saveEdit} className="p-2 rounded text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20" aria-label={`Save action description ${index + 1}`}>
                            <Check className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => setEditingIndex(null)} className="p-2 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label={`Cancel editing action description ${index + 1}`}>
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <RowActionButton
                            variant="edit"
                            label={`Edit action description ${index + 1}`}
                            onClick={() => {
                              setEditingIndex(index);
                              setEditDraft(item.description);
                              setEditDate(item.target_date || '');
                            }}
                          />
                          <RowActionButton variant="delete" label={`Remove action description ${index + 1}`} onClick={() => setPendingDelete(index)} />
                        </>
                      )}
                    </div>
                  </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={`${index}-${item.description.slice(0, 24)}`} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-3 space-y-2">
              <div className="flex items-start gap-2">
                <RowNumberBadge number={getDisplayRowNumber(index)} />
                <p className="flex-1 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{item.description}</p>
                {!disabled && (
                <RowActionButton variant="delete" label={`Remove action description ${index + 1}`} onClick={() => setPendingDelete(index)} />
                )}
              </div>
              <input
                type="date"
                value={item.target_date || ''}
                onChange={(event) => {
                  const next = [...items];
                  next[index] = { ...item, target_date: event.target.value };
                  update(next);
                }}
                className={inputClass}
                aria-label={`Target date for action description ${index + 1}`}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      )}

      {!disabled && items.length > 0 && (
        <button type="button" onClick={() => setPendingDelete('all')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 dark:hover:text-red-400">
          <X className="h-4 w-4" /> Clear all
        </button>
      )}

      {!disabled && (
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addDraft();
            }
          }}
          placeholder="Add an action description"
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          aria-label="New action description"
        />
        <input
          type="date"
          value={draftDate}
          onChange={(event) => setDraftDate(event.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          aria-label="Target date for the new action description"
        />
        <button
          type="button"
          onClick={addDraft}
          disabled={!draft.trim()}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
      )}

      <Modal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title={pendingDelete === 'all' ? 'Clear all descriptions?' : 'Remove this description?'}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPendingDelete(null)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
              Cancel
            </button>
            <button type="button" onClick={confirmDelete} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium">
              Remove
            </button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {pendingDelete === 'all'
            ? 'This removes every description and its target date from this action.'
            : 'This removes the description and its target date. Save the action to keep the change.'}
        </p>
      </Modal>
    </div>
  );
}
