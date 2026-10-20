const PHONE_KEY = 'user_phone'
const NAME_KEY = 'user_name'
const AVATAR_KEY = 'user_avatar'
const HAS_AVATAR_KEY = 'user_has_avatar'
const ROLE_KEY = 'user_role'
const ROLE_TEXT_KEY = 'user_role_text'
const CHECKED_IN_KEY = 'user_checked_in_at'
const PHONE_VERIFIED_KEY = 'user_phone_verified'
const APPLY_STATUS_KEY = 'user_merchant_apply_status'
const STAFF_APPLY_KEY = 'user_staff_apply_status'
const STAFF_REJECT_KEY = 'user_staff_reject_reason'

const ROLE_VISITOR = 'visitor'
const ROLE_MERCHANT = 'merchant'
const ROLE_PARK = 'park'

function getPhone() {
  return wx.getStorageSync(PHONE_KEY) || ''
}

function setPhone(phone) {
  wx.setStorageSync(PHONE_KEY, phone)
}

function getName() {
  return wx.getStorageSync(NAME_KEY) || ''
}

function setName(name) {
  wx.setStorageSync(NAME_KEY, name)
}

function getAvatar() {
  return wx.getStorageSync(AVATAR_KEY) || ''
}

function setAvatar(avatar) {
  wx.setStorageSync(AVATAR_KEY, avatar || '')
}

function getHasAvatar() {
  return wx.getStorageSync(HAS_AVATAR_KEY) === '1'
}

function setHasAvatar(hasAvatar) {
  wx.setStorageSync(HAS_AVATAR_KEY, hasAvatar ? '1' : '')
}

function getRole() {
  return wx.getStorageSync(ROLE_KEY) || ROLE_VISITOR
}

function getRoleText() {
  return wx.getStorageSync(ROLE_TEXT_KEY) || '访客'
}

function isPhoneVerified() {
  return !!wx.getStorageSync(PHONE_VERIFIED_KEY)
}

function setPhoneVerified(verified) {
  wx.setStorageSync(PHONE_VERIFIED_KEY, !!verified)
}

function getMerchantApplyStatus() {
  return wx.getStorageSync(APPLY_STATUS_KEY) || 'none'
}

function getStaffApplyStatus() {
  return wx.getStorageSync(STAFF_APPLY_KEY) || 'none'
}

function getStaffRejectReason() {
  return wx.getStorageSync(STAFF_REJECT_KEY) || ''
}

function isMerchant() {
  return getRole() === ROLE_MERCHANT
}

function isVisitor() {
  return getRole() === ROLE_VISITOR
}

function isPark() {
  return getRole() === ROLE_PARK
}

function saveUserProfile(user) {
  if (!user) return
  if (user.phone) setPhone(user.phone)
  if (user.name) setName(user.name)
  if (Object.prototype.hasOwnProperty.call(user, 'has_avatar')) setHasAvatar(!!user.has_avatar)
  if (Object.prototype.hasOwnProperty.call(user, 'avatar')) setAvatar(user.avatar)
  if (user.role) wx.setStorageSync(ROLE_KEY, user.role)
  if (user.role_text) wx.setStorageSync(ROLE_TEXT_KEY, user.role_text)
  if (user.checked_in_at) wx.setStorageSync(CHECKED_IN_KEY, user.checked_in_at)
  if (user.phone_verified !== undefined) setPhoneVerified(user.phone_verified)
  if (user.merchant_apply_status !== undefined) {
    wx.setStorageSync(APPLY_STATUS_KEY, user.merchant_apply_status || 'none')
  }
  if (user.staff_apply_status !== undefined) {
    wx.setStorageSync(STAFF_APPLY_KEY, user.staff_apply_status || 'none')
  }
  if (user.staff_reject_reason !== undefined) {
    wx.setStorageSync(STAFF_REJECT_KEY, user.staff_reject_reason || '')
  }
  if (user.token) {
    const userAuth = require('./userAuth')
    userAuth.setToken(user.token)
  } else if (user.phone_verified === false) {
    const userAuth = require('./userAuth')
    userAuth.clearToken()
  }
}

function requirePhoneVerified(options = {}) {
  const userAuth = require('./userAuth')
  const { redirect = true, silent = false } = options

  if (isPhoneVerified() && userAuth.isLoggedIn()) {
    return true
  }

  if (silent) {
    return false
  }

  if (redirect) {
    wx.showModal({
      title: '需要微信授权',
      content: '请先微信授权手机号登录后，才能使用此功能',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/mine/login' })
        }
      },
    })
  }

  return false
}

function clearUserProfile() {
  // 退出微信账号时一并清超管与园区工作台会话
  wx.removeStorageSync(PHONE_KEY)
  wx.removeStorageSync(NAME_KEY)
  wx.removeStorageSync(AVATAR_KEY)
  wx.removeStorageSync(HAS_AVATAR_KEY)
  wx.removeStorageSync(ROLE_KEY)
  wx.removeStorageSync(ROLE_TEXT_KEY)
  wx.removeStorageSync(CHECKED_IN_KEY)
  wx.removeStorageSync(PHONE_VERIFIED_KEY)
  wx.removeStorageSync(APPLY_STATUS_KEY)
  wx.removeStorageSync(STAFF_APPLY_KEY)
  wx.removeStorageSync(STAFF_REJECT_KEY)
  const userAuth = require('./userAuth')
  userAuth.clearToken()
  try {
    const superAuth = require('./superAuth')
    superAuth.clearToken()
  } catch (e) {}
  try {
    const parkAuth = require('./parkAuth')
    parkAuth.clearAuth()
  } catch (e) {}
}

module.exports = {
  ROLE_VISITOR,
  ROLE_MERCHANT,
  ROLE_PARK,
  getPhone,
  setPhone,
  getName,
  setName,
  getAvatar,
  setAvatar,
  getHasAvatar,
  setHasAvatar,
  getRole,
  getRoleText,
  isPhoneVerified,
  setPhoneVerified,
  getMerchantApplyStatus,
  getStaffApplyStatus,
  getStaffRejectReason,
  isMerchant,
  isVisitor,
  isPark,
  saveUserProfile,
  requirePhoneVerified,
  clearUserProfile,
}
