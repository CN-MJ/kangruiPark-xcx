Page({
  onLoad() {
    wx.showModal({
      title: '功能已调整',
      content: '企业入驻请先手机号快捷登录，再进入「我的 → 园区工作台」在「赣南健康企业库」录入。访客可在首页「赣南健康企业库」浏览。',
      confirmText: '去我的',
      cancelText: '去赣南健康企业库',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({ url: '/pages/mine/index' })
        } else {
          wx.redirectTo({ url: '/pages/enterprises/index' })
        }
      },
    })
  },
})
