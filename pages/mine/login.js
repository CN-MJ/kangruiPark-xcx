const { wechatPhoneLogin } = require('../../utils/auth')
const { saveUserProfile } = require('../../utils/user')
const { request } = require('../../utils/request')

// TODO(dev-only): 多账号测试用，上线前整段 mock 入口删除
// 与 UserSeeder 种子账号对齐
const MOCK_PRESETS = [
  {
    id: 'visitor',
    label: '普通访客',
    phone: '13900000002',
    hint: '仅个人功能',
  },
  {
    id: 'escalate',
    label: '可升超管',
    phone: '13900000001',
    hint: '连点版本号进控制台 · 密 123456',
  },
  {
    id: 'park_admin',
    label: '园区管理员',
    phone: '13800000001',
    hint: '工作台密码 123456',
  },
  {
    id: 'park_enterprise',
    label: '健康企业汇录入',
    phone: '13800000002',
    hint: '工作台密码 12345678',
  },
  {
    id: 'park_category',
    label: '分类管理员',
    phone: '13800000003',
    hint: '工作台密码 12345678',
  },
]

function isDevToolEnv() {
  try {
    const info = wx.getAccountInfoSync()
    const env = (info.miniProgram && info.miniProgram.envVersion) || ''
    return env === 'develop' || env === 'trial'
  } catch (e) {
    return false
  }
}

Page({
  data: {
    submitting: false,
    mockHint: false,
    mockPresets: MOCK_PRESETS,
    selectedPresetId: 'visitor',
    mockPhone: MOCK_PRESETS[0].phone,
    selectedHint: MOCK_PRESETS[0].hint,
  },

  onShow() {
    this.refreshMockHint()
  },

  refreshMockHint() {
    if (!isDevToolEnv()) {
      this.setData({ mockHint: false })
      return
    }
    request('/users/login-options')
      .then((res) => {
        const enabled = !!(res.data && res.data.mock_enabled)
        this.setData({ mockHint: enabled })
      })
      .catch(() => this.setData({ mockHint: false }))
  },

  onSelectPreset(e) {
    const id = e.currentTarget.dataset.id
    const preset = MOCK_PRESETS.find((item) => item.id === id)
    if (!preset) return
    this.setData({
      selectedPresetId: preset.id,
      mockPhone: preset.phone,
      selectedHint: preset.hint,
    })
  },

  onMockPhoneInput(e) {
    const phone = (e.detail.value || '').trim()
    this.setData({
      mockPhone: phone,
      selectedPresetId: '',
      selectedHint: '自定义号码（无种子则登录后为新访客）',
    })
  },

  onGetPhoneNumber(e) {
    if (this.data.submitting) return
    const detail = e.detail || {}
    if (detail.errMsg && detail.errMsg.indexOf('ok') === -1) {
      wx.showToast({ title: '需要授权手机号才能登录', icon: 'none' })
      return
    }
    const phoneCode = detail.code
    if (!phoneCode) {
      wx.showToast({
        title: this.data.mockHint ? '未获取到授权码，请使用下方开发登录' : '未获取到授权码，请重试',
        icon: 'none',
      })
      return
    }
    this.doLogin(phoneCode)
  },

  onMockLogin() {
    if (this.data.submitting || !this.data.mockHint) return
    const phone = String(this.data.mockPhone || '').replace(/\D/g, '')
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请选择账号或输入 11 位手机号', icon: 'none' })
      return
    }
    this.doLogin(`MOCK:${phone}`)
  },

  doLogin(phoneCode) {
    this.setData({ submitting: true })
    wechatPhoneLogin(phoneCode)
      .then((res) => {
        saveUserProfile(res.data)
        wx.showToast({ title: res.msg || '登录成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 500)
      })
      .catch((err) => wx.showToast({ title: err.message || '登录失败', icon: 'none' }))
      .finally(() => this.setData({ submitting: false }))
  },
})
