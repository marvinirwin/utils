import * as fs from "fs/promises";
import * as clipboardy from "clipboardy";
import {getChatGPTResult} from "./lib.js";
import glob from "glob";
import * as path from "path";
import * as process from "process";

interface InputFile {
    path: string;
    contents: string;
}

interface Modification {
    path: string;
    content: string;
}

interface FileDeletion {
    path: string;
}

interface FileCreation {
    path: string;
    content: string;
}

interface ApiResult {
    modifications: Modification[];
    deletions: FileDeletion[];
    creations: FileCreation[];
}

// API function definition
type ProcessFilesApi = (
    p: {
        command: string,
        inputFiles: InputFile[]
    }
) => Promise<ApiResult>;

const getModifications: ProcessFilesApi = async (
    {
        inputFiles,
        command
    }
) => {
    const result = await getChatGPTResult(
        `
        
You will function as a JSON api. The user will feed you valid JSON and you will return valid JSON, do not add any extra characters to the output that would make your output invalid JSON.

The end of this system message will contain typescript types named Input and Output. 

If all inputs are valid then you should perform the action described in the "command" value of the input and return the result in the format described by the Output type.
The input to this is defined as follows

interface InputFile {
    path: string;
    contents: string;
}

Your output, which should be 

interface Modification {
    path: string;
    content: string;
}

interface FileDeletion {
    path: string;
}

interface FileCreation {
    path: string;
    content: string;
}

interface ApiResult {
    modifications: Modification[];
    deletions: FileDeletion[];
    creations: FileCreation[];
}

Please only reply the following prompt with the JSON representation of the APIResult interface, parsable with JSON.parse

${JSON.stringify({command, inputFiles})}
        `
    )
    try {
        console.log(result);
        return JSON.parse(result);
    } catch (e) {
        throw new Error(`Could not parse response ${e}`);
    }
};
async function resolveFileBlobs(fileBlobs: string[]): Promise<InputFile[]> {
    const resolvedFiles: InputFile[] = [];

    for (let i = 0; i < fileBlobs.length; i++) {
        const fileBlob = fileBlobs[i];
        const matches = await glob(fileBlob);
        if (!matches.length) {
            throw new Error(`Could not resolve any files for blob ${fileBlob}`)
        }
        for (let j = 0; j < matches.length; j++) {
            const match = matches[j];
            let item = path.resolve(match);
            resolvedFiles.push(
                {
                    path: item,
                    contents: await fs.readFile(item, 'utf-8')
                }
            );
        }
    }
    return resolvedFiles;
}

async function applyModifications() {
    const [request, ...fileBlobs] = process.argv.slice(2)

    const modifications = await getModifications({
        command: request,
        inputFiles: await resolveFileBlobs(fileBlobs)
    });
    for (let i = 0; i < modifications.modifications.length; i++) {
        const modification = modifications.modifications[i];
        await fs.writeFile(modification.path, modification.content);
    }
    for (let i = 0; i < modifications.creations.length; i++) {
        const creation = modifications.creations[i];
        await fs.writeFile(creation.path, creation.content);
    }
    for (let i = 0; i < modifications.deletions.length; i++) {
        const deletion = modifications.deletions[i];
        await fs.unlink(deletion.path);
    }
}

applyModifications().catch(console.error);