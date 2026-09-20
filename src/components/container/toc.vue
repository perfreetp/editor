<template>
  <div ref="tocContainerRef" class="umo-toc-container">
    <div class="umo-toc-title">
      <icon class="icon-toc" name="toc" /> {{ t('toc.title') }}
      <div class="umo-dialog__close" @click="$emit('close')">
        <icon name="close" />
      </div>
    </div>
    <div class="umo-toc-content umo-scrollbar">
      <div v-if="tocData.length" class="umo-toc-list">
        <button
          v-for="item in tocData"
          :key="item.id"
          class="umo-toc-item"
          :class="{ active: activeHeadingId === item.id }"
          type="button"
          :style="{ paddingInlineStart: 12 + (item.originalLevel - 1) * 16 }"
          @click="headingActive(item.id)"
        >
          {{ item.textContent || t('toc.untitled') }}
        </button>
      </div>
      <t-empty v-else :description="t('toc.empty')" size="small" />
    </div>
    <div class="umo-toc-resize-handle" @mousedown="startResize"></div>
  </div>
</template>

<script setup>
import { TextSelection } from '@tiptap/pm/state'

const container = inject('container')
const editor = inject('editor')
const page = inject('page')

defineEmits(['close'])

let tocData = $ref([])
const activeHeadingId = ref(null)
const scrollContainer = ref(null)

const tocDebounceFn = useDebounceFn((toc) => {
  tocData = toc || []
  updateActiveHeading()
}, 120)

watch(
  () => editor.value?.storage.tableOfContents.content,
  (toc) => {
    tocDebounceFn(toc)
  },
  { immediate: true },
)

const headingActive = (id) => {
  if (!editor.value) {
    return
  }
  const nodeElement = editor.value.view.dom.querySelector(
    `[data-toc-id="${id}"]`,
  )
  const pageContainer = document.querySelector(
    `${container} .umo-zoomable-container`,
  )
  if (!nodeElement || !pageContainer) {
    return
  }
  activeHeadingId.value = id
  nodeElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const pos = editor.value.view.posAtDOM(nodeElement, 0)
  const { tr } = editor.value.view.state
  tr.setSelection(new TextSelection(tr.doc.resolve(pos)))
  editor.value.view.dispatch(tr)
  editor.value.view.focus()
}

const updateActiveHeading = useThrottleFn(() => {
  if (!editor.value || tocData.length === 0) {
    return
  }
  const editorRect = editor.value.view.dom.getBoundingClientRect()
  const triggerOffset = Math.min(140, editorRect.height * 0.25)
  let current = tocData[0]?.id
  for (const item of tocData) {
    const element = editor.value.view.dom.querySelector(
      `[data-toc-id="${item.id}"]`,
    )
    if (!element) continue
    if (element.getBoundingClientRect().top <= editorRect.top + triggerOffset) {
      current = item.id
    } else {
      break
    }
  }
  activeHeadingId.value = current
}, 80)

const baseTocWidth = 320
const minTocWidth = baseTocWidth / 1.5
const maxTocWidth = baseTocWidth * 2
const tocContainerRef = ref(null)
const umoPageContainer = ref(null)
const isResizing = ref(false)
const startX = ref(0)
const initialWidth = ref(baseTocWidth)
let resizeFrame = 0
let pendingWidth = null

const applyWidth = (width) => {
  if (tocContainerRef.value) {
    tocContainerRef.value.style.width = `${width}px`
  }
}

const flushWidth = () => {
  resizeFrame = 0
  if (pendingWidth === null) {
    return
  }
  applyWidth(pendingWidth)
}

const startResize = (e) => {
  if (!umoPageContainer.value || !tocContainerRef.value) {
    return
  }
  e.preventDefault()
  isResizing.value = true
  startX.value = e.clientX
  initialWidth.value = parseInt(
    getComputedStyle(tocContainerRef.value).width,
    10,
  )
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', resize)
  document.addEventListener('mouseup', stopResize)
}

const resize = (e) => {
  if (!isResizing.value) {
    return
  }

  const offsetX = e.clientX - startX.value
  pendingWidth = Math.min(
    maxTocWidth,
    Math.max(minTocWidth, initialWidth.value + offsetX),
  )

  if (!resizeFrame) {
    resizeFrame = requestAnimationFrame(flushWidth)
  }
}

const stopResize = () => {
  if (!isResizing.value) {
    return
  }
  isResizing.value = false
  document.body.style.userSelect = ''
  document.removeEventListener('mousemove', resize)
  document.removeEventListener('mouseup', stopResize)
  if (resizeFrame) {
    cancelAnimationFrame(resizeFrame)
    flushWidth()
  }
  pendingWidth = null
}

onMounted(() => {
  umoPageContainer.value = document.querySelector(
    `${container} .umo-main-container`,
  )
  scrollContainer.value = document.querySelector(
    `${container} .umo-zoomable-container`,
  )
  scrollContainer.value?.addEventListener('scroll', updateActiveHeading)
  window.addEventListener('resize', updateActiveHeading)
  updateActiveHeading()
})

onBeforeUnmount(() => {
  stopResize()
  scrollContainer.value?.removeEventListener('scroll', updateActiveHeading)
  window.removeEventListener('resize', updateActiveHeading)
})
</script>

<style lang="less">
.umo-toc-container {
  width: 320px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
  .umo-toc-resize-handle {
    position: absolute;
    top: 0;
    right: -5px;
    width: 10px;
    height: 100%;
    background-color: transparent;
    cursor: col-resize;
    &::before {
      content: '';
      position: absolute;
      top: 0;
      right: 4px;
      width: 2px;
      height: 100%;
      opacity: 0.5;
      background-color: transparent;
      transition: background-color 0.2s ease;
    }
    &:hover {
      &::before {
        background-color: var(--umo-primary-color);
      }
    }
  }
  &:hover {
    .umo-dialog__close {
      display: flex !important;
    }
  }
  .umo-toc-title {
    display: flex;
    align-items: center;
    position: relative;
    padding: 20px 15px 10px;
    .icon-toc {
      margin-right: 5px;
      font-size: 20px;
    }
    .umo-dialog__close {
      position: absolute;
      right: -4px;
      display: flex;
      align-items: center;
      justify-content: center;
      display: none;
    }
  }
  .umo-toc-content {
    flex: 1;
    display: flex;
    padding: 10px 10px 10px 15px;
    flex-direction: column;
    .umo-toc-tree {
      --td-comp-margin-xxl: 12px;
      user-select: none;
      --td-brand-color-light: rgba(0, 0, 0, 0.03);
      .umo-tree {
        &__item {
          height: 32px;
          &--open .t-icon {
            color: var(--umo-text-color-light);
          }
        }
        &__label {
          --td-comp-paddingLR-xs: 5px;
          --td-bg-color-container-hover: rgba(0, 0, 0, 0.03);
        }
        &__empty {
          height: 60px;
          font-size: 12px;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--umo-text-color-light);
        }
      }
      .umo-is-active {
        font-weight: 400;
        color: var(--umo-primary-color);
      }
    }
    .umo-toc-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .umo-toc-item {
      border: 0;
      width: 100%;
      padding-block: 7px;
      padding-inline-end: 8px;
      border-radius: 6px;
      background: transparent;
      color: var(--umo-text-color);
      text-align: start;
      font-size: 13px;
      line-height: 1.35;
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      &:hover {
        background: var(--umo-button-hover-background);
      }
      &.active {
        color: var(--umo-primary-color);
        background: var(--umo-primary-color-light);
        font-weight: 500;
      }
    }
  }
}
.umo-editor-container.umo-skin-default {
  .umo-toc-container {
    background-color: var(--umo-color-white);
    border-right: solid 1px var(--umo-border-color);
    .umo-toc-title {
      border-bottom: solid 1px var(--umo-border-color-light);
      padding: 10px 15px;
      .umo-dialog__close {
        right: 15px;
      }
    }
    .umo-toc-content {
      .umo-toc-tree {
        --td-comp-size-m: 30px;
        --td-comp-paddingLR-xs: 8px;
        --td-comp-margin-xs: 0;
        --td-brand-color-light: var(--umo-button-hover-background);
      }
    }
  }
}
</style>
