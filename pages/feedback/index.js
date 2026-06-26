const { getPhone, setPhone, getName, setName } = require('../../utils/user')

Page({
  data: {
    userName: '',
    userPhone: '',
    content: '',
  },

  onLoad() {
    this.setData({
      userName: getName(),
      userPhone: getPhone(),
    })
  },

  onNameInput(e) {
    this.setData({ userName: e.detail.value })
  },

  onPhoneInput(e) {
    this.setData({ userPhone: e.detail.value })
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  onSubmit() {
    const { userName, userPhone, content } = this.data
    if (!userName.trim() || !userPhone.trim() || !content.trim()) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }

    setName(userName.trim())
    setPhone(userPhone.trim())

    const records = wx.getStorageSync('feedback_list') || []
    records.unshift({
      id: Date.now(),
      userName: userName.trim(),
      userPhone: userPhone.trim(),
      content: content.trim(),
      time: new Date().toLocaleString(),
    })
    wx.setStorageSync('feedback_list', records.slice(0, 20))

    wx.showToast({ title: '提交成功', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1500)
  },
})
