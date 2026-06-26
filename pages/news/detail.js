const { request } = require('../../utils/request')
const { formatDateTime } = require('../../utils/format')

Page({
  data: {
    detail: null,
    loading: true,
  },

  onLoad(options) {
    if (!options.id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }
    request(`/news/${options.id}`)
      .then((res) => {
        const detail = {
          ...res.data,
          timeText: formatDateTime(res.data.publish_time),
        }
        this.setData({ detail, loading: false })
        wx.setNavigationBarTitle({ title: '新闻详情' })
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },
})
