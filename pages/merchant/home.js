const { merchantRequest } = require('../../utils/request')
const merchantAuth = require('../../utils/merchantAuth')

Page({
  data: { merchant: null, stats: null },
  onShow() {
    if (!merchantAuth.isMerchantLoggedIn()) {
      wx.redirectTo({ url: '/pages/merchant/login' })
      return
    }
    merchantRequest('/merchant/me')
      .then((res) => this.setData({ merchant: res.data }))
      .catch(() => {})
    this.loadStats()
  },
  loadStats() {
    merchantRequest('/merchant/appointments')
      .then((res) => {
        const list = res.data.list || []
        this.setData({
          stats: {
            total: list.length,
            pending: list.filter((i) => i.status === 0).length,
          },
        })
      })
      .catch(() => {})
  },
  goAppointments() {
    wx.navigateTo({ url: '/pages/merchant/appointments' })
  },
  goChangePassword() {
    wx.navigateTo({ url: '/pages/merchant/change-password' })
  },
  logout() {
    merchantRequest('/merchant/logout', { method: 'POST' }).finally(() => {
      merchantAuth.clearAuth()
      wx.redirectTo({ url: '/pages/merchant/login' })
    })
  },
})
