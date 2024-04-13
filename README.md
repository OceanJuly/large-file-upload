# React 大文件上传实现前端部分

![Alt](https://github.com/OceanJuly/large-file-upload-react/blob/master/public/upload.png)

### 实现细节
#### 计算文件 hash
使用 spark-md5 插件计算文件 `hash` 值， hash 计算比较费时，在主线程调用计算`hash`函数可能会导致页面卡顿，把计算函数丢到 `WebWorker` 执行，计算完成在返回给主线程。
#### 显示上传进度
原生的有 `XHR` 和 `Fetch`，只有 `XHR` 才有进度监控功能，所以只能用 `XHR` 或者通过 `XHR` 封装的第三方请求插件，我这里使用原生 `XHR` 实现

> 问题: 在控制显示进度时候，如果在上传过程中点击暂停上传再重新上传，会导致进度条回退一小部分

总进度条是根据所有切片的上传进度计算而来，点击暂停会取消并清空切片的 xhr 请求，此时如果已经上传了一部分，就会发现文件进度条有倒退的现象
我们需要创建一个“假”的进度条，这个假进度条基于文件进度条，但只会停止和增加，然后给用户展示这个假的进度条：
```ts
const totalPercent = useMemo(() => {
	if (!chunks.length) return 0
	const loadData = chunks
		.map((chunk) => chunk.size * chunk.progress)
		.reduce((acc, cur) => acc + cur)
	const percent = parseInt((loadData / file.current.fileSize).toFixed(2))
	if (percent > file.current.lastUploadPercent) {
		file.current.lastUploadPercent = percent
		return percent
	} else return file.current.lastUploadPercent
}, [chunks])
```

#### 文件分片
把文件转化成 `Blob` 对象，并执行 `Blob.prototype.slice` 方法进行切片

#### 并发上传
自定义实现一个`Promise`调度器，处理一次性发多个请求造成页面卡顿问题，[代码](https://github.com/OceanJuly/large-file-upload-react/blob/master/src/utils/requestPool.ts)