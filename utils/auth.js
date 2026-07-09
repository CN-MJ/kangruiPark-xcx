const { request } = require('./request')
const { parkRequest } = require('./request')
const { merchantRequest } = require('./request')

const PURPOSE = {
  BIND_PHONE: 'bind_phone',
  PARK_LOGIN: 'park_login',
  MERCHANT_LOGIN: 'merchant_login',
  RESET_PARK: 'password_reset_park',
  RESET_MERCHANT: 'password_reset_merchant',
}

function sendSmsCode(phone, purpose) {
  return request('/auth/sms/send', {
    method: 'POST',
    data: { phone, purpose },
  })
}

function bindPhone(phone, smsCode, name) {
  return request('/users/bind-phone', {
    method: 'POST',
    data: { phone, sms_code: smsCode, name },
  })
}

function resetPassword(accountType, phone, smsCode, newPassword, newPasswordConfirmation) {
  return request('/auth/password/reset', {
    method: 'POST',
    data: {
      account_type: accountType,
      phone,
      sms_code: smsCode,
      new_password: newPassword,
      new_password_confirmation: newPasswordConfirmation,
    },
  })
}

function changeParkPassword(oldPassword, newPassword, newPasswordConfirmation) {
  return parkRequest('/park/change-password', {
    method: 'POST',
    data: {
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirmation: newPasswordConfirmation,
    },
  })
}

function changeMerchantPassword(oldPassword, newPassword, newPasswordConfirmation) {
  return merchantRequest('/merchant/change-password', {
    method: 'POST',
    data: {
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirmation: newPasswordConfirmation,
    },
  })
}

module.exports = {
  PURPOSE,
  sendSmsCode,
  bindPhone,
  resetPassword,
  changeParkPassword,
  changeMerchantPassword,
}
