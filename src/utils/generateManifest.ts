import * as crypto from 'crypto';
import * as fse from 'fs-extra';
import * as mime from 'mime-types';


export async function generateManifest({
    platform, metaJson, runtimeVersion, expoConfigJson,
    assetBasePath
}: { platform: string, metaJson: any, runtimeVersion?: string, expoConfigJson: any, assetBasePath: string }) {
    function convertSHA256HashToUUID(value = '') {
        return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(
            16,
            20
        )}-${value.slice(20, 32)}`;
    }

    function createHash(file: Buffer, hashingAlgorithm: string, encoding: any) {
        return crypto.createHash(hashingAlgorithm).update(file).digest(encoding);
    }

    function getBase64URLEncoding(base64EncodedString: string) {
        return base64EncodedString.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    if (!['ios', 'android'].includes(platform))
        throw new Error('generateManifest: Invalid platform');

    const createdAt = new Date().toISOString();
    const meta = metaJson.fileMetadata[platform];
    const bundleFile = fse.readFileSync(`./dist/${meta.bundle}`);
    const key = createHash(bundleFile, 'md5', 'hex');
    const assetHash = getBase64URLEncoding(createHash(bundleFile, 'sha256', 'base64'));

    // const metaFileBuffer = await fse.readFile('./dist/metadata.json');
    // const id = createHash(metaFileBuffer, 'sha256', 'hex')
    const id = convertSHA256HashToUUID(
        createHash(Buffer.from(JSON.stringify(metaJson)), 'sha256', 'hex')
    )
    const assets = await Promise.all(
        meta.assets?.map((asset: { path: string; ext: string }) => {
            const file = fse.readFileSync(`./dist/${asset.path}`);
            const key = createHash(file, 'md5', 'hex');
            const assetHash = getBase64URLEncoding(createHash(file, 'sha256', 'base64'));
            return {
                key,
                hash: assetHash,
                fileExtension: `.${asset.ext}`,
                contentType: mime.lookup(asset.ext),
                url: `${assetBasePath}/${asset.path}`, //path.join(assetBasePath, asset.path),
            };
        })
    )
    const launchAsset = {
        key,
        hash: assetHash,
        fileExtension: `.bundle`,
        contentType: 'application/javascript',
        url: `${assetBasePath}/${meta.bundle}`, //path.join(, meta.bundle),
    }
    return {
        id,
        createdAt,
        runtimeVersion,
        assets,
        launchAsset,
        metadata: { mandate: true },
        extra: { expoClient: expoConfigJson, },
    };
}