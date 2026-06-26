const { request } = require('../../utils/request')
const { getPhone, getName, setPhone, setName, saveUserProfile } = require('../../utils/user')

Page({
  data: {
    userName: '',
    userPhone: '',
    checkedIn: false,
    checkinTime: '',
    submitting: false,
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

  onCheckin() {
    if (this.data.submitting) return

    const { userName, userPhone } = this.data
    if (!userPhone.trim()) {
      wx.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    if (!userName.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }

    setPhone(userPhone.trim())
    setName(userName.trim())

    this.setData({ submitting: true })
    request('/users/checkin', {
      method: 'POST',
      data: {
        phone: userPhone.trim(),
        name: userName.trim(),
      },
    })
      .then((res) => {
        saveUserProfile(res.data)
        this.setData({
          checkedIn: true,
          checkinTime: new Date().toLocaleString(),
        })
        wx.showToast({ title: res.msg || '签到成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1500)
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '签到失败', icon: 'none' })
      })
      .finally(() => {
        this.setData({ submitting: false })
      })
  },
})
