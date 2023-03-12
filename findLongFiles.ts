import fs from 'fs';
import path from 'path';
import { encode } from 'gpt-3-encoder';

const rootDir = '/Users/marvinirwin/WebstormProjects/epub-finder';

function processFile(filePath: string) {
    const extname = path.extname(filePath);
    if (extname !== '.tx' && extname !== '.tsx') {
        return;
    }

    const fileContents = fs.readFileSync(filePath, 'utf-8');
    const tokens = encode(fileContents);
    const maxTokens = 4096 / 2;
    if (tokens.length > maxTokens) {
        console.log(`${filePath} needs a refactor because it has too many tokens ${tokens.length}`);
    }
}

function processDir(dirPath: string) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            processDir(filePath);
        } else {
            processFile(filePath);
        }
    }
}

processDir(rootDir);