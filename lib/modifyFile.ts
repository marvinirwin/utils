import {getChatGPTResult} from "../lib.js";
import glob from "glob";
import path from "path";
import yargs from "yargs";
import fs from 'fs-extra';

export const JsonTypescriptPromptStart = `You will function as a JSON api. The user will feed you valid JSON and you will return valid JSON, do not add any extra characters to the output that would make your output invalid JSON.

The end of this system message will contain typescript types named Input and Output. 
`;
export const JsonTypescriptPromptInputTypeStart = `The input to this is defined as follows`;
export const JsonTypescriptPromptOutputTypeStart = `Your output, which should be `;
export const JsonTypescriptPromptEnd = `Please only reply the following prompt with the JSON representation of the APIResult interface, parsable with JSON.parse`;

export interface InputFile {
    path: string;
    contents: string;
} // API function definition
export interface Modification {
    path: string;
    content: string;
}

export interface FileDeletion {
    path: string;
}

export interface FileCreation {
    path: string;
    content: string;
}

export interface ApiResult {
    modifications: Modification[];
    deletions: FileDeletion[];
    creations: FileCreation[];
}

export type ProcessFilesApi = (
    p: {
        command: string,
        inputFiles: InputFile[],
        baseDir: string
    }
) => Promise<ApiResult>;
export const getModifications: ProcessFilesApi = async (
    {
        inputFiles,
        command,
        baseDir
    }
) => {
    let result = await getChatGPTResult(
        `
        
${JsonTypescriptPromptStart}
If all inputs are valid then you should perform the action described in the "command" value of the input and return the result in the format described by the Output type.  All new files should be created relative to the baseDir
${JsonTypescriptPromptInputTypeStart}

interface InputFile {
    path: string;
    contents: string;
}

${JsonTypescriptPromptOutputTypeStart}

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

${JsonTypescriptPromptEnd}

${JSON.stringify({command, inputFiles, baseDir})}
        `
    );
    // ChatGPT JSON sometimes escapes parentheses, which is invalid JSON
    result = result.replace('\\(', ')')
    result = result.replace('\\)', '(')


    try {
        return JSON.parse(result);
    } catch (e) {
        console.log(result);
        throw new Error(`Could not parse response ${e}`);
    }
};
export const askWithFiles = async (
    {
        inputFiles,
        question,
    }: {
        question: string,
        inputFiles: InputFile[],
    }
) => {

    const result = await getChatGPTResult(
        `
        
If all inputs are valid then you should answer the question described in the "question" value of the input 
${JsonTypescriptPromptInputTypeStart}

interface InputFile {
    path: string;
    contents: string;
}

${JsonTypescriptPromptEnd}

${JSON.stringify({question, inputFiles})}
        `
    );
    return result
}

export async function resolveFileAndContents(match: string) {
    let item = path.resolve(match);
    return {
        path: item,
        contents: await fs.readFile(item, 'utf-8')
    }
        ;
}

export async function resolveFileBlobs(fileBlobs: string[]): Promise<InputFile[]> {
    const resolvedFiles: InputFile[] = [];

    for (let i = 0; i < fileBlobs.length; i++) {
        const fileBlob = fileBlobs[i];
        const matches = await glob(fileBlob);
        if (!matches.length) {
            throw new Error(`Could not resolve any files for blob ${fileBlob}`)
        }
        for (let j = 0; j < matches.length; j++) {
            const match = matches[j];
            resolvedFiles.push(await resolveFileAndContents(match))
        }
    }
    return resolvedFiles;
}

async function writeFileWithDirs(filePath: string, data: string) {
    try {
        await fs.outputFile(filePath, data);
    } catch (err) {
        console.error('Error writing file:', err);
    }
}
export async function writeModificationsObject(modifications: ApiResult) {
    for (let i = 0; i < modifications.modifications.length; i++) {
        const modification = modifications.modifications[i];
        console.log(`Modifying ${modification.path}`)
        await writeFileWithDirs(modification.path, modification.content);
    }
    for (let i = 0; i < modifications.creations.length; i++) {
        const creation = modifications.creations[i];
        console.log(`Creating ${creation.path}`)
        await writeFileWithDirs(creation.path, creation.content);
    }
    for (let i = 0; i < modifications.deletions.length; i++) {
        const deletion = modifications.deletions[i];
        await fs.unlink(deletion.path);
    }
}

export function getOptions() {
    const argv = yargs(process.argv.slice(2))
        .option('print-modifications',
            {
                alias: 'pm',
                type: 'boolean',
                description: 'Print modifications'
            })
        .option('request',
            {
                alias: 'r',
                type: 'string',
                demandOption: true,
                description: 'Request command'
            })
        .option(
            'base-dir',
            {
                alias: 'b',
            }
        )
        .option('ask', {
            alias: 'a',
        })
        .parseSync();

    const request = argv.request;
    const fileBlobs = argv._ as string[];
    return {argv, request, fileBlobs, ask: argv.ask};
}