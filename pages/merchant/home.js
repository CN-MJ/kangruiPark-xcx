const { merchantRequest } = require('../../utils/request')
const merchantAuth = require('../../utils/merchantAuth')
const { bindMerchantMpOpenid, openMerchantMpBindIfNeeded } = require('../../utils/wechatMp')

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
  onBindMp() {
    const m = this.data.merchant
    if (!m || !m.id) {
      wx.showToast({ title: '账号信息未加载', icon: 'none' })
      return
    }
    bindMerchantMpOpenid(m.id).catch(() => {
      wx.showToast({ title: '复制失败，请重试', icon: 'none' })
    })
  },
  ensureMpBound(then) {
    const m = this.data.merchant
    if (!m || !m.id) {
      wx.showToast({ title: '账号信息未加载', icon: 'none' })
      return
    }
    if (m.has_mp_openid) {
      then()
      return
    }
    openMerchantMpBindIfNeeded({ merchantId: m.id, from: 'merchant' })
      .then((ret) => {
        if (ret && ret.skipped) then()
      })
      .catch(() => {
        wx.showToast({ title: '请先绑定服务号以接收预约通知', icon: 'none' })
      })
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
  goServices() {
    wx.navigateTo({ url: '/pages/merchant/services' })
  },
  goAppointments() {
    this.ensureMpBound(() => {
      wx.navigateTo({ url: '/pages/merchant/appointments' })
    })
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
