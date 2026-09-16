const { parkRequest } = require('../../../utils/request')
const { resolveMediaUrl, materializeMediaUrl } = require('../../../utils/media')
const parkAuth = require('../../../utils/parkAuth')

Page({
  data: {
    list: [],
    loading: false,
    keyword: '',
    page: 1,
    hasMore: true,
  },

  onShow() {
    if (!parkAuth.requirePermission('enterprises', { redirectHome: true })) return
    this.loadList({ reset: true })
  },

  onPullDownRefresh() {
    this.loadList({ reset: true }).finally(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    this.loadList()
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearch() {
    this.loadList({ reset: true })
  },

  hydrateCovers(items) {
    items.forEach((item, index) => {
      const remote = item.coverRemote || item.cover
      if (!remote) return
      materializeMediaUrl(remote).then((local) => {
        if (!local || local === item.cover) return
        this.setData({ [`list[${index}].cover`]: local })
      })
    })
  },

  loadList({ reset = false } = {}) {
    if (this.data.loading) return Promise.resolve()
    if (!reset && !this.data.hasMore) return Promise.resolve()

    const page = reset ? 1 : this.data.page
    this.setData({ loading: true })

    const data = { page, per_page: 20 }
    const keyword = this.data.keyword.trim()
    if (keyword) data.keyword = keyword

    return parkRequest('/park/enterprises', { data })
      .then((res) => {
        const payload = res.data || {}
        const startIndex = reset ? 0 : this.data.list.length
        const mapped = (payload.list || []).map((item) => {
          const coverRemote = resolveMediaUrl(item.cover || (item.images && item.images[0]) || '')
          return {
            ...item,
            coverRemote,
            cover: coverRemote,
            statusText: item.status === 1 ? '上架' : '下架',
            statusClass: item.status === 1 ? 'ok' : 'off',
            settleText: item.settle_in_park ? '已入驻园区' : '未入驻园区',
            tagsText: (item.categories || []).map((c) => c.name).join('、'),
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
        })

        this.hydrateCovers(list.slice(startIndex))
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onCreate() {
    wx.navigateTo({ url: '/packageAdmin/pages/enterprises/edit' })
  },

  onEdit(e) {
    wx.navigateTo({ url: `/packageAdmin/pages/enterprises/edit?id=${e.currentTarget.dataset.id}` })
  },

  onDelete(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: '删除后访客将无法查看该企业',
      success: (res) => {
        if (!res.confirm) return
        parkRequest(`/park/enterprises/${id}`, { method: 'DELETE' })
          .then(() => {
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadList({ reset: true })
          })
          .catch((err) => wx.showToast({ title: err.message || '删除失败', icon: 'none' }))
      },
    })
  },
})
