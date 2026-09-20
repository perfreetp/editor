<template>
  <aside class="umo-comments-panel">
    <div class="umo-side-panel-title">
      <icon name="reply" />
      <span>{{ t('comments.title') }}</span>
      <button class="umo-side-panel-close" type="button" @click="closePanel">
        <icon name="close" />
      </button>
    </div>

    <div class="umo-comments-panel-body umo-scrollbar">
      <div v-if="comments.pendingSelection.value" class="umo-comment-compose is-new">
        <blockquote>{{ comments.pendingSelection.value.quote }}</blockquote>
        <t-textarea
          v-model="newContent"
          :autosize="{ minRows: 3, maxRows: 6 }"
          :placeholder="t('comments.newPlaceholder')"
        />
        <div class="umo-comment-actions">
          <t-button theme="primary" size="small" @click="submitNew">
            {{ t('comments.add') }}
          </t-button>
          <t-button variant="text" size="small" @click="cancelNew">
            {{ t('comments.cancel') }}
          </t-button>
        </div>
      </div>

      <t-empty
        v-if="comments.threads.value.length === 0 && !comments.pendingSelection.value"
        :description="t('comments.empty')"
        size="small"
      />

      <article
        v-for="thread in comments.threads.value"
        :key="thread.id"
        class="umo-comment-thread"
        :class="{
          resolved: thread.resolved,
          active: comments.activeThreadId.value === thread.id,
        }"
        @mouseenter="comments.activeThreadId.value = thread.id"
      >
        <div class="umo-comment-thread-head">
          <button
            class="umo-comment-quote"
            type="button"
            @click="comments.focusThread(thread.id)"
          >
            {{ thread.quote }}
          </button>
          <span v-if="thread.resolved" class="umo-comment-resolved-badge">
            {{ t('comments.resolved') }}
          </span>
        </div>

        <div
          v-for="comment in thread.comments"
          :key="comment.id"
          class="umo-comment-item"
        >
          <t-avatar
            v-if="comment.authorAvatar"
            :image="comment.authorAvatar"
            size="28px"
          />
          <t-avatar v-else size="28px">{{ comment.authorName.slice(0, 1) }}</t-avatar>
          <div class="umo-comment-content">
            <div class="umo-comment-meta">
              <strong>{{ comment.authorName }}</strong>
              <time>{{ formatTime(comment.createdAt) }}</time>
            </div>
            <p>{{ comment.content }}</p>
          </div>
        </div>

        <div v-if="replyDrafts[thread.id]" class="umo-comment-compose">
          <t-textarea
            v-model="replyDrafts[thread.id]"
            :autosize="{ minRows: 2, maxRows: 5 }"
            :placeholder="t('comments.replyPlaceholder')"
            @keydown.ctrl.enter="submitReply(thread.id)"
          />
          <div class="umo-comment-actions">
            <t-button theme="primary" size="small" @click="submitReply(thread.id)">
              {{ t('comments.reply') }}
            </t-button>
            <t-button
              variant="text"
              size="small"
              @click="replyDrafts[thread.id] = ''"
            >
              {{ t('comments.cancel') }}
            </t-button>
          </div>
        </div>

        <div v-if="editor?.isEditable !== false" class="umo-comment-thread-actions">
          <t-button
            size="small"
            variant="text"
            @click="replyDrafts[thread.id] = replyDrafts[thread.id] || ''"
          >
            {{ t('comments.reply') }}
          </t-button>
          <t-button size="small" variant="text" @click="comments.toggleResolved(thread.id)">
            {{
              thread.resolved ? t('comments.reopen') : t('comments.markResolved')
            }}
          </t-button>
          <t-button
            size="small"
            variant="text"
            theme="danger"
            @click="confirmDelete(thread.id)"
          >
            {{ t('comments.delete') }}
          </t-button>
        </div>
      </article>
    </div>
  </aside>
</template>

<script setup>
import { DialogPlugin } from 'tdesign-vue-next'

const container = inject('container')
const editor = inject('editor')
const comments = inject('comments')

const newContent = ref('')
const replyDrafts = reactive({})

const formatTime = (time) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(time))

const submitNew = () => {
  if (comments.createThread(newContent.value)) {
    newContent.value = ''
  }
}

const cancelNew = () => {
  newContent.value = ''
  comments.pendingSelection.value = null
}

const submitReply = (threadId) => {
  if (comments.addReply(threadId, replyDrafts[threadId])) {
    replyDrafts[threadId] = ''
  }
}

const confirmDelete = (threadId) => {
  const dialog = DialogPlugin.confirm({
    attach: container,
    header: t('comments.deleteConfirmTitle'),
    body: t('comments.deleteConfirmMessage'),
    confirmBtn: { content: t('dialog.confirm'), theme: 'danger' },
    cancelBtn: t('dialog.cancel'),
    onConfirm: () => {
      comments.deleteThread(threadId)
      dialog.destroy()
    },
  })
}
</script>
