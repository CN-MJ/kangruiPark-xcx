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
      if (!base) return value
      const baseHost = base.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0].toLowerCase()
      // localhost / 同域 / 本站 storage 的 http 地址改到当前配置的 https
      const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
      const isSameHost = host === baseHost
      const isOurStorage = path.indexOf('/storage/uploads/') === 0 && (isSameHost || isLocalHost || matched[1] === 'http')
      if (isLocalHost || isSameHost || isOurStorage) {
        return `${base}${path}`
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

/** 开发者工具临时文件是 http://tmp/...，真机多半是 wxfile://。 */
function isLocalImagePath(src) {
  const value = src == null ? '' : String(src).trim()
  if (!value) return false
  if (value.indexOf('wxfile://') !== -1) return true
  if (value.indexOf('://tmp/') !== -1) return true
  if (value.indexOf('://usr/') !== -1) return true
  if (value.indexOf('http://') === 0 || value.indexOf('https://') === 0) return false
  return true
}

/** 网络图片先下载到本地再显示，避免 image 组件被 downloadFile 域名拦住。 */
function shouldMaterialize(src) {
  const url = resolveMediaUrl(src)
  return isRemoteHttpUrl(url)
}

function cacheKeyForUrl(url) {
  return String(url || '').replace(/[^\w.-]+/g, '_').slice(-120)
}

/**
 * 真机预览时 <image> 常拦局域网 HTTP；用已通的 wx.request 拉到本地再显示。
 */
function logImage(step, extra) {
  console.log('[图片]', step, extra || '')
}

function materializeMediaUrl(src) {
  const url = resolveMediaUrl(src)
  logImage('准备下载', { raw: src, url })
  if (!url) {
    logImage('地址为空，跳过', { raw: src })
    return Promise.resolve('')
  }
  if (!isRemoteHttpUrl(url)) {
    logImage('不是网络地址，直接使用', { url })
    return Promise.resolve(url)
  }
  if (localCache[url]) {
    logImage('使用已下载的本地文件', { url, file: localCache[url] })
    return Promise.resolve(localCache[url])
  }

  return new Promise((resolve) => {
    const finishLocal = (filePath, via) => {
      if (!filePath) {
        logImage('没有本地文件，页面不会显示这张图', { url, via })
        resolve('')
        return
      }
      localCache[url] = filePath
      logImage('下载成功', { url, via, file: filePath })
      resolve(filePath)
    }

    const viaRequest = () => {
      logImage('downloadFile 未成功，改用 request 下载', { url })
      wx.request({
        url,
        method: 'GET',
        responseType: 'arraybuffer',
        timeout: 30000,
        success(res) {
          const bytes = res.data
          const size = bytes && bytes.byteLength ? bytes.byteLength : 0
          logImage('request 返回', { url, status: res.statusCode, bytes: size })
          if (res.statusCode < 200 || res.statusCode >= 300 || size < 32) {
            logImage('request 内容不是图片', { url, status: res.statusCode, bytes: size })
            resolve('')
            return
          }
          try {
            const extMatch = url.match(/\.(jpe?g|png|webp|gif)(\?|$)/i)
            const ext = extMatch ? `.${extMatch[1].toLowerCase().replace('jpeg', 'jpg')}` : '.jpg'
            const filePath = `${wx.env.USER_DATA_PATH}/media_${cacheKeyForUrl(url)}${ext}`
            wx.getFileSystemManager().writeFile({
              filePath,
              data: bytes,
              success() { finishLocal(filePath, 'request') },
              fail(err) {
                logImage('写入本地失败', { url, err: err && err.errMsg })
                resolve('')
              },
            })
          } catch (e) {
            logImage('写入本地异常', { url, err: e && e.message })
            resolve('')
          }
        },
        fail(err) {
          logImage('request 失败', { url, err: err && err.errMsg })
          resolve('')
        },
      })
    }

    wx.downloadFile({
      url,
      timeout: 30000,
      success(res) {
        logImage('downloadFile 返回', { url, status: res.statusCode, file: res.tempFilePath || '' })
        if (res.statusCode !== 200 || !res.tempFilePath) {
          viaRequest()
          return
        }
        wx.getFileInfo({
          filePath: res.tempFilePath,
          success(info) {
            logImage('downloadFile 文件大小', { url, size: info.size })
            if (info.size > 32) finishLocal(res.tempFilePath, 'downloadFile')
            else viaRequest()
          },
          fail(err) {
            logImage('读取临时文件失败', { url, err: err && err.errMsg })
            viaRequest()
          },
        })
      },
      fail(err) {
        logImage('downloadFile 失败', { url, err: err && err.errMsg })
        viaRequest()
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
  isLocalImagePath,
  shouldMaterialize,
}
