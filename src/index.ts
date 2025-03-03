// index.js

import fsPromises from 'fs/promises';
import FormData from 'form-data';
import express from "express";
// import mime from 'mime';
import { loggerMiddleware } from "./middlewares/logger.middleware";
import bodyparser from 'body-parser';
import cookieParser from 'cookie-parser';
import serveStatic from 'serve-static';
import fs from 'fs-extra';
import { Command } from 'commander';
import { getIp } from "./get-ip";
import { logQRCode } from "./show-qr";
import { getExpoConfig } from "./utils/getExpoConfigs";
import { generateManifest } from "./utils/generateManifest";
import path from 'path';
import nullthrows from 'nullthrows';

const mime = require('mime');

const ip = getIp();

// Command line arguments
const program = new Command();
program.option('-p, --port <port>', 'Port to run the server on', '3000');
program.option('-d, --dir <dir>', 'Dist directory of expo bundle', 'dist');
program.parse();
const options = program.opts();
const port = options.port || '3000';
const dir = options.dir || 'dist';

// Start app
const app = express();
app.use(loggerMiddleware)
app.use(bodyparser.json());
app.use(cookieParser());
app.use(serveStatic('public'));
app.use('/dist', serveStatic(dir));

app.get("/", async (req, res) => {
    const platform = req.headers['expo-platform'] ?? req.query.platform;
    const runtimeVersion = req.headers['expo-runtime-version'] ?? req.query['runtime-version'];
    const protocolVersionMaybeArray = req.headers['expo-protocol-version'] ?? '1';

    const expoConfigJson = getExpoConfig();

    const metaJson = fs.readJsonSync(`./${dir}/metadata.json`);
    console.log({ metaJson });

    if (platform !== 'ios' && platform !== 'android') {
        res.statusCode = 400;
        res.json({ error: 'No platform provided. Expected "ios" or "android".' });
        return;
    }

    const manifest = await generateManifest({
        platform,
        expoConfigJson,
        metaJson,
        assetBasePath: `http://${ip}:${port}/dist`,
        runtimeVersion: expoConfigJson.runtimeVersion as any,
    })

    // res.json({ manifest });

    const assetRequestHeaders: { [key: string]: object } = {};
    [...manifest.assets, manifest.launchAsset].forEach((asset) => {
        assetRequestHeaders[asset.key] = {
            'test-header': 'test-header-value',
        };
    });
    let signature = null;
    const expectSignatureHeader = req.headers['expo-expect-signature'];


    const form = new FormData();
    form.append('manifest', JSON.stringify(manifest), {
        contentType: 'application/json',
        header: {
            'content-type': 'application/json; charset=utf-8',
            'Content-Disposition': 'form-data; name="manifest"',
            ...(signature ? { 'expo-signature': signature } : {}),
        },
    });
    form.append('extensions', JSON.stringify({ assetRequestHeaders }), {
        contentType: 'application/json',
    });

    res.statusCode = 200;
    res.setHeader('expo-protocol-version', 1);
    res.setHeader('expo-sfv-version', 0);
    res.setHeader('cache-control', 'private, max-age=0');
    res.setHeader('content-type', `multipart/mixed; boundary=${form.getBoundary()}`);
    res.write(form.getBuffer());
    res.end();

});

app.get("/assets", async (req, res) => {
    const { asset: assetName, runtimeVersion, platform } = req.query;

    const metadataJson = fs.readJsonSync(`./${dir}/metadata.json`);

    if (!assetName || typeof assetName !== 'string') {
        res.statusCode = 400;
        res.json({ error: 'No asset name provided.' });
        return;
    }

    if (platform !== 'ios' && platform !== 'android') {
        res.statusCode = 400;
        res.json({ error: 'No platform provided. Expected "ios" or "android".' });
        return;
    }

    // if (!runtimeVersion || typeof runtimeVersion !== 'string') {
    //     res.statusCode = 400;
    //     res.json({ error: 'No runtimeVersion provided.' });
    //     return;
    // }

    let updateBundlePath = `${dir}/`
    const assetPath = path.resolve(updateBundlePath + assetName);
    const assetMetadata = metadataJson.fileMetadata[platform].assets.find(
        (asset: any) => asset.path === assetName.replace(`${updateBundlePath}/`, '')
    );
    const isLaunchAsset =
        metadataJson.fileMetadata[platform].bundle === assetName.replace(`${updateBundlePath}/`, '');

    console.log({ assetPath, assetMetadata, isLaunchAsset, dir, metabundle: metadataJson.fileMetadata[platform].bundle, assetname: assetName.replace(`${updateBundlePath}/`, '') });


    if (!fs.existsSync(assetPath)) {
        res.statusCode = 404;
        res.json({ error: `Asset "${assetName}" does not exist.` });
        return;
    }

    try {
        res.statusCode = 200;
        res.setHeader(
            'content-type',
            isLaunchAsset ? 'application/javascript' : nullthrows(mime.getType(assetMetadata.ext))
        );
        const stream = fs.createWriteStream(assetPath);
        stream.pipe(res);
        // const asset = await fsPromises.readFile(assetPath, null);
        // res.end(asset);
    } catch (error) {
        console.log(error);
        res.statusCode = 500;
        res.json({ error });
    }
});

export function startServer() {
    app.listen(port, () => {

        const hostIp = ip ? `http://${ip}:${port}` : ''

        if (hostIp) {
            logQRCode(hostIp);
        }

        console.log(`Running on port ${port} at ${hostIp?.length ? `and ${hostIp}` : ''}`);
        console.log(`- http://localhost:${port}`)

        hostIp &&
            console.log(`- ${hostIp}`);

        console.log(`Press Ctrl+C to stop`);
    });
}

