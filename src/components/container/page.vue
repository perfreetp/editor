<template>
  <div ref="mainContainerRef" class="umo-main-container">
    <container-toc
      v-if="pageOptions.showToc"
      @close="pageOptions.showToc = false"
    />
    <div
      :class="`umo-zoomable-container umo-${pageOptions.layout}-container umo-scrollbar`"
    >
      <div
        class="umo-zoomable-content"
        :style="{
          width: pageZoomWidth,
          height: pageZoomHeight,
        }"
      >
        <t-watermark
          class="umo-page-content"
          :style="{
            '--umo-page-orientation': pageOptions.orientation,
            '--umo-page-background': pageOptions.background,
            '--umo-page-margin-top': pageOptions.margin?.top + 'cm',
            '--umo-page-margin-bottom': pageOptions.margin?.bottom + 'cm',
            '--umo-page-margin-left': pageOptions.margin?.left + 'cm',
            '--umo-page-margin-right': pageOptions.margin?.right + 'cm',
            '--umo-page-width':
              pageOptions.layout === 'page' ? pageSize.width + 'cm' : 'auto',
            '--umo-page-height':
              pageOptions.layout === 'page' ? pageSize.height + 'cm' : '100%',
            width:
              pageOptions.layout === 'page' ? pageSize.width + 'cm' : '100%',
            transform: `scale(${pageOptions.zoomLevel ? pageOptions.zoomLevel / 100 : 1})`,
          }"
          :alpha="pageOptions.watermark.alpha"
          v-bind="watermarkOptions"
          :watermark-content="pageOptions.watermark"
        >
          <div class="umo-page-node-header" contenteditable="false">
            <div
              class="umo-page-corner corner-tl"
              style="width: var(--umo-page-margin-left)"
            ></div>

            <div class="umo-page-node-header-content"></div>
            <div
              class="umo-page-corner corner-tr"
              style="width: var(--umo-page-margin-right)"
            ></div>
          </div>
          <div class="umo-page-node-content">
            <editor>
              <template #bubble_menu="props">
                <slot name="bubble_menu" v-bind="props" />
              </template>
            </editor>
          </div>
          <div class="umo-page-node-footer" contenteditable="false">
            <div
              class="umo-page-corner corner-bl"
              style="width: var(--umo-page-margin-left)"
            ></div>
            <div class="umo-page-node-footer-content"></div>
            <div
              class="umo-page-corner corner-br"
              style="width: var(--umo-page-margin-right)"
            ></div>
          </div>
        </t-watermark>
      </div>
    </div>
    <div class="umo-main-floating-actions">
      <t-back-top
        style="position: relative"
        :container="`${container} .umo-zoomable-container`"
        :visible-height="800"
        size="small"
      />
    </div>
    <t-image-viewer
      :attach="container"
      v-model:visible="imageViewer.visible"
      v-model:index="currentImageIndex"
      :images="previewImages"
      :trigger="() => {}"
      :image-scale="{ max: 10, min: 0.1, step: 0.2 }"
      @close="imageViewer.visible = false"
    />
    <container-search-replace />
    <container-print />
    <container-comments-panel v-if="comments.panelVisible.value" />
    <container-versions-panel v-if="versions.panelVisible.value" />
    <container-comment-preview />
  </div>
</template>

<script setup>
const container = inject('container')
const imageViewer = inject('imageViewer')
const pageOptions = inject('page')
const comments = inject('comments')
const versions = inject('versions')
const mainContainerRef = ref(null)

const findCommentMark = (target) =>
  target instanceof Element ? target.closest('[data-comment-id]') : null

const handleCommentClick = (event) => {
  const mark = findCommentMark(event.target)
  if (!mark) return
  event.preventDefault()
  const threadId = mark.getAttribute('data-comment-id')
  comments.openPanel(threadId)
  comments.focusThread(threadId)
}

let hidePreviewTimer = 0
const handleCommentMouseEnter = (event) => {
  const mark = findCommentMark(event.target)
  if (!mark) return
  window.clearTimeout(hidePreviewTimer)
  const threadId = mark.getAttribute('data-comment-id')
  if (comments.preview.value.threadId !== threadId) {
    comments.showPreview(threadId, event)
  }
}

const handleCommentMouseOut = (event) => {
  const mark = findCommentMark(event.target)
  if (!mark) return
  window.clearTimeout(hidePreviewTimer)
  hidePreviewTimer = window.setTimeout(comments.hidePreview, 120)
}

onMounted(() => {
  mainContainerRef.value?.addEventListener('click', handleCommentClick)
  mainContainerRef.value?.addEventListener(
    'mouseover',
    handleCommentMouseEnter,
  )
  mainContainerRef.value?.addEventListener('mouseout', handleCommentMouseOut)
})

onBeforeUnmount(() => {
  window.clearTimeout(hidePreviewTimer)
  mainContainerRef.value?.removeEventListener('click', handleCommentClick)
  mainContainerRef.value?.removeEventListener(
    'mouseover',
    handleCommentMouseEnter,
  )
  mainContainerRef.value?.removeEventListener('mouseout', handleCommentMouseOut)
})

// 页面大小
const pageSize = $computed(() => {
  const { width, height } = pageOptions.value.size || { width: 0, height: 0 }
  return {
    width: pageOptions.value.orientation === 'portrait' ? width : height,
    height: pageOptions.value.orientation === 'portrait' ? height : width,
  }
})
// 页面缩放后的大小
const pageZoomWidth = $computed(() => {
  if (pageOptions.value.layout === 'web') {
    return '100%'
  }
  return `calc(${pageSize.width}cm * ${pageOptions.value.zoomLevel ? pageOptions.value.zoomLevel / 100 : 1})`
})

// 页面内容变化后更新页面高度
let pageZoomHeight = $ref('')
let pageContentEl = $ref(null)
let pageHeightRaf = 0
let pageHeightObserver = $ref(null)
const updatePageZoomHeight = () => {
  if (pageOptions.value.layout === 'web') {
    pageZoomHeight = 'auto'
    return
  }
  if (!pageContentEl) {
    console.warn('The element <.umo-page-content> does not exist.')
    return
  }
  const height = `${(pageContentEl.clientHeight * (pageOptions.value.zoomLevel || 1)) / 100}px`
  if (pageZoomHeight !== height) {
    pageZoomHeight = height
  }
}
const schedulePageZoomHeight = () => {
  if (pageHeightRaf) {
    cancelAnimationFrame(pageHeightRaf)
  }
  pageHeightRaf = requestAnimationFrame(() => {
    pageHeightRaf = 0
    updatePageZoomHeight()
  })
}
onMounted(async () => {
  await nextTick()
  pageContentEl = document.querySelector(`${container} .umo-page-content`)
  if (pageContentEl) {
    pageHeightObserver = new ResizeObserver(() => {
      schedulePageZoomHeight()
    })
    pageHeightObserver.observe(pageContentEl)
  } else {
    console.warn('The element <.umo-page-content> does not exist.')
  }
  schedulePageZoomHeight()
})
onUnmounted(() => {
  if (pageHeightObserver) {
    pageHeightObserver.disconnect()
    pageHeightObserver = null
  }
  if (pageHeightRaf) {
    cancelAnimationFrame(pageHeightRaf)
  }
})

// 页面变化后，更新页面高度
watch(
  () => [
    pageOptions.value.layout,
    pageOptions.value.zoomLevel,
    pageOptions.value.size,
    pageOptions.value.orientation,
  ],
  () => {
    schedulePageZoomHeight()
  },
  { deep: true },
)

// 水印
const watermarkOptions = $ref({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  type: undefined,
})
watch(
  () => pageOptions.value.watermark,
  (watermarkObj = { type: '' }) => {
    const { type } = watermarkObj
    if (type === 'compact') {
      watermarkOptions.width = 320
      watermarkOptions.y = 240
    } else {
      watermarkOptions.width = 480
      watermarkOptions.y = 360
    }
  },
  { deep: true, immediate: true },
)

// 图片预览
let previewImages = $ref([])
let currentImageIndex = $ref(0)

watch(
  () => imageViewer.value.visible,
  async (visible) => {
    if (!visible) {
      previewImages = []
      currentImageIndex = 0
      return
    }
    await nextTick()
    previewImages = []
    currentImageIndex = 0
    const images = document.querySelectorAll(
      `${container} .umo-page-node-content img[src][data-preview]`,
    )
    Array.from(images).forEach((image, index) => {
      const src =
        image.getAttribute('data-preview-src') || image.getAttribute('src')
      const nodeId = image.getAttribute('data-id')
      previewImages.push(src)
      if (nodeId === imageViewer.value.current) {
        currentImageIndex = index
      }
    })
  },
)
</script>

<style lang="less">
.umo-main-container {
  height: 100%;
  display: flex;
  position: relative;
}

.umo-zoomable-container {
  flex: 1;
  scroll-behavior: smooth;
  &.umo-page-container {
    padding: 20px 50px;
    box-sizing: border-box;
    .umo-zoomable-content {
      margin: 0 auto;
      box-shadow:
        rgba(0, 0, 0, 0.06) 0px 0px 10px 0px,
        rgba(0, 0, 0, 0.04) 0px 0px 0px 1px;
    }
  }
  &.umo-web-container {
    display: flex;
    .umo-zoomable-content {
      flex: 1;
      .umo-page-corner {
        display: none;
      }
      .umo-page-content {
        min-height: 100%;
        .umo-page-node-content {
          min-height: 100px;
        }
      }
    }
  }
  .umo-page-content {
    transform-origin: 0 0;
    box-sizing: border-box;
    display: flex;
    position: relative;
    box-sizing: border-box;
    background-color: var(--umo-page-background);
    width: var(--umo-page-width);
    min-height: var(--umo-page-height);
    overflow: visible !important;
    display: flex;
    flex-direction: column;
    [contenteditable] {
      outline: none;
    }
  }
}

.umo-page-node-header {
  height: var(--umo-page-margin-top);
  overflow: hidden;
}

.umo-page-node-footer {
  height: var(--umo-page-margin-bottom);
  overflow: hidden;
}

.umo-page-node-header,
.umo-page-node-footer {
  display: flex;
  justify-content: space-between;
}

.umo-page-corner {
  box-sizing: border-box;
  position: relative;
  z-index: 10;
}

.umo-page-corner {
  @media print {
    opacity: 0;
  }

  &::after {
    position: absolute;
    content: '';
    display: block;
    height: 1cm;
    width: 1cm;
    border: solid 1px rgba(0, 0, 0, 0.08);
  }

  &.corner-tl::after {
    border-top: none;
    border-left: none;
    bottom: 0;
    right: 0;
  }

  &.corner-tr::after {
    border-top: none;
    border-right: none;
    bottom: 0;
    left: 0;
  }

  &.corner-bl::after {
    border-bottom: none;
    border-left: none;
    top: 0;
    right: 0;
  }

  &.corner-br::after {
    border-bottom: none;
    border-right: none;
    top: 0;
    left: 0;
  }
}

.umo-page-node-header-content,
.umo-page-node-footer-content {
  flex: 1;
}

.umo-page-node-content {
  position: relative;
  box-sizing: border-box;
  flex-shrink: 1;
}

.umo-main-floating-actions {
  position: absolute;
  bottom: 25px;
  right: 25px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 10px;
  > * {
    position: relative;
    inset-inline-end: unset !important;
    inset-block-end: unset !important;
    opacity: 0.9;
    &:hover {
      opacity: 1;
      background-color: var(--umo-color-white) !important;
      border: solid 1px var(--umo-primary-color);
    }
  }
}

.umo-viewer-container {
  position: absolute;
  inset: 0;
  z-index: 1000;
}

.umo-comments-panel,
.umo-versions-panel {
  width: 340px;
  max-width: 42vw;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  background: var(--umo-color-white);
  border-inline-start: 1px solid var(--umo-border-color);
}

.umo-side-panel-title {
  height: 48px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  border-bottom: 1px solid var(--umo-border-color-light);
  .umo-side-panel-close {
    margin-inline-start: auto;
    border: 0;
    padding: 4px;
    background: transparent;
    color: var(--umo-text-color);
    cursor: pointer;
    display: inline-flex;
  }
}

.umo-comments-panel-body,
.umo-versions-panel-body {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.umo-comment-compose {
  padding: 10px;
  border: 1px solid var(--umo-border-color-light);
  border-radius: 8px;
  margin-bottom: 12px;
  background: var(--umo-fill-light-color, rgba(0, 0, 0, 0.02));
  blockquote {
    margin: 0 0 8px;
    padding: 6px 8px;
    border-inline-start: 3px solid var(--umo-primary-color);
    color: var(--umo-text-color-secondary);
    font-size: 12px;
  }
}

.umo-comment-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.umo-comment-thread {
  padding: 10px;
  border: 1px solid var(--umo-border-color-light);
  border-radius: 8px;
  margin-bottom: 10px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  &.active {
    border-color: var(--umo-primary-color);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--umo-primary-color) 12%, transparent);
  }
  &.resolved {
    opacity: 0.72;
  }
}

.umo-comment-thread-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.umo-comment-quote {
  border: 0;
  padding: 0;
  text-align: start;
  background: transparent;
  color: var(--umo-primary-color);
  cursor: pointer;
  font-size: 12px;
  line-height: 1.5;
}

.umo-comment-resolved-badge {
  flex: 0 0 auto;
  font-size: 11px;
  color: var(--umo-success-color, #2ba471);
}

.umo-comment-item {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.umo-comment-content {
  min-width: 0;
  p {
    margin: 4px 0 0;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
  }
}

.umo-comment-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: var(--umo-text-color-light);
}

.umo-comment-thread-actions {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
  margin-top: 4px;
}

.umo-comment-preview {
  position: fixed;
  z-index: 3000;
  width: 280px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--umo-border-color);
  background: var(--umo-color-white);
  color: var(--umo-text-color);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  pointer-events: none;
  blockquote {
    margin: 0 0 6px;
    padding: 0 0 0 8px;
    border-inline-start: 3px solid var(--umo-primary-color);
    color: var(--umo-text-color-secondary);
    font-size: 12px;
  }
  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
  }
  footer {
    margin-top: 8px;
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--umo-text-color-light);
  }
}

.umo-versions-toolbar {
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--umo-border-color-light);
  span {
    font-size: 12px;
    color: var(--umo-text-color-light);
  }
}

.umo-version-card {
  padding: 10px;
  border: 1px solid var(--umo-border-color-light);
  border-radius: 8px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  &.selected {
    border-color: var(--umo-primary-color);
  }
}

.umo-version-main {
  min-width: 0;
  display: flex;
  gap: 8px;
}

.umo-version-info {
  min-width: 0;
  border: 0;
  padding: 0;
  text-align: start;
  background: transparent;
  color: var(--umo-text-color);
  strong,
  span,
  p {
    display: block;
  }
  strong {
    font-size: 13px;
  }
  span {
    margin: 2px 0;
    font-size: 11px;
    color: var(--umo-primary-color);
  }
  p {
    margin: 0;
    font-size: 12px;
    color: var(--umo-text-color-light);
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}

.umo-version-diff {
  margin-top: 16px;
  h4 {
    margin: 0 0 8px;
  }
}

.umo-version-diff-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.umo-diff-list {
  max-height: 280px;
  overflow: auto;
  border: 1px solid var(--umo-border-color-light);
  border-radius: 6px;
  padding: 6px;
  p {
    margin: 0 0 4px;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 12px;
    line-height: 1.4;
  }
  .is-removed {
    background: color-mix(in srgb, var(--umo-error-color, #d54941) 12%, transparent);
  }
  .is-added {
    background: color-mix(in srgb, var(--umo-success-color, #2ba471) 12%, transparent);
  }
  .is-empty {
    opacity: 0;
  }
}
</style>
