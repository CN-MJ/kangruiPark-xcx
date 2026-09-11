const { parkRequest } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')
const { applyParkNavTheme } = require('../../utils/navTheme')
const { INVESTMENT_STATUS, formatDateTimeShort } = require('../../utils/cms')

Page({
  data: {
    list: [],
    statuses: INVESTMENT_STATUS,
    statusTabs: ['全部', ...INVESTMENT_STATUS],
    statusFilterIndex: 0,
    statusFilter: '',
    houseId: '',
    houseTitle: '',
    page: 1,
    hasMore: true,
    loading: false,
  },

  onLoad(options) {
    if (options.house_id) {
      this.setData({
        houseId: options.house_id,
        houseTitle: options.house_title ? decodeURIComponent(options.house_title) : '',
      })
    }
  },

  onShow() {
    applyParkNavTheme()
    if (!parkAuth.canAccessParkAdmin()) {
      wx.redirectTo({ url: '/packageAdmin/pages/login/index' })
      return
    }
    this.loadList()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadList(true)
  },

  onStatusFilter(e) {
    const index = Number(e.detail.value)
    this.setData({
      statusFilterIndex: index,
      statusFilter: index === 0 ? '' : String(index - 1),
      page: 1,
      list: [],
      hasMore: true,
    })
    this.loadList()
  },

  clearHouseFilter() {
    this.setData({ houseId: '', houseTitle: '', page: 1, list: [], hasMore: true })
    this.loadList()
  },

  loadList(loadMore = false) {
    if (this.data.loading) return
    const page = loadMore ? this.data.page + 1 : 1
    const params = { page }
    if (this.data.statusFilter !== '') params.status = this.data.statusFilter
    if (this.data.houseId) params.house_id = this.data.houseId

    this.setData({ loading: true })
    parkRequest('/park/investments', { data: params })
      .then((res) => {
        const payload = res.data || {}
        const rows = (payload.data || []).map((item) => ({
          ...item,
          statusText: INVESTMENT_STATUS[item.status] || '未知',
          statusClass: item.status === 0 ? 'pending' : item.status === 3 ? 'open' : item.status === 4 ? 'cancel' : 'done',
          createdText: formatDateTimeShort(item.created_at),
          houseTitle: item.house ? item.house.title : '',
        }))
        this.setData({
          list: loadMore ? this.data.list.concat(rows) : rows,
          page,
          hasMore: page < (payload.last_page || 1),
          loading: false,
        })
      })
      .catch(() => this.setData({ loading: false }))
  },

  onStatusChange(e) {
    const { id } = e.currentTarget.dataset
    const status = Number(e.detail.value)
    parkRequest(`/park/investments/${id}/status`, { method: 'PATCH', data: { status } })
      .then(() => {
        wx.showToast({ title: '状态已更新', icon: 'success' })
        this.loadList()
      })
      .catch((err) => wx.showToast({ title: err.message || '更新失败', icon: 'none' }))
  },

  onDetail(e) {
    wx.navigateTo({ url: `/packageAdmin/pages/investments/detail?id=${e.currentTarget.dataset.id}` })
  },

  onViewHouse(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    wx.navigateTo({ url: `/packageAdmin/pages/houses/edit?id=${id}` })
  },
})
