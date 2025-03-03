


export function getIp() {
    const interfaces = require("os").networkInterfaces()
    const values: any[] = Object.values(interfaces).flatMap((value) => value);
    const externalIPv4 = values.filter(
        (value: any) => {
            return value && value.family === "IPv4" && !value.internal
        }
    )
    return externalIPv4?.[0]?.address
}