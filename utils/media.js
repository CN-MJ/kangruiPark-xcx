const { SERVER_BASE_URL } = require('./config')

const localCache = Object.create(null)

/**
 * 把相对路径 / localhost 图片地址转成当前配置的可访问 URL
 */
function resolveMediaUrl(src) {
  if (!src || typeof src !== 'string') return ''
  const value = src.trim()
  if (!value) return ''

  // 本地临时文件（选图未上传 / 已落地缓存）
  if (!/^https?:\/\//i.test(value) && !value.startsWith('/') && !value.startsWith('uploads/')) {
    return value
  }

  const base = String(SERVER_BASE_URL || '').replace(/\/$/, '')

  if (/^https?:\/\//i.test(value)) {
    try {
      const matched = value.match(/^(https?):\/\/([^/]+)(\/.*)?$/i)
      if (!matched) return value
      const host = matched[2].split(':')[0].toLowerCase()
      const path = matched[3] || ''
      if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
        return `${base}${path}`
      }
      if (path.indexOf('/storage/') === 0 && base) {
        const baseHost = base.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0].toLowerCase()
        if (baseHost && host !== baseHost) {
          return `${base}${path}`
        }
      }
      return value
    } catch (e) {
      return value
    }
  }

  if (value.indexOf('/storage/') === 0) {
    return `${base}${value}`
  }
  if (value.indexOf('storage/') === 0) {
    return `${base}/${value}`
  }
  if (value.indexOf('uploads/') === 0) {
    return `${base}/storage/${value}`
  }

  return value
}

function resolveMediaList(list) {
  if (!Array.isArray(list)) return []
  return list.map(resolveMediaUrl).filter(Boolean)
}

function isRemoteHttpUrl(src) {
  return typeof src === 'string' && /^https?:\/\//i.test(src.trim())
}

function cacheKeyForUrl(url) {
  return String(url || '').replace(/[^\w.-]+/g, '_').slice(-120)
}

/**
 * 真机预览时 <image> 常拦局域网 HTTP；用已通的 wx.request 拉到本地再显示。
 */
function materializeMediaUrl(src) {
  const url = resolveMediaUrl(src)
  if (!url) return Promise.resolve('')
  if (!isRemoteHttpUrl(url)) return Promise.resolve(url)
  if (localCache[url]) return Promise.resolve(localCache[url])

  return new Promise((resolve) => {
    wx.request({
      url,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 30000,
      success(res) {
        if (res.statusCode < 200 || res.statusCode >= 300 || !res.data) {
          resolve(url)
          return
        }
        try {
          const fs = wx.getFileSystemManager()
          const extMatch = url.match(/\.(jpe?g|png|webp|gif)(\?|$)/i)
          const ext = extMatch ? `.${extMatch[1].toLowerCase().replace('jpeg', 'jpg')}` : '.jpg'
          const filePath = `${wx.env.USER_DATA_PATH}/media_${cacheKeyForUrl(url)}${ext}`
          fs.writeFile({
            filePath,
            data: res.data,
            success() {
              localCache[url] = filePath
              resolve(filePath)
            },
            fail() {
              resolve(url)
            },
          })
        } catch (e) {
          resolve(url)
        }
      },
      fail() {
        resolve(url)
      },
    })
  })
}

function materializeMediaList(list) {
  const arr = Array.isArray(list) ? list : []
  return Promise.all(arr.map((item) => materializeMediaUrl(item)))
}

module.exports = {
  resolveMediaUrl,
  resolveMediaList,
  materializeMediaUrl,
  materializeMediaList,
  isRemoteHttpUrl,
}
