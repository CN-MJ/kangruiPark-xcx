const { parkRequest } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')
const { applyParkNavTheme } = require('../../utils/navTheme')
const { materializeMediaUrl } = require('../../../utils/media')

Page({
  data: {
    list: [],
    keyword: '',
    page: 1,
    hasMore: true,
    loading: false,
  },

  onShow() {
    applyParkNavTheme()
    if (!parkAuth.canAccessParkAdmin()) {
      wx.redirectTo({ url: '/packageAdmin/pages/login/index' })
      return
    }
    if (!parkAuth.hasPermission('service_teams')) {
      wx.showToast({ title: '无权访问', icon: 'none' })
      wx.redirectTo({ url: '/packageAdmin/pages/home/index' })
      return
    }
    this.loadList()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadList(true)
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearch() {
    this.setData({ page: 1, list: [], hasMore: true })
    this.loadList()
  },

  hydratePhotos(rows, startIndex) {
    rows.forEach((item, offset) => {
      const index = startIndex + offset
      if (!item.photo) return
      materializeMediaUrl(item.photo).then((local) => {
        const current = this.data.list[index]
        if (!current || !local || local === current.photoLocal) return
        this.setData({ [`list[${index}].photoLocal`]: local })
      })
    })
  },

  loadList(loadMore = false) {
    if (this.data.loading) return
    const page = loadMore ? this.data.page + 1 : 1
    const params = { page }
    const keyword = (this.data.keyword || '').trim()
    if (keyword) params.keyword = keyword

    this.setData({ loading: true })
    parkRequest('/park/service-teams', { data: params })
      .then((res) => {
        const payload = res.data || {}
        const rows = (payload.data || []).map((item) => ({
          ...item,
          photoLocal: item.photo || '/images/default-avatar.jpg',
        }))
        const startIndex = loadMore ? this.data.list.length : 0
        this.setData({
          list: loadMore ? this.data.list.concat(rows) : rows,
          page,
          hasMore: page < (payload.last_page || 1),
          loading: false,
        })
        this.hydratePhotos(rows, startIndex)
      })
      .catch(() => this.setData({ loading: false }))
  },

  onCreate() {
    wx.navigateTo({ url: '/packageAdmin/pages/service-teams/edit' })
  },

  onEdit(e) {
    wx.navigateTo({ url: `/packageAdmin/pages/service-teams/edit?id=${e.currentTarget.dataset.id}` })
  },

  onDelete(e) {
    const { id, name } = e.currentTarget.dataset
    wx.showModal({
      title: '删除成员',
      content: `确定删除「${name || '该成员'}」吗？`,
      success: (res) => {
        if (!res.confirm) return
        parkRequest(`/park/service-teams/${id}`, { method: 'DELETE' }).then(() => {
          wx.showToast({ title: '已删除', icon: 'success' })
          this.setData({ page: 1, list: [], hasMore: true })
          this.loadList()
        })
      },
    })
  },
})
