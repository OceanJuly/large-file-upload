import { request } from "./request"

export interface verifyFileRes {
	shouldUpload: boolean,
	uploadedChunks?: string[]
}

export const testApi = <T>() => request.post<T>(`http://127.0.0.1:3000`)

export const verifyFile = (hash: string, suffix: string) => request.post<verifyFileRes>(`/upload/verifyFile`, { hash, suffix })
export const uploadChunk = <T>(formData: FormData) => request.post<T>(`/upload/uploadChunks`, formData)
export const mergeFile = <T>(hash: string, name: string, size: number) => request.post<T>(`/upload/merge`, {
	hash,
	name,
	size
})
