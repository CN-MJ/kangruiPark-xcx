Page({
  onLoad() {
    wx.showModal({
      title: '功能已调整',
      content: '企业入驻请登录「我的 → 园区工作台」，在「企业库」中录入。访客可在首页「企业库」浏览筛选企业。',
      confirmText: '去工作台',
      cancelText: '去企业库',
      success: (res) => {
        if (res.confirm) {
          wx.redirectTo({ url: '/packageAdmin/pages/login/index' })
        } else {
          wx.redirectTo({ url: '/pages/enterprises/index' })
        }
      },
    })
  },
})
