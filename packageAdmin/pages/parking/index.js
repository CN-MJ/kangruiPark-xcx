const { parkRequest } = require('../../../utils/request')
const { formatDateTime } = require('../../../utils/format')
const parkAuth = require('../../../utils/parkAuth')

const FILTERS = [
  { key: 'all', label: '全部', status: '' },
  { key: 'in', label: '在场', status: '0' },
  { key: 'out', label: '已离场', status: '1' },
]

Page({
  data: {
    list: [],
    loading: true,
    filters: FILTERS,
    activeFilter: 'all',
    keyword: '',
    summary: null,
  },

  onShow() {
    if (!parkAuth.canAccessParkAdmin()) {
      wx.redirectTo({ url: '/packageAdmin/pages/login/index' })
      return
    }
    this.loadSummary()
    this.loadList()
  },

  onPullDownRefresh() {
    Promise.all([this.loadSummary(), this.loadList()]).finally(() => wx.stopPullDownRefresh())
  },

  loadSummary() {
    return parkRequest('/park/dashboard')
      .then((res) => {
        this.setData({
          summary: {
            occupied: res.data.parking_occupied,
            remaining: res.data.parking_remaining,
            total: res.data.parking_total,
          },
        })
      })
      .catch(() => {})
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
    if (this.data.keyword.trim()) params.plate_number = this.data.keyword.trim()

    return parkRequest('/park/parking/records', { data: params })
      .then((res) => {
        const list = (res.data.list || []).map((item) => ({
          ...item,
          entryText: formatDateTime(item.entry_time),
          exitText: item.exit_time ? formatDateTime(item.exit_time) : '—',
          statusText: item.status === 1 ? '已离场' : '在场',
        }))
        this.setData({ list, loading: false })
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onExit(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '确认出场',
      content: '确定将该车辆标记为离场吗？',
      success: (res) => {
        if (!res.confirm) return
        parkRequest(`/park/parking/${id}/exit`, { method: 'PATCH' })
          .then(() => {
            wx.showToast({ title: '出场成功', icon: 'success' })
            this.loadSummary()
            this.loadList()
          })
          .catch((err) => {
            wx.showToast({ title: err.message || '操作失败', icon: 'none' })
          })
      },
    })
  },
})
