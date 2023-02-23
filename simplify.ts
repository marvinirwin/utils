import {getChatGPTResult, getChunkedChatGPTResults} from "./lib.js";
import path from 'path';
import fs from 'fs';

const level = 'HSK3';


const inputDir = process.argv[2];
console.log(`simplifying ${inputDir}`);
(
    async () => {
        const txtFiles = await fs.promises.readdir(inputDir);
        for (const file of txtFiles) {
            if (path.extname(file) === '.txt') {
                const inputPath = path.join(inputDir, file);
                const text = await fs.promises.readFile(inputPath, 'utf8');
                const outputPath = path.join(inputDir, path.parse(file).name + '.json');
                if (fs.existsSync(outputPath)) {
                    continue;
                }
                const results = await getChunkedChatGPTResults(
                    `Please make the following Chinese text use as much grammar and vocabulary from HSK level ${level}.  Don't simplify the characters of any names.`,
                    text,
                    0.5
                ); // assuming this function returns a Promise
                await fs.promises.writeFile(outputPath, JSON.stringify(results, null, '\t'));
            }
        }
    }
)();
