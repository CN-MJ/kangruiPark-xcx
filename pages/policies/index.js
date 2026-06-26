const { request } = require('../../utils/request')

Page({
  data: { list: [] },
  onShow() {
    request('/policies')
      .then((res) => this.setData({ list: res.data || [] }))
      .catch(() => this.setData({ list: [] }))
  },
  onDetail(e) {
    wx.navigateTo({ url: `/pages/policies/detail?id=${e.currentTarget.dataset.id}` })
  },
})
