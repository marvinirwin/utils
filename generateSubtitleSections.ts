import {encode, decode} from 'gpt-3-encoder';
import * as fs from "fs";
import {getChatGPTResult} from "./lib.js";
import * as readline from "readline";
import lodash from "lodash";


interface Subtitle {
    startTime: number;
    endTime: number;
    text: string;
}

interface Summary {
    "startTime": number
    "endTime": number,
    "text": string
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

function convertToJSONArray<T>(jsonString: string): T[] {
    const jsonArray: any[] = [];

    // Check if the string is empty or null
    if (!jsonString || jsonString.trim() === '') {
        return jsonArray;
    }

    // Split the string by }{ to create an array of objects
    const objectsArray = jsonString.split('}{');

    // Add the opening and closing curly braces to the first and last objects
    // Loop through each object and parse it as JSON, then add it to the array
    for (let objStr of objectsArray) {
        if (!objStr.startsWith('{')) {
            objStr = `{${objStr}`;
        }
        if (!objStr.endsWith('}')) {
            objStr = `${objStr}}`;
        }
        const obj = JSON.parse(`${objStr}`);
        jsonArray.push(obj);
    }

    return jsonArray;
}

function formatDuration(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const remainingSeconds = totalSeconds % 3600;
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');

    if (hours > 0) {
        return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    } else {
        return `${formattedMinutes}:${formattedSeconds}`;
    }
}

async function main() {
    const filePath = `/Users/marvinirwin/PycharmProjects/pythonProject/The prehistoric genetic roots of the Chinese.srt`;
    const videoTopic = 'genetics and archeology';
    const subtitles = await readSubtitles(filePath);

    const generateSummaries = async (
        summaryTargetFraction: number,
        inputSummaries: Summary[]
    ): Promise<Summary[]> => {
        const chunks: string[] = await splitSubtitles(
            inputSummaries
                .map(subTitleObject => JSON.stringify(subTitleObject)),
            8090 * (1 / 7)
        );

        const processChunk = async (chunk: Summary[], index: number): Promise<{ summaries: Summary[]; errors: string[] }> => {
            console.log(`${index}/${chunks.length}`);
            const summaryTarget = Math.floor(chunk.length * summaryTargetFraction) + 1;
            console.log(`Summaries: ${chunk.length}, Target: ${summaryTarget}`);
            let prompt = `
            Can you merge these subtitles and summarize them so that the word count of the new summary is 80% of the word count from the original subtitles.  The subtitles should be summarized into at or under ${summaryTarget} summaries as best you can.  When the subtitles are summarized their start and end time should come from the first and last source subtitles. Keep in mind these summaries will be used to generate YouTube chapters for a video about ${videoTopic} using this format for input: [{"startTime": 1, "endTime": 1000, "text": "Hi my name is John"},{"startTime": 1001, "endTime": 2000, "text": "I'm a geneticist"},{"startTime": 2001, "endTime": 3000, "text": "I like icecream and pizza"}] and this ONLY this format for output: [{"startTime": 1, "endTime": 2000, "text": "Introducing John"}, {"startTime": 2001, "endTime": 3000, "text": "John's favorite foods"}].  Your response should be fully valid JSON accepted by the JSON.parse function
            
            ${JSON.stringify(chunk)}
            `;
            const summary = await getChatGPTResult(prompt);
            try {
                const s = JSON.parse(summary);
                return { summaries: s, errors: [] };
            } catch (e) {
                console.error(prompt);
                console.error(summary);
                const r = await getChatGPTResult("Why aren't you following the output format I provided?");
                console.log(r);
                return { summaries: [], errors: [summary] };
            }
        };

        const promises = chunks.map((chunk, index) => processChunk(convertToJSONArray(chunk), index));
        const results = await Promise.all(promises);

        const summaries: Summary[] = [];
        const errors: string[] = [];

        results.forEach((result) => {
            summaries.push(...result.summaries);
            errors.push(...result.errors);
        });

        console.log(`Generated ${summaries.length} sections:`);
        console.log(summaries);

        // Prompt user to check if the number of sections is acceptable
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question(`Are you satisfied with these ${summaries.length} of summaries? (yes/no): `, (answer) => {
                rl.close();
                if (answer.trim().toLowerCase() === 'yes') {
                    resolve(summaries);
                } else {
                    resolve(generateSummaries(summaryTargetFraction, summaries));
                }
            });
        });
    };
    const finalSummaries = await generateSummaries(
        0.5,
        subtitles
    );
    const texts = await Promise.all(finalSummaries.map(summary => getChatGPTResult(
        `If the following text is over 70 characters, summarize it for a a youtube chapter label? If there are at or less than 70 characters, then just return the input text without ANY modification.  Verbatim.  The text is:
         
         ${summary.text}`
    )));
    finalSummaries.forEach((summary, index) => {
        summary.text = texts[index];
    })

    fs.writeFileSync(`${filePath.replace('.srt', '')}-summary.json`, JSON.stringify(finalSummaries));
    console.log(`Hey! I like your video so I used ChatGPT to make a summary from the subtitles so you can add youtube chapters to it
    ${
        finalSummaries.map(summary => `${formatDuration(summary.startTime)}-${formatDuration(summary.endTime)}: ${summary.text}`)
            .join('\n')
    }
    `)
}

main().catch(console.error);