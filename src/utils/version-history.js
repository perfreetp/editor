// 文档版本历史：基于 localStorage 按编辑器实例（editorKey）持久化
const MAX_VERSIONS = 50

const storageKey = (editorKey) =>
  `umo-editor:${editorKey || 'default'}:versions`

export const getVersions = (editorKey) => {
  try {
    const versions = JSON.parse(localStorage.getItem(storageKey(editorKey)))
    return Array.isArray(versions) ? versions : []
  } catch {
    return []
  }
}

const persistVersions = (editorKey, versions) => {
  try {
    localStorage.setItem(
      storageKey(editorKey),
      JSON.stringify(versions.slice(0, MAX_VERSIONS)),
    )
  } catch {
    // localStorage 容量不足时，移除最旧的版本后重试
    if (versions.length > 1) {
      persistVersions(editorKey, versions.slice(0, versions.length - 1))
    }
  }
}

export const saveVersion = (editorKey, version) => {
  const versions = getVersions(editorKey)
  versions.unshift(version)
  persistVersions(editorKey, versions)
  return getVersions(editorKey)
}

export const removeVersion = (editorKey, id) => {
  const versions = getVersions(editorKey).filter((item) => item.id !== id)
  persistVersions(editorKey, versions)
  return versions
}

// 从 HTML 中提取纯文本摘要
export const getContentExcerpt = (html, limit = 100) => {
  const text = String(html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > limit ? `${text.slice(0, limit)}...` : text
}

// 将 HTML 转换为按行组织的纯文本（用于差异对比）
export const htmlToTextLines = (html) => {
  const text = String(html || '')
    .replace(/<\/(p|h[1-6]|li|blockquote|pre|tr|div|summary)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
}
