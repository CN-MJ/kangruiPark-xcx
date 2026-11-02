const { userRequest } = require('../../utils/request')
const { requirePhoneVerified, isMerchant, getEnterpriseId } = require('../../utils/user')

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
  return text.length > 19 ? text.slice(0, 19) : text
}

function mapDetail(raw) {
  return {
    ...raw,
    serviceName: (raw.enterprise_service && raw.enterprise_service.name)
      || raw.resource_name
      || '预约',
    serviceSummary: (raw.enterprise_service && raw.enterprise_service.summary) || '',
    servicePrice: (raw.enterprise_service && raw.enterprise_service.price_text) || '',
    enterpriseName: raw.enterprise ? raw.enterprise.name : '',
    timeText: formatTime(raw.appointment_time),
    createdText: formatTime(raw.created_at),
    statusTone: statusTone(raw.status),
  }
}

Page({
  data: {
    id: 0,
    detail: null,
    loading: true,
  },

  onLoad(options) {
    const id = options.id ? Number(options.id) : 0
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      this.setData({ loading: false })
      return
    }
    this.setData({ id })
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
    if (this.data.id) this.loadDetail()
  },

  loadDetail() {
    this.setData({ loading: true })
    userRequest(`/user/shop/appointments/${this.data.id}`)
      .then((res) => {
        this.setData({
          detail: mapDetail(res.data || {}),
          loading: false,
        })
      })
      .catch((err) => {
        this.setData({ loading: false, detail: null })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onCall() {
    const phone = this.data.detail && this.data.detail.user_phone
    if (!phone) return
    wx.makePhoneCall({ phoneNumber: String(phone) })
  },

  onAction(e) {
    const action = e.currentTarget.dataset.action
    const id = this.data.id
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
            this.loadDetail()
          })
          .catch((err) => wx.showToast({ title: err.message || '操作失败', icon: 'none' }))
      },
    })
  },
})
