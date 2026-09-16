const { request } = require('../../utils/request')
const { fetchCaptcha } = require('../../utils/auth')
const merchantAuth = require('../../utils/merchantAuth')

Page({
  data: {
    phone: '',
    password: '',
    captchaKey: '',
    captchaImage: '',
    captchaCode: '',
    loading: false,
    workbenchEnabled: false,
    checked: false,
  },

  onShow() {
    this.checkWorkbench()
  },

  checkWorkbench() {
    request('/users/login-options')
      .then((res) => {
        const enabled = !!(res.data && res.data.merchant_workbench_enabled)
        this.setData({ workbenchEnabled: enabled, checked: true })
        if (enabled) {
          this.refreshCaptcha()
        }
      })
      .catch(() => {
        this.setData({ workbenchEnabled: false, checked: true })
      })
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  onCaptchaInput(e) {
    this.setData({ captchaCode: e.detail.value.trim() })
  },

  refreshCaptcha() {
    fetchCaptcha()
      .then((res) => {
        const data = res.data || {}
        this.setData({
          captchaKey: data.captcha_key || '',
          captchaImage: data.captcha_image || '',
          captchaCode: '',
        })
      })
      .catch(() => wx.showToast({ title: '验证码加载失败', icon: 'none' }))
  },

  goEnterprises() {
    wx.navigateTo({ url: '/pages/enterprises/index' })
  },

  onSubmit() {
    if (this.data.loading) return
    if (!this.data.workbenchEnabled) {
      wx.showToast({ title: '商户工作台已停用', icon: 'none' })
      return
    }

    const phone = this.data.phone.trim()
    const password = this.data.password
    const captchaCode = this.data.captchaCode
    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    if (!captchaCode) {
      wx.showToast({ title: '请输入图形验证码', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    request('/merchant/login', {
      method: 'POST',
      data: {
        phone,
        password,
        captcha_key: this.data.captchaKey,
        captcha_code: captchaCode,
      },
    })
      .then((res) => {
        merchantAuth.setAuth(res.data.token, res.data.merchant)
        wx.redirectTo({ url: '/pages/merchant/home' })
      })
      .catch((err) => {
        this.refreshCaptcha()
        wx.showToast({ title: err.message || '登录失败', icon: 'none' })
      })
      .finally(() => this.setData({ loading: false }))
  },

  onForgotPassword() {
    wx.showModal({
      title: '找回密码',
      content: '商户工作台已停用。如需处理业务请联系园区管理员。',
      showCancel: false,
    })
  },
})
