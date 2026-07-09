const { parkRequest } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')
const { applyParkNavTheme } = require('../../utils/navTheme')
const { POLICY_LEVELS } = require('../../utils/cms')

Page({
  data: {
    list: [],
    levelTabs: POLICY_LEVELS,
    levelFilterIndex: 0,
    levelFilter: '',
    page: 1,
    hasMore: true,
    loading: false,
  },

  onShow() {
    applyParkNavTheme()
    if (!parkAuth.isParkLoggedIn()) {
      wx.redirectTo({ url: '/packageAdmin/pages/login/index' })
      return
    }
    this.loadList()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadList(true)
  },

  onLevelFilter(e) {
    const index = Number(e.detail.value)
    this.setData({
      levelFilterIndex: index,
      levelFilter: index === 0 ? '' : POLICY_LEVELS[index],
      page: 1,
      list: [],
      hasMore: true,
    })
    this.loadList()
  },

  loadList(loadMore = false) {
    if (this.data.loading) return
    const page = loadMore ? this.data.page + 1 : 1
    const params = { page }
    if (this.data.levelFilter) params.level = this.data.levelFilter

    this.setData({ loading: true })
    parkRequest('/park/policies', { data: params })
      .then((res) => {
        const payload = res.data || {}
        const rows = payload.data || []
        this.setData({
          list: loadMore ? this.data.list.concat(rows) : rows,
          page,
          hasMore: page < (payload.last_page || 1),
          loading: false,
        })
      })
      .catch(() => this.setData({ loading: false }))
  },

  onCreate() {
    wx.navigateTo({ url: '/packageAdmin/pages/policies/edit' })
  },

  onEdit(e) {
    wx.navigateTo({ url: `/packageAdmin/pages/policies/edit?id=${e.currentTarget.dataset.id}` })
  },

  onDelete(e) {
    const { id, title } = e.currentTarget.dataset
    wx.showModal({
      title: '删除政策',
      content: `确定删除「${title}」吗？`,
      success: (res) => {
        if (!res.confirm) return
        parkRequest(`/park/policies/${id}`, { method: 'DELETE' }).then(() => {
          wx.showToast({ title: '已删除', icon: 'success' })
          this.setData({ page: 1, list: [], hasMore: true })
          this.loadList()
        })
      },
    })
  },
})
