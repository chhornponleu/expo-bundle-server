import { getConfig } from '@expo/config';

// --> export configs
export function getExpoConfig() {
    const projectDir = process.cwd();
    const { exp } = getConfig(projectDir, {
        skipSDKVersionRequirement: true,
        isPublicConfig: true,
    });
    return exp;
}


