const { request } = require('../../utils/request')

Page({
  data: {
    detail: null,
    contact_name: '',
    contact_phone: '',
  },

  onLoad(options) {
    if (options.id) this.loadDetail(options.id)
  },

  loadDetail(id) {
    request(`/activities/${id}`)
      .then((res) => this.setData({ detail: res.data }))
      .catch((err) => wx.showToast({ title: err.message || '加载失败', icon: 'none' }))
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value })
  },

  onRegister() {
    const { detail, contact_name, contact_phone } = this.data
    if (!detail) return
    if (!contact_name.trim() || !contact_phone.trim()) {
      wx.showToast({ title: '请填写联系人和手机号', icon: 'none' })
      return
    }
    request(`/activities/${detail.id}/register`, {
      method: 'POST',
      data: { contact_name: contact_name.trim(), contact_phone: contact_phone.trim() },
    })
      .then(() => {
        wx.showToast({ title: '报名成功', icon: 'success' })
        this.loadDetail(detail.id)
      })
      .catch((err) => wx.showToast({ title: err.message || '报名失败', icon: 'none' }))
  },
})
