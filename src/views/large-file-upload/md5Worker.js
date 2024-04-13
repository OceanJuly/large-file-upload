const Md5Worker = () => {
	self.importScripts('http://localhost:5173/public/spark-md5.min.js')
	self.onmessage = (e) => {
		const chunkList = e.data
		const spark = new self.SparkMD5.ArrayBuffer()
		let percentAge = 0
		let count = 0
		const loadNext = index => {
			const reader = new FileReader();
			reader.readAsArrayBuffer(chunkList[index])
			reader.onload = event => {
				count++
				spark.append(event.target.result)
				if (count === chunkList.length) {
					self.postMessage({
						percentAge: 100,
						hash: spark.end()
					})
					self.close();
				} else {
					percentAge += (100 / chunkList.length)
					self.postMessage({
						percentAge
					})
					loadNext(count)
				}
			}
		}
		loadNext(count)
	}
}

export default Md5Worker