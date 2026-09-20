<template>
  <menus-button
    ico="reply"
    :text="t('comments.add')"
    @menu-click="addComment"
  />
</template>

<script setup>
const container = inject('container')
const comments = inject('comments')

const addComment = () => {
  if (!comments.prepareThread()) {
    useMessage('warning', {
      attach: container,
      content: t('comments.selectTextFirst'),
    })
  }
}
</script>
