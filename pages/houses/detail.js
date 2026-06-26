const { request } = require('../../utils/request')

Page({
  data: { detail: null },

  onLoad(options) {
    if (options.id) this.loadDetail(options.id)
  },

  loadDetail(id) {
    request(`/houses/${id}`)
      .then((res) => this.setData({ detail: res.data }))
      .catch((err) => wx.showToast({ title: err.message || '加载失败', icon: 'none' }))
  },

  onInvestment() {
    const houseId = this.data.detail ? this.data.detail.id : ''
    wx.navigateTo({ url: `/pages/investment/index?house_id=${houseId}` })
  },
})
