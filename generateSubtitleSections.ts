import {summarizeSubtitles} from "./lib/subtitle/subtitle-utils.js";
import process from 'process';


async function main() {
    const filePath = process.argv[2];
    const videoTopic = process.argv[3];
    await summarizeSubtitles(filePath, videoTopic);
}

main().catch(console.error);