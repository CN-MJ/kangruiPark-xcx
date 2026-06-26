const { getPhone, setPhone, getName, setName } = require('../../utils/user')

Page({
  data: {
    userName: '',
    userPhone: '',
    title: '',
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

  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value })
  },

  onSubmit() {
    const { userName, userPhone, title, content } = this.data
    if (!userName.trim() || !userPhone.trim() || !title.trim() || !content.trim()) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' })
      return
    }

    setName(userName.trim())
    setPhone(userPhone.trim())

    const records = wx.getStorageSync('repair_list') || []
    records.unshift({
      id: Date.now(),
      userName: userName.trim(),
      userPhone: userPhone.trim(),
      title: title.trim(),
      content: content.trim(),
      time: new Date().toLocaleString(),
    })
    wx.setStorageSync('repair_list', records.slice(0, 20))

    wx.showToast({ title: '报修已提交', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 1500)
  },
})
