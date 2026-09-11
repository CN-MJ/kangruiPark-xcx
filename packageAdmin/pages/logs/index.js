const { superRequest } = require('../../../utils/request')
const superAuth = require('../../../utils/superAuth')
const { formatDateTime } = require('../../../utils/format')

const PAGE_SIZE = 15

const ACTION_LABELS = {
  'super.escalate': '进入系统管理控制台',
  'super.escalate_failed': '升权失败',
  'super.logout': '退出系统管理控制台',
  'user.update': '修改用户',
}

function resolveKind(payload, action) {
  const op = (payload && payload.operation) || ''
  if (op === 'create') return { kind: 'create', kindText: '新增' }
  if (op === 'delete') return { kind: 'delete', kindText: '删除' }
  if (op === 'update') return { kind: 'update', kindText: '修改' }

  const raw = String(action || '')
  if (raw.startsWith('super.')) return { kind: 'system', kindText: '系统' }
  if (raw.endsWith('.create') || /\.POST\./i.test(raw)) return { kind: 'create', kindText: '新增' }
  if (raw.endsWith('.delete') || /\.DELETE\./i.test(raw)) return { kind: 'delete', kindText: '删除' }
  return { kind: 'update', kindText: '修改' }
}

function formatValue(value) {
  if (value === null || value === undefined) return '空'
  if (typeof value === 'string') return value === '' ? '空' : value
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'number') return String(value)
  try {
    return JSON.stringify(value)
  } catch (e) {
    return String(value)
  }
}

function buildChangeLines(payload) {
  if (!payload || typeof payload !== 'object') return []
  const changes = payload.changes
  if (changes && typeof changes === 'object' && Object.keys(changes).length) {
    return Object.keys(changes).map((key) => {
      const item = changes[key] || {}
      return {
        key,
        text: `${key}：${formatValue(item.from)} → ${formatValue(item.to)}`,
      }
    })
  }
  return []
}

function buildDataText(data) {
  if (!data || typeof data !== 'object') return ''
  const keys = Object.keys(data)
  if (!keys.length) return ''
  return keys
    .map((key) => `${key}=${formatValue(data[key])}`)
    .join('\n')
}

function formatActionTitle(item) {
  const payload = item.payload || {}
  if (payload.title) return payload.title
  if (ACTION_LABELS[item.action]) return ACTION_LABELS[item.action]
  if (payload.resource_label && payload.operation) {
    const opMap = { create: '新增', update: '修改', delete: '删除' }
    return `${opMap[payload.operation] || '操作'}${payload.resource_label}`
  }
  return item.action || '操作记录'
}

function buildPageItems(current, last) {
  if (last <= 1) return [{ type: 'page', num: 1, active: true, key: 'p-1' }]
  const set = new Set([1, last, current - 1, current, current + 1])
  const nums = [...set].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b)
  const items = []
  let prev = 0
  nums.forEach((n) => {
    if (prev && n - prev > 1) items.push({ type: 'ellipsis', key: `e-${prev}` })
    items.push({ type: 'page', num: n, active: n === current, key: `p-${n}` })
    prev = n
  })
  return items
}

Page({
  data: {
    list: [],
    loading: true,
    currentPage: 1,
    lastPage: 1,
    total: 0,
    pageItems: [],
    canPrev: false,
    canNext: false,
  },

  onShow() {
    if (!superAuth.isSuperLoggedIn()) {
      wx.redirectTo({ url: '/packageAdmin/pages/x-console/gate' })
      return
    }
    this.loadList(this.data.currentPage || 1)
  },

  onPullDownRefresh() {
    this.loadList(this.data.currentPage || 1).finally(() => wx.stopPullDownRefresh())
  },

  onPrev() {
    if (!this.data.canPrev || this.data.loading) return
    this.loadList(this.data.currentPage - 1)
  },

  onNext() {
    if (!this.data.canNext || this.data.loading) return
    this.loadList(this.data.currentPage + 1)
  },

  onPageTap(e) {
    const num = Number(e.currentTarget.dataset.num)
    if (!num || num === this.data.currentPage || this.data.loading) return
    this.loadList(num)
  },

  onToggle(e) {
    const id = e.currentTarget.dataset.id
    const list = this.data.list.map((item) => {
      if (String(item.id) !== String(id)) return item
      return { ...item, expanded: !item.expanded }
    })
    this.setData({ list })
  },

  loadList(page) {
    const target = Math.max(1, Number(page) || 1)
    this.setData({ loading: true })
    return superRequest(`/super/audit-logs?page=${target}&per_page=${PAGE_SIZE}`)
      .then((res) => {
        const payload = res.data || {}
        const current = Number(payload.current_page || target)
        const last = Math.max(1, Number(payload.last_page || 1))
        const total = Number(payload.total || 0)
        const rows = (payload.data || []).map((item) => {
          const body = item.payload || {}
          const kindInfo = resolveKind(body, item.action)
          const changeLines = buildChangeLines(body)
          const beforeText = buildDataText(body.before)
          const afterText = buildDataText(body.after)
          return {
            ...item,
            timeText: formatDateTime(item.created_at),
            actionText: formatActionTitle(item),
            kind: kindInfo.kind,
            kindText: kindInfo.kindText,
            phoneText: item.phone || '未知账号',
            targetText: item.target_type
              ? `${body.resource_label || item.target_type} #${item.target_id || '-'}`
              : '',
            changeLines,
            beforeText,
            afterText,
            noteText: body.note || '',
            hasDetail: !!(changeLines.length || beforeText || afterText || body.note),
            beforeLabel: kindInfo.kind === 'delete' ? '删除前数据' : '修改前',
            afterLabel: kindInfo.kind === 'create' ? '新增数据' : '修改后',
            expanded: false,
          }
        })
        this.setData({
          list: rows,
          loading: false,
          currentPage: current,
          lastPage: last,
          total,
          pageItems: buildPageItems(current, last),
          canPrev: current > 1,
          canNext: current < last,
        })
        if (typeof wx.pageScrollTo === 'function') {
          wx.pageScrollTo({ scrollTop: 0, duration: 200 })
        }
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },
})
