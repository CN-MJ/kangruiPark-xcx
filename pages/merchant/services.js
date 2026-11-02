const { merchantRequest } = require('../../utils/request')
const merchantAuth = require('../../utils/merchantAuth')
const {
  chooseServiceImages,
  uploadLocalServiceImages,
  SERVICE_MAX_COUNT,
} = require('../../utils/upload')
const { resolveMediaList } = require('../../utils/media')

Page({
  data: {
    list: [],
    loading: true,
    showForm: false,
    editingId: 0,
    form: {
      name: '',
      summary: '',
      description: '',
      price_text: '',
      status: 1,
      images: [],
      displayImages: [],
    },
    maxImages: SERVICE_MAX_COUNT,
    submitting: false,
  },

  onShow() {
    if (!merchantAuth.isMerchantLoggedIn()) {
      wx.redirectTo({ url: '/pages/merchant/login' })
      return
    }
    this.loadList()
  },

  loadList() {
    this.setData({ loading: true })
    merchantRequest('/merchant/services')
      .then((res) => {
        this.setData({
          list: (res.data && res.data.list) || [],
          loading: false,
        })
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  openCreate() {
    this.setData({
      showForm: true,
      editingId: 0,
      form: {
        name: '',
        summary: '',
        description: '',
        price_text: '',
        status: 1,
        images: [],
        displayImages: [],
      },
    })
  },

  openEdit(e) {
    const id = Number(e.currentTarget.dataset.id)
    const item = this.data.list.find((i) => i.id === id)
    if (!item) return
    const remote = resolveMediaList(item.images || (item.cover ? [item.cover] : []))
    this.setData({
      showForm: true,
      editingId: id,
      form: {
        name: item.name || '',
        summary: item.summary || '',
        description: item.description || '',
        price_text: item.price_text === '面议' ? '' : (item.price_text || ''),
        status: item.status,
        images: item.images || [],
        displayImages: remote,
      },
    })
  },

  closeForm() {
    this.setData({ showForm: false })
  },

  preventMove() {},

  onField(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onToggleStatusInForm() {
    this.setData({ 'form.status': this.data.form.status === 1 ? 0 : 1 })
  },

  onAddImages() {
    const current = this.data.form.images || []
    chooseServiceImages(current.length, SERVICE_MAX_COUNT)
      .then((paths) => {
        if (!paths.length) return
        const nextImages = current.concat(paths)
        const nextDisplay = (this.data.form.displayImages || []).concat(paths)
        this.setData({
          'form.images': nextImages.slice(0, SERVICE_MAX_COUNT),
          'form.displayImages': nextDisplay.slice(0, SERVICE_MAX_COUNT),
        })
      })
      .catch((err) => wx.showToast({ title: err.message || '选图失败', icon: 'none' }))
  },

  onRemoveImage(e) {
    const index = Number(e.currentTarget.dataset.index)
    const images = (this.data.form.images || []).slice()
    const display = (this.data.form.displayImages || []).slice()
    images.splice(index, 1)
    display.splice(index, 1)
    this.setData({ 'form.images': images, 'form.displayImages': display })
  },

  onSubmit() {
    if (this.data.submitting) return
    const { form, editingId } = this.data
    if (!form.name.trim()) {
      wx.showToast({ title: '请填写服务名称', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '保存中', mask: true })

    uploadLocalServiceImages(form.images || [], { mode: 'merchant' })
      .then((paths) => {
        const payload = {
          name: form.name.trim(),
          summary: (form.summary || '').trim() || null,
          description: (form.description || '').trim() || null,
          price_text: (form.price_text || '').trim() || null,
          images: paths.slice(0, SERVICE_MAX_COUNT),
          status: form.status,
        }
        return editingId
          ? merchantRequest(`/merchant/services/${editingId}`, { method: 'PUT', data: payload })
          : merchantRequest('/merchant/services', { method: 'POST', data: payload })
      })
      .then(() => {
        wx.showToast({ title: editingId ? '已保存' : '已发布', icon: 'success' })
        this.setData({ showForm: false })
        this.loadList()
      })
      .catch((err) => wx.showToast({ title: err.message || '保存失败', icon: 'none' }))
      .finally(() => {
        wx.hideLoading()
        this.setData({ submitting: false })
      })
  },

  onToggleShelf(e) {
    const { id, status } = e.currentTarget.dataset
    const next = Number(status) === 1 ? 0 : 1
    merchantRequest(`/merchant/services/${id}/status`, {
      method: 'PATCH',
      data: { status: next },
    })
      .then(() => {
        wx.showToast({ title: next === 1 ? '已上架' : '已下架', icon: 'success' })
        this.loadList()
      })
      .catch((err) => wx.showToast({ title: err.message || '操作失败', icon: 'none' }))
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除服务',
      content: '确认删除该服务？访客将无法再预约。',
      success: (res) => {
        if (!res.confirm) return
        merchantRequest(`/merchant/services/${id}`, { method: 'DELETE' })
          .then(() => {
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadList()
          })
          .catch((err) => wx.showToast({ title: err.message || '删除失败', icon: 'none' }))
      },
    })
  },
})
