const nav = require('../../utils/nav')
const parkAuth = require('../../utils/parkAuth')
const { getPhone, getName, getRole, getRoleText, isMerchant, isVisitor, saveUserProfile } = require('../../utils/user')
const { request } = require('../../utils/request')

const APP_VERSION = '1.0.0'

Page({
  data: {
    userName: '',
    userPhone: '',
    roleText: '访客',
    isVisitor: true,
    isMerchant: false,
    isParkStaff: false,
    parkStaffName: '',
    appVersion: APP_VERSION,
  },

  onShow() {
    this.refreshProfile()
  },

  refreshProfile() {
    const phone = getPhone()
    const parkUser = parkAuth.getParkUser()

    this.setData({
      userName: getName() || '园区访客',
      userPhone: phone || '未绑定手机号',
      roleText: getRoleText(),
      isVisitor: isVisitor(),
      isMerchant: isMerchant(),
      isParkStaff: parkAuth.isParkLoggedIn(),
      parkStaffName: parkUser ? parkUser.name : '',
    })

    if (phone) {
      request('/users/sync', {
        method: 'POST',
        data: { phone, name: getName() || undefined },
      })
        .then((res) => {
          saveUserProfile(res.data)
          this.setData({
            roleText: res.data.role_text,
            isVisitor: res.data.role === 'visitor',
            isMerchant: res.data.role === 'merchant',
            userName: res.data.name,
          })
        })
        .catch((err) => {
          wx.showToast({ title: err.message || '网络异常', icon: 'none' })
        })
    }
  },

  onBindPhone() {
    wx.showModal({
      title: '绑定手机号',
      editable: true,
      placeholderText: '请输入手机号',
      success: (res) => {
        if (!res.confirm || !res.content) return
        const phone = res.content.trim()
        if (!phone) return
        wx.setStorageSync('user_phone', phone)
        this.refreshProfile()
      },
    })
  },

  goCheckin() {
    if (!getPhone()) {
      wx.showToast({ title: '请先绑定手机号', icon: 'none' })
      return
    }
    nav.go('checkin')
  },

  goOrders() {
    nav.go('order')
  },

  goContact() {
    nav.go('contact')
  },

  goMerchantService() {
    nav.go('enterprise')
  },

  goParkLogin() {
    wx.navigateTo({ url: '/packageAdmin/pages/login/index' })
  },

  goParkHome() {
    if (!parkAuth.isParkLoggedIn()) {
      this.goParkLogin()
      return
    }
    wx.navigateTo({ url: '/packageAdmin/pages/home/index' })
  },

  onLogoutPark() {
    wx.showModal({
      title: '退出园区工作台',
      content: '确定退出吗？',
      success: (res) => {
        if (!res.confirm) return
        const { parkRequest } = require('../../utils/request')
        parkRequest('/park/logout', { method: 'POST' }).finally(() => {
          parkAuth.clearAuth()
          this.setData({ isParkStaff: false, parkStaffName: '' })
          wx.showToast({ title: '已退出', icon: 'success' })
        })
      },
    })
  },
})
