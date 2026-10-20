const { parkRequest } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')

Page({
  data: {
    roles: [],
    menus: [],
    loading: true,
    editing: false,
    editingKey: '',
    editingName: '',
    menuItems: [],
    isSystem: false,
  },

  onShow() {
    if (!parkAuth.canAccessParkAdmin() || !parkAuth.hasPermission('roles')) {
      wx.showToast({ title: '仅管理员可配置角色', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 400)
      return
    }
    this.loadRoles()
  },

  onPullDownRefresh() {
    this.loadRoles().finally(() => wx.stopPullDownRefresh())
  },

  loadRoles() {
    this.setData({ loading: true })
    return parkRequest('/park/roles')
      .then((res) => {
        const payload = res.data || {}
        this.setData({
          roles: payload.roles || [],
          menus: payload.menus || [],
          loading: false,
        })
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onCreate() {
    this.openEditor({ key: 'new', name: '', menus: [], is_system: false })
  },

  onEdit(e) {
    const key = e.currentTarget.dataset.key
    const role = this.data.roles.find((item) => item.key === key)
    if (!role) return
    this.openEditor(role)
  },

  openEditor(role) {
    const selected = role.menus || []
    const lockedAdmin = role.key === 'admin'
    this._selected = selected.slice()
    if (lockedAdmin && this._selected.indexOf('users') === -1) {
      this._selected.push('users')
    }
    if (lockedAdmin && this._selected.indexOf('roles') === -1) {
      this._selected.push('roles')
    }
    this.setData({
      editing: true,
      editingKey: role.key,
      editingName: role.name || '',
      isSystem: !!role.is_system,
      menuItems: (this.data.menus || []).map((item) => ({
        ...item,
        checked: this._selected.indexOf(item.key) !== -1 || (lockedAdmin && (item.key === 'users' || item.key === 'roles')),
        locked: lockedAdmin && (item.key === 'users' || item.key === 'roles'),
      })),
    })
  },

  onNameInput(e) {
    this.setData({ editingName: e.detail.value })
  },

  onMenusChange(e) {
    this._selected = e.detail.value || []
  },

  onCancel() {
    this.setData({ editing: false })
  },

  onSave() {
    const name = (this.data.editingName || '').trim()
    if (!name) {
      wx.showToast({ title: '请填写角色名称', icon: 'none' })
      return
    }
    let permissions = (this._selected || []).slice()
    if (this.data.editingKey === 'admin' && permissions.indexOf('users') === -1) {
      permissions.push('users')
    }
    if (this.data.editingKey === 'admin' && permissions.indexOf('roles') === -1) {
      permissions.push('roles')
    }
    const isNew = this.data.editingKey === 'new'
    const req = isNew
      ? parkRequest('/park/roles', { method: 'POST', data: { name, permissions } })
      : parkRequest(`/park/roles/${this.data.editingKey}`, { method: 'PUT', data: { name, permissions } })

    req.then((ret) => {
      wx.showToast({ title: ret.msg || '已保存', icon: 'none' })
      this.setData({ editing: false })
      this.loadRoles()
    }).catch((err) => wx.showToast({ title: err.message || '保存失败', icon: 'none' }))
  },

  onDelete(e) {
    const { key, name } = e.currentTarget.dataset
    wx.showModal({
      title: '删除角色',
      content: `确认删除「${name}」？已分配该角色的用户需先调整。`,
      success: (res) => {
        if (!res.confirm) return
        parkRequest(`/park/roles/${key}`, { method: 'DELETE' })
          .then((ret) => {
            wx.showToast({ title: ret.msg || '已删除', icon: 'none' })
            this.loadRoles()
          })
          .catch((err) => wx.showToast({ title: err.message || '删除失败', icon: 'none' }))
      },
    })
  },
})
