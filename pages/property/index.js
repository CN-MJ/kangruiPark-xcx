const nav = require('../../utils/nav')

Page({
  onRepair() {
    wx.navigateTo({ url: '/pages/repair/index' })
  },

  onContact() {
    nav.go('contact')
  },
})
