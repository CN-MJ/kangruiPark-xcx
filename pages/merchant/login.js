const { request } = require('../../utils/request')
const merchantAuth = require('../../utils/merchantAuth')

Page({
  data: { phone: '' },
  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },
  onSubmit() {
    const phone = this.data.phone.trim()
    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    request('/merchant/login', { method: 'POST', data: { phone } })
      .then((res) => {
        merchantAuth.setAuth(res.data.token, res.data.merchant)
        wx.redirectTo({ url: '/pages/merchant/home' })
      })
      .catch((err) => wx.showToast({ title: err.message || '登录失败', icon: 'none' }))
  },
})
