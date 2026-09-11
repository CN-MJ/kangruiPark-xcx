const { request } = require('../../utils/request')
const { resolveMediaUrl, materializeMediaUrl } = require('../../utils/media')

function splitMajorName(name) {
  const text = String(name || '')
  const matched = text.match(/^(.+?)（(.+)）$/)
  if (matched) {
    return { short: matched[1], tip: matched[2], full: text }
  }
  return { short: text, tip: '', full: text }
}

Page({
  data: {
    majors: [],
    panelMajors: [],
    activeMajorId: 0,
    activeMajor: null,
    categoryId: 0,
    categoryName: '',
    filterSummary: '全部分类',
    hasCategoryFilter: false,
    settleOnly: false,
    audience: '',
    keyword: '',
    list: [],
    page: 1,
    hasMore: true,
    loading: false,
    loadingMore: false,
    catPanelOpen: false,
    panelMajorId: 0,
    panelMajor: null,
    panelMinors: [],
    resultTotal: null,
  },

  onLoad(options) {
    if (options.major_id) this.setData({ activeMajorId: Number(options.major_id) })
    if (options.category_id) this.setData({ categoryId: Number(options.category_id) })
    this.loadCategories().then(() => this.loadList({ reset: true }))
  },

  loadCategories() {
    return request('/enterprise-categories')
      .then((res) => {
        const majors = (res.data.list || []).map((m) => {
          const parts = splitMajorName(m.name)
          return {
            ...m,
            shortName: parts.short,
            tipName: parts.tip,
            children: (m.children || []).filter((c) => c.status !== 0),
          }
        })
        let activeMajorId = this.data.activeMajorId
        const activeMajor = majors.find((m) => m.id === activeMajorId) || null
        if (activeMajorId && !activeMajor) activeMajorId = 0

        let categoryId = this.data.categoryId
        let categoryName = ''
        if (activeMajor && categoryId) {
          const minor = (activeMajor.children || []).find((c) => c.id === categoryId)
          if (minor) categoryName = minor.name
          else categoryId = 0
        }

        this.setData({ majors, activeMajorId, activeMajor, categoryId, categoryName })
        this.refreshFilterSummary()
      })
      .catch(() => {
        this.setData({ majors: [], activeMajor: null, panelMajors: [] })
        this.refreshFilterSummary()
      })
  },

  refreshFilterSummary() {
    const { activeMajor, categoryName, categoryId } = this.data
    let filterSummary = '全部分类'
    if (activeMajor && categoryId && categoryName) {
      filterSummary = `${activeMajor.shortName || activeMajor.name} · ${categoryName}`
    } else if (activeMajor) {
      filterSummary = `${activeMajor.shortName || activeMajor.name} · 全部小类`
    }
    this.setData({
      filterSummary,
      hasCategoryFilter: !!(activeMajor || categoryId),
    })
  },

  openCatPanel() {
    const { majors, activeMajorId, activeMajor, categoryId } = this.data
    const panelMajorId = activeMajorId || (majors[0] ? majors[0].id : 0)
    const panelMajor = majors.find((m) => m.id === panelMajorId) || null
    this.setData({
      catPanelOpen: true,
      panelMajors: majors,
      panelMajorId,
      panelMajor,
      panelMinors: panelMajor ? (panelMajor.children || []) : [],
      panelCategoryId: categoryId,
    })
  },

  closeCatPanel() {
    this.setData({ catPanelOpen: false })
  },

  preventMove() {},

  onPanelMajor(e) {
    const id = Number(e.currentTarget.dataset.id)
    if (id === 0) {
      this.applyCategoryFilter(0, 0, null, '')
      this.setData({
        panelMajorId: 0,
        panelMajor: null,
        panelMinors: [],
        panelCategoryId: 0,
      })
      return
    }
    const panelMajor = this.data.majors.find((m) => m.id === id) || null
    this.setData({
      panelMajorId: id,
      panelMajor,
      panelMinors: panelMajor ? (panelMajor.children || []) : [],
      panelCategoryId: 0,
    })
    this.applyCategoryFilter(id, 0, panelMajor, '')
  },

  onPanelMinor(e) {
    const id = Number(e.currentTarget.dataset.id)
    const name = e.currentTarget.dataset.name || ''
    const panelMajor = this.data.panelMajor
    if (!panelMajor) return
    const categoryId = id === this.data.categoryId ? 0 : id
    const categoryName = categoryId ? name : ''
    this.setData({ panelCategoryId: categoryId })
    this.applyCategoryFilter(panelMajor.id, categoryId, panelMajor, categoryName)
  },

  onPanelAllMinors() {
    const panelMajor = this.data.panelMajor
    if (!panelMajor) return
    this.setData({ panelCategoryId: 0 })
    this.applyCategoryFilter(panelMajor.id, 0, panelMajor, '')
  },

  applyCategoryFilter(majorId, categoryId, major, categoryName) {
    this.setData({
      activeMajorId: majorId,
      activeMajor: major,
      categoryId,
      categoryName: categoryName || '',
    })
    this.refreshFilterSummary()
    this.loadList({ reset: true })
  },

  onClearCategory() {
    this.applyCategoryFilter(0, 0, null, '')
    this.setData({
      panelMajorId: 0,
      panelMajor: null,
      panelMinors: [],
      panelCategoryId: 0,
    })
  },

  onToggleSettle() {
    this.setData({ settleOnly: !this.data.settleOnly })
    this.loadList({ reset: true })
  },

  onAudience(e) {
    const value = e.currentTarget.dataset.value
    this.setData({ audience: this.data.audience === value ? '' : value })
    this.loadList({ reset: true })
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearch() {
    this.loadList({ reset: true })
  },

  onReachBottom() {
    this.loadList()
  },

  onPullDownRefresh() {
    this.loadList({ reset: true }).finally(() => wx.stopPullDownRefresh())
  },

  hydrateCovers(items, startIndex) {
    items.forEach((item, offset) => {
      const index = startIndex + offset
      const remote = item.coverRemote || item.cover
      if (!remote) return
      materializeMediaUrl(remote).then((local) => {
        const current = this.data.list[index]
        if (!current || !local || local === current.cover) return
        this.setData({ [`list[${index}].cover`]: local })
      })
    })
  },

  loadList({ reset = false } = {}) {
    if (this.data.loading || this.data.loadingMore) return Promise.resolve()
    if (!reset && !this.data.hasMore) return Promise.resolve()

    const page = reset ? 1 : this.data.page
    const loadingKey = reset || this.data.list.length === 0 ? 'loading' : 'loadingMore'
    this.setData({ [loadingKey]: true })

    const data = { page, per_page: 10 }
    if (this.data.activeMajorId) data.major_id = this.data.activeMajorId
    if (this.data.categoryId) data.category_id = this.data.categoryId
    if (this.data.settleOnly) data.settle_in_park = 1
    if (this.data.audience) data.service_audience = this.data.audience
    if (this.data.keyword.trim()) data.keyword = this.data.keyword.trim()

    return request('/enterprises', { data })
      .then((res) => {
        const payload = res.data || {}
        const startIndex = reset ? 0 : this.data.list.length
        const mapped = (payload.list || []).map((item) => {
          const coverRemote = resolveMediaUrl(item.cover || (item.images && item.images[0]) || '')
          return {
            ...item,
            coverRemote,
            cover: coverRemote,
            scopePreview: (item.business_intro || '').slice(0, 60),
            tagsPreview: (item.categories || []).slice(0, 3).map((c) => c.name),
          }
        })
        const pagination = payload.pagination || {}
        const current = pagination.current_page || page
        const last = pagination.last_page || current
        const list = reset ? mapped : this.data.list.concat(mapped)

        this.setData({
          list,
          page: current + 1,
          hasMore: current < last,
          loading: false,
          loadingMore: false,
          resultTotal: pagination.total != null ? pagination.total : this.data.resultTotal,
        })
        this.hydrateCovers(mapped, startIndex)
      })
      .catch((err) => {
        this.setData({ loading: false, loadingMore: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onDetail(e) {
    wx.navigateTo({ url: `/pages/enterprises/detail?id=${e.currentTarget.dataset.id}` })
  },
})
