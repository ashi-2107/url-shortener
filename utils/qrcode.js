import QRCode from 'qrcode'

export async function generateQrPng(text) {
    return QRCode.toBuffer(text, {
        type: 'png',
        width: 300,
        margin: 2,
    })
}