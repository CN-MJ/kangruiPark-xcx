const { superRequest } = require('../../../utils/request')
const superAuth = require('../../../utils/superAuth')

const ROLES = ['visitor', 'merchant', 'park']
const ROLE_TEXT = { visitor: '访客', merchant: '商户', park: '园区' }

Page({
  data: {
    list: [],
    loading: true,
    roles: ['访客', '商户', '园区'],
    roleKeys: ROLES,
  },

  onShow() {
    if (!superAuth.isSuperLoggedIn()) {
      wx.redirectTo({ url: '/packageAdmin/pages/x-console/gate' })
      return
    }
    this.loadList()
  },

  loadList() {
    this.setData({ loading: true })
    superRequest('/super/users')
      .then((res) => {
        const payload = res.data || {}
        const rows = (payload.data || []).map((item) => ({
          ...item,
          roleText: ROLE_TEXT[item.role] || item.role,
        }))
        this.setData({ list: rows, loading: false })
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onRoleChange(e) {
    const { id } = e.currentTarget.dataset
    const role = ROLES[Number(e.detail.value)]
    superRequest(`/super/users/${id}`, {
      method: 'PATCH',
      data: { role },
    })
      .then(() => {
        wx.showToast({ title: '已更新', icon: 'success' })
        this.loadList()
      })
      .catch((err) => wx.showToast({ title: err.message || '更新失败', icon: 'none' }))
  },
})
