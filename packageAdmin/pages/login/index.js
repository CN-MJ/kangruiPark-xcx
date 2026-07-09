const { request } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')
const { applyParkNavTheme } = require('../../utils/navTheme')

Page({
  data: {
    phone: '',
    password: '',
    loading: false,
  },

  onShow() {
    applyParkNavTheme()
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  onLogin() {
    if (this.data.loading) return

    const phone = this.data.phone.trim()
    const password = this.data.password
    if (!phone) {
      wx.showToast({ title: '请输入园区人员手机号', icon: 'none' })
      return
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    request('/park/login', {
      method: 'POST',
      data: { phone, password },
    })
      .then((res) => {
        parkAuth.setAuth(res.data.token, res.data.user)
        wx.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => {
          wx.redirectTo({ url: '/packageAdmin/pages/home/index' })
        }, 500)
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '登录失败', icon: 'none' })
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  onForgotPassword() {
    wx.navigateTo({ url: '/pages/auth/forgot-password?type=park' })
  },
})
