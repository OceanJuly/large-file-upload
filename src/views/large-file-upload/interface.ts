export interface ChunkProps {
    chunk: Blob,
    hash: string,
    size: number,
    progress: number
}

export interface fileProps {
    name: string,
    hash: string,
    fileSize: number,
    requestList: XMLHttpRequest[]
}

export interface ChunksData {
    chunk: Blob,
    hash: string,
    progress: number
}

export interface tableProps {
    hash: string,
    size: number,
    progress: number
}