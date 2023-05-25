import filetype from 'magic-bytes.js'
import Compressor from 'compressorjs'

export function GetServerID() {
    const ServerID =
        new URL(window.location.href).searchParams.get('ServerID') ?? ''
    return ServerID
}

export function Base64ToBlob(image: string) {
    const u = Uint8Array.from(atob(image), (c) => c.charCodeAt(0))
    const blob = new Blob([u], { type: filetype(u)[0].mime })
    return blob
}

export function BlobToBase64(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => reject()

        reader.readAsDataURL(blob)
    })
}

export function CompressImage(file: Blob) {
    return new Promise<Blob>((resolve, reject) => {
        new Compressor(file, {
            quality: 0.9,
            mimeType: 'image/webp',
            // The compression process is asynchronous,
            // which means you have to access the `result` in the `success` hook function.
            success(result) {
                resolve(result)
            },
            error(err) {
                console.log(err.message)
                reject(err)
            },
        })
    })
}
