<template>
  <aside class="umo-versions-panel">
    <div class="umo-side-panel-title">
      <icon name="time" />
      <span>{{ t('versions.title') }}</span>
      <button class="umo-side-panel-close" type="button" @click="closePanel">
        <icon name="close" />
      </button>
    </div>

    <div class="umo-versions-toolbar">
      <t-button theme="primary" size="small" @click="versions.saveManual()">
        {{ t('versions.save') }}
      </t-button>
      <span>{{ t('versions.selectHint') }}</span>
    </div>

    <div class="umo-versions-panel-body umo-scrollbar">
      <div
        v-for="version in versions.versions.value"
        :key="version.id"
        class="umo-version-card"
        :class="{ selected: versions.selectedIds.value.includes(version.id) }"
      >
        <div class="umo-version-main">
          <t-checkbox
            :checked="versions.selectedIds.value.includes(version.id)"
            :disabled="
              !versions.selectedIds.value.includes(version.id) &&
              versions.selectedIds.value.length >= 2
            "
            @change="versions.toggleSelection(version.id)"
          />
          <button class="umo-version-info" type="button">
            <strong>{{ formatTime(version.createdAt) }}</strong>
            <span>{{
              version.type === 'manual'
                ? t('versions.manual')
                : t('versions.auto')
            }}</span>
            <p>{{ version.summary || t('versions.emptyContent') }}</p>
          </button>
        </div>
        <t-button size="small" variant="text" @click="confirmRestore(version.id)">
          {{ t('versions.restore') }}
        </t-button>
      </div>
      <t-empty
        v-if="versions.versions.value.length === 0"
        :description="t('versions.empty')"
        size="small"
      />

      <section v-if="selectedVersions.length === 2" class="umo-version-diff">
        <header>
          <strong>{{ t('versions.diff') }}</strong>
        </header>
        <div class="umo-version-diff-columns">
          <div v-for="(version, index) in selectedVersions" :key="version.id">
            <h4>{{ formatTime(version.createdAt) }}</h4>
            <div class="umo-diff-list umo-scrollbar">
              <template v-for="row in diffRows" :key="row.id">
                <p v-if="(index === 0 && row.left) || (index === 1 && row.right)"
                   :class="getDiffClass(index, row.status)">
                  {{ index === 0 ? row.left?.text : row.right?.text }}
                </p>
                <p v-else class="is-empty">&nbsp;</p>
              </template>
            </div>
          </div>
        </div>
      </section>
    </div>
  </aside>
</template>

<script setup>
import { DialogPlugin } from 'tdesign-vue-next'

import { diffBlocks, htmlToBlocks } from '@/utils/version-diff'

const container = inject('container')
const versions = inject('versions')

const closePanel = () => versions.closePanel()

const selectedVersions = computed(() =>
  versions.selectedIds.value
    .map((id) => versions.versions.value.find((item) => item.id === id))
    .filter(Boolean)
    .sort((left, right) => left.createdAt - right.createdAt),
)

const diffRows = computed(() => {
  if (selectedVersions.value.length !== 2) {
    return []
  }
  return diffBlocks(
    htmlToBlocks(selectedVersions.value[0].html),
    htmlToBlocks(selectedVersions.value[1].html),
  )
})

const formatTime = (time) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(time))

const getDiffClass = (index, status) => {
  if (index === 0 && status === 'removed') {
    return 'is-removed'
  }
  if (index === 1 && status === 'added') {
    return 'is-added'
  }
  return ''
}

const confirmRestore = (id) => {
  const dialog = DialogPlugin.confirm({
    attach: container,
    header: t('versions.restoreConfirmTitle'),
    body: t('versions.restoreConfirmMessage'),
    confirmBtn: { content: t('dialog.confirm'), theme: 'primary' },
    cancelBtn: t('dialog.cancel'),
    onConfirm: async () => {
      dialog.destroy()
      await versions.restore(id)
    },
  })
}
</script>
