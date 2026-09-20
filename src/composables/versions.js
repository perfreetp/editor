import { createContentSummary } from '@/utils/version-diff'
import { shortId } from '@/utils/short-id'

export function useVersions(editorRef, options) {
  const storageKey = `umo-editor:${options.value.editorKey || 'default'}:versions`
  const versions = useStorage(storageKey, [])
  const panelVisible = ref(false)
  const selectedIds = ref([])
  let initialized = false
  let autoTimer = null

  const snapshot = (type = 'manual') => {
    const editor = editorRef.value
    if (!editor) {
      return null
    }
    const html = editor.getHTML()
    const id = shortId(10)
    const item = {
      id,
      type,
      html,
      summary: createContentSummary(html),
      createdAt: Date.now(),
    }
    versions.value.unshift(item)
    versions.value = versions.value.slice(0, 10)
    selectedIds.value = [id, ...selectedIds.value].slice(0, 2)
    return item
  }

  const saveManual = () => snapshot('manual')

  const toggleSelection = (id) => {
    if (selectedIds.value.includes(id)) {
      selectedIds.value = selectedIds.value.filter((item) => item !== id)
      return
    }
    selectedIds.value = [id, ...selectedIds.value].slice(0, 2)
  }

  const openPanel = () => {
    panelVisible.value = true
  }

  const closePanel = () => {
    panelVisible.value = false
  }

  const restore = async (id) => {
    const target = versions.value.find((item) => item.id === id)
    const editor = editorRef.value
    if (!target || !editor) {
      return false
    }
    snapshot('before-restore')
    editor.commands.setContent(target.html, { emitUpdate: true })
    const storageKey = `umo-editor:${options.value.editorKey || 'default'}:document`
    const storedDocument = useStorage(storageKey, {})
    storedDocument.value.content = target.html
    return true
  }

  const scheduleAutoSnapshot = () => {
    if (options.value.versionHistory?.enabled === false) {
      return
    }
    if (!initialized) {
      return
    }
    if (autoTimer !== null) {
      return
    }
    autoTimer = window.setTimeout(() => {
      autoTimer = null
      snapshot('auto')
    }, options.value.versionHistory?.interval || 5 * 60 * 1000)
  }

  const initialize = () => {
    if (initialized || !editorRef.value) {
      return
    }
    initialized = true
    if (
      versions.value.length === 0 &&
      options.value.versionHistory?.enabled !== false
    ) {
      snapshot('auto')
    }
    editorRef.value.on('update', scheduleAutoSnapshot)
  }

  onBeforeUnmount(() => {
    if (autoTimer !== null) {
      clearTimeout(autoTimer)
    }
    editorRef.value?.off('update', scheduleAutoSnapshot)
  })

  return {
    versions,
    panelVisible,
    selectedIds,
    initialize,
    saveManual,
    restore,
    toggleSelection,
    openPanel,
    closePanel,
  }
}
