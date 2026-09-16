Page({
  onLoad() {
    wx.showModal({
      title: '功能已调整',
      content: '企业入驻请先微信授权，再登录「我的 → 园区工作台」在「健康企业汇」录入。访客可在首页「健康企业汇」浏览。',
      confirmText: '去我的',
      cancelText: '去健康企业汇',
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
