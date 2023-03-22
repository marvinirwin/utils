import {encode, decode} from 'gpt-3-encoder';
import * as fs from "fs";
import {getChatGPTResult} from "./lib.js";
import * as readline from "readline";

interface Subtitle {
    id: number;
    startTime: number;
    endTime: number;
    text: string;
}

function parseSrtFile(filename: string): Subtitle[] {
    const srtData: string = fs.readFileSync(filename, "utf8");
    const srtArray: string[] = srtData.trim().split("\n\n");
    const subtitles: Subtitle[] = [];

    for (const srt of srtArray) {
        const parts: string[] = srt.split("\n");

        const id: number = parseInt(parts[0]);
        const times: string[] = parts[1].split(" --> ");
        const startTime: number = timeToMilliseconds(times[0]);
        const endTime: number = timeToMilliseconds(times[1]);
        const text: string = parts.slice(2).join("\n");

        subtitles.push({
            id,
            startTime,
            endTime,
            text,
        });
    }

    return subtitles;
}

function timeToMilliseconds(time: string): number {
    const parts: number[] = time.split(/[:,]/).map((part) => parseInt(part));
    return (
        parts[0] * 3600000 + // hours
        parts[1] * 60000 + // minutes
        parts[2] * 1000 + // seconds
        parts[3] // milliseconds
    );
}

async function readSubtitles(filePath: string): Promise<any[]> {
    const subtitles = parseSrtFile(filePath)
    return subtitles.map(subtitle => ({text: subtitle.text, endTime: subtitle.endTime, startTime: subtitle.startTime}));
}

async function splitSubtitles(subtitles: string[], chunkSize: number): Promise<string[]> {
    const chunks: number[][] = [];
    let currentChunk: number[] = [];
    for (const subtitle of subtitles) {
        const tokenizedSubtitle = encode(subtitle);
        if (currentChunk.length + tokenizedSubtitle.length >= chunkSize) {
            chunks.push(currentChunk);
            currentChunk = tokenizedSubtitle;
        } else {
            currentChunk.push(...tokenizedSubtitle);
        }
    }
    chunks.push(currentChunk);
    return chunks.map(decode);
}


async function main() {
    const filePath = `/Users/marvinirwin/Downloads/[English (auto-generated)] David Anthony_ The origin of Indo-Europeans [DownSub.com].srt`;
    const videoTopic = 'genetics and archeology';
    const subtitles = await readSubtitles(filePath);
    const chunks = await splitSubtitles(subtitles.map(subTitleObject => JSON.stringify(subTitleObject)), 4096 * (1 / 2));

    const generateSummaries = async (numSections: number): Promise<any[]> => {
        const summaries: any[] = [];
        const errors: string[] = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            let prompt = `
            Respond to all the following requests using JSON of this type {"startTime": number, "endTime": number, "text": string}[] and NO OTHER TEXT
            The following are subtitles from a video as javascript objects.  Can you combine and summarize each subtitle into ${numSections} sections as best you can while keeping in mind these summaries will be used to generate YouTube chapters for a video about ${videoTopic}, while keeping track of which content is contained in which timestamp.
      ${chunk}`;
            const summary = await getChatGPTResult(prompt);
            try {
                const s = JSON.parse(summary);
                summaries.push(s);
            } catch (e) {
                errors.push(summary);
                console.error(prompt)
                console.error(summary)
            }
        }

        console.log(`Generated ${numSections} sections:`);
        console.log(summaries);

        // Prompt user to check if the number of sections is acceptable
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question('Are you satisfied with the number of sections? (yes/no): ', (answer) => {
                rl.close();
                if (answer.trim().toLowerCase() === 'yes') {
                    resolve(summaries);
                } else {
                    resolve(generateSummaries(numSections + 1));
                }
            });
        });
    };

    const finalSummaries = await generateSummaries(5);
    fs.writeFileSync(`${filePath.replace('.srt', '')}-summary.json`, JSON.stringify(finalSummaries));
}

main().catch(console.error);