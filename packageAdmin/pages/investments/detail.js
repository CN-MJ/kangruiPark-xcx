const { parkRequest } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')
const { applyParkNavTheme } = require('../../utils/navTheme')
const { INVESTMENT_STATUS, formatDateTimeShort } = require('../../utils/cms')

Page({
  data: {
    detail: null,
    statuses: INVESTMENT_STATUS,
    loading: true,
  },

  onLoad(options) {
    if (!options.id) return
    this.intentId = options.id
  },

  onShow() {
    applyParkNavTheme()
    if (!parkAuth.canAccessParkAdmin()) {
      wx.redirectTo({ url: '/packageAdmin/pages/login/index' })
      return
    }
    if (this.intentId) this.loadDetail()
  },

  loadDetail() {
    this.setData({ loading: true })
    parkRequest(`/park/investments/${this.intentId}`)
      .then((res) => {
        const d = res.data || {}
        this.setData({
          detail: {
            ...d,
            statusText: INVESTMENT_STATUS[d.status] || '未知',
            createdText: formatDateTimeShort(d.created_at),
            houseTitle: d.house ? d.house.title : '',
          },
          loading: false,
        })
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onStatusChange(e) {
    const status = Number(e.detail.value)
    parkRequest(`/park/investments/${this.intentId}/status`, { method: 'PATCH', data: { status } })
      .then(() => {
        wx.showToast({ title: '状态已更新', icon: 'success' })
        this.loadDetail()
      })
      .catch((err) => wx.showToast({ title: err.message || '更新失败', icon: 'none' }))
  },

  onViewHouse() {
    const { detail } = this.data
    if (!detail || !detail.house_id) return
    wx.navigateTo({ url: `/packageAdmin/pages/houses/edit?id=${detail.house_id}` })
  },

  onCall() {
    const phone = this.data.detail && this.data.detail.contact_phone
    if (!phone) return
    wx.makePhoneCall({ phoneNumber: phone })
  },
})
