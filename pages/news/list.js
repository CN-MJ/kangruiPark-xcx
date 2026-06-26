const { request } = require('../../utils/request')
const { formatDateTime } = require('../../utils/format')
const nav = require('../../utils/nav')

Page({
  data: {
    list: [],
    loading: true,
    defaultCover: '/images/default-cover.jpg',
  },

  onLoad() {
    this.loadList()
  },

  loadList() {
    request('/news', { data: { type: 'news', per_page: 20 } })
      .then((res) => {
        const list = (res.data.list || []).map((item) => ({
          id: item.id,
          title: item.title,
          cover_image: item.cover_image,
          timeText: formatDateTime(item.publish_time),
          tag: item.is_top ? '置顶' : '园区动态',
        }))
        this.setData({ list, loading: false })
      })
      .catch(() => {
        this.setData({ list: [], loading: false })
      })
  },

  onItemTap(e) {
    const { id } = e.currentTarget.dataset
    nav.go('news_detail', { id })
  },
})
