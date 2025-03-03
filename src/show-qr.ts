import QR from 'qrcode-terminal';

export function logQRCode(text: string) {
    QR.generate(text, { small: true }, (qrcode) => {
        console.log(qrcode);
    });
}