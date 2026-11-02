const { userRequest } = require('../../utils/request')
const { requirePhoneVerified, isMerchant, getEnterpriseId, getPhone } = require('../../utils/user')
const { openVisitorMpBindIfNeeded } = require('../../utils/wechatMp')

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'confirmed', label: '已确认' },
  { key: 'rejected', label: '已拒绝' },
]

function statusTone(status) {
  const n = Number(status)
  if (n === 0) return 'tone-pending'
  if (n === 1) return 'tone-ok'
  if (n === 2) return 'tone-reject'
  return 'tone-muted'
}

function formatTime(value) {
  if (!value) return '—'
  const text = String(value).replace('T', ' ')
  return text.length > 16 ? text.slice(0, 16) : text
}

function mapItem(item) {
  return {
    ...item,
    serviceName: (item.enterprise_service && item.enterprise_service.name)
      || item.resource_name
      || '预约',
    enterpriseName: item.enterprise ? item.enterprise.name : '',
    timeText: formatTime(item.appointment_time),
    statusTone: statusTone(item.status),
  }
}

function filterList(list, filter) {
  if (filter === 'pending') return list.filter((i) => Number(i.status) === 0)
  if (filter === 'confirmed') return list.filter((i) => Number(i.status) === 1)
  if (filter === 'rejected') return list.filter((i) => Number(i.status) === 2)
  return list
}

Page({
  data: {
    list: [],
    displayList: [],
    filters: FILTERS,
    filter: 'pending',
    pendingCount: 0,
    loading: true,
  },

  onShow() {
    if (!requirePhoneVerified()) return
    if (!isMerchant() || !getEnterpriseId()) {
      wx.showModal({
        title: '尚未绑定企业',
        content: '请先在个人资料中选择商户身份并绑定所属企业',
        showCancel: false,
        success: () => wx.redirectTo({ url: '/pages/mine/profile' }),
      })
      return
    }
    const phone = getPhone()
    if (phone && !this._mpBindChecked) {
      this._mpBindChecked = true
      openVisitorMpBindIfNeeded({ phone, from: 'shop' })
        .catch(() => {})
        .finally(() => this.loadList())
      return
    }
    this.loadList()
  },

  onPullDownRefresh() {
    this.loadList().finally(() => wx.stopPullDownRefresh())
  },

  applyFilter(list, filter) {
    const pendingCount = list.filter((i) => Number(i.status) === 0).length
    this.setData({
      list,
      filter,
      displayList: filterList(list, filter),
      pendingCount,
      loading: false,
    })
  },

  loadList() {
    this.setData({ loading: true })
    return userRequest('/user/shop/appointments')
      .then((res) => {
        const raw = (res.data && res.data.list) || []
        const list = raw.map(mapItem)
        this.applyFilter(list, this.data.filter)
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onFilter(e) {
    const key = e.currentTarget.dataset.key
    if (!key || key === this.data.filter) return
    this.applyFilter(this.data.list, key)
  },

  onDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/shop/appointment-detail?id=${id}` })
  },

  noop() {},

  onCall(e) {
    const phone = e.currentTarget.dataset.phone
    if (!phone) return
    wx.makePhoneCall({ phoneNumber: String(phone) })
  },

  onAction(e) {
    const { id, action } = e.currentTarget.dataset
    if (!id || !action) return
    const title = action === 'confirm' ? '确认预约' : '拒绝预约'
    const content = action === 'confirm'
      ? '确认后将通知访客，是否继续？'
      : '拒绝后将通知访客，是否继续？'
    wx.showModal({
      title,
      content,
      success: (res) => {
        if (!res.confirm) return
        userRequest(`/user/shop/appointments/${id}/${action}`, { method: 'PATCH' })
          .then(() => {
            wx.showToast({ title: action === 'confirm' ? '已确认' : '已拒绝', icon: 'success' })
            this.loadList()
          })
          .catch((err) => wx.showToast({ title: err.message || '操作失败', icon: 'none' }))
      },
    })
  },
})
