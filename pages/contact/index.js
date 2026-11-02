Page({
  onCall() {
    wx.makePhoneCall({
      phoneNumber: '07978235888',
      fail: () => {
        wx.showToast({ title: '拨打失败', icon: 'none' })
      },
    })
  },
})
