// 基于 LCS 的行级文本差异对比
export const diffLines = (oldLines, newLines) => {
  const a = Array.isArray(oldLines) ? oldLines : []
  const b = Array.isArray(newLines) ? newLines : []
  const m = a.length
  const n = b.length

  // 行数过大时退化为整体替换，避免 DP 矩阵占用过多内存
  if (m * n > 1000000) {
    return [
      ...a.map((text) => ({ type: 'del', text })),
      ...b.map((text) => ({ type: 'add', text })),
    ]
  }

  // 计算 LCS 长度矩阵
  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1))
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  // 回溯生成差异结果
  const result = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      result.push({ type: 'same', text: a[i] })
      i += 1
      j += 1
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: 'del', text: a[i] })
      i += 1
    } else {
      result.push({ type: 'add', text: b[j] })
      j += 1
    }
  }
  while (i < m) {
    result.push({ type: 'del', text: a[i] })
    i += 1
  }
  while (j < n) {
    result.push({ type: 'add', text: b[j] })
    j += 1
  }
  return result
}
