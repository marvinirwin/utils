import axios from 'axios';
import { encode, decode } from 'gpt-3-encoder';
import * as fs from "fs";
import {getChatGPTResult} from "./lib.js";
import {ChatGPTAPI} from "chatgpt";
const api = new ChatGPTAPI({ apiKey: process.env.OPENAI_API_KEY as string })

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
    const subtitles = await readSubtitles(`/Users/marvinirwin/Downloads/[English (auto-generated)] David Anthony_ The origin of Indo-Europeans [DownSub.com].srt`);
    const chunks = await splitSubtitles(subtitles.map(subTitleObject => JSON.stringify(subTitleObject)), 4096 * 2/3);
    const summaries: string[] = await Promise.all(chunks.map(chunk => getChatGPTResult(`The following are subtitles from a video represented as javascript objects.  Can you summarize the text as best you can, while keeping track of which content is contained in which timestamp?  Return the results as a JSON array: 
    ${chunk}`
    )))
    const message = summaries.map(chunk => encode(chunk).length);
    console.log(summaries);
    console.log(message);
}

main().catch(console.error);