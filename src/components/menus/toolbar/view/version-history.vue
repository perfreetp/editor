<template>
  <menus-button
    ico="time"
    :text="versions.panelVisible.value ? t('versions.hide') : t('versions.show')"
    huge
    @menu-click="versions.panelVisible.value ? versions.closePanel() : versions.openPanel()"
  />
</template>

<script setup>
const versions = inject('versions')
</script>
