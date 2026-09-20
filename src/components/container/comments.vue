<template>
  <div v-if="page.showComments" class="umo-comments-container">
    <div class="umo-comments-title">
      <icon class="icon-comment" name="comment" /> {{ t('comment.title') }}
      <div class="umo-dialog__close" @click="page.showComments = false">
        <icon name="close" />
      </div>
    </div>
    <div class="umo-comments-content umo-scrollbar">
      <!-- 新批注 -->
      <div v-if="draft" class="umo-comment-card is-draft">
        <div class="umo-comment-quote">{{ draft.quote }}</div>
        <t-textarea
          v-model="draftContent"
          class="umo-comment-textarea"
          :placeholder="t('comment.placeholder')"
          :autosize="{ minRows: 2, maxRows: 6 }"
        />
        <div class="umo-comment-actions">
          <t-button
            size="small"
            theme="primary"
            :disabled="draftContent.trim() === ''"
            @click="submitDraft"
          >
            {{ t('comment.submit') }}
          </t-button>
          <t-button size="small" variant="text" @click="cancelDraft">
            {{ t('dialog.cancel') }}
          </t-button>
        </div>
      </div>
      <!-- 空状态 -->
      <div v-if="threads.length === 0 && !draft" class="umo-comments-empty">
        {{ t('comment.empty') }}
      </div>
      <!-- 批注列表 -->
      <div
        v-for="thread in threads"
        :key="thread.commentId"
        class="umo-comment-card"
        :class="{
          'is-resolved': thread.data?.resolved,
          'is-active': activeId === thread.commentId,
        }"
        @click="locate(thread)"
      >
        <div class="umo-comment-quote" :title="thread.data?.quote">
          {{ thread.data?.quote }}
        </div>
        <t-tag
          v-if="thread.data?.resolved"
          class="umo-comment-resolved-tag"
          size="small"
          variant="light"
        >
          {{ t('comment.resolved') }}
        </t-tag>
        <div
          v-for="item in thread.data?.comments || []"
          :key="item.id"
          class="umo-comment-item"
        >
          <div class="umo-comment-meta">
            <span class="umo-comment-user">{{ item.user?.label }}</span>
            <span class="umo-comment-time">{{ timeAgo(item.createdAt) }}</span>
          </div>
          <div class="umo-comment-text">{{ item.content }}</div>
        </div>
        <div class="umo-comment-reply" @click.stop>
          <t-input
            v-model="replyContents[thread.commentId]"
            size="small"
            :placeholder="t('comment.replyPlaceholder')"
            :readonly="!editor?.isEditable"
            @enter="reply(thread)"
          />
        </div>
        <div class="umo-comment-actions" @click.stop>
          <t-button
            size="small"
            variant="text"
            :disabled="!editor?.isEditable"
            @click="toggleResolve(thread)"
          >
            <icon name="check" />
            {{
              thread.data?.resolved
                ? t('comment.reopen')
                : t('comment.resolve')
            }}
          </t-button>
          <t-button
            size="small"
            variant="text"
            theme="danger"
            :disabled="!editor?.isEditable"
            @click="remove(thread)"
          >
            <icon name="close" />
            {{ t('comment.delete') }}
          </t-button>
        </div>
      </div>
    </div>
  </div>
  <!-- 悬停预览 -->
  <div
    v-if="preview.visible && preview.data"
    class="umo-comment-preview"
    :style="{ left: `${preview.x}px`, top: `${preview.y}px` }"
    @mouseenter="cancelHidePreview"
    @mouseleave="hidePreview"
  >
    <div class="umo-comment-quote">{{ preview.data.quote }}</div>
    <div
      v-for="item in (preview.data.comments || []).slice(0, 2)"
      :key="item.id"
      class="umo-comment-item"
    >
      <div class="umo-comment-meta">
        <span class="umo-comment-user">{{ item.user?.label }}</span>
        <span class="umo-comment-time">{{ timeAgo(item.createdAt) }}</span>
      </div>
      <div class="umo-comment-text">{{ item.content }}</div>
    </div>
    <div v-if="(preview.data.comments || []).length > 2" class="umo-comment-more">
      {{ t('comment.more', { count: preview.data.comments.length - 2 }) }}
    </div>
  </div>
</template>

<script setup>
import { shortId } from '@/utils/short-id'
import { timeAgo } from '@/utils/time-ago'

const container = inject('container')
const editor = inject('editor')
const page = inject('page')
const options = inject('options')
const commentState = inject('commentState')

const threads = ref([])
const replyContents = reactive({})
const preview = ref({ visible: false, x: 0, y: 0, data: null })

const draft = computed(() => commentState.value?.draft)
const activeId = computed(() => commentState.value?.activeId)

const currentUser = () => {
  const user = options.value?.user
  return {
    id: user?.id || 'unknown',
    label: user?.label || user?.id || '',
  }
}

// 扫描文档中的批注标记，生成批注线程列表
const scanThreads = () => {
  const result = []
  const seen = new Set()
  editor.value?.state?.doc?.descendants((node) => {
    if (!node.isText) {
      return true
    }
    for (const mark of node.marks) {
      const { commentId, data } = mark.attrs
      if (
        mark.type.name === 'comment' &&
        commentId &&
        !seen.has(commentId)
      ) {
        seen.add(commentId)
        result.push({ commentId, data })
      }
    }
    return true
  })
  threads.value = result
}
const scheduleScan = useDebounceFn(scanThreads, 200)

watch(
  () => editor.value,
  (instance) => {
    if (!instance) {
      return
    }
    instance.on('update', scheduleScan)
    instance.on('create', scheduleScan)
    scanThreads()
  },
  { immediate: true },
)

// 新批注
let draftContent = ref('')
const submitDraft = () => {
  const currentDraft = commentState.value?.draft
  const content = draftContent.value.trim()
  if (!currentDraft || content === '') {
    return
  }
  const commentId = shortId(10)
  const data = {
    quote: currentDraft.quote,
    resolved: false,
    createdAt: Date.now(),
    comments: [
      {
        id: shortId(10),
        user: currentUser(),
        content,
        createdAt: Date.now(),
      },
    ],
  }
  editor.value
    ?.chain()
    .focus()
    .setTextSelection({ from: currentDraft.from, to: currentDraft.to })
    .setComment({ commentId, data })
    .run()
  commentState.value.draft = null
  commentState.value.activeId = commentId
  draftContent.value = ''
  scanThreads()
}
const cancelDraft = () => {
  commentState.value.draft = null
  draftContent.value = ''
}
watch(draft, (val) => {
  if (val) {
    draftContent.value = ''
  }
})

// 回复
const reply = (thread) => {
  const content = (replyContents[thread.commentId] || '').trim()
  if (content === '') {
    return
  }
  const data = {
    ...thread.data,
    comments: [
      ...(thread.data?.comments || []),
      {
        id: shortId(10),
        user: currentUser(),
        content,
        createdAt: Date.now(),
      },
    ],
  }
  editor.value?.commands.updateCommentData({
    commentId: thread.commentId,
    data,
  })
  replyContents[thread.commentId] = ''
  scanThreads()
}

// 标记已解决 / 重新打开
const toggleResolve = (thread) => {
  editor.value?.commands.updateCommentData({
    commentId: thread.commentId,
    data: { ...thread.data, resolved: !thread.data?.resolved },
  })
  scanThreads()
}

// 删除批注
const remove = (thread) => {
  const dialog = useConfirm({
    attach: container,
    theme: 'warning',
    header: t('comment.delete'),
    body: t('comment.deleteConfirm'),
    onConfirm() {
      editor.value?.commands.unsetComment(thread.commentId)
      scanThreads()
      dialog.destroy()
    },
  })
}

// 定位到正文中的批注标记
const locate = (thread) => {
  commentState.value.activeId = thread.commentId
  const nodeElement = editor.value?.view?.dom?.querySelector(
    `[data-comment-id="${thread.commentId}"]`,
  )
  if (!nodeElement) {
    return
  }
  nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
  nodeElement.classList.add('umo-comment-focus')
  setTimeout(() => {
    nodeElement.classList.remove('umo-comment-focus')
  }, 2000)
}

// 悬停预览
let hidePreviewTimer = null
const showPreview = (element) => {
  clearTimeout(hidePreviewTimer)
  let data = null
  try {
    data = JSON.parse(element.getAttribute('data-comment'))
  } catch {
    data = null
  }
  if (!data) {
    return
  }
  const mainContainer = document.querySelector(
    `${container} .umo-main-container`,
  )
  if (!mainContainer) {
    return
  }
  const rect = element.getBoundingClientRect()
  const containerRect = mainContainer.getBoundingClientRect()
  preview.value = {
    visible: true,
    x: Math.max(0, rect.left - containerRect.left),
    y: rect.bottom - containerRect.top + 6,
    data,
  }
}
const hidePreview = () => {
  preview.value.visible = false
}
const scheduleHidePreview = () => {
  clearTimeout(hidePreviewTimer)
  hidePreviewTimer = setTimeout(hidePreview, 200)
}
const cancelHidePreview = () => {
  clearTimeout(hidePreviewTimer)
}

// 点击正文中的批注标记时，打开面板并高亮对应批注
const handleMarkClick = (event) => {
  const element = event.target?.closest?.('.umo-comment')
  if (!element) {
    return
  }
  const commentId = element.getAttribute('data-comment-id')
  if (!commentId) {
    return
  }
  page.value.showComments = true
  commentState.value.activeId = commentId
}

onMounted(() => {
  const contentElement = document.querySelector(
    `${container} .umo-editor-content`,
  )
  contentElement?.addEventListener('mouseover', (event) => {
    const element = event.target?.closest?.('.umo-comment')
    if (element) {
      showPreview(element)
    }
  })
  contentElement?.addEventListener('mouseout', (event) => {
    if (event.target?.closest?.('.umo-comment')) {
      scheduleHidePreview()
    }
  })
  contentElement?.addEventListener('click', handleMarkClick)
})
</script>

<style lang="less">
.umo-comments-container {
  width: 300px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: var(--umo-color-white);
  border-left: solid 1px var(--umo-border-color);
  flex-shrink: 0;
  &:hover {
    .umo-dialog__close {
      display: flex !important;
    }
  }
  .umo-comments-title {
    display: flex;
    align-items: center;
    position: relative;
    padding: 10px 15px;
    border-bottom: solid 1px var(--umo-border-color-light);
    .icon-comment {
      margin-right: 5px;
      font-size: 18px;
    }
    .umo-dialog__close {
      position: absolute;
      right: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      display: none;
    }
  }
  .umo-comments-content {
    flex: 1;
    overflow-y: auto;
    padding: 10px 12px;
  }
  .umo-comments-empty {
    color: var(--umo-text-color-light);
    font-size: var(--umo-font-size-small);
    text-align: center;
    padding: 40px 0;
  }
}
.umo-comment-card {
  border: solid 1px var(--umo-border-color);
  border-radius: var(--umo-radius-medium);
  padding: 10px 12px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: border-color 0.2s ease;
  &:hover {
    border-color: var(--umo-primary-color);
  }
  &.is-active {
    border-color: var(--umo-primary-color);
    box-shadow: 0 0 0 1px var(--umo-primary-color);
  }
  &.is-resolved {
    opacity: 0.65;
  }
  &.is-draft {
    cursor: default;
    border-color: var(--umo-primary-color);
  }
  .umo-comment-resolved-tag {
    margin-top: 6px;
  }
}
.umo-comment-quote {
  font-size: var(--umo-font-size-small);
  color: var(--umo-text-color-light);
  border-left: 3px solid #f5b800;
  padding-left: 8px;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
}
.umo-comment-item {
  margin-bottom: 8px;
  .umo-comment-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    .umo-comment-user {
      font-size: var(--umo-font-size-small);
      font-weight: 500;
      color: var(--umo-text-color);
    }
    .umo-comment-time {
      font-size: var(--umo-font-size-small);
      color: var(--umo-text-color-light);
      transform: scale(0.9);
      transform-origin: right center;
    }
  }
  .umo-comment-text {
    font-size: var(--umo-font-size-small);
    color: var(--umo-text-color);
    margin-top: 2px;
    word-break: break-word;
  }
}
.umo-comment-reply {
  margin-top: 4px;
}
.umo-comment-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  .umo-button {
    .umo-icon {
      margin-right: 2px;
    }
  }
}
.umo-comment-preview {
  position: absolute;
  z-index: 120;
  width: 260px;
  background-color: var(--umo-color-white);
  border: solid 1px var(--umo-border-color);
  border-radius: var(--umo-radius-medium);
  box-shadow: var(--umo-shadow);
  padding: 10px 12px;
  .umo-comment-more {
    font-size: var(--umo-font-size-small);
    color: var(--umo-text-color-light);
  }
}

// 正文中的批注标记
.umo-editor-content {
  .umo-comment {
    background-color: rgba(245, 184, 0, 0.25);
    border-bottom: 2px solid #f5b800;
    cursor: pointer;
    &.is-resolved {
      background-color: rgba(245, 184, 0, 0.08);
      border-bottom-color: rgba(245, 184, 0, 0.4);
    }
    &.umo-comment-focus {
      animation: umo-comment-flash 1s ease-in-out 2;
    }
  }
}
@keyframes umo-comment-flash {
  0%,
  100% {
    background-color: rgba(245, 184, 0, 0.25);
  }
  50% {
    background-color: rgba(245, 184, 0, 0.6);
  }
}
@media print {
  .umo-editor-content .umo-comment {
    background-color: transparent;
    border-bottom: none;
  }
}
</style>
