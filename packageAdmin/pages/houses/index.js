const { parkRequest } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')
const { applyParkNavTheme } = require('../../utils/navTheme')
const { HOUSE_STATUS_FILTER } = require('../../utils/cms')

Page({
  data: {
    list: [],
    statusTabs: HOUSE_STATUS_FILTER,
    statusFilterIndex: 0,
    statusFilter: '',
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
    this.loadList()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadList(true)
  },

  onStatusFilter(e) {
    const index = Number(e.detail.value)
    const statusMap = ['', '1', '0']
    this.setData({
      statusFilterIndex: index,
      statusFilter: statusMap[index] || '',
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
    if (this.data.statusFilter !== '') params.status = this.data.statusFilter

    this.setData({ loading: true })
    parkRequest('/park/houses', { data: params })
      .then((res) => {
        const payload = res.data || {}
        const rows = (payload.data || []).map((item) => ({
          ...item,
          statusText: item.status === 1 ? '在售/在租' : '已售/已租',
          statusClass: item.status === 1 ? 'on' : 'off',
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

  onCreate() {
    wx.navigateTo({ url: '/packageAdmin/pages/houses/edit' })
  },

  onEdit(e) {
    wx.navigateTo({ url: `/packageAdmin/pages/houses/edit?id=${e.currentTarget.dataset.id}` })
  },

  onViewIntents(e) {
    const { id, title } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/packageAdmin/pages/investments/index?house_id=${id}&house_title=${encodeURIComponent(title || '')}`,
    })
  },

  onDelete(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '删除房源',
      content: '确定删除该房源吗？关联招商意向将保留但不再显示房源名称。',
      success: (res) => {
        if (!res.confirm) return
        parkRequest(`/park/houses/${id}`, { method: 'DELETE' }).then(() => {
          wx.showToast({ title: '已删除', icon: 'success' })
          this.setData({ page: 1, list: [], hasMore: true })
          this.loadList()
        })
      },
    })
  },
})
