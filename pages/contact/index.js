Page({
  onCall() {
    wx.makePhoneCall({
      phoneNumber: '4008886688',
      fail: () => {
        wx.showToast({ title: '拨打失败', icon: 'none' })
      },
    })
  },
})
