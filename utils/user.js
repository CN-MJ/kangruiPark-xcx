const PHONE_KEY = 'user_phone'
const NAME_KEY = 'user_name'
const ROLE_KEY = 'user_role'
const ROLE_TEXT_KEY = 'user_role_text'
const CHECKED_IN_KEY = 'user_checked_in_at'
const PHONE_VERIFIED_KEY = 'user_phone_verified'
const APPLY_STATUS_KEY = 'user_merchant_apply_status'

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

function isMerchant() {
  return getRole() === ROLE_MERCHANT
}

function isVisitor() {
  return getRole() === ROLE_VISITOR
}

function saveUserProfile(user) {
  if (!user) return
  if (user.phone) setPhone(user.phone)
  if (user.name) setName(user.name)
  if (user.role) wx.setStorageSync(ROLE_KEY, user.role)
  if (user.role_text) wx.setStorageSync(ROLE_TEXT_KEY, user.role_text)
  if (user.checked_in_at) wx.setStorageSync(CHECKED_IN_KEY, user.checked_in_at)
  if (user.phone_verified !== undefined) setPhoneVerified(user.phone_verified)
  if (user.merchant_apply_status !== undefined) {
    wx.setStorageSync(APPLY_STATUS_KEY, user.merchant_apply_status || 'none')
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
  wx.removeStorageSync(PHONE_KEY)
  wx.removeStorageSync(NAME_KEY)
  wx.removeStorageSync(ROLE_KEY)
  wx.removeStorageSync(ROLE_TEXT_KEY)
  wx.removeStorageSync(CHECKED_IN_KEY)
  wx.removeStorageSync(PHONE_VERIFIED_KEY)
  wx.removeStorageSync(APPLY_STATUS_KEY)
  const userAuth = require('./userAuth')
  userAuth.clearToken()
  try {
    const superAuth = require('./superAuth')
    superAuth.clearToken()
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
  getRole,
  getRoleText,
  isPhoneVerified,
  setPhoneVerified,
  getMerchantApplyStatus,
  isMerchant,
  isVisitor,
  saveUserProfile,
  requirePhoneVerified,
  clearUserProfile,
}
