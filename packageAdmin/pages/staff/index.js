const { parkRequest } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')
const superAuth = require('../../../utils/superAuth')

const ROLE_KEYS = ['visitor', 'merchant', 'park']
const ROLE_LABELS = ['访客', '商户', '工作人员']
const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'visitor', label: '访客' },
  { key: 'merchant', label: '商户' },
  { key: 'park', label: '工作人员' },
]

Page({
  data: {
    list: [],
    loading: true,
    loadingMore: false,
    keyword: '',
    filters: FILTERS,
    activeFilter: 'all',
    pendingCount: 0,
    parkRoles: [],
    parkRoleLabels: ['全部角色'],
    assignLabels: [],
    parkRoleFilterIndex: 0,
    page: 1,
    lastPage: 1,
    superMode: false,
    roleLabels: ROLE_LABELS,
    sheetVisible: false,
  },

  onShow() {
    if (!this.ensureAccess()) return
    this.loadList(true)
  },

  onPullDownRefresh() {
    this.loadList(true).finally(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.loading || this.data.loadingMore) return
    if (this.data.page >= this.data.lastPage) return
    this.loadList(false)
  },

  ensureAccess() {
    const superMode = superAuth.isSuperLoggedIn() && !parkAuth.isParkLoggedIn()
    this.setData({ superMode })
    if (!parkAuth.canAccessParkAdmin()) {
      wx.redirectTo({
        url: superMode ? '/packageAdmin/pages/x-console/gate' : '/packageAdmin/pages/login/index',
      })
      return false
    }
    if (!parkAuth.hasPermission('users')) {
      wx.showToast({ title: '仅管理员可查看用户管理', icon: 'none' })
      setTimeout(() => {
        wx.navigateBack({
          fail() {
            wx.redirectTo({ url: '/packageAdmin/pages/home/index' })
          },
        })
      }, 400)
      return false
    }
    return true
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value })
  },

  onSearch() {
    this.loadList(true)
  },

  onFilterTap(e) {
    const { key } = e.currentTarget.dataset
    if (key === this.data.activeFilter) return
    this.setData({ activeFilter: key, parkRoleFilterIndex: 0 })
    this.loadList(true)
  },

  onParkRoleFilter(e) {
    this.setData({ parkRoleFilterIndex: Number(e.detail.value) })
    this.loadList(true)
  },

  loadList(reset) {
    const page = reset ? 1 : this.data.page + 1
    if (reset) this.setData({ loading: true })
    else this.setData({ loadingMore: true })

    const params = { page }
    const filter = this.data.activeFilter
    if (filter === 'pending') params.staff_apply_status = 'pending'
    if (filter === 'visitor' || filter === 'merchant' || filter === 'park') params.role = filter
    if (filter === 'park' && this.data.parkRoleFilterIndex > 0) {
      const role = this.data.parkRoles[this.data.parkRoleFilterIndex - 1]
      if (role) params.park_role = role.value
    }
    const keyword = (this.data.keyword || '').trim()
    if (keyword) params.keyword = keyword

    return parkRequest('/park/users', { data: params })
      .then((res) => {
        const payload = res.data || {}
        const parkRoles = payload.park_roles || []
        const rows = (payload.list || []).map((item) => this.decorate(item, parkRoles))
        const pagination = payload.pagination || {}
        this.setData({
          list: reset ? rows : this.data.list.concat(rows),
          loading: false,
          loadingMore: false,
          page: pagination.current_page || page,
          lastPage: pagination.last_page || 1,
          pendingCount: payload.pending_count || 0,
          parkRoles,
          assignLabels: parkRoles.map((role) => role.label),
          parkRoleLabels: ['全部角色'].concat(parkRoles.map((role) => role.label)),
        })
      })
      .catch((err) => {
        this.setData({ loading: false, loadingMore: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  decorate(item, parkRoles) {
    const roles = parkRoles || this.data.parkRoles
    return {
      ...item,
      roleText: item.role_text || '访客',
      roleIndex: Math.max(0, ROLE_KEYS.indexOf(item.role)),
      parkRoleIndex: Math.max(0, roles.findIndex((role) => role.value === item.park_role)),
      isPending: item.staff_apply_status === 'pending',
    }
  },

  onRoleChange(e) {
    const id = Number(e.currentTarget.dataset.id)
    const role = ROLE_KEYS[Number(e.detail.value)]
    if (role !== 'park') {
      this.patchUser(id, { role })
      return
    }
    this.openRoleSheet(id, 'assign')
  },

  onParkRoleChange(e) {
    const id = Number(e.currentTarget.dataset.id)
    const opt = this.data.parkRoles[Number(e.detail.value)]
    if (!opt) return
    this.assignRole(id, opt.value)
  },

  onConfigRole(e) {
    this.openRoleSheet(Number(e.currentTarget.dataset.id), 'assign')
  },

  openRoleSheet(id, mode) {
    const user = this.data.list.find((item) => item.id === id)
    if (!this.data.parkRoles.length) {
      wx.showToast({ title: '还没有可分配的角色', icon: 'none' })
      return
    }
    this._sheetMode = mode
    this._sheetUserId = id
    this._sheetHasPassword = !!(user && user.has_password)
    this.setData({ sheetVisible: true })
  },

  onApprove(e) {
    this.openRoleSheet(Number(e.currentTarget.dataset.id), 'approve')
  },

  onPickSheetRole(e) {
    const parkRole = e.currentTarget.dataset.value
    const id = this._sheetUserId
    const mode = this._sheetMode
    this.setData({ sheetVisible: false })
    if (mode === 'approve') {
      this.askPassword(!this._sheetHasPassword, (password) => {
        const data = { action: 'approve', park_role: parkRole }
        if (password) data.password = password
        this.review(id, data)
      })
      return
    }
    this.assignRole(id, parkRole)
  },

  assignRole(id, parkRole) {
    const user = this.data.list.find((item) => item.id === id)
    const data = { role: 'park', park_role: parkRole }
    if (user && !user.has_password) {
      this.askPassword(true, (password) => {
        data.password = password
        this.patchUser(id, data)
      })
      return
    }
    this.patchUser(id, data)
  },

  onCloseSheet() {
    this.setData({ sheetVisible: false })
    if (this._sheetMode === 'assign') {
      this.loadList(true)
    }
  },

  noop() {},

  onReject(e) {
    const id = Number(e.currentTarget.dataset.id)
    wx.showModal({
      title: '拒绝申请',
      editable: true,
      placeholderText: '请填写原因',
      success: (res) => {
        if (!res.confirm) return
        const reason = (res.content || '').trim()
        if (!reason) {
          wx.showToast({ title: '请填写原因', icon: 'none' })
          return
        }
        this.review(id, { action: 'reject', reject_reason: reason })
      },
    })
  },

  onResetPassword(e) {
    const id = Number(e.currentTarget.dataset.id)
    this.askPassword(true, (password) => {
      this.patchUser(id, { password }, '密码已更新')
    })
  },

  askPassword(required, done) {
    wx.showModal({
      title: required ? '设置工作台密码' : '工作台密码',
      editable: true,
      placeholderText: required ? '至少 8 位，用于工作台登录' : '留空表示不修改，修改则至少 8 位',
      success: (res) => {
        if (!res.confirm) return
        const password = (res.content || '').trim()
        if (required && password.length < 8) {
          wx.showToast({ title: '密码至少 8 位', icon: 'none' })
          return
        }
        if (password && password.length < 8) {
          wx.showToast({ title: '密码至少 8 位', icon: 'none' })
          return
        }
        done(password)
      },
    })
  },

  patchUser(id, data, successTip) {
    parkRequest(`/park/users/${id}`, { method: 'PATCH', data })
      .then((ret) => {
        wx.showToast({ title: successTip || ret.msg || '已更新', icon: 'none' })
        this.loadList(true)
      })
      .catch((err) => wx.showToast({ title: err.message || '更新失败', icon: 'none' }))
  },

  review(id, data) {
    parkRequest(`/park/users/${id}/review-staff`, { method: 'POST', data })
      .then((ret) => {
        wx.showToast({ title: ret.msg || '已处理', icon: 'none' })
        this.loadList(true)
      })
      .catch((err) => wx.showToast({ title: err.message || '处理失败', icon: 'none' }))
  },
})
