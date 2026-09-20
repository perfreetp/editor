<template>
  <menus-button
    ico="comment"
    :text="page.showComments ? t('comment.hide') : t('comment.show')"
    huge
    @menu-click="page.showComments = !page.showComments"
  />
</template>

<script setup>
const page = inject('page')
</script>
