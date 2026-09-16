const { parkRequest } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')

Page({
  data: {
    majors: [],
    loading: false,
    expandedId: 0,
    showForm: false,
    editingId: '',
    formName: '',
    formSort: 0,
    formStatus: 1,
    formParentId: null,
    formParentName: '',
    submitting: false,
  },

  onShow() {
    if (!parkAuth.requirePermission('categories', { redirectHome: true })) return
    this.loadTree()
  },

  onSyncDefaults() {
    const run = () => {
      wx.showLoading({ title: '同步中', mask: true })
      parkRequest('/park/enterprise-categories/sync-defaults', { method: 'POST' })
        .then((ret) => {
          const major = (ret.data && ret.data.major_count) || 0
          const minor = (ret.data && ret.data.minor_count) || 0
          wx.showToast({ title: `已同步 ${major} 大类 / ${minor} 小类`, icon: 'none' })
          this.loadTree()
        })
        .catch((err) => wx.showToast({ title: err.message || '同步失败', icon: 'none' }))
        .finally(() => wx.hideLoading())
    }

    wx.showModal({
      title: '同步标准分类',
      content: '将自动建表（如需要）并写入 6 个健康服务大类及其小类，可重复执行',
      success: (res) => {
        if (res.confirm) run()
      },
    })
  },

  loadTree() {
    this.setData({ loading: true })
    parkRequest('/park/enterprise-categories', { data: { tree: 1 } })
      .then((res) => {
        const majors = (res.data.list || []).map((m) => ({
          ...m,
          statusText: m.status === 1 ? '启用' : '停用',
          children: (m.children || []).map((c) => ({
            ...c,
            statusText: c.status === 1 ? '启用' : '停用',
          })),
        }))
        this.setData({ majors, loading: false })
        if (!majors.length) {
          wx.showModal({
            title: '尚未配置分类',
            content: '检测到分类为空或未初始化，是否立即同步标准 6 大类？',
            success: (r) => {
              if (r.confirm) this.onSyncDefaults()
            },
          })
        }
      })
      .catch((err) => {
        this.setData({ loading: false, majors: [] })
        const msg = err.message || '加载失败'
        if (msg.indexOf('未初始化') !== -1 || msg.indexOf('不存在') !== -1 || msg.indexOf('503') !== -1) {
          wx.showModal({
            title: '需要初始化分类表',
            content: '数据库还没有企业分类表。点确定将自动建表并写入标准 6 大类。',
            success: (r) => {
              if (r.confirm) this.onSyncDefaults()
            },
          })
          return
        }
        wx.showToast({ title: msg, icon: 'none' })
      })
  },

  onToggleExpand(e) {
    const id = Number(e.currentTarget.dataset.id)
    this.setData({ expandedId: this.data.expandedId === id ? 0 : id })
  },

  onAddMajor() {
    this.setData({
      showForm: true,
      editingId: '',
      formName: '',
      formSort: (this.data.majors.length + 1) * 10,
      formStatus: 1,
      formParentId: null,
      formParentName: '一级大类',
    })
  },

  onAddMinor(e) {
    const { id, name } = e.currentTarget.dataset
    const major = this.data.majors.find((m) => m.id === id)
    this.setData({
      showForm: true,
      editingId: '',
      formName: '',
      formSort: ((major && major.children.length) || 0) + 1,
      formStatus: 1,
      formParentId: id,
      formParentName: name,
      expandedId: id,
    })
  },

  onEdit(e) {
    const { id, parentId, name, sort, status, parentName } = e.currentTarget.dataset
    this.setData({
      showForm: true,
      editingId: id,
      formName: name,
      formSort: Number(sort || 0),
      formStatus: Number(status),
      formParentId: parentId ? Number(parentId) : null,
      formParentName: parentName || '一级大类',
    })
  },

  onFormInput(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value })
  },

  onFormStatusChange(e) {
    this.setData({ formStatus: Number(e.detail.value) })
  },

  onCancelForm() {
    this.setData({ showForm: false })
  },

  onSaveForm() {
    if (this.data.submitting) return
    const name = (this.data.formName || '').trim()
    if (!name) {
      wx.showToast({ title: '请输入名称', icon: 'none' })
      return
    }

    const data = {
      name,
      parent_id: this.data.formParentId || null,
      sort_order: Number(this.data.formSort || 0),
      status: this.data.formStatus,
    }

    const req = this.data.editingId
      ? parkRequest(`/park/enterprise-categories/${this.data.editingId}`, { method: 'PUT', data })
      : parkRequest('/park/enterprise-categories', { method: 'POST', data })

    this.setData({ submitting: true })
    req
      .then(() => {
        wx.showToast({ title: '已保存', icon: 'success' })
        this.setData({ showForm: false })
        this.loadTree()
      })
      .catch((err) => wx.showToast({ title: err.message || '保存失败', icon: 'none' }))
      .finally(() => this.setData({ submitting: false }))
  },

  onToggleStatus(e) {
    const { id, status, name, sort, parentId } = e.currentTarget.dataset
    const next = Number(status) === 1 ? 0 : 1
    parkRequest(`/park/enterprise-categories/${id}`, {
      method: 'PUT',
      data: {
        name,
        parent_id: parentId ? Number(parentId) : null,
        sort_order: Number(sort || 0),
        status: next,
      },
    })
      .then(() => this.loadTree())
      .catch((err) => wx.showToast({ title: err.message || '操作失败', icon: 'none' }))
  },

  onDelete(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: '若已被企业使用将无法删除，可改为停用',
      success: (res) => {
        if (!res.confirm) return
        parkRequest(`/park/enterprise-categories/${id}`, { method: 'DELETE' })
          .then(() => {
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadTree()
          })
          .catch((err) => wx.showToast({ title: err.message || '删除失败', icon: 'none' }))
      },
    })
  },
})
