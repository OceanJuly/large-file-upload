interface RequestOptions {
	url: string;
	method?: string;
	data?: FormData | string | null;
	headers?: { [key: string]: string };
	onprogress?: (event: ProgressEvent) => void;
	requestList?: any
}

const XHRRequest = ({
	url,
	method = "post",
	data,
	headers = {},
	onprogress,
	requestList = []
}: RequestOptions): Promise<{ data: any }> => {
	return new Promise((resolve) => {
		const xhr: any = new XMLHttpRequest();
		xhr.open(method, url);
		Object.keys(headers).forEach((key) =>
			xhr.setRequestHeader(key, headers[key])
		);
		xhr.upload.onprogress = onprogress;
		xhr.send(data);
		xhr.onload = (e) => {
			// 将请求成功的 xhr 从列表中删除
			// if (requestList) {
			// 	const xhrIdx = requestList.findIndex(item => item === xhr)
			// 	requestList.splice(xhrIdx, 1)
			// }
			resolve({
				data: e.target!.response,
			})
		}
		// 暴露当前 xhr 给外部
		requestList.push(xhr)
	})
}

export default XHRRequest;