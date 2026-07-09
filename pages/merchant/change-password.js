const { changeMerchantPassword } = require('../../utils/auth')
const merchantAuth = require('../../utils/merchantAuth')

Page({
  data: {
    oldPassword: '',
    password: '',
    passwordConfirm: '',
    submitting: false,
  },

  onLoad() {
    if (!merchantAuth.isMerchantLoggedIn()) {
      wx.redirectTo({ url: '/pages/merchant/login' })
    }
  },

  onOldInput(e) {
    this.setData({ oldPassword: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  onConfirmInput(e) {
    this.setData({ passwordConfirm: e.detail.value })
  },

  onSubmit() {
    if (this.data.submitting) return
    const { oldPassword, password, passwordConfirm } = this.data
    if (!oldPassword || !password) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }
    if (password !== passwordConfirm) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    changeMerchantPassword(oldPassword, password, passwordConfirm)
      .then((res) => {
        wx.showToast({ title: res.msg || '修改成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 600)
      })
      .catch((err) => wx.showToast({ title: err.message || '修改失败', icon: 'none' }))
      .finally(() => this.setData({ submitting: false }))
  },
})
