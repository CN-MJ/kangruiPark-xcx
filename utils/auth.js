const { request } = require('./request')
const { parkRequest } = require('./request')
const { merchantRequest } = require('./request')

function fetchCaptcha() {
  return request('/auth/captcha', { method: 'GET' })
}

function wxLoginCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) resolve(res.code)
        else reject(new Error('微信登录失败'))
      },
      fail: () => reject(new Error('微信登录失败')),
    })
  })
}

/**
 * 微信授权手机号登录
 * @param {string} phoneCode getPhoneNumber 返回的 code；本地 mock 可用 MOCK:138xxxx
 */
function wechatPhoneLogin(phoneCode, name) {
  return wxLoginCode().then((loginCode) =>
    request('/users/wechat-phone-login', {
      method: 'POST',
      data: {
        login_code: loginCode,
        phone_code: phoneCode,
        name: name || undefined,
      },
    })
  )
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
  fetchCaptcha,
  wxLoginCode,
  wechatPhoneLogin,
  changeParkPassword,
  changeMerchantPassword,
}
