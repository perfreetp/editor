<template>
  <div ref="tocContainerRef" class="umo-toc-container">
    <div class="umo-toc-title">
      <icon class="icon-toc" name="toc" /> {{ t('toc.title') }}
      <div class="umo-dialog__close" @click="$emit('close')">
        <icon name="close" />
      </div>
    </div>
    <div class="umo-toc-content umo-scrollbar">
      <t-tree
        class="umo-toc-tree"
        :data="tocData"
        :actived="activedIds"
        :keys="{
          label: 'textContent',
          value: 'id',
        }"
        :empty="t('toc.empty')"
        :transition="false"
        activable
        hover
        expand-all
        @active="headingActive"
      />
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

// 最终可视化数据
let tocData = $ref([])
const buildTocTree = (tocArray) => {
  const root = []
  const stack = []
  if (!tocArray || tocArray.length === 0) {
    return root
  }
  for (const item of tocArray) {
    const node = {
      textContent: item.textContent,
      level: item.originalLevel,
      id: item.id,
      children: [],
    }
    while (
      stack.length > 0 &&
      stack[stack.length - 1].level >= item.originalLevel
    ) {
      stack.pop()
    }
    if (stack.length === 0) {
      root.push(node)
    } else {
      if (!stack[stack.length - 1].children) {
        stack[stack.length - 1].children = []
      }
      stack[stack.length - 1].children.push(node)
    }
    stack.push(node)
  }
  return root
}

const tocDebounceFn = useDebounceFn((toc) => {
  tocData = buildTocTree(toc)
  syncActiveHeading()
}, 300)

// 滚动正文时，当前章节在大纲中自动高亮
// 注意：扩展在滚动时直接修改 storage（不经过编辑器事务），
// 无法通过 watch 感知，需要监听滚动容器主动同步
const activeId = ref(null)
const syncActiveHeading = () => {
  const toc = editor.value?.storage?.tableOfContents?.content || []
  const active = toc.find((item) => item.isActive)
  activeId.value = active?.id || null
}
const activedIds = computed(() => (activeId.value ? [activeId.value] : []))
const handlePageScroll = useDebounceFn(syncActiveHeading, 100)

watch(
  () => editor.value?.storage.tableOfContents.content,
  (toc) => {
    tocDebounceFn(toc)
  },
  { immediate: true },
)

const headingActive = (value) => {
  if (!editor.value) {
    return
  }
  const nodeElement = editor.value.view.dom.querySelector(
    `[data-toc-id="${value[0]}"]`,
  )
  const pageContainer = document.querySelector(
    `${container} .umo-zoomable-container`,
  )
  const pageHeader = pageContainer?.querySelector('.umo-page-node-header')
  if (!nodeElement || !pageContainer || !pageHeader) {
    return
  }
  const { zoomLevel } = page.value
  pageContainer.scrollTo({
    top: Math.round(
      ((nodeElement.offsetTop + pageHeader.offsetHeight) * zoomLevel) / 100,
    ),
  })
  const pos = editor.value.view.posAtDOM(nodeElement, 0)
  const { tr } = editor.value.view.state
  tr.setSelection(new TextSelection(tr.doc.resolve(pos)))
  editor.value.view.dispatch(tr)
  editor.value.view.focus()
}

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
  document
    .querySelector(`${container} .umo-zoomable-container`)
    ?.addEventListener('scroll', handlePageScroll, { passive: true })
  syncActiveHeading()
})

onBeforeUnmount(() => {
  stopResize()
  document
    .querySelector(`${container} .umo-zoomable-container`)
    ?.removeEventListener('scroll', handlePageScroll)
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
