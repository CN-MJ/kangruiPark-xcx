const nav = require('../../utils/nav')
const parkAuth = require('../../utils/parkAuth')
const {
  getPhone,
  getName,
  getRoleText,
  isMerchant,
  isVisitor,
  isPhoneVerified,
  saveUserProfile,
  requirePhoneVerified,
  clearUserProfile,
} = require('../../utils/user')
const { request, userRequest } = require('../../utils/request')
const userAuth = require('../../utils/userAuth')
const superAuth = require('../../utils/superAuth')

const APP_VERSION = '1.0.0'
const VERSION_TAP_NEED = 7
const VERSION_TAP_WINDOW_MS = 2500

Page({
  data: {
    userName: '',
    userPhone: '',
    roleText: '访客',
    isVisitor: true,
    isMerchant: false,
    isParkStaff: false,
    parkStaffName: '',
    phoneVerified: false,
    hasUserAccount: false,
    headerPhoneText: '未登录 · 点击登录',
    appVersion: APP_VERSION,
  },

  onShow() {
    this.refreshProfile()
  },

  refreshProfile() {
    const phone = getPhone()
    const parkUser = parkAuth.getParkUser()
    const verified = isPhoneVerified()
    const loggedIn = !!phone && userAuth.isLoggedIn() && verified

    let headerPhoneText = '未登录 · 点击登录'
    if (loggedIn) {
      headerPhoneText = phone
    } else if (phone && !verified) {
      headerPhoneText = `${phone} · 点击授权登录`
    } else if (phone) {
      headerPhoneText = `${phone} · 点击登录`
    }

    this.setData({
      userName: loggedIn ? (getName() || '园区访客') : '园区访客',
      userPhone: phone || '未绑定手机号',
      roleText: loggedIn ? getRoleText() : '访客',
      isVisitor: loggedIn ? isVisitor() : true,
      isMerchant: loggedIn ? isMerchant() : false,
      isParkStaff: parkAuth.isParkLoggedIn(),
      parkStaffName: parkUser ? parkUser.name : '',
      phoneVerified: verified,
      hasUserAccount: loggedIn,
      headerPhoneText,
    })

    if (loggedIn) {
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
            phoneVerified: !!res.data.phone_verified,
            hasUserAccount: true,
            headerPhoneText: res.data.phone || phone,
          })
        })
        .catch((err) => {
          wx.showToast({ title: err.message || '网络异常', icon: 'none' })
        })
    }
  },

  onHeaderTap() {
    // 已登录：顶部卡片不再跳转
    if (this.data.hasUserAccount) return
    wx.navigateTo({ url: '/pages/mine/login' })
  },

  goOrders() {
    if (!requirePhoneVerified()) return
    nav.go('order')
  },

  goVehicles() {
    if (!requirePhoneVerified()) return
    wx.navigateTo({ url: '/pages/vehicles/index' })
  },

  goContact() {
    nav.go('contact')
  },

  goMerchantService() {
    nav.go('enterprises')
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

  onLogoutUser() {
    wx.showModal({
      title: '退出当前账号',
      content: '退出后需重新绑定手机号才能使用车辆、停车确认等功能',
      success: (res) => {
        if (!res.confirm) return
        clearUserProfile()
        this.setData({
          userName: '园区访客',
          userPhone: '未绑定手机号',
          roleText: '访客',
          isVisitor: true,
          isMerchant: false,
          phoneVerified: false,
          hasUserAccount: false,
          headerPhoneText: '未登录 · 点击登录',
        })
        wx.showToast({ title: '已退出账号', icon: 'success' })
      },
    })
  },

  onVersionTap() {
    const now = Date.now()
    if (!this._versionTapAt || now - this._versionTapAt > VERSION_TAP_WINDOW_MS) {
      this._versionTapCount = 0
    }
    this._versionTapAt = now
    this._versionTapCount = (this._versionTapCount || 0) + 1

    if (this._versionTapCount < VERSION_TAP_NEED) return
    this._versionTapCount = 0

    if (!getPhone() || !isPhoneVerified() || !userAuth.isLoggedIn()) {
      return
    }

    if (superAuth.isSuperLoggedIn()) {
      wx.navigateTo({ url: '/packageAdmin/pages/x-console/home' })
      return
    }

    userRequest('/super/probe')
      .then((res) => {
        if (!res.data || !res.data.can_escalate) return
        wx.navigateTo({ url: '/packageAdmin/pages/x-console/gate' })
      })
      .catch(() => {})
  },
})
