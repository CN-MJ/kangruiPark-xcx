const { userRequest } = require('../../../utils/request')
const { fetchCaptcha } = require('../../../utils/auth')
const { getPhone, requirePhoneVerified } = require('../../../utils/user')
const superAuth = require('../../../utils/superAuth')

Page({
  data: {
    phone: '',
    password: '',
    captchaKey: '',
    captchaImage: '',
    captchaCode: '',
    submitting: false,
  },

  onLoad() {
    if (!requirePhoneVerified({ redirect: false })) {
      wx.showToast({ title: '请先微信授权登录', icon: 'none' })
      setTimeout(() => wx.redirectTo({ url: '/pages/mine/login' }), 500)
      return
    }
    this.setData({ phone: getPhone() })
    if (superAuth.isSuperLoggedIn()) {
      wx.redirectTo({ url: '/packageAdmin/pages/x-console/home' })
      return
    }
    this.refreshCaptcha()
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

  onSubmit() {
    if (this.data.submitting) return
    const { password, captchaCode, captchaKey } = this.data
    if (!password || !captchaCode) {
      wx.showToast({ title: '请填写密码和图形验证码', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    userRequest('/super/escalate', {
      method: 'POST',
      data: {
        password,
        captcha_key: captchaKey,
        captcha_code: captchaCode,
      },
    })
      .then((res) => {
        superAuth.setAuth(res.data.token, res.data.user)
        wx.showToast({ title: '验证成功', icon: 'success' })
        setTimeout(() => {
          wx.redirectTo({ url: '/packageAdmin/pages/x-console/home' })
        }, 400)
      })
      .catch((err) => {
        this.refreshCaptcha()
        wx.showToast({ title: err.message || '验证失败', icon: 'none' })
      })
      .finally(() => this.setData({ submitting: false }))
  },
})
