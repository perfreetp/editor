<template>
  <div
    v-if="thread && comments.preview.value.visible"
    class="umo-comment-preview"
    :style="previewStyle"
  >
    <blockquote>{{ thread.quote }}</blockquote>
    <p>{{ thread.comments[0]?.content }}</p>
    <footer>
      <span>{{ thread.comments[0]?.authorName }}</span>
      <span>{{ thread.comments.length }} {{ t('comments.items') }}</span>
    </footer>
  </div>
</template>

<script setup>
const comments = inject('comments')

const thread = computed(() =>
  comments.threads.value.find(
    (item) => item.id === comments.preview.value.threadId,
  ),
)

const previewStyle = computed(() => ({
  left: `${Math.min(window.innerWidth - 300, Math.max(12, comments.preview.value.x + 14))}px`,
  top: `${Math.min(window.innerHeight - 150, Math.max(12, comments.preview.value.y + 14))}px`,
}))
</script>
