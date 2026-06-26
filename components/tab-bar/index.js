Component({
  properties: {
    active: {
      type: String,
      value: 'index',
    },
  },

  methods: {
    onTap(e) {
      const { tab } = e.currentTarget.dataset
      if (tab === this.data.active) return

      if (tab === 'index') {
        wx.redirectTo({ url: '/pages/index/index' })
        return
      }

      if (tab === 'mine') {
        wx.redirectTo({ url: '/pages/mine/index' })
      }
    },
  },
})
