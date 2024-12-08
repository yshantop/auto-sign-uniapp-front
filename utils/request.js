export const BASE_URL = 'https://web-production-9731d.up.railway.app'

// 将对象转换为URL查询字符串
function objectToQueryString(obj) {
  return Object.keys(obj)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
    .join('&')
}

function request(options = {}) {
  return new Promise((resolve, reject) => {
    // 处理请求URL
    let url = /^(http|https):\/\//.test(options.url) 
      ? options.url 
      : BASE_URL + options.url
      
    // 处理查询参数
    if (options.params) {
      const queryString = objectToQueryString(options.params)
      url = `${url}${queryString ? '?' + queryString : ''}`
    }
    
    // 处理请求头
    const token = uni.getStorageSync('token')
    const header = {
      'Content-Type': 'application/json;charset=UTF-8',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.header
    }
    
    // 从data中移除token，统一使用header传递
    const data = options.data
    if (data && data.token) {
      delete data.token
    }
    
    // 发起请求
    uni.request({
      url,
      method: options.method || 'GET',
      data,
      header,
      success: (res) => {
        const { statusCode, data } = res
        
        // 处理HTTP状态码
        if (statusCode === 200) {
          // 处理业务状态码
          if (data.code === 200) {
            resolve(data)
          } else if (data.code === 401) {
            // token过期，尝试重新登录
            const userInfo = uni.getStorageSync('userInfo')
            if (userInfo) {
              // 尝试使用保存的登录信息重新登录
              request({
                url: '/api/login',
                method: 'POST',
                data: {
                  loginAccount: userInfo.loginAccount,
                  password: userInfo.password,
                  enrollmentYear: userInfo.enrollmentYear
                }
              }).then(loginRes => {
                // 更新token
                uni.setStorageSync('token', loginRes.token)
                // 重试原请求
                request(options).then(resolve).catch(reject)
              }).catch(() => {
                // 重新登录失败，清除信息并跳转登录页
                uni.removeStorageSync('token')
                uni.removeStorageSync('userInfo')
                uni.showToast({
                  title: '登录已过期，请重新登录',
                  icon: 'none'
                })
                setTimeout(() => {
                  uni.reLaunch({
                    url: '/pages/login/login'
                  })
                }, 1500)
                reject(new Error('登录已过期'))
              })
            } else {
              // 没有保存的登录信息，直接跳转登录页
              uni.removeStorageSync('token')
              uni.showToast({
                title: '登录已过期，请重新登录',
                icon: 'none'
              })
              setTimeout(() => {
                uni.reLaunch({
                  url: '/pages/login/login'
                })
              }, 1500)
              reject(new Error('登录已过期'))
            }
          } else {
            reject(new Error(data.msg || '请求失败'))
          }
        } else {
          reject(new Error(`HTTP错误：${statusCode}`))
        }
      },
      fail: (err) => {
        reject(new Error('网络请求失败'))
      }
    })
  })
}

export default request