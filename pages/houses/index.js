const { request } = require('../../utils/request')

Page({
  data: {
    list: [],
    loading: false,
  },

  onShow() {
    this.loadList()
  },

  loadList() {
    this.setData({ loading: true })
    request('/houses')
      .then((res) => {
        this.setData({ list: res.data || [], loading: false })
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onDetail(e) {
    wx.navigateTo({ url: `/pages/houses/detail?id=${e.currentTarget.dataset.id}` })
  },
})
