import { cloneDeep } from 'lodash'

/**
 * @params requestList
 * @params limit
 * @return Promise[]
 * 处理一次性发多个请求造成页面卡顿问题
 * 提供取消发送功能
 * * */
export function promiseScheduler(arr: any, limit: number) {
	console.log('循环调度开始')
	const _arr = cloneDeep(arr)
	const len = _arr.length
	let counter = 0
	
	return new Promise((res, rej) => {
		const result: Promise<any>[] = []
		const processRequest = (req: () => Promise<any>, index: number) => {
			req().then((r) => {
				result[index] = r
			}).catch((e) => {
				if (e === 'cancel') {
					counter = 1
					_arr.length = 0
					console.log('用户取消发送')
					rej()
				}
			}).finally( () => {
				counter--
				if (counter === 0 && _arr.length === 0) {
					console.log('循环调度结束')
					res(result)
				} else {
					scheduleNextRequest()
				}
			})
		}
		const scheduleNextRequest = () => {
			while (counter < limit && _arr.length > 0) {
				counter++
				const request = _arr.shift()!
				const currentIndex = len - _arr.length - 1
				console.log('下标为' + _arr.length + '开始执行')
				processRequest(request, currentIndex)
			}
		}
		scheduleNextRequest()
	})
}
