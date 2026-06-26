const PHONE_KEY = 'user_phone'
const NAME_KEY = 'user_name'
const ROLE_KEY = 'user_role'
const ROLE_TEXT_KEY = 'user_role_text'
const CHECKED_IN_KEY = 'user_checked_in_at'

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
  isMerchant,
  isVisitor,
  saveUserProfile,
}
