import { Mark } from '@tiptap/core'

const Comment = Mark.create({
  name: 'comment',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-comment-id'),
        renderHTML: (attributes) => ({
          'data-comment-id': attributes.id,
        }),
      },
      quote: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-comment-quote'),
        renderHTML: (attributes) => ({
          'data-comment-quote': attributes.quote,
        }),
      },
      resolved: {
        default: false,
        parseHTML: (element) =>
          element.getAttribute('data-comment-resolved') === 'true',
        renderHTML: (attributes) => ({
          'data-comment-resolved': String(Boolean(attributes.resolved)),
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      {
        class: 'umo-comment-mark',
        ...this.options.HTMLAttributes,
        ...HTMLAttributes,
      },
      0,
    ]
  },
})

export default Comment
