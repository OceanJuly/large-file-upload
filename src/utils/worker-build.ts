export default class WorkerBuilder extends Worker {
	constructor(worker: () => void) {
		const code = worker.toString()
		const blob = new Blob([`(${code})()`])
		const workerURL = URL.createObjectURL(blob)
		// 调用父类 Worker 的构造函数
		super(workerURL)
	}
}