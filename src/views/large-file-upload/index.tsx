import { Button, Progress, Table, TableProps } from 'antd'
import { ChunkProps, ChunksData, fileProps, tableProps } from './interface'
import { ChangeEvent, useMemo, useRef, useState } from 'react'
import { mergeFile, verifyFile } from '@/apis/upload'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import Md5Worker from './md5Worker.js'
import WorkerBuilder from '@/utils/worker-build'
import { promiseScheduler } from '@/utils/requestPool'

const CHUNK_SIZE: number = 10 * 1024 * 1024
const columns: TableProps<tableProps>['columns'] = [
    {
        title: 'hash',
        dataIndex: 'hash',
        key: 'hash',
        render: (text: string) => <a>{text}</a>,
    },
    {
        title: 'size(KB)',
        dataIndex: 'size',
        key: 'size',
    },
    {
        title: 'progress',
        dataIndex: 'progress',
        key: 'progress',
        render: (_, { progress }) => (
          <Progress percent={progress}></Progress>
        )
    }
]

function LargeFileUpload() {
    const file = useRef<fileProps>({
        name: '',
        hash: '',
        fileSize: 0,
        requestList: []
    })
    const [hashPercent, setHashPercent] = useState<number>(0)
    const [chunks, setChunks] = useState<ChunkProps[]>([])
    const [requestList, setRequestList] = useState<XMLHttpRequest[]>([])

    // 获取文件后缀名
    function getFileSuffix(name: string) {
        const arr = name.split('.')
        if (!arr.length) return ''
        else return arr[arr.length - 1]
    }

    // 选择文件
    async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        const _fs: FileList | null = e.target.files
        if (!_fs?.length) return
        // 清除之前数据
        clearData()
        const tar: File = _fs[0]
        // 保存文件名
        file.current.name = tar.name
        file.current.fileSize = tar.size
        // 文件切片
        const blobs = createFileChunk(tar)
        // 计算hash
        const hash = await calculateHash(blobs)
        file.current.hash = hash
        console.log('hash计算结束: ', hash)
        setChunks(blobs.map((blob: Blob, index: number) => {
            return {
                chunk: blob,
                hash: `${hash}-${index}`,
                size: CHUNK_SIZE,
                progress: 0
            }
        }))
    }

    function clearData() {
        setHashPercent(0)
    }

    // 拆分文件
    function createFileChunk(file: File) {
        const fileChunks: Blob[] = []
        let cur: number = 0
        while (cur * CHUNK_SIZE < file.size) {
            const start: number = cur * CHUNK_SIZE
            fileChunks.push(file.slice(start, start + CHUNK_SIZE))
            cur++
        }
        return fileChunks
    }

    // 计算 chunk hash
    function calculateHash(chunks: Blob[]): Promise<string> {
        return new Promise(resolve => {
            const worker = new WorkerBuilder(Md5Worker)
            worker.postMessage(chunks)
            worker.onmessage = (e: MessageEvent) => {
                const { percentAge, hash } = e.data
                console.log(percentAge)
                setHashPercent(percentAge)
                if (hash) resolve(hash)
            }
        })
    }

    async function uploadChunks(chunksData: ChunksData[], hash: string) {
        const formDataList = chunksData.map((item) => {
            const { chunk, hash } = item
            const formData = new FormData()
            formData.append('chunk', chunk)
            formData.append('hash', hash)
            formData.append('suffix', getFileSuffix(file.current.name))
            return formData
        })
        console.log('formDataList: ', formDataList)
        const _r: any = formDataList.map((formData: FormData) => {
            return () => {
                return new Promise((resolve, reject) => {
                    const xhr: any = new XMLHttpRequest()
                    xhr.open('post', 'http://localhost:3000/upload/uploadChunks')
                    xhr.upload.onprogress = e => {
                        const hash = formData.get('hash')
                        const list: ChunkProps[] = [...chunks]
                        const i = list.findIndex((item) => item.hash === hash)
                        list[i].progress = parseInt(String((e.loaded / e.total) * 100))
                        setChunks(list)
                    }
                    xhr.send(formData)
                    xhr.onabort = () => {
                        reject('cancel')
                    }
                    xhr.onload = (e) => {
                        // 将请求成功的 xhr 从列表中删除
                        const arr: XMLHttpRequest[] = file.current.requestList = file.current.requestList.filter((item) => item !== xhr)
                        setRequestList(arr)
                        resolve({
                            data: e.target!.response,
                        })
                    }
                    // 暴露当前 xhr 给外部
                    const arr: XMLHttpRequest[] = file.current.requestList = file.current.requestList.concat(xhr)
                    setRequestList(arr)
                })
            }
        })
        try {
            const res = await promiseScheduler(_r, 6)
            console.log('调度器结果: ', res)
        } catch (e) {
            return
        }
        await mergeFile(hash, file.current.name, CHUNK_SIZE)
        setRequestList([])
        file.current.requestList = []
    }

    // 开始上传
    async function handleUpload() {
        const { name, hash } = file.current
        if (!name || !chunks.length) return
        const { shouldUpload, uploadedChunks } = await verifyFile(hash, getFileSuffix(name))
        console.log('开始验证文件上传: ', shouldUpload)
        if (!shouldUpload) return
        if (uploadedChunks?.length) {
            const newChunks: ChunkProps[] = chunks.map((chunk: ChunkProps) => {
                const { hash } = chunk
                if (uploadedChunks.includes(hash)) {
                    return {
                        ...chunk,
                        progress: 100
                    }
                } else return chunk
            })
            setChunks(newChunks)
            console.log('已上传的区间：', uploadedChunks)
        }
        const chunksData: ChunksData[] = chunks.map(({ chunk }, index) => ({
            chunk: chunk,
            hash: hash + '-' + index,
            progress: 0
        })).filter((item) => {
            const { hash } = item
            return !uploadedChunks?.includes(hash)
        })
        console.log('未上传的分片: ', chunksData)
        await uploadChunks(chunksData, hash)
    }

    function handlePause() {
        requestList.forEach((xhr: XMLHttpRequest) => xhr.abort())
        setRequestList([])
        file.current.requestList = []
    }

    const totalPercent = useMemo(() => {
        if (!chunks.length) return 0
        const loadData = chunks
          .map((chunk) => chunk.size * chunk.progress)
          .reduce((acc, cur) => acc + cur)
        return parseInt((loadData / file.current.fileSize).toFixed(2))
    }, [chunks])
    
    return (
       <div className="h-[100vh] text-white px-[24px] py-[16px]">
           <input type="file" onChange={handleFileChange} />
           <div className={'flex my-[16px]'}>
               <Button onClick={handleUpload}>upload</Button>
               <Button onClick={handlePause}>pause</Button>
           </div>
           <div className={'mb-[16px] flex text-[black] whitespace-nowrap'}>
               <div className={'w-[240px]'}>calculate chunks hash: </div>
               <Progress percent={hashPercent}></Progress>
           </div>
           <div className={'mb-[16px] flex text-[black] whitespace-nowrap'}>
               <div  className={'w-[240px]'}>upload file: </div>
               <Progress percent={totalPercent}></Progress>
           </div>
           {
               chunks.length
                 ? <Table columns={columns} dataSource={chunks} rowKey={'hash'} />
                 : null
           }
       </div>
    )
}

export default LargeFileUpload