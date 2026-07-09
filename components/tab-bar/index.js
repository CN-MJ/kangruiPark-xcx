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

      const url = tab === 'index' ? '/pages/index/index' : '/pages/mine/index'
      wx.reLaunch({ url })
    },
  },
})
