const { sendSmsCode, resetPassword, PURPOSE } = require('../../utils/auth')

Page({
  data: {
    accountType: 'park',
    phone: '',
    code: '',
    password: '',
    passwordConfirm: '',
    countdown: 0,
    devHint: '',
    submitting: false,
  },

  onLoad(options) {
    if (options.type === 'merchant') {
      this.setData({ accountType: 'merchant' })
      wx.setNavigationBarTitle({ title: '商户忘记密码' })
    }
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value.trim() })
  },

  onCodeInput(e) {
    this.setData({ code: e.detail.value.trim() })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  onConfirmInput(e) {
    this.setData({ passwordConfirm: e.detail.value })
  },

  onSendCode() {
    if (this.data.countdown > 0) return
    const phone = this.data.phone
    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }

    const purpose = this.data.accountType === 'park' ? PURPOSE.RESET_PARK : PURPOSE.RESET_MERCHANT
    sendSmsCode(phone, purpose)
      .then((res) => {
        wx.showToast({ title: res.msg || '已发送', icon: 'none' })
        if (res.data && res.data.dev_code_hint) {
          this.setData({ devHint: `开发环境验证码：${res.data.dev_code_hint}` })
        }
        this.startCountdown()
      })
      .catch((err) => wx.showToast({ title: err.message || '发送失败', icon: 'none' }))
  },

  startCountdown() {
    this.setData({ countdown: 60 })
    clearInterval(this.timer)
    this.timer = setInterval(() => {
      const next = this.data.countdown - 1
      if (next <= 0) {
        clearInterval(this.timer)
        this.setData({ countdown: 0 })
        return
      }
      this.setData({ countdown: next })
    }, 1000)
  },

  onSubmit() {
    if (this.data.submitting) return
    const { accountType, phone, code, password, passwordConfirm } = this.data
    if (!phone || !code || !password) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }
    if (password !== passwordConfirm) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    resetPassword(accountType, phone, code, password, passwordConfirm)
      .then((res) => {
        wx.showToast({ title: res.msg || '重置成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 800)
      })
      .catch((err) => wx.showToast({ title: err.message || '重置失败', icon: 'none' }))
      .finally(() => this.setData({ submitting: false }))
  },

  onUnload() {
    clearInterval(this.timer)
  },
})
