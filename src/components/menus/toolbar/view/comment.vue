<template>
  <menus-button
    ico="reply"
    :text="comments.panelVisible.value ? t('comments.hide') : t('comments.show')"
    huge
    @menu-click="toggleComments"
  />
</template>

<script setup>
const comments = inject('comments')

const toggleComments = () => {
  if (comments.panelVisible.value) {
    comments.closePanel()
    return
  }
  comments.openPanel()
}
</script>
