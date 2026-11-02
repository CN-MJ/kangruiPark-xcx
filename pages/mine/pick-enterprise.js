const { request } = require('../../utils/request')
const { DISTRICT_NAMES } = require('../../utils/ganzhouDistrict')

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
    keyword: '',
    settleOnly: true,
    district: '',
    districtOptions: DISTRICT_NAMES,
    majors: [],
    activeMajorId: 0,
    activeMajor: null,
    categoryId: 0,
    categoryName: '',
    filterSummary: '入驻园区 · 全部分类',
    hasCategoryFilter: false,
    catPanelOpen: false,
    panelMajors: [],
    panelMajorId: 0,
    panelMajor: null,
    panelMinors: [],
    panelCategoryId: 0,
    list: [],
    page: 1,
    hasMore: true,
    loading: false,
    loadingMore: false,
    selectedId: 0,
  },

  onLoad(options) {
    this._eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel()
    if (options.selected_id) {
      this.setData({ selectedId: Number(options.selected_id) || 0 })
    }
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
        this.setData({ majors })
        this.refreshFilterSummary()
      })
      .catch(() => {
        this.setData({ majors: [] })
        this.refreshFilterSummary()
      })
  },

  refreshFilterSummary() {
    const { activeMajor, categoryName, categoryId, district, settleOnly } = this.data
    const parts = []
    if (settleOnly) parts.push('入驻园区')
    if (district) parts.push(district)
    if (activeMajor && categoryId && categoryName) {
      parts.push(`${activeMajor.shortName || activeMajor.name} · ${categoryName}`)
    } else if (activeMajor) {
      parts.push(`${activeMajor.shortName || activeMajor.name} · 全部小类`)
    }
    this.setData({
      filterSummary: parts.length ? parts.join(' / ') : '全部企业',
      hasCategoryFilter: !!(activeMajor || categoryId || district),
    })
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearch() {
    this.loadList({ reset: true })
  },

  onToggleSettle() {
    this.setData({ settleOnly: !this.data.settleOnly })
    this.refreshFilterSummary()
    this.loadList({ reset: true })
  },

  openCatPanel() {
    const { majors, activeMajorId, categoryId } = this.data
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
    this.setData({
      district: '',
      panelMajorId: 0,
      panelMajor: null,
      panelMinors: [],
      panelCategoryId: 0,
    })
    this.applyCategoryFilter(0, 0, null, '')
  },

  onDistrict(e) {
    const name = e.currentTarget.dataset.name || ''
    const district = this.data.district === name ? '' : name
    this.setData({ district })
    this.refreshFilterSummary()
    this.loadList({ reset: true })
  },

  onReachBottom() {
    this.loadList()
  },

  loadList({ reset = false } = {}) {
    if (this.data.loading || this.data.loadingMore) return Promise.resolve()
    if (!reset && !this.data.hasMore) return Promise.resolve()

    const page = reset ? 1 : this.data.page
    const loadingKey = reset || this.data.list.length === 0 ? 'loading' : 'loadingMore'
    this.setData({ [loadingKey]: true })

    const data = { page, per_page: 15, with_services: 0 }
    if (this.data.activeMajorId) data.major_id = this.data.activeMajorId
    if (this.data.categoryId) data.category_id = this.data.categoryId
    if (this.data.settleOnly) data.settle_in_park = 1
    if (this.data.district) data.district = this.data.district
    if (this.data.keyword.trim()) data.keyword = this.data.keyword.trim()

    return request('/enterprises', { data })
      .then((res) => {
        const payload = res.data || {}
        const mapped = (payload.list || []).map((item) => ({
          id: item.id,
          name: item.name,
          district: item.district || '',
          settle_in_park: !!item.settle_in_park,
          categoryName: item.primary_category ? item.primary_category.name : '',
          intro: (item.business_intro || '').slice(0, 48),
        }))
        const pagination = payload.pagination || {}
        const current = pagination.current_page || page
        const last = pagination.last_page || current
        this.setData({
          list: reset ? mapped : this.data.list.concat(mapped),
          page: current + 1,
          hasMore: current < last,
          loading: false,
          loadingMore: false,
        })
      })
      .catch((err) => {
        this.setData({ loading: false, loadingMore: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onSelect(e) {
    const { id, name } = e.currentTarget.dataset
    if (!id) return
    const payload = { id: Number(id), name: name || '' }
    if (this._eventChannel && this._eventChannel.emit) {
      this._eventChannel.emit('select', payload)
    }
    wx.navigateBack()
  },
})
