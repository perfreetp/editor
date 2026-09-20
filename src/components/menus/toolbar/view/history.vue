<template>
  <menus-button
    ico="history"
    :text="t('versionHistory.text')"
    huge
    @menu-click="versionHistory = true"
  />
</template>

<script setup>
const versionHistory = inject('versionHistory')
</script>
