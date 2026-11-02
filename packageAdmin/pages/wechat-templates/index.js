const { parkRequest } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')

Page({
  data: {
    loading: true,
    templates: [],
    sources: [],
    sourceLabels: [],
    editing: false,
    editKey: '',
    editName: '',
    editDesc: '',
    editTemplateId: '',
    editEnvFallback: '',
    editEnabled: true,
    editFields: [],
    saving: false,
  },

  onShow() {
    if (!parkAuth.canAccessParkAdmin() || !parkAuth.hasPermission('wechat_templates')) {
      wx.showToast({ title: '仅超管可配置', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 400)
      return
    }
    this.loadList()
  },

  onPullDownRefresh() {
    this.loadList().finally(() => wx.stopPullDownRefresh())
  },

  loadList() {
    this.setData({ loading: true })
    return parkRequest('/park/wechat-templates')
      .then((res) => {
        const payload = res.data || {}
        const sources = payload.sources || []
        this.setData({
          templates: payload.templates || [],
          sources,
          sourceLabels: sources.map((s) => s.label),
          loading: false,
        })
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onEdit(e) {
    const key = e.currentTarget.dataset.key
    const tpl = (this.data.templates || []).find((item) => item.key === key)
    if (!tpl) return
    const sources = this.data.sources || []
    const editFields = (tpl.field_map || []).map((row) => {
      const sourceIndex = Math.max(0, sources.findIndex((s) => s.key === row.source))
      return {
        wechat_key: row.wechat_key || '',
        source: sources[sourceIndex] ? sources[sourceIndex].key : (row.source || ''),
        sourceIndex: sourceIndex < 0 ? 0 : sourceIndex,
      }
    })
    this.setData({
      editing: true,
      editKey: tpl.key,
      editName: tpl.name || '',
      editDesc: tpl.description || '',
      editTemplateId: tpl.template_id || '',
      editEnvFallback: tpl.env_fallback_id || '',
      editEnabled: !!tpl.enabled,
      editFields,
    })
  },

  onTemplateIdInput(e) {
    this.setData({ editTemplateId: e.detail.value })
  },

  onEnabledChange(e) {
    this.setData({ editEnabled: !!e.detail.value })
  },

  onAddField() {
    const sources = this.data.sources || []
    const fields = (this.data.editFields || []).slice()
    fields.push({
      wechat_key: '',
      source: sources[0] ? sources[0].key : '',
      sourceIndex: 0,
    })
    this.setData({ editFields: fields })
  },

  onRemoveField(e) {
    const index = Number(e.currentTarget.dataset.index)
    const fields = (this.data.editFields || []).slice()
    fields.splice(index, 1)
    this.setData({ editFields: fields })
  },

  onFieldInput(e) {
    const index = Number(e.currentTarget.dataset.index)
    const prop = e.currentTarget.dataset.prop
    const fields = (this.data.editFields || []).slice()
    if (!fields[index]) return
    fields[index] = { ...fields[index], [prop]: e.detail.value }
    this.setData({ editFields: fields })
  },

  onSourcePick(e) {
    const index = Number(e.currentTarget.dataset.index)
    const sourceIndex = Number(e.detail.value)
    const sources = this.data.sources || []
    const fields = (this.data.editFields || []).slice()
    if (!fields[index]) return
    fields[index] = {
      ...fields[index],
      sourceIndex,
      source: sources[sourceIndex] ? sources[sourceIndex].key : '',
    }
    this.setData({ editFields: fields })
  },

  onCancel() {
    this.setData({ editing: false })
  },

  onSave() {
    if (this.data.saving) return
    const field_map = (this.data.editFields || [])
      .map((row) => ({
        wechat_key: (row.wechat_key || '').trim(),
        source: row.source || '',
      }))
      .filter((row) => row.wechat_key && row.source)

    if (field_map.length === 0) {
      wx.showToast({ title: '请配置至少一条字段', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    parkRequest(`/park/wechat-templates/${this.data.editKey}`, {
      method: 'PUT',
      data: {
        template_id: (this.data.editTemplateId || '').trim(),
        field_map,
        enabled: !!this.data.editEnabled,
      },
    })
      .then((ret) => {
        wx.showToast({ title: ret.msg || '已保存', icon: 'none' })
        this.setData({ editing: false, saving: false })
        this.loadList()
      })
      .catch((err) => {
        this.setData({ saving: false })
        wx.showToast({ title: err.message || '保存失败', icon: 'none' })
      })
  },
})
