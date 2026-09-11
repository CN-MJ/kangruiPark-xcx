Page({
  onLoad() {
    wx.showModal({
      title: '找回密码',
      content: '已取消短信找回。请登录后修改密码，或联系管理员重置。',
      showCancel: false,
      success: () => {
        const pages = getCurrentPages()
        if (pages.length > 1) wx.navigateBack()
        else wx.reLaunch({ url: '/pages/mine/index' })
      },
    })
  },
})
