/// <reference lib="WebWorker" />

import type {
    ServiceWorkerRequestMessage,
    ServiceWorkerResponseMessage,
} from './src/message'
const _self: ServiceWorkerGlobalScope =
    globalThis.self as unknown as ServiceWorkerGlobalScope

const Log = console.log

const putInCache = async (request, response) => {
    const cache = await caches.open('v1')
    await cache.put(request, response)
}

const cacheFirst = async (request) => {
    Log(request)
    const responseFromCache = await caches.match(request)
    if (responseFromCache) {
        return responseFromCache
    }
    const responseFromNetwork = await fetch(request)
    putInCache(request, responseFromNetwork.clone())
    return responseFromNetwork
}

Log('sw.js')

const PeerId2Message = new Map<string, MessagePort['postMessage']>()
const ClientId2PeerId = new Map<string, string>()

function GetPeerId(clientId: string) {
    const peerId = ClientId2PeerId.get(clientId)
    return peerId
}

function ServiceWorkerResponseMessageToFetchResponse(
    message: ServiceWorkerResponseMessage
) {
    const responseInit = message.response as ResponseInit
    return new Response(message.response.body, responseInit)
}

let order = 0
async function SendMessageToPage(
    clientId: string,
    request: Request
): Promise<Response> {
    const peerId = GetPeerId(clientId)
    if (peerId) {
        const postMessage = PeerId2Message.get(peerId)
        const url = request.url.replace("/p2p-share/webrtc", "")
        const headers = {}
        request.headers.forEach((value, key) => {
            headers[key] = value
        })
        const buffer = await request.arrayBuffer()
        const message: ServiceWorkerRequestMessage = {
            order: order++,
            request: {
                body: ['GET', 'HEAD'].includes(request.method) ? null : buffer,
                cache: request.cache,
                credentials: request.credentials,
                destination: request.destination,
                headers: headers,
                integrity: request.integrity,
                keepalive: request.keepalive,
                method: request.method,
                mode: request.mode,
                redirect: request.redirect,
                referrer: request.referrer,
                referrerPolicy: request.referrerPolicy,
                // signal: request.signal,
                url: url,
            },
        }
        Log(postMessage, message)
        postMessage?.(message, [buffer])

        return new Promise((resolve, reject) => {
            orderMapping[message.order] = (data: any) => {
                resolve(ServiceWorkerResponseMessageToFetchResponse(data))
            }
        })
    }
    return new Promise((resolve, reject) => {
        resolve(
            new Response(null, { status: 400, statusText: 'WebRTC not ready' })
        )
    })
}

function MatchClientId(clientId: string, peerId: string) {
    ClientId2PeerId.set(clientId, peerId)
}

const orderMapping: Record<number, (data: any) => void> = {}

_self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        _self.skipWaiting()
    } else if (event.data.type === 'CREATE_WEBRTC') {
        const peerId = event.data.clientID
        Log('CREATE_WEBRTC', peerId)
        PeerId2Message.set(
            peerId,
            event.ports[0].postMessage.bind(event.ports[0])
        )
    } else if (event.data.type === 'RESPONSE') {
        const message = event.data.payload as ServiceWorkerResponseMessage
        Log('RESPONSE', event.data)
        orderMapping[message.order]?.(message)
    }
})

function RequestByWebRTC(request: Request) {
    const url = new URL(request.url)
}

function IsWebRTCRequest(request: Request) {
    const url = new URL(request.url)
    url.pathname
}

async function PrintAllClient() {
    const list = await _self.clients.matchAll({ type: 'all' })
    list.forEach((client) => {
        console.log(client.id, client.url)
    })
}

async function AutoMatchClientId(clientId: string) {
    const client = await _self.clients.get(clientId)
    if (!client) {
        return
    }
    const peerId = new URL(client.url).searchParams.get('ClientID')

    if (peerId) {
        console.log('match', clientId, peerId)
        MatchClientId(clientId, peerId)
    }
}

_self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url)
    if (url.pathname == '/p2p-share/index2.html') {
        Log('fetch', event.request.url, event)
        event.respondWith(new Response('Hello World!'))
        return
    } else if (url.pathname == '/p2p-share/webrtc/bind') {
        Log('/p2p-share/webrtc/bind')
        const peerId = url.searchParams.get('ClientID')
        if (peerId) {
            MatchClientId(event.clientId, peerId)
            event.respondWith(new Response('BIND'))
        } else {
            event.respondWith(new Response('No ClientID'))
        }
        return
    } else if (url.pathname.startsWith('/p2p-share/webrtc')) {
        Log(event.request.url, 'clientId', event)
        const peerId = url.searchParams.get('ClientID')
        AutoMatchClientId(event.clientId)
        if (peerId) {
            MatchClientId(event.resultingClientId, peerId)
        }
        event.respondWith(
            SendMessageToPage(
                event.clientId ? event.clientId : event.resultingClientId,
                event.request
            )
        )

        // SendMessageToPage(event.clientId, event.request)
        // event.respondWith(new Response('TEST'))
        return
    }
    // event.respondWith(cacheFirst(event.request))
    // event.respondWith(fetch(event.request))
})
