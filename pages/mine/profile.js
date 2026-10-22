const {
  getName,
  getPhone,
  getHasAvatar,
  getRole,
  isPark,
  isPhoneVerified,
  saveUserProfile,
  requirePhoneVerified,
  ROLE_VISITOR,
  ROLE_MERCHANT,
} = require('../../utils/user')
const { userRequest } = require('../../utils/request')
const { uploadUserAvatar, downloadUserAvatar } = require('../../utils/upload')

const DEFAULT_AVATAR = '/images/default-avatar.jpg'

Page({
  data: {
    name: '',
    phone: '',
    avatar: '',
    avatarLocal: DEFAULT_AVATAR,
    avatarDirty: false,
    localPath: '',
    role: ROLE_VISITOR,
    canEditIdentity: false,
    isParkAccount: false,
    submitting: false,
  },

  onLoad() {
    if (!requirePhoneVerified()) {
      return
    }
    const role = getRole() || ROLE_VISITOR
    const parkAccount = isPark()
    this.setData({
      name: getName() || '',
      phone: getPhone(),
      avatarLocal: DEFAULT_AVATAR,
      role: (role === ROLE_MERCHANT || role === ROLE_VISITOR) ? role : ROLE_VISITOR,
      canEditIdentity: isPhoneVerified() && !parkAccount,
      isParkAccount: parkAccount,
    })
    if (getHasAvatar()) {
      downloadUserAvatar().then((local) => {
        if (local && !this.data.avatarDirty) this.setData({ avatarLocal: local })
      }).catch(() => {})
    }
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onRoleTap(e) {
    if (!this.data.canEditIdentity) return
    const role = e.currentTarget.dataset.role
    if (role !== ROLE_VISITOR && role !== ROLE_MERCHANT) return
    this.setData({ role })
  },

  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: (res) => {
        const file = (res.tempFiles || [])[0]
        if (!file || !file.tempFilePath) return
        this.setData({
          avatarLocal: file.tempFilePath,
          avatarDirty: true,
          localPath: file.tempFilePath,
        })
      },
    })
  },

  onAvatarError() {
    if (this.data.avatarLocal !== DEFAULT_AVATAR) {
      this.setData({ avatarLocal: DEFAULT_AVATAR })
    }
  },

  onSubmit() {
    if (!requirePhoneVerified()) return
    const name = (this.data.name || '').trim()
    if (!name) {
      wx.showToast({ title: '请填写名称', icon: 'none' })
      return
    }
    if (name.length > 50) {
      wx.showToast({ title: '名称不能超过 50 个字', icon: 'none' })
      return
    }
    if (this.data.submitting) return

    this.setData({ submitting: true })
    wx.showLoading({ title: this.data.avatarDirty ? '上传头像' : '保存中', mask: true })

    const upload = this.data.avatarDirty
      ? uploadUserAvatar(this.data.localPath)
      : Promise.resolve('')

    const finish = () => {
      wx.hideLoading()
      this.setData({ submitting: false })
    }

    upload
      .then((avatar) => {
        const data = { name }
        if (avatar) data.avatar = avatar
        if (this.data.canEditIdentity) {
          data.role = this.data.role === ROLE_MERCHANT ? ROLE_MERCHANT : ROLE_VISITOR
        }
        return userRequest('/users/profile', { method: 'PATCH', data })
      })
      .then((res) => {
        saveUserProfile(res.data)
        finish()
        wx.showToast({ title: '已保存', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 400)
      })
      .catch((err) => {
        finish()
        wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' })
      })
  },
})
