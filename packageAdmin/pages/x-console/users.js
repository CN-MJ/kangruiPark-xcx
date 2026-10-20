const { superRequest } = require('../../../utils/request')
const superAuth = require('../../../utils/superAuth')

const ROLES = ['visitor', 'merchant', 'park']
const ROLE_TEXT = { visitor: '访客', merchant: '商户(标签)', park: '园区' }

Page({
  data: {
    list: [],
    loading: true,
    roles: ['访客', '商户(标签)', '园区'],
    roleKeys: ROLES,
    parkRoleOptions: [],
    parkRoleLabels: [],
  },

  onShow() {
    wx.redirectTo({ url: '/packageAdmin/pages/staff/index' })
  },

  loadList() {
    this.setData({ loading: true })
    superRequest('/super/users')
      .then((res) => {
        const payload = res.data || {}
        const parkRoles = payload.park_roles || []
        const rows = (payload.data || []).map((item) => ({
          ...item,
          roleText: ROLE_TEXT[item.role] || item.role,
          parkRoleIndex: Math.max(0, parkRoles.findIndex((r) => r.value === item.park_role)),
          roleIndex: Math.max(0, ROLES.indexOf(item.role)),
        }))
        this.setData({
          list: rows,
          loading: false,
          parkRoleOptions: parkRoles,
          parkRoleLabels: parkRoles.map((r) => r.label),
        })
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onRoleChange(e) {
    const { id } = e.currentTarget.dataset
    const role = ROLES[Number(e.detail.value)]
    const data = { role }
    if (role === 'park') {
      data.park_role = 'admin'
    }
    this.patchUser(id, data)
  },

  onParkRoleChange(e) {
    const { id } = e.currentTarget.dataset
    const opt = this.data.parkRoleOptions[Number(e.detail.value)]
    if (!opt) return
    this.patchUser(id, { role: 'park', park_role: opt.value })
  },

  onToggleEscalate(e) {
    const { id } = e.currentTarget.dataset
    const checked = !!e.detail.value
    this.patchUser(id, { can_escalate: checked })
  },

  onResetPassword(e) {
    const { id, phone } = e.currentTarget.dataset
    wx.showModal({
      title: '重置密码',
      editable: true,
      placeholderText: '至少 8 位新密码',
      success: (res) => {
        if (!res.confirm) return
        const password = (res.content || '').trim()
        if (password.length < 8) {
          wx.showToast({ title: '密码至少 8 位', icon: 'none' })
          return
        }
        this.patchUser(id, { password }, `已重置 ${phone || ''}`.trim())
      },
    })
  },

  patchUser(id, data, successTip) {
    superRequest(`/super/users/${id}`, {
      method: 'PATCH',
      data,
    })
      .then((ret) => {
        wx.showToast({
          title: successTip || ret.msg || '已更新',
          icon: 'none',
        })
        this.loadList()
      })
      .catch((err) => wx.showToast({ title: err.message || '更新失败', icon: 'none' }))
  },
})
