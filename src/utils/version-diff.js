const BLOCK_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,pre'

export const htmlToBlocks = (html) => {
  const documentNode = new DOMParser().parseFromString(html || '', 'text/html')
  return Array.from(documentNode.body.querySelectorAll(BLOCK_SELECTOR))
    .map((element) => ({
      type: element.tagName.toLowerCase(),
      text: element.textContent.replace(/\s+/g, ' ').trim(),
    }))
    .filter((item) => item.text)
}

export const createContentSummary = (html, limit = 120) => {
  const text = htmlToBlocks(html)
    .map((item) => item.text)
    .join(' / ')
  return text.length > limit ? `${text.slice(0, limit)}...` : text
}

export const diffBlocks = (leftBlocks = [], rightBlocks = []) => {
  const left = leftBlocks.slice(0, 600)
  const right = rightBlocks.slice(0, 600)
  const table = Array.from({ length: left.length + 1 }, () =>
    Array(right.length + 1).fill(0),
  )

  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
      table[leftIndex][rightIndex] =
        left[leftIndex].text === right[rightIndex].text
          ? table[leftIndex + 1][rightIndex + 1] + 1
          : Math.max(
              table[leftIndex + 1][rightIndex],
              table[leftIndex][rightIndex + 1],
            )
    }
  }

  const rows = []
  let leftIndex = 0
  let rightIndex = 0
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex].text === right[rightIndex].text) {
      rows.push({
        id: `same-${leftIndex}-${rightIndex}`,
        status: 'same',
        left: left[leftIndex],
        right: right[rightIndex],
      })
      leftIndex += 1
      rightIndex += 1
    } else if (
      table[leftIndex + 1][rightIndex] >=
      table[leftIndex][rightIndex + 1]
    ) {
      rows.push({
        id: `removed-${leftIndex}`,
        status: 'removed',
        left: left[leftIndex],
        right: null,
      })
      leftIndex += 1
    } else {
      rows.push({
        id: `added-${rightIndex}`,
        status: 'added',
        left: null,
        right: right[rightIndex],
      })
      rightIndex += 1
    }
  }
  while (leftIndex < left.length) {
    rows.push({
      id: `removed-${leftIndex}`,
      status: 'removed',
      left: left[leftIndex],
      right: null,
    })
    leftIndex += 1
  }
  while (rightIndex < right.length) {
    rows.push({
      id: `added-${rightIndex}`,
      status: 'added',
      left: null,
      right: right[rightIndex],
    })
    rightIndex += 1
  }
  return rows
}
