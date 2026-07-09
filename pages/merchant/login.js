const { request } = require('../../utils/request')
const merchantAuth = require('../../utils/merchantAuth')

Page({
  data: {
    phone: '',
    password: '',
    loading: false,
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  onSubmit() {
    if (this.data.loading) return

    const phone = this.data.phone.trim()
    const password = this.data.password
    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    request('/merchant/login', { method: 'POST', data: { phone, password } })
      .then((res) => {
        merchantAuth.setAuth(res.data.token, res.data.merchant)
        wx.redirectTo({ url: '/pages/merchant/home' })
      })
      .catch((err) => wx.showToast({ title: err.message || '登录失败', icon: 'none' }))
      .finally(() => this.setData({ loading: false }))
  },

  onForgotPassword() {
    wx.navigateTo({ url: '/pages/auth/forgot-password?type=merchant' })
  },
})
