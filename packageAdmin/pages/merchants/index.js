const { parkRequest } = require('../../../utils/request')
const { formatDateTime } = require('../../../utils/format')
const parkAuth = require('../../../utils/parkAuth')

const FILTERS = [
  { key: 'pending', label: '待审核', apply_status: 'pending' },
  { key: 'all', label: '全部', apply_status: '' },
  { key: 'merchant', label: '已入驻', role: 'merchant' },
  { key: 'visitor', label: '访客', role: 'visitor' },
]

Page({
  data: {
    list: [],
    loading: true,
    filters: FILTERS,
    activeFilter: 'pending',
    keyword: '',
    stats: null,
    pendingCount: 0,
    actingId: 0,
  },

  onShow() {
    if (!parkAuth.canAccessParkAdmin()) {
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
    const filter = FILTERS.find((f) => f.key === this.data.activeFilter) || FILTERS[0]
    const params = {}
    if (filter.role) params.role = filter.role
    if (filter.apply_status) params.apply_status = filter.apply_status
    if (this.data.keyword.trim()) params.keyword = this.data.keyword.trim()

    return parkRequest('/park/users', { data: params })
      .then((res) => {
        const list = (res.data.list || []).map((item) => ({
          ...item,
          checkinText: item.checked_in_at ? formatDateTime(item.checked_in_at) : '',
          applyText: item.merchant_applied_at ? formatDateTime(item.merchant_applied_at) : '',
          avatarChar: (item.name || '访').charAt(0),
          isPending: item.merchant_apply_status === 'pending',
          statusClass: this.statusClass(item.merchant_apply_status),
        }))
        this.setData({
          list,
          loading: false,
          pendingCount: res.data.pending_count || 0,
        })
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  statusClass(status) {
    if (status === 'pending') return 'tag-pending'
    if (status === 'approved') return 'tag-active'
    if (status === 'rejected') return 'tag-cancelled'
    return ''
  },

  onApprove(e) {
    const { id, name } = e.currentTarget.dataset
    if (this.data.actingId) return
    wx.showModal({
      title: '通过入驻申请',
      content: `确认通过「${name || '该用户'}」的入驻申请？通过后将成为商户。`,
      success: (res) => {
        if (!res.confirm) return
        this.setData({ actingId: id })
        parkRequest(`/park/users/${id}/approve-merchant`, { method: 'POST' })
          .then((resp) => {
            wx.showToast({ title: resp.msg || '已通过', icon: 'success' })
            this.loadStats()
            this.loadList()
          })
          .catch((err) => wx.showToast({ title: err.message || '操作失败', icon: 'none' }))
          .finally(() => this.setData({ actingId: 0 }))
      },
    })
  },

  onReject(e) {
    const { id, name } = e.currentTarget.dataset
    if (this.data.actingId) return
    wx.showModal({
      title: '拒绝入驻申请',
      content: `确认拒绝「${name || '该用户'}」的入驻申请？`,
      confirmColor: '#dc2626',
      success: (res) => {
        if (!res.confirm) return
        this.setData({ actingId: id })
        parkRequest(`/park/users/${id}/reject-merchant`, { method: 'POST' })
          .then((resp) => {
            wx.showToast({ title: resp.msg || '已拒绝', icon: 'none' })
            this.loadStats()
            this.loadList()
          })
          .catch((err) => wx.showToast({ title: err.message || '操作失败', icon: 'none' }))
          .finally(() => this.setData({ actingId: 0 }))
      },
    })
  },
})
