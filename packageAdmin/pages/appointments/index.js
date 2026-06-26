const { parkRequest } = require('../../../utils/request')
const { formatDateTime } = require('../../../utils/format')
const parkAuth = require('../../../utils/parkAuth')

const FILTERS = [
  { key: 'all', label: '全部', status: '' },
  { key: 'pending', label: '待确认', status: '0' },
  { key: 'confirmed', label: '已确认', status: '1' },
  { key: 'rejected', label: '已拒绝', status: '2' },
  { key: 'cancelled', label: '已取消', status: '3' },
]

Page({
  data: {
    list: [],
    loading: true,
    filters: FILTERS,
    activeFilter: 'all',
    keyword: '',
  },

  onShow() {
    if (!parkAuth.isParkLoggedIn()) {
      wx.redirectTo({ url: '/packageAdmin/pages/login/index' })
      return
    }
    this.loadList()
  },

  onPullDownRefresh() {
    this.loadList().finally(() => wx.stopPullDownRefresh())
  },

  onFilterTap(e) {
    const { key } = e.currentTarget.dataset
    if (key === this.data.activeFilter) return
    this.setData({ activeFilter: key })
    this.loadList()
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearch() {
    this.loadList()
  },

  onClearSearch() {
    this.setData({ keyword: '' })
    this.loadList()
  },

  loadList() {
    this.setData({ loading: true })
    const filter = FILTERS.find((f) => f.key === this.data.activeFilter)
    const params = {}
    if (filter && filter.status !== '') params.status = filter.status
    if (this.data.keyword.trim()) params.user_phone = this.data.keyword.trim()

    return parkRequest('/park/appointments', { data: params })
      .then((res) => {
        const list = (res.data.list || []).map((item) => ({
          ...item,
          timeText: formatDateTime(item.appointment_time),
          statusText: item.status_text || ({ 0: '待确认', 1: '已确认', 2: '已拒绝', 3: '已取消' }[item.status] || '待确认'),
          displayTitle: item.merchant ? `拜访 ${item.resource_name}` : item.resource_name,
          locationText: item.merchant && item.merchant.location ? item.merchant.location : '',
        }))
        this.setData({ list, loading: false })
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onCancel(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '取消预约',
      content: '确定取消该预约吗？',
      success: (res) => {
        if (!res.confirm) return
        parkRequest(`/park/appointments/${id}/cancel`, { method: 'PATCH' })
          .then(() => {
            wx.showToast({ title: '已取消', icon: 'success' })
            this.loadList()
          })
          .catch((err) => {
            wx.showToast({ title: err.message || '操作失败', icon: 'none' })
          })
      },
    })
  },

  onConfirm(e) {
    const { id } = e.currentTarget.dataset
    parkRequest(`/park/appointments/${id}/confirm`, { method: 'PATCH' })
      .then(() => {
        wx.showToast({ title: '已确认', icon: 'success' })
        this.loadList()
      })
      .catch((err) => wx.showToast({ title: err.message || '操作失败', icon: 'none' }))
  },

  onReject(e) {
    const { id } = e.currentTarget.dataset
    parkRequest(`/park/appointments/${id}/reject`, { method: 'PATCH' })
      .then(() => {
        wx.showToast({ title: '已拒绝', icon: 'success' })
        this.loadList()
      })
      .catch((err) => wx.showToast({ title: err.message || '操作失败', icon: 'none' }))
  },
})
