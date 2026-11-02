const nav = require('../../utils/nav')
const parkAuth = require('../../utils/parkAuth')
const {
  getPhone,
  getName,
  getHasAvatar,
  getRoleText,
  isMerchant,
  isVisitor,
  isPark,
  isPhoneVerified,
  getStaffApplyStatus,
  getStaffRejectReason,
  getEnterpriseId,
  getEnterpriseName,
  saveUserProfile,
  requirePhoneVerified,
  clearUserProfile,
} = require('../../utils/user')
const { request, userRequest, parkRequest } = require('../../utils/request')
const { downloadUserAvatar } = require('../../utils/upload')
const { isRemoteHttpUrl } = require('../../utils/media')
const { bindVisitorMpOpenid, openVisitorMpBindIfNeeded } = require('../../utils/wechatMp')
const userAuth = require('../../utils/userAuth')
const superAuth = require('../../utils/superAuth')

const APP_VERSION = '1.0.16'
const VERSION_TAP_NEED = 7
const VERSION_TAP_WINDOW_MS = 2500

Page({
  data: {
    userName: '',
    userAvatar: '',
    userPhone: '',
    roleText: '访客',
    isVisitor: true,
    isMerchant: false,
    isParkAccount: false,
    isParkStaff: false,
    parkStaffName: '',
    phoneVerified: false,
    hasUserAccount: false,
    staffApplyStatus: 'none',
    staffApplyDesc: '提交后由管理员分配岗位',
    enterpriseName: '',
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
      headerPhoneText = `${phone} · 点击登录`
    } else if (phone) {
      headerPhoneText = `${phone} · 点击登录`
    }

    const parkAccount = loggedIn && isPark()
    // 访客不应残留工作台会话
    if (loggedIn && !parkAccount && parkAuth.isParkLoggedIn()) {
      parkAuth.clearAuth()
    }

    this.setData({
      userName: loggedIn ? (getName() || '园区访客') : '园区访客',
      userAvatar: this.previewAvatar(loggedIn && getHasAvatar()),
      userPhone: phone || '未绑定手机号',
      roleText: loggedIn ? getRoleText() : '访客',
      isVisitor: loggedIn ? isVisitor() : true,
      isMerchant: loggedIn ? isMerchant() : false,
      isParkAccount: parkAccount,
      isParkStaff: parkAccount && parkAuth.isParkLoggedIn(),
      parkStaffName: parkAccount && parkUser ? parkUser.name : '',
      phoneVerified: verified,
      hasUserAccount: loggedIn,
      staffApplyStatus: loggedIn ? getStaffApplyStatus() : 'none',
      staffApplyDesc: this.staffApplyDesc(loggedIn ? getStaffApplyStatus() : 'none', getStaffRejectReason()),
      enterpriseName: loggedIn && isMerchant() ? getEnterpriseName() : '',
      headerPhoneText,
    })
    this.applyAvatar(loggedIn && getHasAvatar())

    if (loggedIn) {
      request('/users/sync', {
        method: 'POST',
        data: { phone, name: getName() || undefined },
      })
        .then((res) => {
          saveUserProfile(res.data)
          const syncedPark = res.data.role === 'park'
          if (!syncedPark && parkAuth.isParkLoggedIn()) {
            parkAuth.clearAuth()
          }
          this.setData({
            roleText: res.data.role_text,
            isVisitor: res.data.role === 'visitor',
            isMerchant: res.data.role === 'merchant',
            enterpriseName: res.data.role === 'merchant' && res.data.enterprise
              ? res.data.enterprise.name
              : '',
            isParkAccount: syncedPark,
            isParkStaff: syncedPark && parkAuth.isParkLoggedIn(),
            parkStaffName: syncedPark && parkAuth.getParkUser() ? parkAuth.getParkUser().name : '',
            userName: res.data.name,
            phoneVerified: !!res.data.phone_verified,
            hasUserAccount: true,
            staffApplyStatus: res.data.staff_apply_status || 'none',
            staffApplyDesc: this.staffApplyDesc(res.data.staff_apply_status || 'none', res.data.staff_reject_reason || ''),
            headerPhoneText: res.data.phone || phone,
          })
          this.applyAvatar(!!res.data.has_avatar)
        })
        .catch((err) => {
          wx.showToast({ title: err.message || '网络异常', icon: 'none' })
        })
    }
  },

  previewAvatar(hasAvatar) {
    const current = this.data.userAvatar || ''
    if (hasAvatar && current && !isRemoteHttpUrl(current)) return current
    return ''
  },

  applyAvatar(hasAvatar) {
    const token = (this._avatarToken || 0) + 1
    this._avatarToken = token
    if (!hasAvatar) {
      this.setData({ userAvatar: '' })
      return
    }
    downloadUserAvatar().then((local) => {
      if (this._avatarToken !== token) return
      this.setData({ userAvatar: local || '' })
    }).catch(() => {
      if (this._avatarToken !== token) return
      this.setData({ userAvatar: '' })
    })
  },

  onHeaderTap() {
    if (this.data.hasUserAccount) {
      wx.navigateTo({ url: '/pages/mine/profile' })
      return
    }
    wx.navigateTo({ url: '/pages/mine/login' })
  },

  onAvatarError() {
    const current = this.data.userAvatar || ''
    if (!current || !isRemoteHttpUrl(current)) return
    this.setData({ userAvatar: '' })
  },

  goOrders() {
    if (!requirePhoneVerified()) return
    nav.go('order')
  },

  goVehicles() {
    if (!requirePhoneVerified()) return
    wx.navigateTo({ url: '/pages/vehicles/index' })
  },

  onBindMpNotify() {
    if (!requirePhoneVerified()) return
    const phone = getPhone()
    if (!phone) {
      wx.showToast({ title: '请先绑定手机号', icon: 'none' })
      return
    }
    bindVisitorMpOpenid(phone).catch(() => {
      wx.showToast({ title: '复制失败，请重试', icon: 'none' })
    })
  },

  goContact() {
    nav.go('contact')
  },

  staffApplyDesc(status, reason) {
    if (status === 'pending') return '审核中，请等待管理员处理'
    if (status === 'rejected') return reason ? `未通过：${reason}，点击可重新申请` : '未通过，点击可重新申请'
    return '提交后由管理员分配岗位'
  },

  onApplyStaff() {
    if (!requirePhoneVerified()) return
    if (isPark()) return
    if (getStaffApplyStatus() === 'pending') {
      wx.showToast({ title: '申请正在审核中', icon: 'none' })
      return
    }
    wx.showModal({
      title: '申请成为工作人员',
      editable: true,
      placeholderText: '选填说明，例如负责的事项',
      success: (res) => {
        if (!res.confirm) return
        userRequest('/users/staff-apply', {
          method: 'POST',
          data: { note: (res.content || '').trim() },
        }).then((ret) => {
          saveUserProfile(ret.data)
          this.setData({
            staffApplyStatus: (ret.data && ret.data.staff_apply_status) || 'pending',
            staffApplyDesc: this.staffApplyDesc('pending', ''),
          })
          wx.showToast({ title: ret.msg || '已提交', icon: 'none' })
          const phone = (ret.data && ret.data.phone) || getPhone()
          if (phone) {
            setTimeout(() => {
              openVisitorMpBindIfNeeded({ phone, from: 'staff_apply' }).catch(() => {})
            }, 500)
          }
        }).catch((err) => {
          wx.showToast({ title: err.message || '提交失败', icon: 'none' })
        })
      },
    })
  },

  goShopServices() {
    if (!requirePhoneVerified()) return
    if (!getEnterpriseId()) {
      wx.showModal({
        title: '尚未绑定企业',
        content: '请先在个人资料中选择商户身份并绑定所属企业',
        confirmText: '去绑定',
        success: (res) => {
          if (res.confirm) wx.navigateTo({ url: '/pages/mine/profile' })
        },
      })
      return
    }
    wx.navigateTo({ url: '/pages/shop/services' })
  },

  goShopAppointments() {
    if (!requirePhoneVerified()) return
    if (!getEnterpriseId()) {
      wx.showModal({
        title: '尚未绑定企业',
        content: '请先在个人资料中选择商户身份并绑定所属企业',
        confirmText: '去绑定',
        success: (res) => {
          if (res.confirm) wx.navigateTo({ url: '/pages/mine/profile' })
        },
      })
      return
    }
    const phone = getPhone()
    const go = () => wx.navigateTo({ url: '/pages/shop/appointments' })
    if (!phone) {
      go()
      return
    }
    openVisitorMpBindIfNeeded({ phone, from: 'shop' })
      .then((ret) => {
        if (ret && ret.skipped) go()
      })
      .catch(() => go())
  },

  goEnterprises() {
    nav.go('enterprises')
  },

  goParkLogin() {
    if (!requirePhoneVerified()) return
    if (!isPark()) {
      wx.showToast({ title: '仅园区人员可进入工作台', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/packageAdmin/pages/login/index' })
  },

  goParkHome() {
    if (!requirePhoneVerified()) return
    if (!isPark()) {
      wx.showToast({ title: '仅园区人员可进入工作台', icon: 'none' })
      return
    }
    if (!parkAuth.isParkLoggedIn()) {
      this.goParkLogin()
      return
    }
    const phone = getPhone()
    const go = () => wx.navigateTo({ url: '/packageAdmin/pages/home/index' })
    if (!phone) {
      go()
      return
    }
    // 待审申请会推服务号，未绑定则先授权
    openVisitorMpBindIfNeeded({ phone, from: 'park' })
      .then((ret) => {
        if (ret && ret.skipped) go()
      })
      .catch(() => go())
  },

  onLogoutPark() {
    wx.showModal({
      title: '退出园区工作台',
      content: '仅退出工作台账号，不影响当前个人登录',
      success: (res) => {
        if (!res.confirm) return
        parkRequest('/park/logout', { method: 'POST' }).finally(() => {
          parkAuth.clearAuth()
          this.setData({ isParkStaff: false, parkStaffName: '' })
          wx.showToast({ title: '已退出工作台', icon: 'success' })
        })
      },
    })
  },

  onLogoutUser() {
    wx.showModal({
      title: '退出登录',
      content: '退出后需重新手机号快捷登录，园区工作台也会一并退出。',
      success: (res) => {
        if (!res.confirm) return
        const finish = () => {
          clearUserProfile()
          this.setData({
            userName: '园区访客',
            userAvatar: '',
            userPhone: '未绑定手机号',
            roleText: '访客',
            isVisitor: true,
            isMerchant: false,
            isParkStaff: false,
            parkStaffName: '',
            phoneVerified: false,
            hasUserAccount: false,
            headerPhoneText: '未登录 · 点击登录',
          })
          wx.showToast({ title: '已退出账号', icon: 'success' })
        }
        const tasks = [userRequest('/users/logout', { method: 'POST' }).catch(() => {})]
        if (parkAuth.isParkLoggedIn() || parkAuth.isSuperActingAsPark()) {
          tasks.push(parkRequest('/park/logout', { method: 'POST' }).catch(() => {}))
        }
        Promise.all(tasks).finally(finish)
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
