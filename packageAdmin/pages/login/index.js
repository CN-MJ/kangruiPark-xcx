const { request } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')

Page({
  data: {
    phone: '',
    loading: false,
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onLogin() {
    if (this.data.loading) return

    const phone = this.data.phone.trim()
    if (!phone) {
      wx.showToast({ title: '请输入园区人员手机号', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    request('/park/login', {
      method: 'POST',
      data: { phone },
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
})
