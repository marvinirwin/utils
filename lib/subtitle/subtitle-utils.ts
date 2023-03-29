import fs from "fs";
import {decode, encode} from "gpt-3-encoder";

interface Subtitle {
    startTime: number;
    endTime: number;
    text: string;
}

export interface Summary {
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

export async function readSubtitles(filePath: string): Promise<any[]> {
    const subtitles = parseSrtFile(filePath)
    return subtitles.map(subtitle => ({text: subtitle.text, endTime: subtitle.endTime, startTime: subtitle.startTime}));
}

export async function splitSubtitles(subtitles: string[], chunkSize: number): Promise<string[]> {
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

export function convertToJSONArray<T>(jsonString: string): T[] {
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

export function formatDuration(milliseconds: number): string {
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