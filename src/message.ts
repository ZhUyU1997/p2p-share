import { Base64ToBlob } from './util'

export interface ServiceWorkerRequestMessage {
    order: number
    request: Omit<RequestInit, 'body'> & {
        body?: ArrayBuffer | null
        url: string
        destination: RequestDestination
    }
}

export interface WebRTCRequestMessage {
    order: number
    request: Omit<RequestInit, 'body'> & {
        body?: string
        url: string
        destination: RequestDestination
    }
}

export interface ServiceWorkerResponseMessage {
    order: number
    response: Omit<ResponseInit, 'body' | 'headers'> & {
        body?: ArrayBuffer | null
        ok: boolean
        redirected: boolean
        type: ResponseType
        url: string
        headers: Record<string, string>
    }
}

export interface WebRTCResponseMessage {
    order: number
    response: Omit<ResponseInit, 'body' | 'headers'> & {
        body?: string | null
        ok: boolean
        redirected: boolean
        type: ResponseType
        url: string
        headers: Record<string, string>
    }
}

function ArrayBufferToBase64(buffer: ArrayBuffer) {
    var binary = ''
    var bytes = new Uint8Array(buffer)
    var len = bytes.byteLength
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
}

export function ServiceWorkerToWebRTCRequestMessage(
    message: ServiceWorkerRequestMessage
) {
    const output = message as WebRTCRequestMessage
    if (message.request.body) {
        output.request.body = ArrayBufferToBase64(message.request.body)
    }
    return output
}

export function WebRTCToServiceWorkerResponseMessage(
    message: WebRTCResponseMessage
) {
    const output = message as ServiceWorkerResponseMessage

    if (
        message.response.body &&
        message.response.headers['content-type'] !== 'application/json'
    ) {
        output.response.body = Base64ToArrayBuffer(message.response.body)
    }
    return output
}

export function Base64ToArrayBuffer(s: string) {
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer
}

export function WebRTCRequestMessageToFetchRequest(
    message: WebRTCRequestMessage,
    replaceurl?: (url: string) => string
) {
    const requestInit = message.request as RequestInit
    if (message.request.body)
        requestInit.body = Base64ToArrayBuffer(message.request.body)
    if (replaceurl) message.request.url = replaceurl(message.request.url)

    if (requestInit.mode == 'navigate') delete requestInit['mode']
    console.log(requestInit)
    return new Request(message.request.url, requestInit)
}

export function ServiceWorkerResponseMessageToFetchResponse(
    message: ServiceWorkerResponseMessage
) {
    const responseInit = message.response as ResponseInit
    return new Response(message.response.body, responseInit)
}

export async function ResponseToWebRTCRequestMessage(
    order: number,
    response: Response
) {
    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
        headers[key] = value
    })

    const message: WebRTCResponseMessage = {
        order: order++,
        response: {
            headers: headers,
            ok: response.ok,
            redirected: response.redirected,
            status: response.status,
            statusText: response.statusText,
            type: response.type,
            url: response.url,
        },
    }

    if (headers['content-type'] == 'application/json') {
        message.response.body = await response.text()
    } else {
        message.response.body = ArrayBufferToBase64(
            await response.arrayBuffer()
        )
    }

    return message
}
