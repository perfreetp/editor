<template>
  <menus-button
    ico="comment"
    :text="t('comment.add')"
    :disabled="selectionEmpty"
    huge
    @menu-click="addComment"
  />
</template>

<script setup>
const editor = inject('editor')
const page = inject('page')
const commentState = inject('commentState')

const selectionEmpty = computed(() => {
  const selection = editor.value?.state?.selection
  return !selection || selection.empty
})

const addComment = () => {
  const { selection } = editor.value?.state || {}
  if (!selection || selection.empty) {
    return
  }
  const { from, to } = selection
  const quote = editor.value.state.doc.textBetween(from, to, ' ')
  commentState.value.draft = { from, to, quote }
  page.value.showComments = true
}
</script>
