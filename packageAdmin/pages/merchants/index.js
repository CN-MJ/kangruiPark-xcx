const { parkRequest } = require('../../../utils/request')
const { formatDateTime } = require('../../../utils/format')
const parkAuth = require('../../../utils/parkAuth')

const FILTERS = [
  { key: 'all', label: '全部', role: '' },
  { key: 'merchant', label: '商户', role: 'merchant' },
  { key: 'visitor', label: '访客', role: 'visitor' },
]

Page({
  data: {
    list: [],
    loading: true,
    filters: FILTERS,
    activeFilter: 'all',
    keyword: '',
    stats: null,
  },

  onShow() {
    if (!parkAuth.isParkLoggedIn()) {
      wx.redirectTo({ url: '/packageAdmin/pages/login/index' })
      return
    }
    this.loadStats()
    this.loadList()
  },

  onPullDownRefresh() {
    Promise.all([this.loadStats(), this.loadList()]).finally(() => wx.stopPullDownRefresh())
  },

  loadStats() {
    return parkRequest('/park/dashboard')
      .then((res) => {
        this.setData({
          stats: {
            merchants: res.data.merchants_count,
            visitors: res.data.visitors_count,
            todayCheckins: res.data.today_checkins,
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
    if (filter && filter.role) params.role = filter.role
    if (this.data.keyword.trim()) params.keyword = this.data.keyword.trim()

    return parkRequest('/park/users', { data: params })
      .then((res) => {
        const list = (res.data.list || []).map((item) => ({
          ...item,
          checkinText: item.checked_in_at ? formatDateTime(item.checked_in_at) : '未签到',
          avatarChar: (item.name || '访').charAt(0),
        }))
        this.setData({ list, loading: false })
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },
})
