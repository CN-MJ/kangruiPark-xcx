const superAuth = require('../../../utils/superAuth')

Page({
  onShow() {
    if (!superAuth.isSuperLoggedIn()) {
      wx.redirectTo({ url: '/packageAdmin/pages/x-console/gate' })
      return
    }
    wx.redirectTo({ url: '/packageAdmin/pages/logs/index' })
  },
})
