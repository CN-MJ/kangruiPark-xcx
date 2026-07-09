const { sendSmsCode, bindPhone, PURPOSE } = require('../../utils/auth')
const { saveUserProfile } = require('../../utils/user')

Page({
  data: {
    phone: '',
    code: '',
    name: '',
    countdown: 0,
    devHint: '',
    submitting: false,
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value.trim() })
  },

  onCodeInput(e) {
    this.setData({ code: e.detail.value.trim() })
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onSendCode() {
    if (this.data.countdown > 0) return
    const phone = this.data.phone
    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }

    sendSmsCode(phone, PURPOSE.BIND_PHONE)
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
    const { phone, code, name } = this.data
    if (!phone || !code) {
      wx.showToast({ title: '请填写手机号和验证码', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    bindPhone(phone, code, name || undefined)
      .then((res) => {
        saveUserProfile(res.data)
        wx.showToast({ title: '绑定成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 600)
      })
      .catch((err) => wx.showToast({ title: err.message || '绑定失败', icon: 'none' }))
      .finally(() => this.setData({ submitting: false }))
  },

  onUnload() {
    clearInterval(this.timer)
  },
})
