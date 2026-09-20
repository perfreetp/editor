import { shortId } from '@/utils/short-id'

export function useComments(editorRef, options) {
  const storageKey = `umo-editor:${options.value.editorKey || 'default'}:comments`
  const threads = useStorage(storageKey, [])
  const panelVisible = ref(false)
  const activeThreadId = ref(null)
  const pendingSelection = ref(null)
  const preview = ref({
    visible: false,
    threadId: null,
    x: 0,
    y: 0,
  })

  const currentUser = computed(() => ({
    id: options.value.user?.id || 'anonymous',
    label: options.value.user?.label || 'Guest',
    avatar: options.value.user?.avatar || '',
  }))

  const openPanel = (threadId = null) => {
    panelVisible.value = true
    activeThreadId.value = threadId
  }

  const closePanel = () => {
    panelVisible.value = false
    activeThreadId.value = null
    pendingSelection.value = null
  }

  const prepareThread = () => {
    const editor = editorRef.value
    if (!editor) {
      return false
    }
    const { from, to, empty } = editor.state.selection
    if (empty || from === to) {
      return false
    }
    pendingSelection.value = {
      from,
      to,
      quote: editor.state.doc.textBetween(from, to, ' '),
    }
    openPanel()
    return true
  }

  const createThread = (content) => {
    const editor = editorRef.value
    const text = String(content || '').trim()
    const selection = pendingSelection.value
    if (!editor || !text || !selection) {
      return false
    }
    if (
      selection.to > editor.state.doc.content.size ||
      editor.state.doc.textBetween(selection.from, selection.to, ' ') !==
        selection.quote
    ) {
      pendingSelection.value = null
      return false
    }

    const id = shortId(10)
    const now = Date.now()
    const chain = editor.chain().focus()
    const { empty, from } = editor.state.selection
    if (empty || from !== selection.from) {
      chain.setTextSelection({ from: selection.from, to: selection.to })
    }
    chain
      .setMark('comment', {
        id,
        quote: selection.quote,
        resolved: false,
      })
      .run()

    threads.value.unshift({
      id,
      quote: selection.quote,
      resolved: false,
      createdAt: now,
      updatedAt: now,
      comments: [
        {
          id: shortId(10),
          authorId: currentUser.value.id,
          authorName: currentUser.value.label,
          authorAvatar: currentUser.value.avatar,
          content: text,
          createdAt: now,
        },
      ],
    })
    pendingSelection.value = null
    activeThreadId.value = id
    return true
  }

  const addReply = (threadId, content) => {
    const text = String(content || '').trim()
    const thread = threads.value.find((item) => item.id === threadId)
    if (!text || !thread) {
      return false
    }
    thread.comments.push({
      id: shortId(10),
      authorId: currentUser.value.id,
      authorName: currentUser.value.label,
      authorAvatar: currentUser.value.avatar,
      content: text,
      createdAt: Date.now(),
    })
    thread.updatedAt = Date.now()
    return true
  }

  const updateMarks = (threadId, patch = {}, remove = false) => {
    const editor = editorRef.value
    if (!editor) {
      return
    }
    const type = editor.schema.marks.comment
    if (!type) {
      return
    }
    const {
      state: { tr, doc },
    } = editor
    doc.descents((node, pos) => {
      node.marks
        .filter(
          (mark) =>
            mark.type.name === 'comment' && mark.attrs.id === threadId,
        )
        .forEach((mark) => {
          if (remove) {
            tr.removeMark(pos, pos + node.nodeSize, mark)
          } else {
            tr.addMark(
              pos,
              pos + node.nodeSize,
              type.create({
                ...mark.attrs,
                ...patch,
              }),
            )
          }
        })
    })
    if (tr.docChanged) {
      editor.view.dispatch(tr)
    }
  }

  const toggleResolved = (threadId) => {
    const thread = threads.value.find((item) => item.id === threadId)
    if (!thread) {
      return
    }
    thread.resolved = !thread.resolved
    thread.updatedAt = Date.now()
    updateMarks(threadId, { resolved: thread.resolved })
  }

  const deleteThread = (threadId) => {
    threads.value = threads.value.filter((item) => item.id !== threadId)
    updateMarks(threadId, {}, true)
    if (activeThreadId.value === threadId) {
      activeThreadId.value = null
    }
  }

  const showPreview = (threadId, event) => {
    preview.value = {
      visible: true,
      threadId,
      x: event.clientX,
      y: event.clientY,
    }
  }

  const movePreview = (event) => {
    if (!preview.value.visible) {
      return
    }
    preview.value.x = event.clientX
    preview.value.y = event.clientY
  }

  const hidePreview = () => {
    preview.value.visible = false
  }

  const focusThread = (threadId) => {
    const editor = editorRef.value
    const element = editor?.view.dom.querySelector(
      `[data-comment-id="${threadId}"]`,
    )
    if (!element) {
      return
    }
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    element.classList.add('is-active')
    window.setTimeout(() => element.classList.remove('is-active'), 1600)
  }

  return {
    threads,
    panelVisible,
    activeThreadId,
    pendingSelection,
    preview,
    prepareThread,
    createThread,
    addReply,
    toggleResolved,
    deleteThread,
    openPanel,
    closePanel,
    showPreview,
    movePreview,
    hidePreview,
    focusThread,
  }
}
