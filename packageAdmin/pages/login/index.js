const { request } = require('../../../utils/request')
const { fetchCaptcha } = require('../../../utils/auth')
const parkAuth = require('../../../utils/parkAuth')
const { applyParkNavTheme } = require('../../utils/navTheme')

Page({
  data: {
    phone: '',
    password: '',
    captchaKey: '',
    captchaImage: '',
    captchaCode: '',
    loading: false,
  },

  onShow() {
    applyParkNavTheme()
    this.refreshCaptcha()
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
      .catch(() => {
        this.setData({ captchaKey: '', captchaImage: '' })
        wx.showToast({ title: '验证码加载失败', icon: 'none' })
      })
  },

  onLogin() {
    if (this.data.loading) return

    const phone = this.data.phone.trim()
    const password = this.data.password
    const captchaCode = this.data.captchaCode
    if (!phone) {
      wx.showToast({ title: '请输入园区人员手机号', icon: 'none' })
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
    request('/park/login', {
      method: 'POST',
      data: {
        phone,
        password,
        captcha_key: this.data.captchaKey,
        captcha_code: captchaCode,
      },
    })
      .then((res) => {
        parkAuth.setAuth(res.data.token, res.data.user)
        wx.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => {
          wx.redirectTo({ url: '/packageAdmin/pages/home/index' })
        }, 500)
      })
      .catch((err) => {
        this.refreshCaptcha()
        wx.showToast({ title: err.message || '登录失败', icon: 'none' })
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  onForgotPassword() {
    wx.showModal({
      title: '找回密码',
      content: '已取消短信找回。请登录后在工作台修改密码，或联系系统管理员重置。',
      showCancel: false,
    })
  },
})
