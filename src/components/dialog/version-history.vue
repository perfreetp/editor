<template>
  <modal
    class="umo-version-history-dialog"
    :visible="versionHistory"
    :footer="false"
    width="820px"
    @close="close"
  >
    <template #header>
      <icon name="history" />
      {{ t('versionHistory.title') }}
    </template>
    <div class="umo-version-history-container">
      <div class="umo-version-history-toolbar">
        <t-input
          v-model="manualLabel"
          size="small"
          :placeholder="t('versionHistory.savePlaceholder')"
          clearable
          @enter="saveManualVersion"
        />
        <t-button
          size="small"
          theme="primary"
          :disabled="!editor?.isEditable"
          @click="saveManualVersion"
        >
          {{ t('versionHistory.save') }}
        </t-button>
      </div>
      <div class="umo-version-history-body">
        <div class="umo-version-list umo-scrollbar">
          <div v-if="versions.length === 0" class="umo-version-empty">
            {{ t('versionHistory.empty') }}
          </div>
          <div
            v-for="item in versions"
            :key="item.id"
            class="umo-version-item"
            :class="{ 'is-previewing': previewId === item.id }"
            @click="previewVersion(item)"
          >
            <t-checkbox
              :checked="compareIds.includes(item.id)"
              :disabled="
                !compareIds.includes(item.id) && compareIds.length >= 2
              "
              @click.stop
              @change="toggleCompare(item.id)"
            />
            <div class="umo-version-item-main">
              <div class="umo-version-item-header">
                <span class="umo-version-time">{{
                  formatDateTime(item.createdAt)
                }}</span>
                <t-tag size="small" variant="light" :theme="item.auto ? 'default' : 'primary'">
                  {{
                    item.auto
                      ? t('versionHistory.auto')
                      : t('versionHistory.manual')
                  }}
                </t-tag>
                <span v-if="item.label" class="umo-version-label">{{
                  item.label
                }}</span>
              </div>
              <div class="umo-version-excerpt">{{ item.excerpt }}</div>
            </div>
            <div class="umo-version-item-actions" @click.stop>
              <t-button
                size="small"
                variant="text"
                :disabled="!editor?.isEditable"
                @click="restoreVersion(item)"
              >
                {{ t('versionHistory.restore') }}
              </t-button>
              <t-button
                size="small"
                variant="text"
                theme="danger"
                @click="deleteVersion(item)"
              >
                {{ t('versionHistory.delete') }}
              </t-button>
            </div>
          </div>
        </div>
        <div class="umo-version-detail umo-scrollbar">
          <template v-if="compareIds.length === 2">
            <div class="umo-version-detail-title">
              {{ t('versionHistory.diff') }}
            </div>
            <div class="umo-version-diff">
              <div
                v-for="(line, index) in diffResult"
                :key="index"
                class="umo-version-diff-line"
                :class="`is-${line.type}`"
              >
                {{ line.text }}
              </div>
            </div>
          </template>
          <template v-else-if="previewingVersion">
            <div class="umo-version-detail-title">
              {{ t('versionHistory.preview') }} —
              {{ formatDateTime(previewingVersion.createdAt) }}
            </div>
            <div
              class="umo-version-preview-content"
              v-html="previewingVersion.html"
            ></div>
          </template>
          <div v-else class="umo-version-empty">
            {{ t('versionHistory.compareTip') }}
          </div>
        </div>
      </div>
    </div>
  </modal>
</template>

<script setup>
import { diffLines } from '@/utils/diff'
import { shortId } from '@/utils/short-id'
import {
  getContentExcerpt,
  getVersions,
  htmlToTextLines,
  removeVersion,
  saveVersion,
} from '@/utils/version-history'

const container = inject('container')
const editor = inject('editor')
const options = inject('options')
const versionHistory = inject('versionHistory')
const versionSnapshot = inject('versionSnapshot')

const versions = ref([])
const manualLabel = ref('')
const compareIds = ref([])
const previewId = ref(null)

const editorKey = computed(() => options.value?.editorKey || 'default')

const refresh = () => {
  versions.value = getVersions(editorKey.value)
}

watch(
  () => versionHistory.value,
  (visible) => {
    if (visible) {
      manualLabel.value = ''
      compareIds.value = []
      previewId.value = null
      refresh()
    }
  },
)

const close = () => {
  versionHistory.value = false
}

const formatDateTime = (timestamp) => {
  const date = new Date(timestamp)
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// 手动保存版本
const saveManualVersion = () => {
  if (!editor.value) {
    return
  }
  const html = editor.value.getHTML()
  saveVersion(editorKey.value, {
    id: shortId(10),
    label: manualLabel.value.trim(),
    auto: false,
    createdAt: Date.now(),
    html,
    excerpt: getContentExcerpt(html),
  })
  manualLabel.value = ''
  if (versionSnapshot.value) {
    versionSnapshot.value.baseline = html
  }
  refresh()
  useMessage('success', {
    attach: container,
    content: t('versionHistory.saved'),
    placement: 'bottom',
    offset: [0, -20],
  })
}

// 预览与对比
const previewingVersion = computed(() =>
  versions.value.find((item) => item.id === previewId.value),
)
const previewVersion = (item) => {
  previewId.value = item.id
}
const toggleCompare = (id) => {
  if (compareIds.value.includes(id)) {
    compareIds.value = compareIds.value.filter((item) => item !== id)
    return
  }
  compareIds.value = [...compareIds.value, id].slice(-2)
}
const diffResult = computed(() => {
  if (compareIds.value.length !== 2) {
    return []
  }
  const [first, second] = compareIds.value
    .map((id) => versions.value.find((item) => item.id === id))
    .filter(Boolean)
    .sort((a, b) => a.createdAt - b.createdAt)
  if (!first || !second) {
    return []
  }
  return diffLines(htmlToTextLines(first.html), htmlToTextLines(second.html))
})

// 恢复到指定版本
const restoreVersion = (version) => {
  const dialog = useConfirm({
    attach: container,
    theme: 'warning',
    header: t('versionHistory.restore'),
    body: t('versionHistory.restoreConfirm'),
    onConfirm() {
      // 恢复前将当前内容备份为一个新版本
      const currentHtml = editor.value?.getHTML()
      if (currentHtml) {
        saveVersion(editorKey.value, {
          id: shortId(10),
          label: t('versionHistory.backupLabel'),
          auto: true,
          createdAt: Date.now(),
          html: currentHtml,
          excerpt: getContentExcerpt(currentHtml),
        })
      }
      editor.value
        ?.chain()
        .setContent(version.html, { emitUpdate: true })
        .focus('start', { scrollIntoView: true })
        .run()
      if (versionSnapshot.value) {
        versionSnapshot.value.baseline = editor.value?.getHTML() || ''
      }
      refresh()
      dialog.destroy()
      useMessage('success', {
        attach: container,
        content: t('versionHistory.restored'),
        placement: 'bottom',
        offset: [0, -20],
      })
    },
  })
}

// 删除版本
const deleteVersion = (version) => {
  removeVersion(editorKey.value, version.id)
  compareIds.value = compareIds.value.filter((id) => id !== version.id)
  if (previewId.value === version.id) {
    previewId.value = null
  }
  refresh()
}
</script>

<style lang="less">
.umo-version-history-dialog {
  .t-dialog__body {
    padding: 0 20px 20px;
  }
}
.umo-version-history-container {
  .umo-version-history-toolbar {
    display: flex;
    gap: 8px;
    padding: 4px 0 12px;
    .umo-input {
      flex: 1;
    }
  }
  .umo-version-history-body {
    display: flex;
    gap: 12px;
    height: 420px;
  }
  .umo-version-list {
    width: 340px;
    flex-shrink: 0;
    overflow-y: auto;
    border: solid 1px var(--umo-border-color);
    border-radius: var(--umo-radius-medium);
    padding: 8px;
    box-sizing: border-box;
  }
  .umo-version-empty {
    color: var(--umo-text-color-light);
    font-size: var(--umo-font-size-small);
    text-align: center;
    padding: 40px 0;
  }
  .umo-version-item {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 8px;
    border-radius: var(--umo-radius);
    cursor: pointer;
    &:hover {
      background-color: var(--umo-button-hover-background);
    }
    &.is-previewing {
      background-color: var(--umo-button-hover-background);
    }
    .umo-version-item-main {
      flex: 1;
      min-width: 0;
    }
    .umo-version-item-header {
      display: flex;
      align-items: center;
      gap: 6px;
      .umo-version-time {
        font-size: var(--umo-font-size-small);
        color: var(--umo-text-color);
      }
      .umo-version-label {
        font-size: var(--umo-font-size-small);
        color: var(--umo-primary-color);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    .umo-version-excerpt {
      font-size: var(--umo-font-size-small);
      color: var(--umo-text-color-light);
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .umo-version-item-actions {
      display: flex;
      flex-shrink: 0;
    }
  }
  .umo-version-detail {
    flex: 1;
    overflow-y: auto;
    border: solid 1px var(--umo-border-color);
    border-radius: var(--umo-radius-medium);
    padding: 12px;
    box-sizing: border-box;
    .umo-version-detail-title {
      font-size: var(--umo-font-size-small);
      color: var(--umo-text-color-light);
      margin-bottom: 8px;
    }
    .umo-version-preview-content {
      font-size: var(--umo-font-size-small);
      color: var(--umo-text-color);
      word-break: break-word;
      img {
        max-width: 100%;
      }
    }
    .umo-version-diff-line {
      font-size: var(--umo-font-size-small);
      padding: 2px 8px;
      border-radius: var(--umo-radius);
      word-break: break-word;
      &.is-add {
        background-color: rgba(46, 160, 67, 0.15);
        color: #2ea043;
      }
      &.is-del {
        background-color: rgba(239, 63, 53, 0.12);
        color: var(--umo-error-color);
        text-decoration: line-through;
      }
      &.is-same {
        color: var(--umo-text-color-light);
      }
    }
  }
}
</style>
