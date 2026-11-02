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
const { userRequest, request } = require('../../utils/request')
const { uploadUserAvatar, downloadUserAvatar } = require('../../utils/upload')
const { openVisitorMpBindIfNeeded } = require('../../utils/wechatMp')

const DEFAULT_AVATAR = '/images/default-avatar.jpg'

Page({
  data: {
    name: '',
    phone: '',
    avatarLocal: DEFAULT_AVATAR,
    avatarDirty: false,
    localPath: '',
    role: ROLE_VISITOR,
    canEditIdentity: false,
    isParkAccount: false,
    isApprovedMerchant: false,
    merchantApplyStatus: 'none',
    merchantApplyStatusText: '',
    merchantRejectReason: '',
    applyEnterpriseName: '',
    enterpriseId: 0,
    enterpriseName: '',
    applyNote: '',
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
    this.bootstrapProfile()
  },

  bootstrapProfile() {
    request('/users/sync', {
      method: 'POST',
      data: { phone: getPhone(), name: getName() || undefined },
    })
      .then((res) => {
        const d = res.data || {}
        saveUserProfile(d)
        this.applyProfileState(d)
      })
      .catch(() => {})
  },

  applyProfileState(d) {
    const applyStatus = d.merchant_apply_status || 'none'
    const isApproved = d.role === ROLE_MERCHANT && !!d.enterprise_id && applyStatus === 'approved'
    const displayRole = isApproved
      ? ROLE_MERCHANT
      : (applyStatus === 'pending' ? ROLE_MERCHANT : (d.role === ROLE_MERCHANT ? ROLE_MERCHANT : ROLE_VISITOR))

    this.setData({
      name: d.name || this.data.name,
      role: displayRole === ROLE_MERCHANT ? ROLE_MERCHANT : ROLE_VISITOR,
      canEditIdentity: d.can_edit_identity !== undefined ? !!d.can_edit_identity : this.data.canEditIdentity,
      isApprovedMerchant: isApproved,
      merchantApplyStatus: applyStatus,
      merchantApplyStatusText: d.merchant_apply_status_text || '',
      merchantRejectReason: d.merchant_reject_reason || '',
      applyEnterpriseName: (d.merchant_apply_enterprise && d.merchant_apply_enterprise.name) || '',
      enterpriseId: d.enterprise_id || d.merchant_apply_enterprise_id || 0,
      enterpriseName: (d.enterprise && d.enterprise.name)
        || (d.merchant_apply_enterprise && d.merchant_apply_enterprise.name)
        || '',
      applyNote: d.merchant_apply_note || '',
    })
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onApplyNoteInput(e) {
    this.setData({ applyNote: e.detail.value })
  },

  onRoleTap(e) {
    if (!this.data.canEditIdentity) return
    if (this.data.merchantApplyStatus === 'pending') return
    const role = e.currentTarget.dataset.role
    if (role !== ROLE_VISITOR && role !== ROLE_MERCHANT) return
    this.setData({ role })
  },

  onPickEnterprise() {
    if (!this.data.canEditIdentity || this.data.isApprovedMerchant) return
    const selectedId = this.data.enterpriseId || 0
    wx.navigateTo({
      url: `/pages/mine/pick-enterprise?selected_id=${selectedId}`,
      events: {
        select: (payload) => {
          if (!payload || !payload.id) return
          this.setData({
            enterpriseId: Number(payload.id),
            enterpriseName: payload.name || '',
          })
        },
      },
    })
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

  onCancelApply() {
    if (this.data.submitting) return
    wx.showModal({
      title: '撤回申请',
      content: '确认撤回商户申请并恢复为访客？',
      success: (res) => {
        if (!res.confirm) return
        this.setData({ submitting: true })
        userRequest('/users/profile', {
          method: 'PATCH',
          data: { name: (this.data.name || '').trim() || getName(), role: ROLE_VISITOR },
        })
          .then((ret) => {
            saveUserProfile(ret.data)
            this.applyProfileState(ret.data || {})
            wx.showToast({ title: '已撤回', icon: 'success' })
          })
          .catch((err) => wx.showToast({ title: (err && err.message) || '操作失败', icon: 'none' }))
          .finally(() => this.setData({ submitting: false }))
      },
    })
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

    const applyingMerchant = this.data.canEditIdentity
      && this.data.role === ROLE_MERCHANT
      && !this.data.isApprovedMerchant

    if (applyingMerchant) {
      if (!this.data.enterpriseId) {
        wx.showToast({ title: '请选择所属企业', icon: 'none' })
        return
      }
      if (!(this.data.applyNote || '').trim()) {
        wx.showToast({ title: '请填写申请备注', icon: 'none' })
        return
      }
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
          if (data.role === ROLE_MERCHANT && !this.data.isApprovedMerchant) {
            data.enterprise_id = this.data.enterpriseId
            data.merchant_apply_note = (this.data.applyNote || '').trim()
          }
        }
        return userRequest('/users/profile', { method: 'PATCH', data })
      })
      .then((res) => {
        saveUserProfile(res.data)
        this.applyProfileState(res.data || {})
        finish()
        wx.showToast({ title: res.msg || '已保存', icon: 'success' })
        const pending = res.data && res.data.merchant_apply_status === 'pending'
        const phone = (res.data && res.data.phone) || getPhone()
        setTimeout(() => {
          if (pending && phone) {
            openVisitorMpBindIfNeeded({ phone, from: 'merchant_apply' }).catch(() => {})
            return
          }
          if (!pending) wx.navigateBack()
        }, 500)
      })
      .catch((err) => {
        finish()
        wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' })
      })
  },
})
