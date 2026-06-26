const { request } = require('../../utils/request')

Page({
  data: { detail: null },
  onLoad(options) {
    if (!options.id) return
    request(`/policies/${options.id}`)
      .then((res) => this.setData({ detail: res.data }))
      .catch((err) => wx.showToast({ title: err.message || '加载失败', icon: 'none' }))
  },
})
