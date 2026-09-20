import { Mark, mergeAttributes } from '@tiptap/core'

// 批注标记，批注数据（回复、状态等）存储在标记属性中，
// 随文档内容一起序列化，保证刷新或重新打开文档后批注仍然保留
const Comment = Mark.create({
  name: 'comment',
  // 在批注文本边缘输入时不自动扩展批注范围
  inclusive: false,

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-comment-id'),
        renderHTML: (attributes) =>
          attributes.commentId
            ? { 'data-comment-id': attributes.commentId }
            : {},
      },
      data: {
        default: null,
        parseHTML: (element) => {
          try {
            return JSON.parse(element.getAttribute('data-comment'))
          } catch {
            return null
          }
        },
        renderHTML: (attributes) =>
          attributes.data
            ? { 'data-comment': JSON.stringify(attributes.data) }
            : {},
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }]
  },

  renderHTML({ mark, HTMLAttributes }) {
    const resolved = mark.attrs.data?.resolved
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: `umo-comment${resolved ? ' is-resolved' : ''}`,
      }),
      0,
    ]
  },

  addCommands() {
    return {
      // 为当前选区添加批注
      setComment:
        ({ commentId, data }) =>
        ({ chain }) => {
          return chain().setMark(this.name, { commentId, data }).run()
        },
      // 更新指定批注的数据（回复、解决状态等）
      updateCommentData:
        ({ commentId, data }) =>
        ({ tr, state }) => {
          const markType = state.schema.marks.comment
          if (!markType) {
            return false
          }
          let updated = false
          state.doc.descendants((node, pos) => {
            if (!node.isText) {
              return true
            }
            const mark = node.marks.find(
              (item) =>
                item.type.name === this.name &&
                item.attrs.commentId === commentId,
            )
            if (mark) {
              tr.removeMark(pos, pos + node.nodeSize, markType)
              tr.addMark(
                pos,
                pos + node.nodeSize,
                markType.create({ ...mark.attrs, data }),
              )
              updated = true
            }
            return true
          })
          return updated
        },
      // 删除指定批注（仅移除标记，保留正文）
      unsetComment:
        (commentId) =>
        ({ tr, state }) => {
          const markType = state.schema.marks.comment
          if (!markType) {
            return false
          }
          let removed = false
          state.doc.descendants((node, pos) => {
            if (!node.isText) {
              return true
            }
            const mark = node.marks.find(
              (item) =>
                item.type.name === this.name &&
                item.attrs.commentId === commentId,
            )
            if (mark) {
              tr.removeMark(pos, pos + node.nodeSize, markType)
              removed = true
            }
            return true
          })
          return removed
        },
    }
  },
})

export default Comment
