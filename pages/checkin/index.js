const { userRequest } = require('../../utils/request')
const { getPhone, getName, setName, saveUserProfile, requirePhoneVerified } = require('../../utils/user')

Page({
  data: {
    userName: '',
    userPhone: '',
    checkedIn: false,
    checkinTime: '',
    submitting: false,
    needVerify: false,
  },

  onLoad() {
    const phone = getPhone()
    if (!phone) {
      wx.showModal({
        title: '请先绑定手机号',
        content: '签到前需完成手机号短信验证',
        confirmText: '去绑定',
        showCancel: false,
        success: () => {
          wx.redirectTo({ url: '/pages/mine/bind-phone' })
        },
      })
      return
    }

    if (!requirePhoneVerified({ redirect: false })) {
      this.setData({ needVerify: true, userPhone: phone })
      wx.showModal({
        title: '需要验证手机号',
        content: '请先完成手机号短信验证后再签到',
        confirmText: '去验证',
        showCancel: true,
        success: (res) => {
          if (res.confirm) {
            wx.redirectTo({ url: '/pages/mine/bind-phone' })
          } else {
            wx.navigateBack()
          }
        },
      })
      return
    }

    this.setData({
      userName: getName(),
      userPhone: phone,
    })
  },

  onNameInput(e) {
    this.setData({ userName: e.detail.value })
  },

  onCheckin() {
    if (this.data.submitting || this.data.needVerify) return

    const { userName } = this.data
    if (!userName.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }

    setName(userName.trim())

    this.setData({ submitting: true })
    userRequest('/users/checkin', {
      method: 'POST',
      data: { name: userName.trim() },
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
